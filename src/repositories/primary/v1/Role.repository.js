class RoleRepository {
  constructor(server) {
    this.server = server;
  }

  get models() {
    return this.server.model.models;
  }

  async getAllRoles() {
    return this.models.roles.findAll({
      include: [
        {
          model: this.models.permissions,
          as: 'permissions',
          through: { attributes: [] }
        }
      ],
      order: [['id', 'ASC']]
    });
  }

  async getRoleById(id) {
    return this.models.roles.findByPk(id, {
      include: [
        {
          model: this.models.permissions,
          as: 'permissions',
          through: { attributes: [] }
        }
      ]
    });
  }

  async createRole(data) {
    return this.models.roles.create(data);
  }

  async updateRole(id, data) {
    const role = await this.models.roles.findByPk(id);
    if (!role) return null;
    return role.update(data);
  }

  async deleteRole(id) {
    const role = await this.models.roles.findByPk(id);
    if (!role) return null;
    return role.destroy();
  }

  async assignPermission(roleId, permissionId) {
    return this.models.role_permissions.findOrCreate({
      where: { role_id: roleId, permission_id: permissionId },
      defaults: { role_id: roleId, permission_id: permissionId }
    });
  }

  async removePermission(roleId, permissionId) {
    return this.models.role_permissions.destroy({
      where: { role_id: roleId, permission_id: permissionId }
    });
  }
}

export default RoleRepository;
