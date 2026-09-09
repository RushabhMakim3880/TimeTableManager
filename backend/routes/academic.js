/**
 * Academic Master Routes
 * Standards, Sections, Class Teachers, and Subjects Catalog
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

/**
 * GET /api/academic/standards
 * Returns list of standards, associated sections, room numbers, and class teachers
 */
router.get('/standards', requireAuth, (req, res) => {
  const standards = db.query(`
    SELECT s.id, s.code, s.name, s.shift, s.room_number, s.display_order, s.capacity, s.is_active
    FROM standards s
    WHERE s.is_active = 1
    ORDER BY s.display_order ASC
  `);

  const sections = db.query(`
    SELECT sec.id, sec.standard_id, sec.name, sec.room_number, sec.capacity,
           u.id as class_teacher_id, u.full_name as class_teacher_name, u.email as class_teacher_email
    FROM sections sec
    LEFT JOIN users u ON u.id = sec.class_teacher_id
    WHERE sec.is_active = 1
    ORDER BY sec.name ASC
  `);

  const sectionsByStandard = {};
  sections.forEach(sec => {
    if (!sectionsByStandard[sec.standard_id]) sectionsByStandard[sec.standard_id] = [];
    sectionsByStandard[sec.standard_id].push({
      id: sec.id,
      name: sec.name,
      roomNumber: sec.room_number,
      capacity: sec.capacity,
      classTeacher: sec.class_teacher_id ? {
        id: sec.class_teacher_id,
        name: sec.class_teacher_name,
        email: sec.class_teacher_email
      } : null
    });
  });

  const enrichedStandards = standards.map(std => ({
    ...std,
    isActive: Boolean(std.is_active),
    sections: sectionsByStandard[std.id] || []
  }));

  return res.json({
    success: true,
    standards: enrichedStandards
  });
});

/**
 * POST /api/academic/standards
 * Create a new standard / division
 */
router.post('/standards', requireAuth, requirePermission('academic.classes.manage'), (req, res) => {
  const { code, name, shift, roomNumber, displayOrder, capacity } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Standard code and name are required.' });
  }

  const existing = db.get('SELECT id FROM standards WHERE code = ?', [code.trim()]);
  if (existing) {
    return res.status(400).json({ success: false, message: `Standard '${code}' already exists.` });
  }

  const result = db.run(`
    INSERT INTO standards (code, name, shift, room_number, display_order, capacity)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    code.trim(),
    name.trim(),
    shift || 'afternoon',
    roomNumber || null,
    displayOrder || 99,
    capacity || 45
  ]);

  const stdId = result.lastInsertRowid;
  // Automatically create Section A
  db.run('INSERT INTO sections (standard_id, name, room_number, capacity) VALUES (?, ?, ?, ?)', [
    stdId, 'A', roomNumber || null, capacity || 45
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STANDARD_CREATE',
    resource: 'standards',
    resourceId: stdId,
    details: { code, name, shift }
  });

  return res.status(201).json({
    success: true,
    message: `Standard ${name} created successfully.`,
    standardId: stdId
  });
});

/**
 * GET /api/academic/subjects
 * Returns curriculum subjects master catalog
 */
router.get('/subjects', requireAuth, (req, res) => {
  const subjects = db.query(`
    SELECT id, code, name, category, color, weekly_quota, is_active, created_at
    FROM subjects
    ORDER BY id ASC
  `);

  return res.json({
    success: true,
    subjects: subjects.map(s => ({
      ...s,
      isActive: Boolean(s.is_active)
    }))
  });
});

/**
 * POST /api/academic/subjects
 * Create new subject
 */
router.post('/subjects', requireAuth, requirePermission('academic.subjects.manage'), (req, res) => {
  const { code, name, category, color, weeklyQuota } = req.body;

  if (!code || !name) {
    return res.status(400).json({ success: false, message: 'Subject code and name are required.' });
  }

  const existing = db.get('SELECT id FROM subjects WHERE code = ?', [code.trim().toUpperCase()]);
  if (existing) {
    return res.status(400).json({ success: false, message: `Subject code '${code}' already exists.` });
  }

  const result = db.run(`
    INSERT INTO subjects (code, name, category, color, weekly_quota)
    VALUES (?, ?, ?, ?, ?)
  `, [
    code.trim().toUpperCase(),
    name.trim(),
    category || 'Core',
    color || '#3b82f6',
    weeklyQuota || 5
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'SUBJECT_CREATE',
    resource: 'subjects',
    resourceId: result.lastInsertRowid,
    details: { code, name, category }
  });

  return res.status(201).json({
    success: true,
    message: `Subject '${name}' added to catalog.`,
    subjectId: result.lastInsertRowid
  });
});

module.exports = router;
