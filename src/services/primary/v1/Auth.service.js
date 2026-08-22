import { UserRepository } from '#repositoriesPrimaryV1';
import { JWTHelper, Sha256Helper } from '#helpers';

class AuthService {
    constructor(server) {
        this.server = server;
        this.UserRepository = new UserRepository(this.server);
        this.JwtHelper = new JWTHelper(this.server);
        this.Sha256Helper = new Sha256Helper(this.server);
    }

    async login(identity, password) {
        const userModelData = await this.UserRepository.getUserDataByIdentity(identity);

        if (userModelData === null) return -1;

        const hashedPassword = this.Sha256Helper.getHash(password, this.server.env.HASH_SALT_PASSWORD);
        if (userModelData.password !== hashedPassword) return -1;
        
        const roles = userModelData.roles ? userModelData.roles.map(r => r.name) : [];
        const permissions = [];
        if (userModelData.roles) {
            for (const role of userModelData.roles) {
                if (role.permissions) {
                    for (const perm of role.permissions) {
                        if (!permissions.includes(perm.name)) {
                            permissions.push(perm.name);
                        }
                    }
                }
            }
        }

        const tokenData = {
            userId: userModelData.id,
            username: userModelData.username,
            name: userModelData.name,
            roles,
            permissions
        };

        const tokens = this.JwtHelper.generateWithRefreshToken(tokenData, this.server.env.JWT_TOKEN_EXPIRED || '7d');

        return {
            user: {
                id: userModelData.id,
                name: userModelData.name,
                username: userModelData.username,
                roles,
                permissions
            },
            ...tokens
        };
    }

    async getMe(userId) {
        const user = await this.UserRepository.getUserById(userId);
        if (!user) return null;

        const roles = user.roles ? user.roles.map(r => r.name) : [];
        const permissions = [];
        if (user.roles) {
            for (const role of user.roles) {
                if (role.permissions) {
                    for (const perm of role.permissions) {
                        if (!permissions.includes(perm.name)) {
                            permissions.push(perm.name);
                        }
                    }
                }
            }
        }

        return {
            id: user.id,
            name: user.name,
            username: user.username,
            roles,
            permissions,
            created_at: user.created_at
        };
    }

    async refreshToken(refreshToken) {
        const validated = await this.JwtHelper.refreshTokenValidation({ tokenId: 'dummy', data: {} }, refreshToken);
        return validated;
    }
}

export default AuthService;