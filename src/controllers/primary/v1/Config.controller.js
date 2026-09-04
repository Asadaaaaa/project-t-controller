import { ResponsePresetHelper } from '#helpers';
import { ConfigService } from '#servicesPrimaryV1';

class ConfigController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.ConfigService = new ConfigService(this.server);
  }

  getUserId(req) {
    return req.user ? (req.user.userId || req.user.id) : null;
  }

  async getAutoSummaryConfig(req, res) {
    try {
      const userId = this.getUserId(req);
      const config = await this.ConfigService.getAutoSummaryConfig(userId);
      return res.status(200).json(this.ResponsePreset.resOK('OK', config));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }

  async updateAutoSummaryConfig(req, res) {
    try {
      const userId = this.getUserId(req);
      const updated = await this.ConfigService.updateAutoSummaryConfig(userId, req.body);
      return res.status(200).json(this.ResponsePreset.resOK('Konfigurasi berhasil disimpan', updated));
    } catch (err) {
      return res.status(400).json(this.ResponsePreset.resErr(400, err.message, 'service', null));
    }
  }

  async testSendSummary(req, res) {
    try {
      const userId = this.getUserId(req);
      const { target_chat_id, target_chat_name } = req.body || {};
      const result = await this.ConfigService.sendDailySummaryToChat(userId, target_chat_id, target_chat_name);
      return res.status(200).json(this.ResponsePreset.resOK('Summary harian berhasil dikirim ke room chat!', result));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'service', null));
    }
  }
}

export default ConfigController;
