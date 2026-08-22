import { Op } from 'sequelize';

class UserRepository {
  constructor(server) {
    this.server = server;
  }

  get models() {
    return this.server.model.models;
  }

  async getUserDataByIdentity(identity) {
    return this.models.users.findOne({
      where: {
        username: identity
      },
      include: [
        {
          model: this.models.roles,
          as: 'roles',
          include: [
            {
              model: this.models.permissions,
              as: 'permissions'
            }
          ]
        }
      ]
    });
  }

  async getUserById(id) {
    return this.models.users.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: this.models.roles,
          as: 'roles',
          through: { attributes: [] },
          include: [
            {
              model: this.models.permissions,
              as: 'permissions',
              through: { attributes: [] }
            }
          ]
        }
      ]
    });
  }

  async getAllUsers() {
    return this.models.users.findAll({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: this.models.roles,
          as: 'roles',
          through: { attributes: [] }
        }
      ],
      order: [['id', 'ASC']]
    });
  }

  async createUser(data) {
    return this.models.users.create(data);
  }

  async updateUser(id, data) {
    const user = await this.models.users.findByPk(id);
    if (!user) return null;
    return user.update(data);
  }

  async deleteUser(id) {
    const user = await this.models.users.findByPk(id);
    if (!user) return null;
    return user.destroy();
  }

  async assignRole(userId, roleId) {
    return this.models.user_roles.findOrCreate({
      where: { user_id: userId, role_id: roleId },
      defaults: { user_id: userId, role_id: roleId }
    });
  }

  async removeRole(userId, roleId) {
    return this.models.user_roles.destroy({
      where: { user_id: userId, role_id: roleId }
    });
  }
}

export default UserRepository;