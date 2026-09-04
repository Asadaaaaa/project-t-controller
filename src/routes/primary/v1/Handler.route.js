import {
  AuthRoute,
  UserRoute,
  RoleRoute,
  PermissionRoute,
  WhatsappRoute,
  SummaryRoute,
  TodoRoute,
  DashboardRoute,
  ReimbursementRoute
} from '#routesPrimaryV1';

class PrimaryHandlerV1 {
  constructor(server) {
    this.server = server;
    this.initRoutes('/primary/v1');
    this.initRoutes('/api/v1');
    this.initRoutes('/api');
  }

  initRoutes(prefix) {
    new AuthRoute(this.server, prefix);
    new UserRoute(this.server, prefix);
    new RoleRoute(this.server, prefix);
    new PermissionRoute(this.server, prefix);
    new WhatsappRoute(this.server, prefix);
    new SummaryRoute(this.server, prefix);
    new TodoRoute(this.server, prefix);
    new DashboardRoute(this.server, prefix);
    new ReimbursementRoute(this.server, prefix);
  }
}

export default PrimaryHandlerV1;