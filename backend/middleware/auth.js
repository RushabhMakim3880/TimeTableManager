/**
 * Authentication Middleware
 * Validates JWT tokens from HttpOnly cookies or Authorization Bearer header
 */

const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'funland_erp_enterprise_jwt_secret_2026';
const JWT_EXPIRES_IN = '7d';

/**
 * Generate signed JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      userType: user.user_type
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Fetch complete user profile including roles, permissions, and workspaces
 */
function getUserProfileWithPermissions(userId) {
  const user = db.get(`
    SELECT id, username, email, full_name, user_type, teacher_code, avatar, must_change_password, is_active
    FROM users
    WHERE id = ? AND is_active = 1
  `, [userId]);

  if (!user) return null;

  // Fetch roles
  const roles = db.query(`
    SELECT r.id, r.code, r.name, r.workspace
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ?
  `, [userId]);

  const roleCodes = roles.map(r => r.code);

  // Determine workspaces
  const workspacesSet = new Set();
  roles.forEach(r => {
    if (r.code === 'PRINCIPAL') {
      workspacesSet.add('PRINCIPAL');
      workspacesSet.add('ACADEMIC');
      workspacesSet.add('ADMINISTRATION');
    } else {
      workspacesSet.add(r.workspace);
    }
  });

  // Fetch permissions
  const permissions = db.query(`
    SELECT DISTINCT p.code
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = ?
  `, [userId]);

  const permissionCodes = permissions.map(p => p.code);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    userType: user.user_type,
    teacherCode: user.teacher_code,
    avatar: user.avatar,
    mustChangePassword: Boolean(user.must_change_password),
    roles: roleCodes,
    workspaces: Array.from(workspacesSet),
    permissions: permissionCodes
  };
}

/**
 * Strict authentication middleware - blocks unauthenticated requests
 */
function requireAuth(req, res, next) {
  let token = null;

  // 1. Check HttpOnly Cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Access denied. Please log in with institutional credentials.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userProfile = getUserProfileWithPermissions(decoded.id);

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        error: 'ACCOUNT_DISABLED',
        message: 'Account not found or has been deactivated by administration.'
      });
    }

    req.user = userProfile;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Session expired or token invalid. Please log in again.'
    });
  }
}

/**
 * Optional authentication middleware - attaches req.user if token is present
 */
function optionalAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = getUserProfileWithPermissions(decoded.id);
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  getUserProfileWithPermissions,
  requireAuth,
  optionalAuth
};
