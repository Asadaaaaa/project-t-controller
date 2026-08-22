import { UserRepository } from '#repositoriesPrimaryV1';
import { Sha256Helper } from '#helpers';

class UserService {
  constructor(server) {
    this.server = server;
    this.UserRepository = new UserRepository(this.server);
    this.Sha256Helper = new Sha256Helper(this.server);
  }

  async getAllUsers() {
    return this.UserRepository.getAllUsers();
  }

  async getUserById(id) {
    return this.UserRepository.getUserById(id);
  }

  async createUser(data) {
    const { name, username, password, role_id } = data;
    const hashedPassword = this.Sha256Helper.getHash(password, this.server.env.HASH_SALT_PASSWORD);

    const user = await this.UserRepository.createUser({
      name,
      username,
      password: hashedPassword
    });

    if (role_id) {
      await this.UserRepository.assignRole(user.id, role_id);
    }

    return this.UserRepository.getUserById(user.id);
  }

  async updateUser(id, data) {
    const updateData = { ...data };
    if (updateData.password) {
      updateData.password = this.Sha256Helper.getHash(updateData.password, this.server.env.HASH_SALT_PASSWORD);
    } else {
      delete updateData.password;
    }

    await this.UserRepository.updateUser(id, updateData);
    return this.UserRepository.getUserById(id);
  }

  async deleteUser(id) {
    return this.UserRepository.deleteUser(id);
  }

  async assignRole(userId, roleId) {
    return this.UserRepository.assignRole(userId, roleId);
  }

  async removeRole(userId, roleId) {
    return this.UserRepository.removeRole(userId, roleId);
  }
}

export default UserService;
