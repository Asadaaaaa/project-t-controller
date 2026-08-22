import { SummaryController } from '#controllersPrimaryV1';
import { Authorization, RBAC } from '#middlewaresPrimaryV1';

class SummaryRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/summaries';
    this.Authorization = new Authorization(this.server);
    this.RBAC = new RBAC(this.server);
    this.SummaryController = new SummaryController(this.server);

    this.routes();
  }

  routes() {
    this.API.get(
      this.endpointPrefix,
      this.Authorization.check(),
      this.RBAC.requirePermission('summary.view'),
      (req, res) => this.SummaryController.getAllSummaries(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/:date',
      this.Authorization.check(),
      this.RBAC.requirePermission('summary.view'),
      (req, res) => this.SummaryController.getSummaryByDate(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/generate',
      this.Authorization.check(),
      this.RBAC.requirePermission('summary.generate'),
      (req, res) => this.SummaryController.generateSummary(req, res)
    );
  }
}

export default SummaryRoute;
