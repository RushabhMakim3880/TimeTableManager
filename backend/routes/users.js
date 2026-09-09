/**
 * User Management Routes
 * Enforces role-based access for viewing, creating, and updating institutional accounts
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * GET /api/users
 * Returns list of system users and their assigned roles
 */
router.get('/', requireAuth, requirePermission('system.users.view'), (req, res) => {
  const users = db.query(`
    SELECT u.id, u.username, u.email, u.full_name, u.user_type, u.teacher_code, u.avatar, u.is_active, u.created_at
    FROM users u
    ORDER BY u.id ASC
  `);

  // Fetch roles for each user
  const userRolesList = db.query(`
    SELECT ur.user_id, r.code, r.name, r.workspace
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
  `);

  const rolesByUser = {};
  userRolesList.forEach(item => {
    if (!rolesByUser[item.user_id]) rolesByUser[item.user_id] = [];
    rolesByUser[item.user_id].push({
      code: item.code,
      name: item.name,
      workspace: item.workspace
    });
  });

  const enrichedUsers = users.map(u => ({
    ...u,
    isActive: Boolean(u.is_active),
    roles: rolesByUser[u.id] || []
  }));

  return res.json({
    success: true,
    users: enrichedUsers
  });
});

/**
 * POST /api/users
 * Creates a new user account with role assignment
 */
router.post('/', requireAuth, requirePermission('system.users.manage'), (req, res) => {
  const { username, email, password, fullName, userType, roleCode, teacherCode, avatar } = req.body;

  if (!username || !password || !fullName || !roleCode) {
    return res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'Username, password, full name, and role are required.'
    });
  }

  // Check unique username
  const existing = db.get('SELECT id FROM users WHERE LOWER(username) = ?', [username.trim().toLowerCase()]);
  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'USERNAME_TAKEN',
      message: `The username '${username}' is already in use.`
    });
  }

  const role = db.get('SELECT id, code, workspace FROM roles WHERE code = ?', [roleCode]);
  if (!role) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_ROLE',
      message: `Role '${roleCode}' does not exist.`
    });
  }

  const hash = bcrypt.hashSync(password, SALT_ROUNDS);
  const result = db.run(`
    INSERT INTO users (username, email, password_hash, full_name, user_type, teacher_code, avatar, is_active, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
  `, [
    username.trim(),
    email ? email.trim() : null,
    hash,
    fullName.trim(),
    userType || 'STAFF',
    teacherCode || null,
    avatar || '👤'
  ]);

  const newUserId = result.lastInsertRowid;

  // Map user to role
  db.run(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES (?, ?)
  `, [newUserId, role.id]);

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'USER_CREATE',
    resource: 'users',
    resourceId: newUserId,
    details: { username, fullName, roleCode },
    ipAddress: ip
  });

  return res.status(201).json({
    success: true,
    message: `Account for ${fullName} created successfully.`,
    userId: newUserId
  });
});

/**
 * PUT /api/users/:id
 * Updates an existing user account or toggles active status
 */
router.put('/:id', requireAuth, requirePermission('system.users.manage'), (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  const { fullName, email, userType, roleCode, isActive, newPassword } = req.body;

  const targetUser = db.get('SELECT * FROM users WHERE id = ?', [targetId]);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Update basic fields
  db.run(`
    UPDATE users
    SET full_name = COALESCE(?, full_name),
        email = COALESCE(?, email),
        user_type = COALESCE(?, user_type),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    fullName ? fullName.trim() : null,
    email ? email.trim() : null,
    userType || null,
    typeof isActive === 'boolean' ? (isActive ? 1 : 0) : null,
    targetId
  ]);

  // If password provided, update it
  if (newPassword && newPassword.length >= 6) {
    const hash = bcrypt.hashSync(newPassword, SALT_ROUNDS);
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, targetId]);
  }

  // If role updated
  if (roleCode) {
    const role = db.get('SELECT id FROM roles WHERE code = ?', [roleCode]);
    if (role) {
      db.run('DELETE FROM user_roles WHERE user_id = ?', [targetId]);
      db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [targetId, role.id]);
    }
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'USER_UPDATE',
    resource: 'users',
    resourceId: targetId,
    details: { fullName, roleCode, isActive },
    ipAddress: ip
  });

  return res.json({
    success: true,
    message: 'User account updated successfully.'
  });
});

module.exports = router;
