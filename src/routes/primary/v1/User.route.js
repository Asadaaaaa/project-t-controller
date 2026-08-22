import { UserController } from '#controllersPrimaryV1';
import { Authorization, RBAC } from '#middlewaresPrimaryV1';

class UserRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/users';
    this.Authorization = new Authorization(this.server);
    this.RBAC = new RBAC(this.server);
    this.UserController = new UserController(this.server);

    this.routes();
  }

  routes() {
    this.API.get(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('user.view'),
      (req, res) => this.UserController.getAllUsers(req, res)
    );

    this.API.post(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('user.create'),
      (req, res) => this.UserController.createUser(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('user.view'),
      (req, res) => this.UserController.getUserById(req, res)
    );

    this.API.put(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('user.update'),
      (req, res) => this.UserController.updateUser(req, res)
    );

    this.API.delete(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('user.delete'),
      (req, res) => this.UserController.deleteUser(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/:id/roles',
      this.Authorization.check(),
      this.RBAC.requirePermission('role.assign'),
      (req, res) => this.UserController.assignRole(req, res)
    );

    this.API.delete(
      this.endpointPrefix + '/:id/roles/:roleId',
      this.Authorization.check(),
      this.RBAC.requirePermission('role.assign'),
      (req, res) => this.UserController.removeRole(req, res)
    );
  }
}

export default UserRoute;
