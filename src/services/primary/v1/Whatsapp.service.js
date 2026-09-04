import { WhatsappRepository } from '#repositoriesPrimaryV1';
import axios from 'axios';

class WhatsappService {
  constructor(server) {
    this.server = server;
    this.WhatsappRepository = new WhatsappRepository(this.server);
    this.clientUrl = process.env.WHATSAPP_CLIENT_URL || 'http://localhost:4001';
  }

  getSessionId(userId = null, sessionId = null) {
    if (sessionId) return sessionId;
    if (userId) return `user_${userId}`;
    return 'default';
  }

  async getAllActiveSessions() {
    return this.WhatsappRepository.getAllActiveSessions();
  }

  async getStatus(userId = null, customSessionId = null) {
    const sessionId = this.getSessionId(userId, customSessionId);
    let session = await this.WhatsappRepository.getSession(sessionId);
    let clientStatus = null;

    if (this.server?.socketHandler) {
      try {
        const resp = await this.server.socketHandler.sendGetStatus(sessionId);
        clientStatus = resp;
      } catch (err) {
        // worker may not be connected or session not initialized yet
      }
    }

    const liveStatus = clientStatus?.data?.status || (session ? session.status : 'disconnected');
    const livePhone = clientStatus?.data?.phoneNumber || (session ? session.phone_number : null);

    // Auto synchronize DB session with live client status
    if (clientStatus?.data && (!session || session.status !== liveStatus || session.phone_number !== livePhone)) {
      await this.WhatsappRepository.upsertSession({
        session_id: sessionId,
        user_id: userId || session?.user_id,
        status: liveStatus,
        phone_number: livePhone,
        last_connected_at: liveStatus === 'connected' ? (session?.last_connected_at || new Date()) : session?.last_connected_at
      });
      session = await this.WhatsappRepository.getSession(sessionId);
    }

    return {
      session: session || {
        session_id: sessionId,
        user_id: userId,
        status: liveStatus,
        phone_number: livePhone,
        last_connected_at: null
      },
      clientOnline: !!clientStatus,
      details: clientStatus ? clientStatus.data : null
    };
  }

  async getQR(userId = null, customSessionId = null) {
    const sessionId = this.getSessionId(userId, customSessionId);
    if (!this.server?.socketHandler) {
      return { qr: null, status: 'disconnected', error: 'SocketHandler not initialized' };
    }

    try {
      const resp = await this.server.socketHandler.sendGetQR(sessionId);
      return resp?.data || resp;
    } catch (err) {
      return { qr: null, status: 'disconnected', error: err.message };
    }
  }

  async connect(userId = null, customSessionId = null) {
    const sessionId = this.getSessionId(userId, customSessionId);

    await this.WhatsappRepository.upsertSession({
      session_id: sessionId,
      user_id: userId,
      status: 'connecting'
    });

    if (!this.server?.socketHandler) {
      return { success: false, message: 'WhatsApp worker is not connected' };
    }

    try {
      const resp = await this.server.socketHandler.sendConnect(sessionId, userId);
      return resp;
    } catch (err) {
      return { success: false, message: `Failed to trigger WhatsApp connect: ${err.message}` };
    }
  }

  async disconnect(userId = null, customSessionId = null) {
    const sessionId = this.getSessionId(userId, customSessionId);

    await this.WhatsappRepository.upsertSession({
      session_id: sessionId,
      user_id: userId,
      status: 'disconnected',
      phone_number: null
    });

    if (!this.server?.socketHandler) {
      return { success: false, message: 'WhatsApp worker is not connected' };
    }

    try {
      const resp = await this.server.socketHandler.sendDisconnect(sessionId, userId);
      return resp;
    } catch (err) {
      return { success: false, message: `Failed to trigger WhatsApp disconnect: ${err.message}` };
    }
  }

  async triggerSync(userId = null, customSessionId = null) {
    const sessionId = this.getSessionId(userId, customSessionId);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    if (!this.server?.socketHandler) {
      return { success: false, message: 'WhatsApp worker is not connected' };
    }

    try {
      const resp = await this.server.socketHandler.sendSyncDate(sessionId, today, userId);
      return resp;
    } catch (err) {
      return { success: false, message: `Failed to trigger sync: ${err.message}` };
    }
  }

  async getAllChats(userId = null, customSessionId = null) {
    const sessionId = this.getSessionId(userId, customSessionId);

    // Ambil daftar chat & grup langsung dari WhatsApp client jika sedang connected
    if (this.server?.socketHandler?.isWorkerConnected()) {
      try {
        const resp = await this.server.socketHandler.sendGetChats(sessionId, userId);
        if (resp && resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
          for (const item of resp.data) {
            if (item.id) {
              await this.WhatsappRepository.upsertChat(sessionId, {
                whatsapp_chat_id: String(item.id),
                name: item.name || item.id,
                is_group: !!item.isGroup,
                phone_number: item.phoneNumber || null
              });
            }
          }
        }
      } catch (err) {
        // Fallback langsung ke database jika socket timeout/error
      }
    }

    return this.WhatsappRepository.getAllChats(sessionId);
  }

