import { WhatsappController } from '#controllersPrimaryV1';
import { Authorization, RBAC } from '#middlewaresPrimaryV1';

class WhatsappRoute {
  constructor(server, endpointPrefix) {
    this.server = server;
    this.API = server.API;

    this.endpointPrefix = endpointPrefix + '/whatsapp';
    this.Authorization = new Authorization(this.server);
    this.RBAC = new RBAC(this.server);
    this.WhatsappController = new WhatsappController(this.server);

    this.routes();
  }

  routes() {
    // Status & QR
    this.API.get(
      this.endpointPrefix + '/status',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.view'),
      (req, res) => this.WhatsappController.getStatus(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/qr',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.view'),
      (req, res) => this.WhatsappController.getQR(req, res)
    );

    // Connection Control
    this.API.post(
      this.endpointPrefix + '/connect',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.connect'),
      (req, res) => this.WhatsappController.connect(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/disconnect',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.disconnect'),
      (req, res) => this.WhatsappController.disconnect(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/sync',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.sync'),
      (req, res) => this.WhatsappController.triggerSync(req, res)
    );

    // Chats & Messages
    this.API.get(
      this.endpointPrefix + '/chats',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.message.view'),
      (req, res) => this.WhatsappController.getAllChats(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/chats/:id',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.message.view'),
      (req, res) => this.WhatsappController.getChatById(req, res)
    );

    this.API.get(
      this.endpointPrefix + '/chats/:id/messages',
      this.Authorization.check(),
      this.RBAC.requirePermission('whatsapp.message.view'),
      (req, res) => this.WhatsappController.getChatMessages(req, res)
    );

    // Internal Webhooks (from whatsapp-client service, no auth required on internal loopback)
    this.API.get(
      this.endpointPrefix + '/internal/active-sessions',
      (req, res) => this.WhatsappController.internalGetActiveSessions(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/internal/session-update',
      (req, res) => this.WhatsappController.internalSessionUpdate(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/internal/sync-batch',
      (req, res) => this.WhatsappController.internalSyncBatch(req, res)
    );

    this.API.post(
      this.endpointPrefix + '/internal/incoming-message',
      (req, res) => this.WhatsappController.internalIncomingMessage(req, res)
    );
  }
}

export default WhatsappRoute;
