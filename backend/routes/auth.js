/**
 * Authentication Routes
 * Handles institutional sign in, session verification, logout, and password change
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { generateToken, getUserProfileWithPermissions, requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * POST /api/auth/login
 * Institutional sign-in supporting username, email, or teacher name
 */
router.post('/login', (req, res) => {
  const identifier = req.body.usernameOrEmail || req.body.username || req.body.email;
  const { password, rememberMe } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'CREDENTIALS_REQUIRED',
      message: 'Please provide your institutional username/email and password.'
    });
  }

  const queryIdentifier = identifier.trim().toLowerCase();

  // Look up user by username or email
  let user = db.get(`
    SELECT * FROM users
    WHERE (LOWER(username) = ? OR LOWER(email) = ?) AND is_active = 1
  `, [queryIdentifier, queryIdentifier]);

  // If not found directly, check by first name, clean full name, or email prefix
  if (!user) {
    const cleanInput = queryIdentifier.replace(/[^a-z0-9]/g, '');
    user = db.get(`
      SELECT * FROM users
      WHERE (
        LOWER(username) = ?
        OR LOWER(email) = ?
        OR LOWER(full_name) LIKE ?
      ) AND is_active = 1
    `, [cleanInput, `${cleanInput}@funland.edu`, `${cleanInput}%`]);
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid institutional identifier or password. Please verify your credentials.'
    });
  }

  // Validate bcrypt hash
  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Invalid institutional identifier or password. Please verify your credentials.'
    });
  }

  // Generate JWT token
  const token = generateToken(user);
  const userProfile = getUserProfileWithPermissions(user.id);

  // Set HttpOnly cookie
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
  };
  res.cookie('token', token, cookieOptions);

  // Record audit
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  recordAudit({
    userId: user.id,
    username: user.username,
    role: userProfile.roles[0] || user.user_type,
    action: 'AUTH_LOGIN',
    resource: 'auth',
    details: { userType: user.user_type, fullName: user.full_name },
    ipAddress: ip
  });

  return res.json({
    success: true,
    message: `Welcome, ${user.full_name}!`,
    user: userProfile,
    token
  });
});

/**
 * POST /api/auth/logout
 * Clears institutional session
 */
router.post('/logout', (req, res) => {
  if (req.user) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    recordAudit({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.roles[0],
      action: 'AUTH_LOGOUT',
      resource: 'auth',
      ipAddress: ip
    });
  }

  res.clearCookie('token');
  return res.json({
    success: true,
    message: 'Signed out successfully.'
  });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile, roles, and permissions
 */
router.get('/me', requireAuth, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Current password and new password are required.'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'WEAK_PASSWORD',
      message: 'New password must be at least 6 characters long.'
    });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      error: 'PASSWORD_MISMATCH',
      message: 'New password and confirmation do not match.'
    });
  }

  // Verify current password against database
  const userRecord = db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!userRecord) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const isCurrentValid = bcrypt.compareSync(currentPassword, userRecord.password_hash);
  if (!isCurrentValid) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_CURRENT_PASSWORD',
      message: 'The current password you entered is incorrect.'
    });
  }

  // Hash new password and update
  const newHash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  db.run(`
    UPDATE users
    SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [newHash, req.user.id]);

  // Record audit
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'PASSWORD_CHANGE',
    resource: 'users',
    resourceId: req.user.id,
    ipAddress: ip
  });

  return res.json({
    success: true,
    message: 'Your password has been successfully updated.'
  });
});

module.exports = router;
