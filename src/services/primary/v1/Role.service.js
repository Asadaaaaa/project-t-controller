import { RoleRepository } from '#repositoriesPrimaryV1';

class RoleService {
  constructor(server) {
    this.server = server;
    this.RoleRepository = new RoleRepository(this.server);
  }

  async getAllRoles() {
    return this.RoleRepository.getAllRoles();
  }

  async getRoleById(id) {
    return this.RoleRepository.getRoleById(id);
  }

  async createRole(data) {
    const role = await this.RoleRepository.createRole({
      name: data.name,
      description: data.description || null
    });

    if (data.permissions && Array.isArray(data.permissions)) {
      for (const permId of data.permissions) {
        await this.RoleRepository.assignPermission(role.id, permId);
      }
    }

    return this.RoleRepository.getRoleById(role.id);
  }

  async updateRole(id, data) {
    await this.RoleRepository.updateRole(id, {
      name: data.name,
      description: data.description
    });

    if (data.permissions && Array.isArray(data.permissions)) {
      // Clear old permissions and set new
      await this.server.model.models.role_permissions.destroy({
        where: { role_id: id }
      });
      for (const permId of data.permissions) {
        await this.RoleRepository.assignPermission(id, permId);
      }
    }

    return this.RoleRepository.getRoleById(id);
  }

  async deleteRole(id) {
    return this.RoleRepository.deleteRole(id);
  }

  async assignPermission(roleId, permissionId) {
    return this.RoleRepository.assignPermission(roleId, permissionId);
  }

  async removePermission(roleId, permissionId) {
    return this.RoleRepository.removePermission(roleId, permissionId);
  }
}

export default RoleService;
