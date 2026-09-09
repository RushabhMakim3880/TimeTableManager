/**
 * Departmental Approvals & Urgent Escalations Router
 * - Academic Head: Approves teacher leaves & academic requests
 * - Admin Head: Approves staff & administrative subordinate requests
 * - Principal: Reviews only high-stakes Urgent Escalations forwarded by Department Heads
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

// Auto-initialize approvals table if not present
db.db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL, -- 'ACADEMIC_LEAVE', 'ADMIN_SUBORDINATE', 'URGENT_ESCALATION'
    department TEXT NOT NULL, -- 'ACADEMIC', 'ADMIN', 'CAMPUS'
    requester_name TEXT NOT NULL,
    requester_role TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT,
    urgency_level TEXT DEFAULT 'NORMAL', -- 'NORMAL', 'URGENT', 'CRITICAL'
    target_approver_role TEXT NOT NULL, -- 'ACADEMIC_HEAD', 'ADMIN_HEAD', 'PRINCIPAL'
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'
    escalation_reason TEXT,
    escalated_by TEXT,
    decision_by TEXT,
    decision_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME
  );
`);

// Seed default initial approval requests if empty
const count = db.get('SELECT COUNT(*) as c FROM approvals');
if (count && count.c === 0) {
  const insert = db.db.prepare(`
    INSERT INTO approvals (category, department, requester_name, requester_role, title, details, urgency_level, target_approver_role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `);

  insert.run(
    'ACADEMIC_LEAVE', 'ACADEMIC', 'Payal Ma\'am', 'Class Teacher (Std 3rd)',
    'Medical Leave (1 Day)', 'Leave for medical check-up on Friday, 12th Sept. Nominated proxy teacher: Nisha Ma\'am.',
    'NORMAL', 'ACADEMIC_HEAD'
  );

  insert.run(
    'ACADEMIC_LEAVE', 'ACADEMIC', 'Kavita Ma\'am', 'Senior Faculty (Maths)',
    'Casual Leave (2 Days)', 'Family function leave on 15th-16th Sept. Syllabus topics pre-recorded.',
    'NORMAL', 'ACADEMIC_HEAD'
  );

  insert.run(
    'ADMIN_SUBORDINATE', 'ADMIN', 'Ramesh Kumar', 'Campus Facilities Supervisor',
    'Store Requisition: Examination Paper Bundles', 'Urgent replenishment of 20 rim paper bundles and printer cartridges for term test prep (₹6,800).',
    'NORMAL', 'ADMIN_HEAD'
  );

  insert.run(
    'URGENT_ESCALATION', 'ACADEMIC', 'Academic Head', 'Academic Head',
    'GSEB District Inspection: Class 8th Science Lab Certification', 'District Education Officer inspection scheduled for next Tuesday. Requires Principal executive approval for urgent safety equipment procurement.',
    'URGENT', 'PRINCIPAL'
  );
}

/**
 * GET /api/approvals/academic
 * Academic Head reviews teacher leaves and academic requests
 */
router.get('/academic', requireAuth, (req, res) => {
  const items = db.query(`
    SELECT * FROM approvals
    WHERE target_approver_role = 'ACADEMIC_HEAD'
       OR (department = 'ACADEMIC' AND status != 'ESCALATED')
    ORDER BY CASE status WHEN 'PENDING' THEN 1 ELSE 2 END, id DESC
  `);
  return res.json({ success: true, approvals: items });
});

/**
 * GET /api/approvals/admin
 * Admin Head reviews subordinate staff and campus logistics requests
 */
router.get('/admin', requireAuth, (req, res) => {
  const items = db.query(`
    SELECT * FROM approvals
    WHERE target_approver_role = 'ADMIN_HEAD'
       OR (department = 'ADMIN' AND status != 'ESCALATED')
    ORDER BY CASE status WHEN 'PENDING' THEN 1 ELSE 2 END, id DESC
  `);
  return res.json({ success: true, approvals: items });
});

