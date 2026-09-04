import { WhatsappService } from '#servicesPrimaryV1';
import JWT from 'jsonwebtoken';

class SocketHandler {
  constructor(server) {
    this.server = server;
    this.io = server.io;
    this.whatsappService = new WhatsappService(this.server);
    this.workerSockets = new Set();

    this.init();
  }

  getPrimaryWorker() {
    if (this.workerSockets.size === 0) return null;
    return this.workerSockets.values().next().value;
  }

  isWorkerConnected() {
    return this.workerSockets.size > 0;
  }

  init() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const clientType = socket.handshake.query.type || socket.handshake.auth?.type || 'dashboard_client';
      this.server.sendLogs(`[SocketHandler] Client connected: ${socket.id} (type: ${clientType})`);

      // Branch 1: WhatsApp Worker backend connection
      if (clientType === 'whatsapp_worker') {
        this.workerSockets.add(socket);

        // 1. Worker requests active DB sessions on startup
        socket.on('whatsapp:get_db_sessions', async (data, callback) => {
          try {
            const sessions = await this.whatsappService.getAllActiveSessions();
            if (typeof callback === 'function') {
              callback({ success: true, data: sessions });
            }
          } catch (err) {
            if (typeof callback === 'function') {
              callback({ success: false, error: err.message });
            }
          }
        });

        // 2. Worker notifies session status change
        socket.on('whatsapp:session_updated', async (data, callback) => {
          try {
            const result = await this.whatsappService.handleSessionUpdate(data);

            // Broadcast real-time status update to connected dashboard users
            const updatePayload = {
              sessionId: data.sessionId,
              status: data.status,
              phoneNumber: data.phoneNumber || null,
              userId: data.userId || null
            };

            if (data.userId) {
              this.io.to(`user_${data.userId}`).emit('whatsapp:status_updated', updatePayload);
            }
            this.io.to('dashboard').emit('whatsapp:status_updated', updatePayload);

            if (typeof callback === 'function') {
              callback({ success: true, data: result });
            }
          } catch (err) {
            this.server.sendLogs(`[SocketHandler] Error handling session update: ${err.message}`);
            if (typeof callback === 'function') {
              callback({ success: false, error: err.message });
            }
          }
        });

        // 3. Worker notifies QR code received or cleared
        socket.on('whatsapp:qr_updated', async (data, callback) => {
          try {
            const qrPayload = {
              sessionId: data.sessionId,
              status: data.qr ? 'connecting' : 'disconnected',
              qr: data.qr || null,
              qrDataUrl: data.qrDataUrl || null,
              userId: data.userId || null
            };

            if (data.userId) {
              this.io.to(`user_${data.userId}`).emit('whatsapp:qr_updated', qrPayload);
            }
            this.io.to('dashboard').emit('whatsapp:qr_updated', qrPayload);

            if (typeof callback === 'function') {
              callback({ success: true });
            }
          } catch (err) {
            this.server.sendLogs(`[SocketHandler] Error handling QR update: ${err.message}`);
            if (typeof callback === 'function') {
              callback({ success: false, error: err.message });
            }
          }
        });

        // 4. Worker forwards real-time incoming message
        socket.on('whatsapp:incoming_message', async (data, callback) => {
          try {
            const result = await this.whatsappService.handleIncomingMessage(data);
            if (typeof callback === 'function') {
              callback({ success: true, data: result });
            }
          } catch (err) {
            this.server.sendLogs(`[SocketHandler] Error handling incoming message: ${err.message}`);
            if (typeof callback === 'function') {
              callback({ success: false, error: err.message });
            }
          }
        });

        // 5. Worker forwards detected reimbursement with media
        socket.on('whatsapp:reimbursement_detected', async (data, callback) => {
          try {
            this.server.sendLogs(`[SocketHandler] 📥 Received reimbursement_detected event from worker`);
            const ReimbursementServiceClass = (await import('../services/primary/v1/Reimbursement.service.js')).default;
            const reimbursementService = new ReimbursementServiceClass(this.server);
            const saved = await reimbursementService.processIncomingReimbursement(data);
            if (typeof callback === 'function') {
              callback({ success: true, data: saved });
            }
          } catch (err) {
            this.server.sendLogs(`[SocketHandler] Error processing reimbursement_detected: ${err.message}`);
            if (typeof callback === 'function') {
              callback({ success: false, error: err.message });
            }
          }
        });

        // 5. Worker sends synced batch of chats & messages
        socket.on('whatsapp:sync_batch', async (data, callback) => {
          try {
            const result = await this.whatsappService.handleSyncBatch(data);
            if (typeof callback === 'function') {
              callback({ success: true, data: result });
            }
          } catch (err) {
            this.server.sendLogs(`[SocketHandler] Error handling sync batch: ${err.message}`);
            if (typeof callback === 'function') {
              callback({ success: false, error: err.message });
            }
          }
        });

        socket.on('disconnect', (reason) => {
          this.server.sendLogs(`[SocketHandler] WhatsApp Worker disconnected: ${socket.id} (reason: ${reason})`);
          this.workerSockets.delete(socket);
        });

        return;
      }

      // Branch 2: Dashboard frontend browser connection
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token && token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
      }

      if (token) {
        try {
          const decoded = JWT.verify(token, this.server.env.JWT_TOKEN_SECRET);
          const userPayload = decoded.data || decoded;
          socket.user = userPayload;
          if (userPayload.userId) {
            socket.join(`user_${userPayload.userId}`);
          }
          this.server.sendLogs(`[SocketHandler] Authenticated Dashboard client (${userPayload.username || userPayload.userId}) joined room.`);
        } catch (err) {
          this.server.sendLogs(`[SocketHandler] Dashboard auth error: ${err.message}`);
        }
      }

      socket.join('dashboard');

      socket.on('disconnect', (reason) => {
        this.server.sendLogs(`[SocketHandler] Dashboard client disconnected: ${socket.id} (reason: ${reason})`);
      });
    });
  }

  /**
   * Helper to emit an event to the worker with ACK and timeout
   */
  async emitWithTimeout(eventName, payload, timeoutMs = 5000) {
    const worker = this.getPrimaryWorker();
    if (!worker) {
      throw new Error('WhatsApp worker client is not connected to Socket.IO');
    }

    return new Promise((resolve, reject) => {
      let isDone = false;
      const timer = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          reject(new Error(`Socket command '${eventName}' timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      worker.emit(eventName, payload, (response) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timer);
          resolve(response);
        }
      });
    });
  }

  async sendGetStatus(sessionId) {
    return this.emitWithTimeout('whatsapp:get_status', { sessionId }, 5000);
  }

  async sendGetQR(sessionId) {
    return this.emitWithTimeout('whatsapp:get_qr', { sessionId }, 5000);
  }

  async sendConnect(sessionId, userId) {
    return this.emitWithTimeout('whatsapp:connect', { sessionId, userId }, 10000);
  }

  async sendDisconnect(sessionId, userId) {
    return this.emitWithTimeout('whatsapp:disconnect', { sessionId, userId }, 10000);
  }

  async sendSyncDate(sessionId, date, userId) {
    return this.emitWithTimeout('whatsapp:sync_date', { sessionId, date, userId }, 90000);
  }
}

export default SocketHandler;
