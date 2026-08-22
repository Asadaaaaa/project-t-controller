import { ResponsePresetHelper } from '#helpers';
import { RoleValidator } from '#validatorsPrimaryV1';
import { RoleService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class RoleController {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
    this.Ajv = new Ajv();
    this.DataScheme = new RoleValidator();
    this.RoleService = new RoleService(this.server);
  }

  async getAllRoles(req, res) {
    const roles = await this.RoleService.getAllRoles();
    return res.status(200).json(this.ResponsePreset.resOK('OK', roles));
  }

  async getRoleById(req, res) {
    const { id } = req.params;
    const role = await this.RoleService.getRoleById(id);
    if (!role) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'Role not found', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('OK', role));
  }

  async createRole(req, res) {
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
      const newRole = await this.RoleService.createRole(req.body);
      return res.status(201).json(this.ResponsePreset.resOK('Role created successfully', newRole));
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json(this.ResponsePreset.resErr(409, 'Role name already exists', 'service', null));
      }
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'server', null));
    }
  }

  async updateRole(req, res) {
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
      const updatedRole = await this.RoleService.updateRole(id, req.body);
      if (!updatedRole) {
        return res.status(404).json(this.ResponsePreset.resErr(404, 'Role not found', 'service', null));
      }
      return res.status(200).json(this.ResponsePreset.resOK('Role updated successfully', updatedRole));
    } catch (err) {
      return res.status(500).json(this.ResponsePreset.resErr(500, err.message, 'server', null));
    }
  }

  async deleteRole(req, res) {
    const { id } = req.params;
    const deleted = await this.RoleService.deleteRole(id);
    if (!deleted) {
      return res.status(404).json(this.ResponsePreset.resErr(404, 'Role not found', 'service', null));
    }
    return res.status(200).json(this.ResponsePreset.resOK('Role deleted successfully', null));
  }

  async assignPermission(req, res) {
    const { id } = req.params;
    const { permissionId } = req.body;
    if (!permissionId) {
      return res.status(400).json(this.ResponsePreset.resErr(400, 'permissionId is required', 'validator', null));
    }

    await this.RoleService.assignPermission(id, permissionId);
    const role = await this.RoleService.getRoleById(id);
    return res.status(200).json(this.ResponsePreset.resOK('Permission assigned successfully', role));
  }

  async removePermission(req, res) {
    const { id, permissionId } = req.params;
    await this.RoleService.removePermission(id, permissionId);
    const role = await this.RoleService.getRoleById(id);
    return res.status(200).json(this.ResponsePreset.resOK('Permission removed successfully', role));
  }
}

export default RoleController;
