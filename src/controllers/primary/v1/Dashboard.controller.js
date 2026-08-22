import { ResponsePresetHelper } from '#helpers';
import { DashboardService } from '#servicesPrimaryV1';

class DashboardController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.DashboardService = new DashboardService(this.server);
  }

  async getStats(req, res) {
    const userId = req.user ? (req.user.userId || req.user.id) : null;
    const stats = await this.DashboardService.getStats(userId);
    return res.status(200).json(this.ResponsePreset.resOK('OK', stats));
  }
}

export default DashboardController;
