import { DashboardController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class DashboardRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/dashboard';
    this.Authorization = new Authorization(this.server);
    this.DashboardController = new DashboardController(this.server);

    this.routes();
  }

  routes() {
    this.API.get(
      this.endpointPrefix + '/stats',
      this.Authorization.check(),
      (req, res) => this.DashboardController.getStats(req, res)
    );
  }
}

export default DashboardRoute;
