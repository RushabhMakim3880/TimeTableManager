/**
 * Institutional Audit Log Inspection Routes
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

/**
 * GET /api/audit-logs
 * Retrieves immutable institutional audit trails with optional filtering
 */
router.get('/', requireAuth, requirePermission('system.audit.view'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const resource = req.query.resource || null;
  const action = req.query.action || null;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (resource) {
    sql += ' AND resource = ?';
    params.push(resource);
  }
  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const logs = db.query(sql, params);

  const formatted = logs.map(l => {
    let parsedDetails = null;
    try {
      if (l.details) parsedDetails = JSON.parse(l.details);
    } catch (e) {
      parsedDetails = l.details;
    }
    return {
      id: l.id,
      userId: l.user_id,
      username: l.username,
      role: l.role,
      action: l.action,
      resource: l.resource,
      resourceId: l.resource_id,
      details: parsedDetails,
      ipAddress: l.ip_address,
      createdAt: l.created_at
    };
  });

  return res.json({
    success: true,
    count: formatted.length,
    logs: formatted
  });
});

module.exports = router;
