/**
 * Seed Initial System Roles, Granular Permissions, and Enterprise Accounts
 */

const bcrypt = require('bcryptjs');
const db = require('./connection');
const path = require('path');

const SALT_ROUNDS = 10;

const PERMISSIONS_LIST = [
  // ACADEMIC DOMAIN
  { code: 'academic.calendar.view', domain: 'ACADEMIC', module: 'calendar', action: 'view', description: 'View academic calendar and term dates' },
  { code: 'academic.calendar.manage', domain: 'ACADEMIC', module: 'calendar', action: 'manage', description: 'Configure academic years, terms, and institutional holidays' },
  { code: 'academic.curriculum.view', domain: 'ACADEMIC', module: 'curriculum', action: 'view', description: 'View curriculum outlines and subject quotas' },
  { code: 'academic.curriculum.manage', domain: 'ACADEMIC', module: 'curriculum', action: 'manage', description: 'Manage curriculum topics and learning milestones' },
  { code: 'academic.classes.view', domain: 'ACADEMIC', module: 'classes', action: 'view', description: 'View standards, divisions, and classrooms' },
  { code: 'academic.classes.manage', domain: 'ACADEMIC', module: 'classes', action: 'manage', description: 'Create and configure standards, sections, and room allocations' },
  { code: 'academic.subjects.view', domain: 'ACADEMIC', module: 'subjects', action: 'view', description: 'View subject catalog and teacher allocations' },
  { code: 'academic.subjects.manage', domain: 'ACADEMIC', module: 'subjects', action: 'manage', description: 'Create and configure subjects, quotas, and color themes' },
  { code: 'academic.timetable.view', domain: 'ACADEMIC', module: 'timetable', action: 'view', description: 'View class and teacher timetables' },
  { code: 'academic.timetable.edit', domain: 'ACADEMIC', module: 'timetable', action: 'edit', description: 'Edit timetable slot assignments and run auto-solver' },
  { code: 'academic.timetable.publish', domain: 'ACADEMIC', module: 'timetable', action: 'publish', description: 'Publish verified timetables to active school status' },
  { code: 'academic.timetable.export', domain: 'ACADEMIC', module: 'timetable', action: 'export', description: 'Export timetables to institutional Word/Excel documents' },
  { code: 'academic.substitution.view', domain: 'ACADEMIC', module: 'substitution', action: 'view', description: 'View daily substitution and proxy allocations' },
  { code: 'academic.substitution.manage', domain: 'ACADEMIC', module: 'substitution', action: 'manage', description: 'Log staff leaves, allocate proxy teachers, and print daily slips' },
  { code: 'academic.attendance.view', domain: 'ACADEMIC', module: 'attendance', action: 'view', description: 'View student daily and period attendance records' },
  { code: 'academic.attendance.mark', domain: 'ACADEMIC', module: 'attendance', action: 'create', description: 'Mark student attendance for assigned classes' },
  { code: 'academic.syllabus.view', domain: 'ACADEMIC', module: 'syllabus', action: 'view', description: 'View syllabus pacing and completion trackers' },
  { code: 'academic.syllabus.update', domain: 'ACADEMIC', module: 'syllabus', action: 'edit', description: 'Update completed chapters, grammar topics, and notebook checking' },
  { code: 'academic.lessonplan.view', domain: 'ACADEMIC', module: 'lessonplan', action: 'view', description: 'View teacher daily lesson plans' },
  { code: 'academic.lessonplan.create', domain: 'ACADEMIC', module: 'lessonplan', action: 'create', description: 'Create and submit daily lesson plans' },
  { code: 'academic.homework.view', domain: 'ACADEMIC', module: 'homework', action: 'view', description: 'View homework assignments' },
  { code: 'academic.homework.create', domain: 'ACADEMIC', module: 'homework', action: 'create', description: 'Assign homework and class tasks' },
  { code: 'academic.exams.view', domain: 'ACADEMIC', module: 'exams', action: 'view', description: 'View examination terms and papers' },
  { code: 'academic.exams.schedule', domain: 'ACADEMIC', module: 'exams', action: 'manage', description: 'Schedule exam papers, rooms, and durations' },
  { code: 'academic.exams.invigilation', domain: 'ACADEMIC', module: 'exams', action: 'manage', description: 'Assign faculty invigilation duties' },
  { code: 'academic.exams.marks_entry', domain: 'ACADEMIC', module: 'exams', action: 'edit', description: 'Enter student assessment and test marks' },
  { code: 'academic.exams.marks_verify', domain: 'ACADEMIC', module: 'exams', action: 'approve', description: 'Verify and audit student marks before tabulation' },
  { code: 'academic.exams.publish', domain: 'ACADEMIC', module: 'exams', action: 'publish', description: 'Publish final report cards and tabulation results' },
  { code: 'academic.duties.view', domain: 'ACADEMIC', module: 'duties', action: 'view', description: 'View faculty extra duties and assembly rosters' },
  { code: 'academic.duties.manage', domain: 'ACADEMIC', module: 'duties', action: 'manage', description: 'Assign faculty extra duties and campus supervisory rosters' },

  // ADMINISTRATION DOMAIN
  { code: 'admin.students.view', domain: 'ADMIN', module: 'students', action: 'view', description: 'View student directories and records' },
  { code: 'admin.students.create', domain: 'ADMIN', module: 'students', action: 'create', description: 'Enroll new students and allocate General Register (GR) numbers' },
  { code: 'admin.students.edit', domain: 'ADMIN', module: 'students', action: 'edit', description: 'Edit student profiles and emergency contact info' },
  { code: 'admin.students.delete', domain: 'ADMIN', module: 'students', action: 'delete', description: 'Archive or deactivate student records' },
  { code: 'admin.staff.view', domain: 'ADMIN', module: 'staff', action: 'view', description: 'View staff directory and employment profiles' },
  { code: 'admin.staff.create', domain: 'ADMIN', module: 'staff', action: 'create', description: 'Add new staff members and employment contracts' },
  { code: 'admin.staff.edit', domain: 'ADMIN', module: 'staff', action: 'edit', description: 'Update staff details, qualifications, and shifts' },
  { code: 'admin.leave.view', domain: 'ADMIN', module: 'leave', action: 'view', description: 'View staff leave requests and balance ledgers' },
  { code: 'admin.leave.apply', domain: 'ADMIN', module: 'leave', action: 'create', description: 'Apply for personal staff leave' },
  { code: 'admin.leave.approve', domain: 'ADMIN', module: 'leave', action: 'approve', description: 'Approve or reject staff leave requests' },
  { code: 'admin.payroll.view', domain: 'ADMIN', module: 'payroll', action: 'view', description: 'View staff payroll structures and monthly salary slips' },
  { code: 'admin.payroll.generate', domain: 'ADMIN', module: 'payroll', action: 'manage', description: 'Generate monthly payroll, deductions, and payslips' },
  { code: 'admin.fees.view', domain: 'ADMIN', module: 'fees', action: 'view', description: 'View fee structures and student fee accounts' },
  { code: 'admin.fees.structure', domain: 'ADMIN', module: 'fees', action: 'manage', description: 'Configure fee categories, heads, and installment amounts' },
  { code: 'admin.fees.collect', domain: 'ADMIN', module: 'fees', action: 'create', description: 'Collect student fee payments and issue official receipts' },
  { code: 'admin.fees.concession', domain: 'ADMIN', module: 'fees', action: 'manage', description: 'Apply for or manage student fee concessions and discounts' },
  { code: 'admin.fees.reports', domain: 'ADMIN', module: 'fees', action: 'view', description: 'Access fee defaulter aging reports and collection summaries' },
  { code: 'admin.expenses.view', domain: 'ADMIN', module: 'expenses', action: 'view', description: 'View operational expense vouchers and petty cash records' },
  { code: 'admin.expenses.create', domain: 'ADMIN', module: 'expenses', action: 'create', description: 'Create operational expense vouchers' },
  { code: 'admin.transport.view', domain: 'ADMIN', module: 'transport', action: 'view', description: 'View school buses, routes, and stops' },
  { code: 'admin.transport.manage', domain: 'ADMIN', module: 'transport', action: 'manage', description: 'Manage fleet vehicles, driver profiles, and bus route allocations' },
  { code: 'admin.inventory.view', domain: 'ADMIN', module: 'inventory', action: 'view', description: 'View store inventory and asset registers' },
  { code: 'admin.inventory.manage', domain: 'ADMIN', module: 'inventory', action: 'manage', description: 'Manage item stock, purchase orders, and vendor masters' },
  { code: 'admin.visitors.view', domain: 'ADMIN', module: 'visitors', action: 'view', description: 'View campus visitor logs and gate passes' },
  { code: 'admin.visitors.manage', domain: 'ADMIN', module: 'visitors', action: 'manage', description: 'Check-in visitors, issue gate badges, and record departures' },
  { code: 'admin.certificates.generate', domain: 'ADMIN', module: 'certificates', action: 'export', description: 'Generate Transfer Certificates (TC) and Bonafide certificates' },
  { code: 'admin.communication.broadcast', domain: 'ADMIN', module: 'communication', action: 'create', description: 'Publish school circulars and parent notices' },

  // PRINCIPAL DOMAIN
  { code: 'principal.dashboard.view', domain: 'PRINCIPAL', module: 'dashboard', action: 'view', description: 'Access executive supervisory command center' },
  { code: 'principal.kpi.view', domain: 'PRINCIPAL', module: 'kpi', action: 'view', description: 'View real-time institutional health meters' },
  { code: 'principal.approvals.manage', domain: 'PRINCIPAL', module: 'approvals', action: 'approve', description: 'Execute final executive sign-off on institutional requests' },
  { code: 'principal.timetable.approve', domain: 'PRINCIPAL', module: 'timetable', action: 'approve', description: 'Approve and release academic timetables' },
  { code: 'principal.results.approve', domain: 'PRINCIPAL', module: 'exams', action: 'approve', description: 'Authorize release of term examination results' },
  { code: 'principal.leave.approve', domain: 'PRINCIPAL', module: 'leave', action: 'approve', description: 'Final sign-off on staff leaves' },
  { code: 'principal.fees.approve_concession', domain: 'PRINCIPAL', module: 'fees', action: 'approve', description: 'Approve fee concessions and waivers' },

  // SYSTEM & AUDIT DOMAIN
  { code: 'system.users.view', domain: 'SYSTEM', module: 'users', action: 'view', description: 'View user accounts and active roles' },
  { code: 'system.users.manage', domain: 'SYSTEM', module: 'users', action: 'manage', description: 'Create, modify, and deactivate user logins' },
  { code: 'system.roles.manage', domain: 'SYSTEM', module: 'roles', action: 'manage', description: 'Configure role permission mappings' },
  { code: 'system.audit.view', domain: 'SYSTEM', module: 'audit', action: 'view', description: 'Inspect immutable institutional audit logs' },
  { code: 'system.settings.manage', domain: 'SYSTEM', module: 'settings', action: 'manage', description: 'Configure school profile and bell timing schedules' }
];

