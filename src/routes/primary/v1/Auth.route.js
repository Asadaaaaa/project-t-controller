import { AuthController } from '#controllersPrimaryV1';
import { Authorization } from '#middlewaresPrimaryV1';

class AuthRoute {
    constructor(server, endpointPrefix) {
        this.server = server;
        this.API = server.API;

        this.endpointPrefix = endpointPrefix + '/auth';
        this.Authorization = new Authorization(this.server);
        this.AuthController = new AuthController(this.server);

        this.routes();
    }

    routes() {
        this.API.post(this.endpointPrefix + '/login', (req, res) => this.AuthController.login(req, res));
        this.API.post(this.endpointPrefix + '/logout', (req, res) => this.AuthController.logout(req, res));
        this.API.post(this.endpointPrefix + '/refresh-token', (req, res) => this.AuthController.refreshToken(req, res));
        this.API.get(this.endpointPrefix + '/me', this.Authorization.check(), (req, res) => this.AuthController.getMe(req, res));
    }
}

export default AuthRoute;