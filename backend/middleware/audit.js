/**
 * Audit Logging Service & Middleware
 * Records immutable system mutations for regulatory compliance and transparency
 */

const db = require('../db/connection');

/**
 * Record an audit log entry
 */
function recordAudit({ userId, username, role, action, resource, resourceId = null, details = null, ipAddress = null }) {
  try {
    const detailsJson = (details && typeof details === 'object') ? JSON.stringify(details) : (details || null);
    db.run(`
      INSERT INTO audit_logs (user_id, username, role, action, resource, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId || null,
      username || 'SYSTEM',
      role || null,
      action,
      resource,
      resourceId ? String(resourceId) : null,
      detailsJson,
      ipAddress || null
    ]);
  } catch (err) {
    console.error('Failed to write audit log entry:', err.message);
  }
}

/**
 * Middleware to automatically audit successful mutations
 */
function auditMiddleware(action, resource) {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
      // Only log on successful responses (2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.user ? req.user.id : null;
        const username = req.user ? req.user.username : (req.body && req.body.username) || 'ANONYMOUS';
        const role = req.user && req.user.roles ? req.user.roles[0] : null;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        let details = null;
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
          // Clone body and remove sensitive fields
          details = { ...req.body };
          delete details.password;
          delete details.currentPassword;
          delete details.newPassword;
        }

        recordAudit({
          userId,
          username,
          role,
          action,
          resource,
          resourceId: req.params.id || null,
          details,
          ipAddress: ip
        });
      }

      return originalSend.apply(res, arguments);
    };

    next();
  };
}

module.exports = {
  recordAudit,
  auditMiddleware
};
