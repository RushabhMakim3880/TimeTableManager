/**
 * Student Admissions & General Register (GR) Routes
 * Student enrollment, GR allocation, parent profiles, and document verification
 */

const express = require('express');
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

/**
 * GET /api/students/next-gr
 * Generates the next sequential General Register (GR) and Admission Number
 */
router.get('/next-gr', requireAuth, (req, res) => {
  const currentYear = new Date().getFullYear();
  const lastStudent = db.get('SELECT id, gr_number FROM students ORDER BY id DESC LIMIT 1');
  let nextSeq = 1;

  if (lastStudent && lastStudent.gr_number) {
    const match = lastStudent.gr_number.match(/(\d+)$/);
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  const nextGr = `GR-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  const nextAdm = `ADM-${currentYear}-${String(nextSeq).padStart(3, '0')}`;

  return res.json({
    success: true,
    nextGrNumber: nextGr,
    nextAdmissionNumber: nextAdm
  });
});

/**
 * GET /api/students/stats
 * Institutional student enrollment statistics
 */
router.get('/stats', requireAuth, (req, res) => {
  const totalStudents = db.get("SELECT COUNT(*) as count FROM students WHERE status = 'ACTIVE'");
  const boysCount = db.get("SELECT COUNT(*) as count FROM students WHERE status = 'ACTIVE' AND gender = 'Male'");
  const girlsCount = db.get("SELECT COUNT(*) as count FROM students WHERE status = 'ACTIVE' AND gender = 'Female'");

  const standardBreakdown = db.query(`
    SELECT s.name as standard_name, s.code, COUNT(st.id) as student_count
    FROM standards s
    LEFT JOIN students st ON st.standard_id = s.id AND st.status = 'ACTIVE'
    GROUP BY s.id
    ORDER BY s.display_order ASC
  `);

  return res.json({
    success: true,
    total: totalStudents ? totalStudents.count : 0,
    boys: boysCount ? boysCount.count : 0,
    girls: girlsCount ? girlsCount.count : 0,
    standardBreakdown
  });
});

/**
 * GET /api/students
 * Filtered student general register listing
 */
router.get('/', requireAuth, requirePermission('admin.students.view'), (req, res) => {
  const { standardId, sectionId, status, search } = req.query;

  let query = `
    SELECT st.id, st.gr_number, st.admission_no, st.roll_no, st.first_name, st.middle_name, st.last_name,
           st.gender, st.dob, st.blood_group, st.category, st.admission_date, st.status,
           st.emergency_phone, st.address,
           std.id as standard_id, std.name as standard_name, std.code as standard_code,
           sec.id as section_id, sec.name as section_name,
           p.father_name, p.mother_name, p.primary_phone, p.occupation
    FROM students st
    JOIN standards std ON std.id = st.standard_id
    LEFT JOIN sections sec ON sec.id = st.section_id
    LEFT JOIN student_parents sp ON sp.student_id = st.id AND sp.is_primary = 1
    LEFT JOIN parents p ON p.id = sp.parent_id
    WHERE 1=1
  `;
  const params = [];

  if (standardId) {
    query += ' AND st.standard_id = ?';
    params.push(parseInt(standardId, 10));
  }

  if (sectionId) {
    query += ' AND st.section_id = ?';
    params.push(parseInt(sectionId, 10));
  }

  if (status) {
    query += ' AND st.status = ?';
    params.push(status);
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query += ` AND (
      LOWER(st.first_name) LIKE ? OR
      LOWER(st.last_name) LIKE ? OR
      LOWER(st.gr_number) LIKE ? OR
      LOWER(st.admission_no) LIKE ? OR
      LOWER(p.father_name) LIKE ? OR
      p.primary_phone LIKE ?
    )`;
    params.push(term, term, term, term, term, term);
  }

  query += ' ORDER BY st.standard_id ASC, st.roll_no ASC, st.first_name ASC';

  const students = db.query(query, params);

  return res.json({
    success: true,
    count: students.length,
    students: students.map(s => ({
      ...s,
      fullName: `${s.first_name} ${s.last_name}`.trim(),
      parentName: s.father_name || s.mother_name || 'Guardian'
    }))
  });
});

/**
 * GET /api/students/:id
 * Detailed student record with parents and documents
 */
router.get('/:id', requireAuth, requirePermission('admin.students.view'), (req, res) => {
  const studentId = parseInt(req.params.id, 10);

  const student = db.get(`
    SELECT st.*, std.name as standard_name, sec.name as section_name
    FROM students st
    JOIN standards std ON std.id = st.standard_id
    LEFT JOIN sections sec ON sec.id = st.section_id
    WHERE st.id = ?
  `, [studentId]);

  if (!student) {
    return res.status(404).json({ success: false, message: 'Student not found.' });
  }

  // Fetch parents
  const parents = db.query(`
    SELECT p.*, sp.relationship, sp.is_primary
    FROM parents p
    JOIN student_parents sp ON sp.parent_id = p.id
    WHERE sp.student_id = ?
  `, [studentId]);

  // Fetch documents
  const documents = db.query(`
    SELECT id, document_type, document_name, file_url, verification_status, uploaded_at
    FROM student_documents
    WHERE student_id = ?
  `, [studentId]);

  return res.json({
    success: true,
    student: {
      ...student,
      fullName: `${student.first_name} ${student.last_name}`.trim(),
      parents,
      documents
    }
  });
});

/**
 * POST /api/students/admit
 * Complete Admission & General Register (GR) Registration
 */
router.post('/admit', requireAuth, requirePermission('admin.students.create'), (req, res) => {
  const {
    grNumber, admissionNo, rollNo, firstName, middleName, lastName, gender,
    dob, bloodGroup, category, standardId, sectionId, admissionDate,
    fatherName, motherName, primaryPhone, occupation, annualIncome,
    address, verifiedDocuments
  } = req.body;

  if (!firstName || !lastName || !gender || !standardId || !primaryPhone) {
    return res.status(400).json({
      success: false,
      message: 'First name, last name, gender, standard, and parent primary phone are required.'
    });
  }

  // Auto-allocate GR if not provided
  let gr = grNumber ? grNumber.trim() : null;
  let adm = admissionNo ? admissionNo.trim() : null;
  const currentYear = new Date().getFullYear();

  if (!gr) {
    const lastStudent = db.get('SELECT id FROM students ORDER BY id DESC LIMIT 1');
    const nextSeq = (lastStudent ? lastStudent.id : 0) + 1;
    gr = `GR-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  }

  if (!adm) {
    const lastStudent = db.get('SELECT id FROM students ORDER BY id DESC LIMIT 1');
    const nextSeq = (lastStudent ? lastStudent.id : 0) + 1;
    adm = `ADM-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
  }

  // Check unique GR Number
  const existingGr = db.get('SELECT id FROM students WHERE gr_number = ?', [gr]);
  if (existingGr) {
    return res.status(400).json({ success: false, message: `GR Number '${gr}' is already registered.` });
  }

  // If roll number not provided, auto-assign next roll number for that standard/section
  let roll = rollNo ? parseInt(rollNo, 10) : null;
  if (!roll) {
    const lastRoll = db.get('SELECT MAX(roll_no) as max_roll FROM students WHERE standard_id = ?', [parseInt(standardId, 10)]);
    roll = (lastRoll && lastRoll.max_roll ? lastRoll.max_roll : 0) + 1;
  }

  // Insert Student Record
  const result = db.run(`
    INSERT INTO students (
      gr_number, admission_no, roll_no, first_name, middle_name, last_name, gender,
      dob, blood_group, category, standard_id, section_id, admission_date, status,
      emergency_phone, address
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `, [
    gr,
    adm,
    roll,
    firstName.trim(),
    middleName ? middleName.trim() : null,
    lastName.trim(),
    gender,
    dob || null,
    bloodGroup || null,
    category || 'General',
    parseInt(standardId, 10),
    sectionId ? parseInt(sectionId, 10) : null,
    admissionDate || new Date().toISOString().split('T')[0],
    primaryPhone.trim(),
    address ? address.trim() : null
  ]);

  const newStudentId = result.lastInsertRowid;

  // Insert or reuse parent
  const parentResult = db.run(`
    INSERT INTO parents (father_name, mother_name, primary_phone, occupation, annual_income, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    fatherName ? fatherName.trim() : null,
    motherName ? motherName.trim() : null,
    primaryPhone.trim(),
    occupation ? occupation.trim() : null,
    annualIncome ? annualIncome.trim() : null,
    address ? address.trim() : null
  ]);

  const newParentId = parentResult.lastInsertRowid;
  db.run("INSERT INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, 'PARENTS', 1)", [
    newStudentId, newParentId
  ]);

  // Insert verified documents if supplied
  if (Array.isArray(verifiedDocuments)) {
    const insertDoc = db.db.prepare(`
      INSERT INTO student_documents (student_id, document_type, document_name, verification_status, verified_by)
      VALUES (?, ?, ?, 'VERIFIED', ?)
    `);

    verifiedDocuments.forEach(docType => {
      insertDoc.run(newStudentId, docType, `${docType}_${gr}.pdf`, req.user.id);
    });
  }

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STUDENT_ADMISSION',
    resource: 'students',
    resourceId: newStudentId,
    details: { grNumber: gr, name: `${firstName} ${lastName}`, standardId, rollNo: roll }
  });

  return res.status(201).json({
    success: true,
    message: `Student ${firstName} ${lastName} successfully admitted with GR No: ${gr}.`,
    studentId: newStudentId,
    grNumber: gr,
    admissionNo: adm,
    rollNo: roll
  });
});

