import { Op } from 'sequelize';

class WhatsappRepository {
  constructor(server) {
    this.server = server;
  }

  get models() {
    return this.server.model.models;
  }

  async getSession(sessionId = 'default') {
    return this.models.whatsapp_sessions.findOne({
      where: { session_id: sessionId }
    });
  }

  async getAllActiveSessions() {
    return this.models.whatsapp_sessions.findAll({
      attributes: ['session_id', 'user_id', 'status', 'phone_number']
    });
  }

  async upsertSession(data) {
    const existing = await this.models.whatsapp_sessions.findOne({
      where: { session_id: data.session_id }
    });

    if (existing) {
      return existing.update(data);
    }
    return this.models.whatsapp_sessions.create(data);
  }

  async getAllChats(sessionId = 'default') {
    return this.models.whatsapp_chats.findAll({
      where: { session_id: sessionId },
      order: [['updated_at', 'DESC']]
    });
  }

  async getChatById(id) {
    return this.models.whatsapp_chats.findByPk(id, {
      include: [
        {
          model: this.models.whatsapp_messages,
          as: 'messages',
          limit: 50,
          order: [['timestamp', 'DESC']]
        }
      ]
    });
  }

  async upsertChat(sessionId, chatData) {
    const chatId = chatData.whatsapp_chat_id || chatData.id;
    if (!chatId) return null;

    const [chat] = await this.models.whatsapp_chats.findOrCreate({
      where: {
        session_id: sessionId,
        whatsapp_chat_id: String(chatId)
      },
      defaults: {
        session_id: sessionId,
        whatsapp_chat_id: String(chatId),
        name: chatData.name || 'Unknown',
        is_group: !!(chatData.is_group || chatData.isGroup),
        phone_number: chatData.phone_number || chatData.phoneNumber || null
      }
    });

    if (chatData.name && chat.name !== chatData.name) {
      await chat.update({ name: chatData.name, phone_number: chatData.phone_number || chatData.phoneNumber || chat.phone_number });
    }

    return chat;
  }

  async getChatMessages(chatId, limit = 100, offset = 0) {
    return this.models.whatsapp_messages.findAndCountAll({
      where: { chat_id: chatId },
      order: [['timestamp', 'ASC']],
      limit,
      offset
    });
  }

  async createMessage(data) {
    if (!data.whatsapp_message_id) return null;
    return this.models.whatsapp_messages.create(data);
  }

  async findMessageById(whatsappMessageId) {
    if (!whatsappMessageId) return null;
    return this.models.whatsapp_messages.findOne({
      where: { whatsapp_message_id: String(whatsappMessageId) }
    });
  }

  async countMessagesToday() {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const startOfDay = new Date(`${todayStr}T00:00:00+07:00`).getTime();
    const endOfDay = new Date(`${todayStr}T23:59:59.999+07:00`).getTime();

    return this.models.whatsapp_messages.count({
      where: {
        timestamp: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      }
    });
  }

  async countActiveChats() {
    return this.models.whatsapp_chats.count();
  }
}

export default WhatsappRepository;