  async getChatById(id) {
    return this.WhatsappRepository.getChatById(id);
  }

  async getChatMessages(chatId, limit = 100, offset = 0) {
    return this.WhatsappRepository.getChatMessages(chatId, Number(limit), Number(offset));
  }

  /**
   * Internal webhook: handle session status change from WhatsApp client
   */
  async handleSessionUpdate(data) {
    const { sessionId = 'default', status, phoneNumber, userId } = data;
    return this.WhatsappRepository.upsertSession({
      session_id: sessionId,
      user_id: userId || undefined,
      status,
      phone_number: phoneNumber,
      last_connected_at: status === 'connected' ? new Date() : undefined
    });
  }

  /**
   * Internal webhook: store batch of chats and messages
   */
  async handleSyncBatch(data) {
    const { sessionId = 'default', chats = [] } = data;
    let totalMessagesSaved = 0;
    let totalChatsSaved = 0;

    for (const chatItem of chats) {
      const chatId = chatItem.whatsapp_chat_id || chatItem.id;
      if (!chatId) continue;

      try {
        const chat = await this.WhatsappRepository.upsertChat(sessionId, {
          whatsapp_chat_id: String(chatId),
          name: chatItem.name || chatItem.formattedTitle || 'Unknown',
          is_group: !!(chatItem.isGroup || chatItem.is_group),
          phone_number: chatItem.phoneNumber || chatItem.phone_number || null
        });

        if (!chat) continue;
        totalChatsSaved++;

        if (chatItem.messages && Array.isArray(chatItem.messages)) {
          for (const msg of chatItem.messages) {
            const msgId = msg.whatsapp_message_id || msg.id;
            if (!msgId) continue;

            const strMsgId = String(msgId);
            const exists = await this.WhatsappRepository.findMessageById(strMsgId);
            if (!exists) {
              await this.WhatsappRepository.createMessage({
                chat_id: chat.id,
                whatsapp_message_id: strMsgId,
                sender: msg.sender || (msg.fromMe ? 'Me' : null),
                receiver: msg.receiver || null,
                message: msg.body || msg.message || '',
                message_type: msg.type || msg.message_type || 'chat',
                timestamp: msg.timestamp ? (typeof msg.timestamp === 'number' && msg.timestamp < 10000000000 ? msg.timestamp * 1000 : Number(msg.timestamp)) : Date.now(),
                is_from_me: !!msg.fromMe || !!msg.is_from_me
              });
              totalMessagesSaved++;
            }
          }
        }
      } catch (chatErr) {
        console.error(`[WhatsappService:${sessionId}] Error saving chat ${chatId}:`, chatErr.message);
      }
    }

    return {
      success: true,
      sessionId,
      chatsProcessed: totalChatsSaved,
      messagesSaved: totalMessagesSaved
    };
  }

  /**
   * Internal webhook: real-time incoming message
   */
  async handleIncomingMessage(data) {
    const { sessionId = 'default', chat: chatData, message: msgData } = data;
    if (!chatData || !msgData) {
      return { duplicate: false, skipped: true };
    }

    const chatId = chatData.whatsapp_chat_id || chatData.id;
    if (!chatId) return { duplicate: false, skipped: true };

    const chat = await this.WhatsappRepository.upsertChat(sessionId, {
      whatsapp_chat_id: String(chatId),
      name: chatData.name || 'Unknown',
      is_group: !!(chatData.isGroup || chatData.is_group),
      phone_number: chatData.phoneNumber || null
    });

    if (!chat) return { duplicate: false, skipped: true };

    const rawMsgId = msgData.whatsapp_message_id || msgData.id;
    if (!rawMsgId) return { duplicate: false, skipped: true };

    const msgId = String(rawMsgId);
    const exists = await this.WhatsappRepository.findMessageById(msgId);
    if (exists) {
      return { duplicate: true, message: exists };
    }

    const timestamp = msgData.timestamp
      ? (typeof msgData.timestamp === 'number' && msgData.timestamp < 10000000000 ? msgData.timestamp * 1000 : Number(msgData.timestamp))
      : Date.now();

    const createdMsg = await this.WhatsappRepository.createMessage({
      chat_id: chat.id,
      whatsapp_message_id: msgId,
      sender: msgData.sender || (msgData.fromMe ? 'Me' : null),
      receiver: msgData.receiver || null,
      message: msgData.body || msgData.message || '',
      message_type: msgData.type || msgData.message_type || 'chat',
      timestamp,
      is_from_me: !!msgData.fromMe || !!msgData.is_from_me
    });

    return {
      duplicate: false,
      message: createdMsg
    };
  }
}

export default WhatsappService;
