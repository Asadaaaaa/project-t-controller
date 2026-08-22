import { ResponsePresetHelper } from '#helpers';
import { UserValidator } from '#validatorsPrimaryV1';
import { UserService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class UserController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.Ajv = new Ajv();
    this.DataScheme = new UserValidator();
    this.UserService = new UserService(this.server);
  }

  async getAllUsers(req, res) {
    const users = await this.UserService.getAllUsers();
    return res.status(200).json(this.ResponsePreset.resOK('OK', users));
  }

  async getUserById(req, res) {
    const { id } = req.params;
    const user = await this.UserService.getUserById(id);
    if (!user) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'User not found', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('OK', user));
  }

  async createUser(req, res) {
    const schemeValidate = this.Ajv.compile(this.DataScheme.create);
    if (!schemeValidate(req.body)) {
      return res.status(400).json(this.ResponsePreset.resErr(
        400,
        schemeValidate.errors[0].message,
        'validator',
        schemeValidate.errors[0]
      ));
    }

    try {
      const newUser = await this.UserService.createUser(req.body);
      return res.status(201).json(this.ResponsePreset.resOK('User created successfully', newUser));
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json(this.ResponsePreset.resErr(409, 'Username already exists', 'service', null));
      }
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'server', null));
    }
  }

  async updateUser(req, res) {
    const { id } = req.params;
    const schemeValidate = this.Ajv.compile(this.DataScheme.update);
    if (!schemeValidate(req.body)) {
      return res.status(400).json(this.ResponsePreset.resErr(
        400,
        schemeValidate.errors[0].message,
        'validator',
        schemeValidate.errors[0]
      ));
    }

    try {
      const updatedUser = await this.UserService.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json(this.ResponsePreset.resErr(404, 'User not found', 'service', null));
      }
      return res.status(200).json(this.ResponsePreset.resOK('User updated successfully', updatedUser));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'server', null));
    }
  }

  async deleteUser(req, res) {
    const { id } = req.params;
    const deleted = await this.UserService.deleteUser(id);
    if (!deleted) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'User not found', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('User deleted successfully', null));
  }

  async assignRole(req, res) {
    const { id } = req.params;
    const { roleId } = req.body;
    if (!roleId) {
      return res.status(400).json(this.ResponsePreset.resErr(400, 'roleId is required', 'validator', null));
    }

    await this.UserService.assignRole(id, roleId);
    const user = await this.UserService.getUserById(id);
    return res.status(200).json(this.ResponsePreset.resOK('Role assigned successfully', user));
  }

  async removeRole(req, res) {
    const { id, roleId } = req.params;
    await this.UserService.removeRole(id, roleId);
    const user = await this.UserService.getUserById(id);
    return res.status(200).json(this.ResponsePreset.resOK('Role removed successfully', user));
  }
}

export default UserController;
