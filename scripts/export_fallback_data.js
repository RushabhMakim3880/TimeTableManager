const fs = require('fs');
const db = require('../backend/db/connection');

const query = `
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
  WHERE st.status = 'ACTIVE'
  ORDER BY st.id ASC
`;

const students = db.query(query).map(s => ({
  id: s.id,
  gr_number: s.gr_number,
  admission_no: s.admission_no,
  roll_no: s.roll_no,
  fullName: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
  firstName: s.first_name,
  lastName: s.last_name,
  gender: s.gender,
  standard_id: s.standard_id,
  standard_name: s.standard_name,
  section_name: s.section_name || 'A',
  father_name: s.father_name,
  mother_name: s.mother_name,
  primary_phone: s.primary_phone,
  emergency_phone: s.emergency_phone,
  occupation: s.occupation,
  blood_group: s.blood_group,
  dob: s.dob,
  category: s.category
}));

console.log('Exported students count:', students.length);

const staff = db.query(`SELECT * FROM staff_profiles ORDER BY id ASC`);
console.log('Exported staff count:', staff.length);

const users = db.query(`
  SELECT u.id, u.username, u.email, u.full_name, u.user_type, u.is_active, u.updated_at, u.avatar,
         GROUP_CONCAT(r.code) as roles
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  GROUP BY u.id
  ORDER BY u.id ASC
`);
console.log('Exported users count:', users.length);

const auditLogs = db.query(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50`);
console.log('Exported audit logs count:', auditLogs.length);

fs.writeFileSync('js/erp-fallback-data.js', `// Generated ERP Fallback Data for Netlify Static Preview
window.ERP_FALLBACK_DATA = {
  students: ${JSON.stringify(students, null, 2)},
  staff: ${JSON.stringify(staff, null, 2)},
  users: ${JSON.stringify(users, null, 2)},
  auditLogs: ${JSON.stringify(auditLogs, null, 2)}
};
`);

console.log('Successfully wrote js/erp-fallback-data.js');