/**
 * PUT /api/students/:id
 * Update student profile
 */
router.put('/:id', requireAuth, requirePermission('admin.students.edit'), (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const {
    firstName, lastName, rollNo, gender, dob, bloodGroup,
    category, standardId, sectionId, status, emergencyPhone, address
  } = req.body;

  const student = db.get('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student record not found.' });
  }

  db.run(`
    UPDATE students
    SET first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        roll_no = COALESCE(?, roll_no),
        gender = COALESCE(?, gender),
        dob = COALESCE(?, dob),
        blood_group = COALESCE(?, blood_group),
        category = COALESCE(?, category),
        standard_id = COALESCE(?, standard_id),
        section_id = COALESCE(?, section_id),
        status = COALESCE(?, status),
        emergency_phone = COALESCE(?, emergency_phone),
        address = COALESCE(?, address),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    firstName ? firstName.trim() : null,
    lastName ? lastName.trim() : null,
    rollNo ? parseInt(rollNo, 10) : null,
    gender || null,
    dob || null,
    bloodGroup || null,
    category || null,
    standardId ? parseInt(standardId, 10) : null,
    sectionId ? parseInt(sectionId, 10) : null,
    status || null,
    emergencyPhone ? emergencyPhone.trim() : null,
    address ? address.trim() : null,
    studentId
  ]);

  // Update linked primary parent if parent fields are provided
  const { fatherName, motherName, primaryPhone, occupation, annualIncome } = req.body;
  if (fatherName !== undefined || motherName !== undefined || primaryPhone !== undefined || occupation !== undefined || annualIncome !== undefined) {
    const studentParent = db.get('SELECT parent_id FROM student_parents WHERE student_id = ? AND is_primary = 1', [studentId]);
    if (studentParent && studentParent.parent_id) {
      db.run(`
        UPDATE parents
        SET father_name = COALESCE(?, father_name),
            mother_name = COALESCE(?, mother_name),
            primary_phone = COALESCE(?, primary_phone),
            occupation = COALESCE(?, occupation),
            annual_income = COALESCE(?, annual_income),
            address = COALESCE(?, address)
        WHERE id = ?
      `, [
        fatherName ? fatherName.trim() : null,
        motherName ? motherName.trim() : null,
        primaryPhone ? primaryPhone.trim() : null,
        occupation ? occupation.trim() : null,
        annualIncome ? annualIncome.trim() : null,
        address ? address.trim() : null,
        studentParent.parent_id
      ]);
    } else if (fatherName || motherName || primaryPhone) {
      const resP = db.run(`
        INSERT INTO parents (father_name, mother_name, primary_phone, occupation, annual_income, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        fatherName ? fatherName.trim() : null,
        motherName ? motherName.trim() : null,
        primaryPhone ? primaryPhone.trim() : null,
        occupation ? occupation.trim() : null,
        annualIncome ? annualIncome.trim() : null,
        address ? address.trim() : null
      ]);
      db.run("INSERT INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, 'PARENTS', 1)", [
        studentId, resP.lastInsertRowid
      ]);
    }
  }

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STUDENT_UPDATE',
    resource: 'students',
    resourceId: studentId,
    details: { studentId, status }
  });

  return res.json({
    success: true,
    message: 'Student record updated successfully.'
  });
});

