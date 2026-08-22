import { PermissionRepository } from '#repositoriesPrimaryV1';

class PermissionService {
  constructor(server) {
    this.server = server;
    this.PermissionRepository = new PermissionRepository(this.server);
  }

  async getAllPermissions() {
    return this.PermissionRepository.getAllPermissions();
  }
}

export default PermissionService;
