import { ConfigController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class ConfigRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/config';
    this.Authorization = new Authorization(this.server);
    this.ConfigController = new ConfigController(this.server);

    this.routes();
  }

  routes() {
    // Get auto summary config
    this.API.get(
      this.endpointPrefix + '/auto-summary',
      this.Authorization.check(),
      (req, res) => this.ConfigController.getAutoSummaryConfig(req, res)
    );

    // Save / update auto summary config
    this.API.post(
      this.endpointPrefix + '/auto-summary',
      this.Authorization.check(),
      (req, res) => this.ConfigController.updateAutoSummaryConfig(req, res)
    );

    // Test send daily summary now
    this.API.post(
      this.endpointPrefix + '/auto-summary/test-send',
      this.Authorization.check(),
      (req, res) => this.ConfigController.testSendSummary(req, res)
    );
  }
}

export default ConfigRoute;