/**
 * DELETE /api/students/:id
 * Delete student from General Register
 */
router.delete('/:id', requireAuth, requirePermission('admin.students.delete'), (req, res) => {
  const studentId = parseInt(req.params.id, 10);

  const student = db.get('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student record not found.' });
  }

  // Fetch parent_ids to clean up orphaned parent records
  const studentParents = db.query('SELECT parent_id FROM student_parents WHERE student_id = ?', [studentId]);

  // Clean up student documents
  db.run('DELETE FROM student_documents WHERE student_id = ?', [studentId]);

  // Clean up student_parents mapping
  db.run('DELETE FROM student_parents WHERE student_id = ?', [studentId]);

  // Clean up parent records if not linked to other students
  for (const sp of studentParents) {
    const otherLinks = db.get('SELECT student_id FROM student_parents WHERE parent_id = ?', [sp.parent_id]);
    if (!otherLinks) {
      db.run('DELETE FROM parents WHERE id = ?', [sp.parent_id]);
    }
  }

  // Delete student
  db.run('DELETE FROM students WHERE id = ?', [studentId]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STUDENT_DELETE',
    resource: 'students',
    resourceId: studentId,
    details: { grNumber: student.gr_number, name: `${student.first_name} ${student.last_name}`, standardId: student.standard_id }
  });

  return res.json({
    success: true,
    message: `Student ${student.first_name} ${student.last_name} (${student.gr_number}) removed from General Register.`
  });
});

/**
 * POST /api/students/:id/documents
 * Attach and verify a student document
 */
router.post('/:id/documents', requireAuth, requirePermission('admin.students.edit'), (req, res) => {
  const studentId = parseInt(req.params.id, 10);
  const { documentType, documentName, fileUrl } = req.body;

  if (!documentType || !documentName) {
    return res.status(400).json({ success: false, message: 'Document type and name are required.' });
  }

  const result = db.run(`
    INSERT INTO student_documents (student_id, document_type, document_name, file_url, verification_status, verified_by)
    VALUES (?, ?, ?, ?, 'VERIFIED', ?)
  `, [
    studentId,
    documentType,
    documentName.trim(),
    fileUrl || null,
    req.user.id
  ]);

  recordAudit({
    userId: req.user.id,
    username: req.user.username,
    role: req.user.roles[0],
    action: 'STUDENT_DOC_UPLOAD',
    resource: 'student_documents',
    resourceId: result.lastInsertRowid,
    details: { studentId, documentType, documentName }
  });

  return res.status(201).json({
    success: true,
    message: 'Document uploaded and verified.',
    documentId: result.lastInsertRowid
  });
});

module.exports = router;
