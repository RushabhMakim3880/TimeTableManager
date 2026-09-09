/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces action-level and module-level authorization rules
 */

/**
 * Check if user has a specific granular permission
 * Pattern: requirePermission('academic.timetable.edit')
 */
function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication is required to perform this action.'
      });
    }

    // Principal has supervisory bypass for all operations
    if (req.user.roles.includes('PRINCIPAL')) {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: `Forbidden: You do not have permission '${permissionCode}' to access this resource.`,
        requiredPermission: permissionCode
      });
    }

    next();
  };
}

/**
 * Check if user has at least one of the provided permissions
 */
function requireAnyPermission(...permissionCodes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication is required.'
      });
    }

    if (req.user.roles.includes('PRINCIPAL')) {
      return next();
    }

    const hasAny = permissionCodes.some(p => req.user.permissions && req.user.permissions.includes(p));
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Forbidden: You do not hold any of the required permissions for this action.',
        requiredAny: permissionCodes
      });
    }

    next();
  };
}

/**
 * Check if user holds at least one of the given roles
 * Pattern: requireRole('PRINCIPAL', 'ACADEMIC_HEAD')
 */
function requireRole(...roleCodes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication is required.'
      });
    }

    if (req.user.roles.includes('PRINCIPAL')) {
      return next();
    }

    const hasRole = roleCodes.some(r => req.user.roles && req.user.roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_ROLE',
        message: `Forbidden: This operation requires one of the following roles: ${roleCodes.join(', ')}.`,
        requiredRoles: roleCodes
      });
    }

    next();
  };
}

/**
 * Check if user has access to a specific operational workspace
 * Options: 'ACADEMIC', 'ADMINISTRATION', 'PRINCIPAL'
 */
function requireWorkspace(workspaceName) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Authentication is required.'
      });
    }

    if (req.user.roles.includes('PRINCIPAL')) {
      return next();
    }

    if (!req.user.workspaces || !req.user.workspaces.includes(workspaceName)) {
      return res.status(403).json({
        success: false,
        error: 'WORKSPACE_RESTRICTED',
        message: `Access denied to ${workspaceName} workspace for your current operational role.`
      });
    }

    next();
  };
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireRole,
  requireWorkspace
};