const ROLES_LIST = [
  {
    code: 'PRINCIPAL',
    name: 'School Principal / Director',
    workspace: 'PRINCIPAL',
    description: 'Full supervisory authority over both Academic and Administrative operations with executive approval rights.',
    is_system: 1,
    // Gets ALL permissions
    permissions: '*'
  },
  {
    code: 'ACADEMIC_HEAD',
    name: 'Academic Head / Vice Principal',
    workspace: 'ACADEMIC',
    description: 'Manages all teaching operations, academic schedules, curriculum, evaluations, and teacher performance.',
    is_system: 1,
    permissions: [
      'academic.calendar.view', 'academic.calendar.manage',
      'academic.curriculum.view', 'academic.curriculum.manage',
      'academic.classes.view', 'academic.classes.manage',
      'academic.subjects.view', 'academic.subjects.manage',
      'academic.timetable.view', 'academic.timetable.edit', 'academic.timetable.publish', 'academic.timetable.export',
      'academic.substitution.view', 'academic.substitution.manage',
      'academic.attendance.view', 'academic.attendance.mark',
      'academic.syllabus.view', 'academic.syllabus.update',
      'academic.lessonplan.view', 'academic.lessonplan.create',
      'academic.homework.view', 'academic.homework.create',
      'academic.exams.view', 'academic.exams.schedule', 'academic.exams.invigilation', 'academic.exams.marks_entry', 'academic.exams.marks_verify', 'academic.exams.publish',
      'academic.duties.view', 'academic.duties.manage',
      'system.settings.manage'
    ]
  },
  {
    code: 'TIMETABLE_COORDINATOR',
    name: 'Academic Timetable Coordinator',
    workspace: 'ACADEMIC',
    description: 'Specialist role for building, auto-scheduling, verifying, and publishing class and teacher schedules.',
    is_system: 1,
    permissions: [
      'academic.classes.view', 'academic.subjects.view',
      'academic.timetable.view', 'academic.timetable.edit', 'academic.timetable.export',
      'academic.substitution.view', 'academic.substitution.manage',
      'academic.duties.view', 'academic.duties.manage',
      'system.settings.manage'
    ]
  },
  {
    code: 'EXAM_COORDINATOR',
    name: 'Examination Coordinator',
    workspace: 'ACADEMIC',
    description: 'Manages term exam schedules, invigilations, marks collection, and result processing.',
    is_system: 1,
    permissions: [
      'academic.exams.view', 'academic.exams.schedule', 'academic.exams.invigilation',
      'academic.exams.marks_entry', 'academic.exams.marks_verify', 'academic.exams.publish'
    ]
  },
  {
    code: 'CLASS_TEACHER',
    name: 'Class Teacher',
    workspace: 'ACADEMIC',
    description: 'Subject teacher with additional responsibilities for division attendance and report card generation.',
    is_system: 1,
    permissions: [
      'academic.timetable.view', 'academic.timetable.export',
      'academic.attendance.view', 'academic.attendance.mark',
      'academic.syllabus.view', 'academic.syllabus.update',
      'academic.lessonplan.view', 'academic.lessonplan.create',
      'academic.homework.view', 'academic.homework.create',
      'academic.exams.view', 'academic.exams.marks_entry',
      'academic.duties.view', 'admin.leave.apply'
    ]
  },
  {
    code: 'TEACHER',
    name: 'Subject Teacher',
    workspace: 'ACADEMIC',
    description: 'Faculty portal access for schedule, daily slip, syllabus progress, marks entry, and leave requests.',
    is_system: 1,
    permissions: [
      'academic.timetable.view',
      'academic.syllabus.view', 'academic.syllabus.update',
      'academic.lessonplan.view', 'academic.lessonplan.create',
      'academic.homework.view', 'academic.homework.create',
      'academic.exams.view', 'academic.exams.marks_entry',
      'academic.duties.view', 'admin.leave.apply'
    ]
  },
  {
    code: 'ADMIN_HEAD',
    name: 'Administration Head / Registrar',
    workspace: 'ADMINISTRATION',
    description: 'Manages non-academic school operations including admissions, staff HR, facilities, and campus logistics.',
    is_system: 1,
    permissions: [
      'admin.students.view', 'admin.students.create', 'admin.students.edit', 'admin.students.delete',
      'admin.staff.view', 'admin.staff.create', 'admin.staff.edit',
      'admin.leave.view', 'admin.leave.approve',
      'admin.fees.view', 'admin.fees.reports',
      'admin.transport.view', 'admin.transport.manage',
      'admin.inventory.view', 'admin.inventory.manage',
      'admin.visitors.view', 'admin.visitors.manage',
      'admin.certificates.generate', 'admin.communication.broadcast',
      'system.users.view'
    ]
  },
  {
    code: 'ACCOUNTANT',
    name: 'School Accountant / Cashier',
    workspace: 'ADMINISTRATION',
    description: 'Manages fee collection counter, receipts, defaulters, concessions, and operational expense vouchers.',
    is_system: 1,
    permissions: [
      'admin.students.view',
      'admin.fees.view', 'admin.fees.structure', 'admin.fees.collect', 'admin.fees.concession', 'admin.fees.reports',
      'admin.expenses.view', 'admin.expenses.create'
    ]
  },
  {
    code: 'STAFF',
    name: 'Support Staff / Supervisor',
    workspace: 'ADMINISTRATION',
    description: 'Campus operations, gate duty verification, and operational logs.',
    is_system: 1,
    permissions: [
      'academic.duties.view', 'admin.visitors.view', 'admin.visitors.manage', 'admin.leave.apply'
    ]
  }
];

