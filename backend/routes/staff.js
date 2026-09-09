/**
 * Staff HR Directory Routes
 * Staff profiles, employment details, qualifications, and shift allocations
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
 * GET /api/staff
 * Returns list of all staff profiles with their linked system account details
 */
router.get('/', requireAuth, requirePermission('admin.staff.view'), (req, res) => {
  const staffList = db.query(`
    SELECT sp.id, sp.user_id, sp.employee_code, sp.first_name, sp.last_name,
           sp.gender, sp.designation, sp.department, sp.qualification,
           sp.date_of_joining, sp.phone, sp.email, sp.blood_group,
           sp.primary_subject, sp.assigned_shift, sp.is_active,
           u.username, u.user_type, u.avatar
    FROM staff_profiles sp
    LEFT JOIN users u ON u.id = sp.user_id
    ORDER BY sp.employee_code ASC
  `);

  return res.json({
    success: true,
    count: staffList.length,
    staff: staffList.map(s => ({
      ...s,
      fullName: `${s.first_name} ${s.last_name}`.trim(),
      isActive: Boolean(s.is_active)
    }))
  });
});

/**
 * GET /api/staff/:id
 * Returns a single staff profile
 */
router.get('/:id', requireAuth, requirePermission('admin.staff.view'), (req, res) => {
  const staffId = parseInt(req.params.id, 10);
  const staff = db.get(`
    SELECT sp.*, u.username, u.user_type, u.avatar
    FROM staff_profiles sp
    LEFT JOIN users u ON u.id = sp.user_id
    WHERE sp.id = ?
  `, [staffId]);

  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found.' });
  }

  return res.json({
    success: true,
    staff: {
      ...staff,
      fullName: `${staff.first_name} ${staff.last_name}`.trim(),
      isActive: Boolean(staff.is_active)
    }
  });
});

/**
 * POST /api/staff
 * Create a new staff member profile and associated user account
 */
router.post('/', requireAuth, requirePermission('admin.staff.create'), (req, res) => {
  const {
    employeeCode, firstName, lastName, gender, designation, department,
    qualification, dateOfJoining, phone, email, bloodGroup, primarySubject,
    assignedShift, createUserAccount, username, password, roleCode
  } = req.body;

  if (!firstName || !designation || !department) {
    return res.status(400).json({
      success: false,
      message: 'First name, designation, and department are required.'
    });
  }

  // Generate employee code if not provided
  let empCode = employeeCode ? employeeCode.trim() : null;
  if (!empCode) {
    const lastStaff = db.get('SELECT id FROM staff_profiles ORDER BY id DESC LIMIT 1');
    const nextNum = (lastStaff ? lastStaff.id : 0) + 1;
    empCode = `EMP-${String(nextNum + 100).padStart(3, '0')}`;
  }

  // Verify unique empCode
  const existing = db.get('SELECT id FROM staff_profiles WHERE employee_code = ?', [empCode]);
  if (existing) {
    return res.status(400).json({ success: false, message: `Employee code '${empCode}' already exists.` });
  }

  let createdUserId = null;
  if (createUserAccount && username && password) {
    const userExist = db.get('SELECT id FROM users WHERE LOWER(username) = ?', [username.trim().toLowerCase()]);
    if (userExist) {
      return res.status(400).json({ success: false, message: `Username '${username}' is already taken.` });
    }

    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    const userResult = db.run(`
      INSERT INTO users (username, email, password_hash, full_name, user_type, avatar, is_active, must_change_password)
      VALUES (?, ?, ?, ?, ?, '👤', 1, 1)
    `, [
      username.trim(),
      email ? email.trim() : null,
      hash,
      `${firstName} ${lastName || ''}`.trim(),
      'TEACHER'
    ]);
    createdUserId = userResult.lastInsertRowid;

    // Map role
    const role = db.get('SELECT id FROM roles WHERE code = ?', [roleCode || 'TEACHER']);
    if (role) {
      db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [createdUserId, role.id]);
    }
  }

  const result = db.run(`
    INSERT INTO staff_profiles (
      user_id, employee_code, first_name, last_name, gender, designation, department,
      qualification, date_of_joining, phone, email, blood_group, primary_subject, assigned_shift, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    createdUserId,
    empCode,
    firstName.trim(),
    lastName ? lastName.trim() : '',
    gender || 'Female',
    designation.trim(),
    department.trim(),
    qualification ? qualification.trim() : null,
    dateOfJoining || null,
    phone ? phone.trim() : null,
    email ? email.trim() : null,
    bloodGroup || null,
    primarySubject || null,
    assignedShift || 'afternoon'
  ]);

  const newStaffId = result.lastInsertRowid;

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STAFF_CREATE',
    resource: 'staff_profiles',
    resourceId: newStaffId,
    details: { empCode, name: `${firstName} ${lastName || ''}`, designation, department }
  });

  return res.status(201).json({
    success: true,
    message: `Staff member ${firstName} ${lastName || ''} added successfully.`,
    staffId: newStaffId,
    employeeCode: empCode
  });
});

/**
 * PUT /api/staff/:id
 * Update staff profile
 */
router.put('/:id', requireAuth, requirePermission('admin.staff.edit'), (req, res) => {
  const staffId = parseInt(req.params.id, 10);
  const {
    firstName, lastName, designation, department, qualification,
    phone, email, bloodGroup, primarySubject, assignedShift, isActive
  } = req.body;

  const staff = db.get('SELECT * FROM staff_profiles WHERE id = ?', [staffId]);
  if (!staff) {
    return res.status(404).json({ success: false, message: 'Staff member not found.' });
  }

  db.run(`
    UPDATE staff_profiles
    SET first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        designation = COALESCE(?, designation),
        department = COALESCE(?, department),
        qualification = COALESCE(?, qualification),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        blood_group = COALESCE(?, blood_group),
        primary_subject = COALESCE(?, primary_subject),
        assigned_shift = COALESCE(?, assigned_shift),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    firstName ? firstName.trim() : null,
    lastName ? lastName.trim() : null,
    designation ? designation.trim() : null,
    department ? department.trim() : null,
    qualification ? qualification.trim() : null,
    phone ? phone.trim() : null,
    email ? email.trim() : null,
    bloodGroup || null,
    primarySubject || null,
    assignedShift || null,
    typeof isActive === 'boolean' ? (isActive ? 1 : 0) : null,
    staffId
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STAFF_UPDATE',
    resource: 'staff_profiles',
    resourceId: staffId,
    details: { designation, department, phone }
  });

  return res.json({
    success: true,
    message: 'Staff profile updated successfully.'
  });
});

module.exports = router;
