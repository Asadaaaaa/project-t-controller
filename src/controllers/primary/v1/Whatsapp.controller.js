import { ResponsePresetHelper } from '#helpers';
import { WhatsappService } from '#servicesPrimaryV1';

class WhatsappController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.WhatsappService = new WhatsappService(this.server);
  }

  getUserId(req) {
    return req.user ? (req.user.userId || req.user.id) : null;
  }

  async getStatus(req, res) {
    const userId = this.getUserId(req);
    const status = await this.WhatsappService.getStatus(userId);
    return res.status(200).json(this.ResponsePreset.resOK('OK', status));
  }

  async getQR(req, res) {
    const userId = this.getUserId(req);
    const qrData = await this.WhatsappService.getQR(userId);
    return res.status(200).json(this.ResponsePreset.resOK('OK', qrData));
  }

  async connect(req, res) {
    const userId = this.getUserId(req);
    const result = await this.WhatsappService.connect(userId);
    return res.status(200).json(this.ResponsePreset.resOK('Connect triggered', result));
  }

  async disconnect(req, res) {
    const userId = this.getUserId(req);
    const result = await this.WhatsappService.disconnect(userId);
    return res.status(200).json(this.ResponsePreset.resOK('Disconnect triggered', result));
  }

  async triggerSync(req, res) {
    const userId = this.getUserId(req);
    const result = await this.WhatsappService.triggerSync(userId);
    return res.status(200).json(this.ResponsePreset.resOK('Sync triggered', result));
  }

  async getAllChats(req, res) {
    const userId = this.getUserId(req);
    const chats = await this.WhatsappService.getAllChats(userId);
    return res.status(200).json(this.ResponsePreset.resOK('OK', chats));
  }

  async getChatById(req, res) {
    const { id } = req.params;
    const chat = await this.WhatsappService.getChatById(id);
    if (!chat) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'Chat not found', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('OK', chat));
  }

  async getChatMessages(req, res) {
    const { id } = req.params;
    const { limit = 100, offset = 0 } = req.query;
    const messages = await this.WhatsappService.getChatMessages(id, limit, offset);
    return res.status(200).json(this.ResponsePreset.resOK('OK', messages));
  }

  // Internal Webhooks (from whatsapp-client service)
  async internalGetActiveSessions(req, res) {
    try {
      const sessions = await this.WhatsappService.getAllActiveSessions();
      return res.status(200).json(this.ResponsePreset.resOK('Active sessions retrieved', sessions));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async internalSessionUpdate(req, res) {
    const result = await this.WhatsappService.handleSessionUpdate(req.body);
    return res.status(200).json(this.ResponsePreset.resOK('Session updated', result));
  }

  async internalSyncBatch(req, res) {
    const result = await this.WhatsappService.handleSyncBatch(req.body);
    return res.status(200).json(this.ResponsePreset.resOK('Batch processed', result));
  }

  async internalIncomingMessage(req, res) {
    const result = await this.WhatsappService.handleIncomingMessage(req.body);
    return res.status(200).json(this.ResponsePreset.resOK('Message received', result));
  }
}

export default WhatsappController;