function seedDatabase() {
  console.log('🌱 Starting Phase 1 database seed...');

  // 1. Seed Permissions
  const insertPerm = db.db.prepare(`
    INSERT INTO permissions (code, domain, module, action, description)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      domain = excluded.domain,
      module = excluded.module,
      action = excluded.action,
      description = excluded.description
  `);

  for (const p of PERMISSIONS_LIST) {
    insertPerm.run(p.code, p.domain, p.module, p.action, p.description);
  }
  console.log(`✓ Seeded ${PERMISSIONS_LIST.length} granular system permissions.`);

  // 2. Seed Roles
  const insertRole = db.db.prepare(`
    INSERT INTO roles (code, name, workspace, description, is_system)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      workspace = excluded.workspace,
      description = excluded.description
  `);

  for (const r of ROLES_LIST) {
    insertRole.run(r.code, r.name, r.workspace, r.description, r.is_system);
  }
  console.log(`✓ Seeded ${ROLES_LIST.length} organizational roles.`);

  // 3. Map Role Permissions
  const clearRolePerms = db.db.prepare('DELETE FROM role_permissions');
  clearRolePerms.run();

  const insertRolePerm = db.db.prepare(`
    INSERT INTO role_permissions (role_id, permission_id)
    VALUES (?, ?)
    ON CONFLICT DO NOTHING
  `);

  const allPerms = db.query('SELECT id, code FROM permissions');
  const permMap = new Map(allPerms.map(p => [p.code, p.id]));

  for (const r of ROLES_LIST) {
    const roleRecord = db.get('SELECT id FROM roles WHERE code = ?', [r.code]);
    if (!roleRecord) continue;

    if (r.permissions === '*') {
      // All permissions
      for (const p of allPerms) {
        insertRolePerm.run(roleRecord.id, p.id);
      }
    } else {
      for (const pCode of r.permissions) {
        const pId = permMap.get(pCode);
        if (pId) {
          insertRolePerm.run(roleRecord.id, pId);
        }
      }
    }
  }
  console.log('✓ Successfully mapped role permissions.');

  // 4. Seed Core Administrative Users
  const userList = [
    {
      username: 'principal',
      email: 'principal@funland.edu',
      password: 'principal123',
      fullName: 'Principal / Trustee',
      userType: 'PRINCIPAL',
      roleCode: 'PRINCIPAL',
      avatar: '🏛️'
    },
    {
      username: 'admin',
      email: 'admin@funland.edu',
      password: 'admin123',
      fullName: 'System Administrator',
      userType: 'ADMIN',
      roleCode: 'ADMIN_HEAD',
      avatar: '👑'
    },
    {
      username: 'academics',
      email: 'academic@funland.edu',
      password: 'academic123',
      fullName: 'Academic Head',
      userType: 'ACADEMIC',
      roleCode: 'ACADEMIC_HEAD',
      avatar: '🎓'
    },
    {
      username: 'timetable',
      email: 'timetable@funland.edu',
      password: 'timetable123',
      fullName: 'Timetable Coordinator',
      userType: 'ACADEMIC',
      roleCode: 'TIMETABLE_COORDINATOR',
      avatar: '📅'
    },
    {
      username: 'accountant',
      email: 'accountant@funland.edu',
      password: 'accountant123',
      fullName: 'School Cashier / Accountant',
      userType: 'ADMIN',
      roleCode: 'ACCOUNTANT',
      avatar: '💰'
    },
    {
      username: 'staff',
      email: 'staff@funland.edu',
      password: 'staff123',
      fullName: 'Campus Operations Staff',
      userType: 'STAFF',
      roleCode: 'STAFF',
      avatar: '📋'
    }
  ];

  // 5. Seed Teachers from default data
  let defaultTeachers = [
    'Amee Madam', 'Dhaval Sir', 'Divyesh Sir', 'Dipen Sir', 'Hitesh Sir',
    'Komal Madam', 'Mitesh Sir', 'Mayur Sir', 'Nikhil Sir', 'Pooja Madam',
    'Priyesh Sir', 'Riddhi Madam', 'Roshni Madam', 'Zankhna Madam'
  ];

  try {
    const defaultData = require(path.join(__dirname, '..', '..', 'js', 'default-data.js'));
    if (defaultData && defaultData.teachers && defaultData.teachers.length > 0) {
      defaultTeachers = defaultData.teachers;
    }
  } catch (e) {
    // fallback to array
  }

  defaultTeachers.forEach((tName, idx) => {
    const firstName = tName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanName = tName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const teacherCode = `T${String(idx + 1).padStart(2, '0')}`;
    userList.push({
      username: cleanName,
      email: `${firstName}@funland.edu`,
      password: `${firstName}123`,
      fullName: tName,
      userType: 'TEACHER',
      roleCode: 'TEACHER',
      teacherCode: teacherCode,
      avatar: '👩‍🏫',
      mustChangePassword: 1
    });
  });

  const insertUser = db.db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, user_type, teacher_code, avatar, must_change_password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      full_name = excluded.full_name,
      user_type = excluded.user_type,
      teacher_code = excluded.teacher_code,
      avatar = excluded.avatar
  `);

  const insertUserRole = db.db.prepare(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES (?, ?)
    ON CONFLICT DO NOTHING
  `);

  for (const u of userList) {
    const hash = bcrypt.hashSync(u.password, SALT_ROUNDS);
    insertUser.run(
      u.username,
      u.email,
      hash,
      u.fullName,
      u.userType,
      u.teacherCode || null,
      u.avatar || '👤',
      u.mustChangePassword ? 1 : 0
    );

    const userRecord = db.get('SELECT id FROM users WHERE username = ?', [u.username]);
    const roleRecord = db.get('SELECT id FROM roles WHERE code = ?', [u.roleCode]);

    if (userRecord && roleRecord) {
      insertUserRole.run(userRecord.id, roleRecord.id);
    }
  }
  console.log(`✓ Seeded ${userList.length} users with bcrypt-hashed credentials and assigned roles.`);

  // 6. Seed Default School Profile & Academic Session
  const schoolRecord = db.get('SELECT id FROM schools LIMIT 1');
  if (!schoolRecord) {
    db.run(`
      INSERT INTO schools (name, affiliation_no, tagline, board)
      VALUES (?, ?, ?, ?)
    `, [
      'Funland English Medium School',
      'AFF-2026/SEC-9982',
      'Excellence in Academic Innovation & Character Building',
      'CBSE'
    ]);
  }

  const sessionRecord = db.get('SELECT id FROM academic_sessions LIMIT 1');
  if (!sessionRecord) {
    const school = db.get('SELECT id FROM schools LIMIT 1');
    db.run(`
      INSERT INTO academic_sessions (school_id, session_name, start_date, end_date, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [
      school ? school.id : 1,
      '2026-2027',
      '2026-06-01',
      '2027-04-30',
      1
    ]);
  }
  console.log('✓ Seeded master school profile and active academic session (2026-2027).');

  // 7. Seed Standards & Sections Master
  const STANDARDS_DATA = [
    { code: 'std_nursery', name: 'Nursery', shift: 'morning', room: 'Pre-Primary Hall', order: 1, capacity: 35 },
    { code: 'std_jr_kg', name: 'Jr. KG', shift: 'morning', room: 'Room KG-1', order: 2, capacity: 40 },
    { code: 'std_sr_kg', name: 'Sr. KG', shift: 'morning', room: 'Room KG-2', order: 3, capacity: 40 },
    { code: 'std_1', name: 'Standard: 1st', shift: 'morning', room: 'Room 001', order: 4, capacity: 45 },
    { code: 'std_2', name: 'Standard: 2nd', shift: 'morning', room: 'Room 002', order: 5, capacity: 45 },
    { code: 'std_3', name: 'Standard: 3rd', shift: 'afternoon', room: 'Room 101', order: 6, capacity: 45 },
    { code: 'std_4', name: 'Standard: 4th', shift: 'afternoon', room: 'Room 102', order: 7, capacity: 45 },
    { code: 'std_5', name: 'Standard: 5th', shift: 'afternoon', room: 'Room 103', order: 8, capacity: 45 },
    { code: 'std_6', name: 'Standard: 6th', shift: 'afternoon', room: 'Room 201', order: 9, capacity: 45 },
    { code: 'std_7', name: 'Standard: 7th', shift: 'afternoon', room: 'Room 202', order: 10, capacity: 45 },
    { code: 'std_8', name: 'Standard: 8th', shift: 'afternoon', room: 'Room 203', order: 11, capacity: 45 }
  ];

  const insertStd = db.db.prepare(`
    INSERT INTO standards (code, name, shift, room_number, display_order, capacity)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      shift = excluded.shift,
      room_number = excluded.room_number,
      display_order = excluded.display_order,
      capacity = excluded.capacity
  `);

  const insertSec = db.db.prepare(`
    INSERT INTO sections (standard_id, name, room_number, class_teacher_id, capacity)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(standard_id, name) DO UPDATE SET
      room_number = excluded.room_number,
      class_teacher_id = excluded.class_teacher_id,
      capacity = excluded.capacity
  `);

  // Map class teachers
  const teacherMap = {
    std_3: 'payalmaam',
    std_4: 'yaminmaam',
    std_5: 'manalimaam',
    std_6: 'sakinamaam',
    std_7: 'priyamaam',
    std_8: 'alpamaam'
  };

  for (const s of STANDARDS_DATA) {
    insertStd.run(s.code, s.name, s.shift, s.room, s.order, s.capacity);
    const stdRow = db.get('SELECT id FROM standards WHERE code = ?', [s.code]);
    if (stdRow) {
      let ctId = null;
      if (teacherMap[s.code]) {
        const u = db.get('SELECT id FROM users WHERE username = ?', [teacherMap[s.code]]);
        if (u) ctId = u.id;
      }
      insertSec.run(stdRow.id, 'A', s.room, ctId, s.capacity);
    }
  }
  console.log(`✓ Seeded ${STANDARDS_DATA.length} standards and primary sections with class teacher mappings.`);

  // 8. Seed Subjects Master Catalog
  const SUBJECTS_DATA = [
    { code: 'ENG', name: 'English', category: 'Language', color: '#3b82f6', quota: 6 },
    { code: 'MATH', name: 'Maths', category: 'Core', color: '#ef4444', quota: 6 },
    { code: 'SCI', name: 'Science', category: 'Core', color: '#10b981', quota: 6 },
    { code: 'SOC', name: 'Social Science', category: 'Core', color: '#f59e0b', quota: 5 },
    { code: 'GUJ', name: 'Gujarati', category: 'Language', color: '#8b5cf6', quota: 5 },
    { code: 'COMP', name: 'Computer', category: 'Skill', color: '#06b6d4', quota: 4 },
    { code: 'ENV', name: 'Environment', category: 'Core', color: '#84cc16', quota: 4 },
    { code: 'HIN', name: 'Hindi', category: 'Language', color: '#ec4899', quota: 4 },
    { code: 'SAN', name: 'Sanskrit', category: 'Language', color: '#6366f1', quota: 3 },
    { code: 'DRAW', name: 'Drawing', category: 'Activity', color: '#f97316', quota: 2 },
    { code: 'PT', name: 'P.T. & Sports', category: 'Activity', color: '#14b8a6', quota: 2 },
    { code: 'AI', name: 'Robotics & AI', category: 'Skill', color: '#64748b', quota: 2 },
    { code: 'VM', name: 'Vedic Math', category: 'Skill', color: '#a855f7', quota: 2 }
  ];

  const insertSub = db.db.prepare(`
    INSERT INTO subjects (code, name, category, color, weekly_quota)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      color = excluded.color,
      weekly_quota = excluded.weekly_quota
  `);

  for (const sub of SUBJECTS_DATA) {
    insertSub.run(sub.code, sub.name, sub.category, sub.color, sub.quota);
  }
  console.log(`✓ Seeded ${SUBJECTS_DATA.length} curriculum subjects in master catalog.`);

  // 9. Seed Staff HR Profiles
  const STAFF_DETAILS = [
    { username: 'principal', empCode: 'EMP-001', dept: 'Executive', desig: 'Principal & Director', qual: 'M.Ed. Ph.D. in Education', doj: '2015-04-01', phone: '+91 98250 11223', blood: 'O+', subj: 'Administration' },
    { username: 'admin', empCode: 'EMP-002', dept: 'Administration', desig: 'Head Administrator', qual: 'M.B.A. Operations', doj: '2018-06-01', phone: '+91 98250 22334', blood: 'B+', subj: 'Campus Mgmt' },
    { username: 'academics', empCode: 'EMP-003', dept: 'Academics', desig: 'Academic Head & Dean', qual: 'M.A. M.Ed.', doj: '2017-06-15', phone: '+91 98250 33445', blood: 'A+', subj: 'Curriculum' },
    { username: 'timetable', empCode: 'EMP-004', dept: 'Academics', desig: 'Timetable Coordinator', qual: 'M.Sc. B.Ed.', doj: '2019-07-01', phone: '+91 98250 44556', blood: 'AB+', subj: 'Operations' },
    { username: 'accountant', empCode: 'EMP-005', dept: 'Finance', desig: 'Senior Accounts Officer', qual: 'M.Com. C.A. Inter', doj: '2019-01-10', phone: '+91 98250 55667', blood: 'O+', subj: 'Accounts' },
    { username: 'staff', empCode: 'EMP-006', dept: 'Operations', desig: 'Campus Operations Manager', qual: 'B.A. Operations', doj: '2020-01-05', phone: '+91 98250 66778', blood: 'B+', subj: 'Operations' },
    { username: 'payalmaam', empCode: 'EMP-101', dept: 'Languages', desig: 'Senior English Faculty', qual: 'M.A. (English) B.Ed.', doj: '2018-06-12', phone: '+91 98790 10101', blood: 'B+', subj: 'English' },
    { username: 'manalimaam', empCode: 'EMP-102', dept: 'Computer Science', desig: 'Senior IT Faculty', qual: 'M.C.A. B.Ed.', doj: '2019-06-10', phone: '+91 98790 10102', blood: 'A+', subj: 'Computer' },
    { username: 'priyamaam', empCode: 'EMP-103', dept: 'Languages', desig: 'Senior Regional Language Faculty', qual: 'M.A. (Gujarati) B.Ed.', doj: '2017-08-01', phone: '+91 98790 10103', blood: 'O+', subj: 'Gujarati' },
    { username: 'sakinamaam', empCode: 'EMP-104', dept: 'Social Sciences', desig: 'Senior Humanities Faculty', qual: 'M.A. (History) B.Ed.', doj: '2018-09-15', phone: '+91 98790 10104', blood: 'AB+', subj: 'Social Science' },
    { username: 'alpamaam', empCode: 'EMP-105', dept: 'Mathematics', desig: 'Head of Mathematics', qual: 'M.Sc. (Maths) B.Ed.', doj: '2016-06-20', phone: '+91 98790 10105', blood: 'B+', subj: 'Maths' },
    { username: 'taniyamaam', empCode: 'EMP-106', dept: 'Sciences', desig: 'Senior Science Faculty', qual: 'M.Sc. (Physics) B.Ed.', doj: '2019-11-05', phone: '+91 98790 10106', blood: 'A+', subj: 'Science' },
    { username: 'dollymaam', empCode: 'EMP-107', dept: 'Mathematics', desig: 'Mathematics Teacher', qual: 'B.Sc. (Maths) B.Ed.', doj: '2020-07-01', phone: '+91 98790 10107', blood: 'O+', subj: 'Maths' },
    { username: 'yaminmaam', empCode: 'EMP-108', dept: 'Sciences', desig: 'EVS & Life Sciences Faculty', qual: 'M.Sc. (Botany) B.Ed.', doj: '2021-02-15', phone: '+91 98790 10108', blood: 'B+', subj: 'Environment' },
    { username: 'asthamaam', empCode: 'EMP-109', dept: 'Computer Science', desig: 'Assistant IT & Robotics Teacher', qual: 'B.Tech IT', doj: '2022-06-01', phone: '+91 98790 10109', blood: 'AB+', subj: 'Computer' },
    { username: 'khushimaam', empCode: 'EMP-110', dept: 'Languages', desig: 'Junior English Faculty', qual: 'B.A. (English) B.Ed.', doj: '2022-08-10', phone: '+91 98790 10110', blood: 'A+', subj: 'English' }
  ];

  const insertStaff = db.db.prepare(`
    INSERT INTO staff_profiles (
      user_id, employee_code, first_name, last_name, gender, designation, department,
      qualification, date_of_joining, phone, email, blood_group, primary_subject, assigned_shift
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_code) DO UPDATE SET
      designation = excluded.designation,
      department = excluded.department,
      qualification = excluded.qualification,
      phone = excluded.phone,
      blood_group = excluded.blood_group,
      primary_subject = excluded.primary_subject
  `);

  for (const staff of STAFF_DETAILS) {
    const u = db.get('SELECT id, full_name, email FROM users WHERE username = ?', [staff.username]);
    if (u) {
      const parts = u.full_name.split(' ');
      const fName = parts[0] || 'Faculty';
      const lName = parts.slice(1).join(' ') || "Ma'am";
      insertStaff.run(
        u.id,
        staff.empCode,
        fName,
        lName,
        'Female',
        staff.desig,
        staff.dept,
        staff.qual,
        staff.doj,
        staff.phone,
        u.email,
        staff.blood,
        staff.subj,
        'afternoon'
      );
    }
  }
  console.log(`✓ Seeded ${STAFF_DETAILS.length} staff HR profiles linked to user security accounts.`);

  // 10. Seed Student General Register (GR), Parents, and Documents
  const SAMPLE_STUDENTS = [
    { gr: 'GR-2026-001', adm: 'ADM-2026-001', roll: 1, first: 'Aarav', last: 'Patel', gender: 'Male', dob: '2016-04-12', blood: 'B+', cat: 'General', stdCode: 'std_3', father: 'Rajesh Patel', mother: 'Nita Patel', phone: '+91 98240 12345', occ: 'Textile Merchant', income: '₹12,00,000' },
    { gr: 'GR-2026-002', adm: 'ADM-2026-002', roll: 2, first: 'Diya', last: 'Sharma', gender: 'Female', dob: '2016-07-25', blood: 'O+', cat: 'General', stdCode: 'std_3', father: 'Vikram Sharma', mother: 'Pooja Sharma', phone: '+91 98240 23456', occ: 'Civil Engineer', income: '₹15,00,000' },
    { gr: 'GR-2026-003', adm: 'ADM-2026-003', roll: 3, first: 'Rohan', last: 'Mehta', gender: 'Male', dob: '2016-02-18', blood: 'A+', cat: 'General', stdCode: 'std_3', father: 'Ketan Mehta', mother: 'Bhavna Mehta', phone: '+91 98240 34567', occ: 'Chartered Accountant', income: '₹18,00,000' },
    { gr: 'GR-2026-004', adm: 'ADM-2026-004', roll: 4, first: 'Ananya', last: 'Desai', gender: 'Female', dob: '2016-09-30', blood: 'AB+', cat: 'General', stdCode: 'std_3', father: 'Sanjay Desai', mother: 'Geeta Desai', phone: '+91 98240 45678', occ: 'Doctor', income: '₹22,00,000' },
    { gr: 'GR-2026-005', adm: 'ADM-2026-005', roll: 1, first: 'Vihaan', last: 'Shah', gender: 'Male', dob: '2015-05-14', blood: 'O+', cat: 'General', stdCode: 'std_4', father: 'Nilesh Shah', mother: 'Hiral Shah', phone: '+91 98240 56789', occ: 'Pharmacist', income: '₹14,00,000' },
    { gr: 'GR-2026-006', adm: 'ADM-2026-006', roll: 2, first: 'Riya', last: 'Dave', gender: 'Female', dob: '2015-08-19', blood: 'B+', cat: 'General', stdCode: 'std_4', father: 'Gaurang Dave', mother: 'Ami Dave', phone: '+91 98240 67890', occ: 'Govt Officer', income: '₹10,50,000' },
    { gr: 'GR-2026-007', adm: 'ADM-2026-007', roll: 3, first: 'Ishaan', last: 'Verma', gender: 'Male', dob: '2015-11-03', blood: 'A-', cat: 'OBC', stdCode: 'std_4', father: 'Deepak Verma', mother: 'Sunita Verma', phone: '+91 98240 78901', occ: 'Business Owner', income: '₹11,00,000' },
    { gr: 'GR-2026-008', adm: 'ADM-2026-008', roll: 1, first: 'Kabir', last: 'Trivedi', gender: 'Male', dob: '2014-03-22', blood: 'O+', cat: 'General', stdCode: 'std_5', father: 'Pranav Trivedi', mother: 'Reena Trivedi', phone: '+91 98240 89012', occ: 'Software Architect', income: '₹25,00,000' },
    { gr: 'GR-2026-009', adm: 'ADM-2026-009', roll: 2, first: 'Meera', last: 'Nair', gender: 'Female', dob: '2014-06-11', blood: 'B+', cat: 'General', stdCode: 'std_5', father: 'Mohan Nair', mother: 'Lakshmi Nair', phone: '+91 98240 90123', occ: 'Bank Manager', income: '₹16,00,000' },
    { gr: 'GR-2026-010', adm: 'ADM-2026-010', roll: 3, first: 'Yash', last: 'Parmar', gender: 'Male', dob: '2014-10-05', blood: 'A+', cat: 'SC', stdCode: 'std_5', father: 'Dinesh Parmar', mother: 'Usha Parmar', phone: '+91 98240 01234', occ: 'Legal Advocate', income: '₹9,50,000' },
    { gr: 'GR-2026-011', adm: 'ADM-2026-011', roll: 1, first: 'Sneha', last: 'Kothari', gender: 'Female', dob: '2013-01-29', blood: 'O-', cat: 'General', stdCode: 'std_6', father: 'Ashish Kothari', mother: 'Neelam Kothari', phone: '+91 98241 11223', occ: 'Diamond Merchant', income: '₹30,00,000' },
    { gr: 'GR-2026-012', adm: 'ADM-2026-012', roll: 2, first: 'Dev', last: 'Solanki', gender: 'Male', dob: '2013-05-16', blood: 'B+', cat: 'OBC', stdCode: 'std_6', father: 'Pravin Solanki', mother: 'Hansha Solanki', phone: '+91 98241 22334', occ: 'Automobile Dealer', income: '₹13,50,000' },
    { gr: 'GR-2026-013', adm: 'ADM-2026-013', roll: 1, first: 'Tanya', last: 'Vora', gender: 'Female', dob: '2012-08-21', blood: 'A+', cat: 'General', stdCode: 'std_7', father: 'Manish Vora', mother: 'Rashmi Vora', phone: '+91 98241 33445', occ: 'Professor', income: '₹14,00,000' },
    { gr: 'GR-2026-014', adm: 'ADM-2026-014', roll: 2, first: 'Aryan', last: 'Joshi', gender: 'Male', dob: '2012-11-12', blood: 'O+', cat: 'General', stdCode: 'std_7', father: 'Manoj Joshi', mother: 'Smita Joshi', phone: '+91 98241 44556', occ: 'Consultant', income: '₹20,00,000' },
    { gr: 'GR-2026-015', adm: 'ADM-2026-015', roll: 1, first: 'Kavya', last: 'Bhatt', gender: 'Female', dob: '2011-03-08', blood: 'B+', cat: 'General', stdCode: 'std_8', father: 'Haresh Bhatt', mother: 'Meena Bhatt', phone: '+91 98241 55667', occ: 'Hospitality Director', income: '₹24,00,000' },
    { gr: 'GR-2026-016', adm: 'ADM-2026-016', roll: 2, first: 'Manan', last: 'Gajjar', gender: 'Male', dob: '2011-09-17', blood: 'AB+', cat: 'General', stdCode: 'std_8', father: 'Paresh Gajjar', mother: 'Jyoti Gajjar', phone: '+91 98241 66778', occ: 'Architect', income: '₹17,00,000' }
  ];

  const insertStudent = db.db.prepare(`
    INSERT INTO students (
      gr_number, admission_no, roll_no, first_name, last_name, gender, dob,
      blood_group, category, standard_id, section_id, admission_date, status, emergency_phone, address
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(gr_number) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      standard_id = excluded.standard_id,
      section_id = excluded.section_id,
      roll_no = excluded.roll_no
  `);

  const insertParent = db.db.prepare(`
    INSERT INTO parents (father_name, mother_name, primary_phone, occupation, annual_income, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertStudentParent = db.db.prepare(`
    INSERT INTO student_parents (student_id, parent_id, relationship, is_primary)
    VALUES (?, ?, ?, ?)
    ON CONFLICT DO NOTHING
  `);

  const insertDoc = db.db.prepare(`
    INSERT INTO student_documents (student_id, document_type, document_name, verification_status)
    VALUES (?, ?, ?, ?)
  `);

  const adminUser = db.get("SELECT id FROM users WHERE username = 'admin'");
  const adminId = adminUser ? adminUser.id : 1;

  for (const st of SAMPLE_STUDENTS) {
    const stdRow = db.get('SELECT id FROM standards WHERE code = ?', [st.stdCode]);
    const secRow = stdRow ? db.get("SELECT id FROM sections WHERE standard_id = ? AND name = 'A'", [stdRow.id]) : null;

    if (stdRow && secRow) {
      const addressStr = `Flat ${st.roll * 101}, Funland Residency, Science City Road, Ahmedabad - 380060`;
      insertStudent.run(
        st.gr,
        st.adm,
        st.roll,
        st.first,
        st.last,
        st.gender,
        st.dob,
        st.blood,
        st.cat,
        stdRow.id,
        secRow.id,
        '2026-06-05',
        'ACTIVE',
        st.phone,
        addressStr
      );

      const stuRow = db.get('SELECT id FROM students WHERE gr_number = ?', [st.gr]);
      if (stuRow) {
        insertParent.run(
          st.father,
          st.mother,
          st.phone,
          st.occ,
          st.income,
          addressStr
        );
        const parentRow = db.get('SELECT id FROM parents WHERE primary_phone = ? ORDER BY id DESC LIMIT 1', [st.phone]);
        if (parentRow) {
          insertStudentParent.run(stuRow.id, parentRow.id, 'PARENTS', 1);
        }

        // Attach verified documents
        insertDoc.run(stuRow.id, 'BIRTH_CERTIFICATE', `Birth_Certificate_${st.gr}.pdf`, 'VERIFIED');
        insertDoc.run(stuRow.id, 'AADHAR', `Aadhar_${st.gr}.pdf`, 'VERIFIED');
      }
    }
  }
  console.log(`✓ Seeded ${SAMPLE_STUDENTS.length} students in General Register with mapped parents, standards, and verified documents.`);

  console.log('🎉 Phase 1 & Phase 2 database seeding complete!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
