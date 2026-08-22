import { ResponsePresetHelper } from '#helpers';
import { PermissionService } from '#servicesPrimaryV1';

class PermissionController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.PermissionService = new PermissionService(this.server);
  }

  async getAllPermissions(req, res) {
    const permissions = await this.PermissionService.getAllPermissions();
    return res.status(200).json(this.ResponsePreset.resOK('OK', permissions));
  }
}

export default PermissionController;
