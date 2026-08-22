import { RoleController } from '#controllersPrimaryV1';
import { Authorization, RBAC } from '#middlewaresPrimaryV1';

class RoleRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/roles';
    this.Authorization = new Authorization(this.server);
    this.RBAC = new RBAC(this.server);
    this.RoleController = new RoleController(this.server);

    this.routes();
  }

  routes() {
    this.API.get(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('role.view'),
      (req, res) => this.RoleController.getAllRoles(req, res)
    );

    this.API.post(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('role.create'),
      (req, res) => this.RoleController.createRole(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('role.view'),
      (req, res) => this.RoleController.getRoleById(req, res)
    );

    this.API.put(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('role.update'),
      (req, res) => this.RoleController.updateRole(req, res)
    );

    this.API.delete(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('role.delete'),
      (req, res) => this.RoleController.deleteRole(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/:id/permissions',
      this.Authorization.check(),
      this.RBAC.requirePermission('permission.assign'),
      (req, res) => this.RoleController.assignPermission(req, res)
    );

    this.API.delete(
      this.endpointPrefix + '/:id/permissions/:permissionId',
      this.Authorization.check(),
      this.RBAC.requirePermission('permission.assign'),
      (req, res) => this.RoleController.removePermission(req, res)
    );
  }
}

export default RoleRoute;
