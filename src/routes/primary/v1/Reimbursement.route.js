import { ReimbursementController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class ReimbursementRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/reimbursements';
    this.Authorization = new Authorization(this.server);
    this.ReimbursementController = new ReimbursementController(this.server);

    this.routes();
  }

  routes() {
    // List reimbursements with search and filters
    this.API.get(
      this.endpointPrefix,
      this.Authorization.check(),
      (req, res) => this.ReimbursementController.getAll(req, res)
    );

    // Metrics summary
    this.API.get(
      this.endpointPrefix + '/metrics',
      this.Authorization.check(),
      (req, res) => this.ReimbursementController.getMetrics(req, res)
    );

    // Trigger WhatsApp scan
    this.API.post(
      this.endpointPrefix + '/sync',
      this.Authorization.check(),
      (req, res) => this.ReimbursementController.triggerSync(req, res)
    );

    // Detail by ID
    this.API.get(
      this.endpointPrefix + '/:id',
      this.Authorization.check(),
      (req, res) => this.ReimbursementController.getById(req, res)
    );

    // Update approval status
    this.API.patch(
      this.endpointPrefix + '/:id/status',
      this.Authorization.check(),
      (req, res) => this.ReimbursementController.updateStatus(req, res)
    );

    // Re-run Gemini AI analysis
    this.API.post(
      this.endpointPrefix + '/:id/reanalyze',
      this.Authorization.check(),
      (req, res) => this.ReimbursementController.reanalyze(req, res)
    );

    // Serve image file
    this.API.get(
      this.endpointPrefix + '/:id/image/:type',
      (req, res) => this.ReimbursementController.getImage(req, res)
    );
  }
}

export default ReimbursementRoute;
