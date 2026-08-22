class PermissionRepository {
  constructor(server) {
    this.server = server;
  }

  get models() {
    return this.server.model.models;
  }

  async getAllPermissions() {
    return this.models.permissions.findAll({
      order: [['name', 'ASC']]
    });
  }

  async getPermissionById(id) {
    return this.models.permissions.findByPk(id);
  }
}

export default PermissionRepository;