/**
 * GET /api/approvals/urgent
 * Principal reviews ONLY urgent escalations forwarded by Academic Head or Admin Head
 */
router.get('/urgent', requireAuth, (req, res) => {
  const items = db.query(`
    SELECT * FROM approvals
    WHERE target_approver_role = 'PRINCIPAL'
       OR status = 'ESCALATED'
       OR urgency_level IN ('URGENT', 'CRITICAL')
    ORDER BY CASE status WHEN 'PENDING' THEN 1 WHEN 'ESCALATED' THEN 1 ELSE 2 END, id DESC
  `);
  return res.json({ success: true, approvals: items });
});

/**
 * POST /api/approvals/:id/decide
 * Department Head or Principal approves or rejects a request
 */
router.post('/:id/decide', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { decision, notes } = req.body; // 'APPROVED' or 'REJECTED'

  if (!decision || !['APPROVED', 'REJECTED'].includes(decision.toUpperCase())) {
    return res.status(400).json({ success: false, message: 'Decision must be APPROVED or REJECTED.' });
  }

  const item = db.get('SELECT * FROM approvals WHERE id = ?', [id]);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Approval item not found.' });
  }

  const decUpper = decision.toUpperCase();
  db.run(`
    UPDATE approvals
    SET status = ?,
        decision_by = ?,
        decision_notes = ?,
        decided_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    decUpper,
    req.user.fullName || req.user.username,
    notes ? notes.trim() : null,
    id
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: `APPROVAL_${decUpper}`,
    resource: 'approvals',
    resourceId: id,
    details: { title: item.title, decision: decUpper, category: item.category }
  });

  return res.json({
    success: true,
    message: `Request #${id} '${item.title}' has been ${decUpper.toLowerCase()} by ${req.user.fullName || req.user.username}.`
  });
});

/**
 * POST /api/approvals/:id/escalate
 * Academic Head or Admin Head forwards an urgent item to the Principal
 */
router.post('/:id/escalate', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, message: 'Escalation reason is required.' });
  }

  const item = db.get('SELECT * FROM approvals WHERE id = ?', [id]);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Approval item not found.' });
  }

  db.run(`
    UPDATE approvals
    SET status = 'ESCALATED',
        urgency_level = 'URGENT',
        target_approver_role = 'PRINCIPAL',
        escalated_by = ?,
        escalation_reason = ?
    WHERE id = ?
  `, [
    req.user.fullName || req.user.username,
    reason.trim(),
    id
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'APPROVAL_ESCALATED_TO_PRINCIPAL',
    resource: 'approvals',
    resourceId: id,
    details: { title: item.title, escalatedBy: req.user.username, reason }
  });

  return res.json({
    success: true,
    message: `Request #${id} escalated urgently to Principal for executive sign-off.`
  });
});

/**
 * POST /api/approvals/urgent-create
 * Directly submit an urgent escalation to the Principal
 */
router.post('/urgent-create', requireAuth, (req, res) => {
  const { title, department, details, reason } = req.body;

  if (!title || !department) {
    return res.status(400).json({ success: false, message: 'Title and department are required.' });
  }

  const result = db.run(`
    INSERT INTO approvals (category, department, requester_name, requester_role, title, details, urgency_level, target_approver_role, status, escalation_reason, escalated_by)
    VALUES ('URGENT_ESCALATION', ?, ?, ?, ?, ?, 'URGENT', 'PRINCIPAL', 'PENDING', ?, ?)
  `, [
    department,
    req.user.fullName || req.user.username,
    req.user.roles[0] || 'Department Head',
    title.trim(),
    details ? details.trim() : null,
    reason ? reason.trim() : 'Urgent executive sign-off requested by Department Head.',
    req.user.fullName || req.user.username
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'URGENT_ESCALATION_CREATED',
    resource: 'approvals',
    resourceId: result.lastInsertRowid,
    details: { title, department }
  });

  return res.json({
    success: true,
    message: 'Urgent escalation sent to Principal.',
    approvalId: result.lastInsertRowid
  });
});

module.exports = router;
