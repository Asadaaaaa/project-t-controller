import { ResponsePresetHelper } from '#helpers';
import { AuthValidator } from '#validatorsPrimaryV1';
import { AuthService } from '#servicesPrimaryV1';
import Ajv from 'ajv';

class AuthController {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper(this.server);
        this.Ajv = new Ajv();
        this.DataScheme = new AuthValidator();
        this.AuthService = new AuthService(this.server);
    }

    async login(req, res) {
        const schemeValidate = this.Ajv.compile(this.DataScheme.login);
        if (!schemeValidate(req.body)) {
            return res.status(400).json(this.ResponsePreset.resErr(
                400,
                schemeValidate.errors[0].message,
                'validator',
                schemeValidate.errors[0]
            ));
        }

        const { identity, password } = req.body;
        const loginSrv = await this.AuthService.login(identity, password);

        if (loginSrv === -1) {
            return res.status(401).json(this.ResponsePreset.resErr(
                401,
                'Invalid username or password',
                'auth',
                { code: -1 }
            ));
        }

        return res.status(200).json(this.ResponsePreset.resOK('Login successful', loginSrv));
    }

    async getMe(req, res) {
        const userId = req.user.userId || req.user.id;
        const me = await this.AuthService.getMe(userId);

        if (!me) {
            return res.status(404).json(this.ResponsePreset.resErr(
                404,
                'User not found',
                'service',
                null
            ));
        }

        return res.status(200).json(this.ResponsePreset.resOK('OK', me));
    }

    async logout(req, res) {
        return res.status(200).json(this.ResponsePreset.resOK('Logged out successfully', null));
    }

    async refreshToken(req, res) {
        const schemeValidate = this.Ajv.compile(this.DataScheme.refreshToken);
        if (!schemeValidate(req.body)) {
            return res.status(400).json(this.ResponsePreset.resErr(
                400,
                schemeValidate.errors[0].message,
                'validator',
                schemeValidate.errors[0]
            ));
        }

        const { refreshToken } = req.body;
        const refreshSrv = await this.AuthService.refreshToken(refreshToken);

        if (refreshSrv === -1 || refreshSrv === -2 || refreshSrv === -3) {
            return res.status(401).json(this.ResponsePreset.resErr(
                401,
                'Invalid or expired refresh token',
                'token',
                { code: refreshSrv }
            ));
        }

        return res.status(200).json(this.ResponsePreset.resOK('Token refreshed', refreshSrv));
    }
}

export default AuthController;