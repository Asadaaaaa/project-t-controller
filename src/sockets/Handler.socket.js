import { WhatsappService } from '#servicesPrimaryV1';

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
      const clientType = socket.handshake.query.type || 'unknown';
      this.server.sendLogs(`[SocketHandler] Client connected: ${socket.id} (type: ${clientType})`);

      // Track worker connection
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

      // 3. Worker forwards real-time incoming message
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

      // 4. Worker sends synced batch of chats & messages
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
        this.server.sendLogs(`[SocketHandler] Client disconnected: ${socket.id} (reason: ${reason})`);
        this.workerSockets.delete(socket);
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
