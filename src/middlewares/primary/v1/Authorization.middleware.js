import { ResponsePresetHelper } from '#helpers';
import JWT from "jsonwebtoken";

class Authorization {
    constructor(server) {
        this.server = server;
        this.ResponsePreset = new ResponsePresetHelper(this.server);
    }

    check() {
        return (req, res, next) => {
            let token = req.headers['authorization'] || req.query.token;

            if (token && token.startsWith('Bearer ')) {
                token = token.slice(7).trim();
            }

            if (!token || token === 'undefined' || token === 'null') {
                return res.status(401).json(this.ResponsePreset.resErr(
                    401,
                    'Unauthorized: Token is missing',
                    'token',
                    { code: -1 }
                ));
            }

            JWT.verify(token, this.server.env.JWT_TOKEN_SECRET, (err, data) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return res.status(401).json(this.ResponsePreset.resErr(
                            401,
                            'Unauthorized: Token has expired',
                            'token',
                            { code: -3 }
                        ));
                    }
                    return res.status(401).json(this.ResponsePreset.resErr(
                        401,
                        'Unauthorized: Invalid token',
                        'token',
                        { code: -2 }
                    ));
                }

                // data is { tokenId, data: { userId, username, name, roles, permissions } } or { userId, ... }
                const userPayload = data.data || data;
                req.user = userPayload;
                req.middlewares.authorization = userPayload;

                return next();
            });
        };
    }
}

export default Authorization;