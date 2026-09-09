/**
 * Roles & Permissions Inspection Routes
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/roles
 * Lists all system roles and their assigned permissions
 */
router.get('/', requireAuth, (req, res) => {
  const roles = db.query(`
    SELECT id, code, name, workspace, description, is_system
    FROM roles
    ORDER BY id ASC
  `);

  const rolePerms = db.query(`
    SELECT rp.role_id, p.code, p.domain, p.module, p.action, p.description
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
  `);

  const permsByRole = {};
  rolePerms.forEach(item => {
    if (!permsByRole[item.role_id]) permsByRole[item.role_id] = [];
    permsByRole[item.role_id].push({
      code: item.code,
      domain: item.domain,
      module: item.module,
      action: item.action,
      description: item.description
    });
  });

  const enrichedRoles = roles.map(r => ({
    ...r,
    isSystem: Boolean(r.is_system),
    permissions: permsByRole[r.id] || []
  }));

  return res.json({
    success: true,
    roles: enrichedRoles
  });
});

/**
 * GET /api/permissions
 * Lists all granular permissions grouped by operational domain
 */
router.get('/permissions', requireAuth, (req, res) => {
  const perms = db.query(`
    SELECT id, code, domain, module, action, description
    FROM permissions
    ORDER BY domain ASC, module ASC, action ASC
  `);

  const grouped = {};
  perms.forEach(p => {
    if (!grouped[p.domain]) grouped[p.domain] = [];
    grouped[p.domain].push(p);
  });

  return res.json({
    success: true,
    total: perms.length,
    permissionsByDomain: grouped
  });
});

module.exports = router;
