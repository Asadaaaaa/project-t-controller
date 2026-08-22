import { ResponsePresetHelper } from '#helpers';

class RBAC {
  constructor(server) {
    this.server = server;
    this.ResponsePreset = new ResponsePresetHelper(this.server);
  }

  requirePermission(permissionName) {
    return (req, res, next) => {
      const user = req.user || req.middlewares.authorization;

      if (!user) {
        return res.status(401).json(this.ResponsePreset.resErr(
          401,
          'Unauthorized: Not authenticated',
          'auth',
          { code: -1 }
        ));
      }

      // Admin has full access
      if (user.roles && user.roles.includes('admin')) {
        return next();
      }

      // Check specific permission
      if (user.permissions && user.permissions.includes(permissionName)) {
        return next();
      }

      return res.status(403).json(this.ResponsePreset.resErr(
        403,
        `Forbidden: Missing required permission "${permissionName}"`,
        'rbac',
        { requiredPermission: permissionName }
      ));
    };
  }

  requireRole(roleName) {
    return (req, res, next) => {
      const user = req.user || req.middlewares.authorization;

      if (!user) {
        return res.status(401).json(this.ResponsePreset.resErr(
          401,
          'Unauthorized: Not authenticated',
          'auth',
          { code: -1 }
        ));
      }

      if (user.roles && (user.roles.includes('admin') || user.roles.includes(roleName))) {
        return next();
      }

      return res.status(403).json(this.ResponsePreset.resErr(
        403,
        `Forbidden: Missing required role "${roleName}"`,
        'rbac',
        { requiredRole: roleName }
      ));
    };
  }
}

export default RBAC;
