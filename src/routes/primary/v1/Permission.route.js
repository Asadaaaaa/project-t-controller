import { PermissionController } from '#controllersPrimaryV1';
import { Authorization, RBAC } from '#middlewaresPrimaryV1';

class PermissionRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/permissions';
    this.Authorization = new Authorization(this.server);
    this.RBAC = new RBAC(this.server);
    this.PermissionController = new PermissionController(this.server);

    this.routes();
  }

  routes() {
    this.API.get(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('permission.view'),
      (req, res) => this.PermissionController.getAllPermissions(req, res)
    );
  }
}

export default PermissionRoute;
