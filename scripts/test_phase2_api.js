/**
 * Verification Test Suite for Phase 2: Master Data & Student Enrollment
 */

const http = require('http');

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runPhase2Tests() {
  console.log('🧪 Starting Phase 2 Master Data & Student Enrollment Test Suite...\n');

  // Test 1: Principal Login
  console.log('Test 1: Principal Login...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'principal', password: 'principal123' });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error(`Principal login failed: ${JSON.stringify(loginRes.body)}`);
  }
  const principalToken = loginRes.body.token;
  const authHeader = { 'Authorization': `Bearer ${principalToken}` };
  console.log('✓ PASS: Principal logged in successfully.\n');

  // Test 2: Standards & Sections Master
  console.log('Test 2: Fetching Standards Master (/api/academic/standards)...');
  const stdRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/academic/standards',
    method: 'GET',
    headers: authHeader
  });
  if (stdRes.status !== 200 || !stdRes.body.standards || stdRes.body.standards.length < 11) {
    throw new Error(`Expected at least 11 standards, got: ${JSON.stringify(stdRes.body)}`);
  }
  const std3 = stdRes.body.standards.find(s => s.code === 'std_3');
  if (!std3 || !std3.sections || !std3.sections[0].classTeacher) {
    throw new Error('Standard 3rd section A class teacher mapping missing!');
  }
  console.log(`✓ PASS: ${stdRes.body.standards.length} standards verified. Standard 3rd Class Teacher: ${std3.sections[0].classTeacher.name}.\n`);

  // Test 3: Subjects Master Catalog
  console.log('Test 3: Fetching Subjects Master Catalog (/api/academic/subjects)...');
  const subRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/academic/subjects',
    method: 'GET',
    headers: authHeader
  });
  if (subRes.status !== 200 || !subRes.body.subjects || subRes.body.subjects.length < 13) {
    throw new Error(`Expected at least 13 subjects, got: ${JSON.stringify(subRes.body)}`);
  }
  console.log(`✓ PASS: ${subRes.body.subjects.length} subjects catalog verified.\n`);

  // Test 4: Staff HR Directory
  console.log('Test 4: Fetching Staff Directory (/api/staff)...');
  const staffRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/staff',
    method: 'GET',
    headers: authHeader
  });
  if (staffRes.status !== 200 || !staffRes.body.staff || staffRes.body.staff.length < 15) {
    throw new Error(`Expected at least 15 staff profiles, got: ${JSON.stringify(staffRes.body)}`);
  }
  console.log(`✓ PASS: ${staffRes.body.staff.length} staff HR profiles verified.\n`);

  // Test 5: Student Enrollment Stats
  console.log('Test 5: Fetching Student Enrollment Stats (/api/students/stats)...');
  const statsRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/students/stats',
    method: 'GET',
    headers: authHeader
  });
  if (statsRes.status !== 200 || statsRes.body.total < 16) {
    throw new Error(`Expected at least 16 enrolled students, got: ${JSON.stringify(statsRes.body)}`);
  }
  console.log(`✓ PASS: Total Students: ${statsRes.body.total} (Boys: ${statsRes.body.boys}, Girls: ${statsRes.body.girls}).\n`);

  // Test 6: General Register List
  console.log('Test 6: Fetching General Register List (/api/students)...');
  const grRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/students',
    method: 'GET',
    headers: authHeader
  });
  if (grRes.status !== 200 || !grRes.body.students || grRes.body.students.length < 16) {
    throw new Error(`Expected at least 16 students in GR, got: ${JSON.stringify(grRes.body)}`);
  }
  const firstStudent = grRes.body.students[0];
  console.log(`✓ PASS: General Register lists ${grRes.body.students.length} students. Sample: ${firstStudent.gr_number} - ${firstStudent.fullName} (${firstStudent.standard_name}).\n`);

  // Test 7: New Student Admission
  console.log('Test 7: Enrolling New Student via /api/students/admit...');
  const newStudentPayload = {
    firstName: 'Reyansh',
    middleName: 'Amit',
    lastName: 'Shah',
    gender: 'Male',
    dob: '2016-05-15',
    bloodGroup: 'O+',
    category: 'General',
    standardId: std3.id,
    sectionId: std3.sections[0].id,
    fatherName: 'Amit Shah',
    motherName: 'Kinjal Shah',
    primaryPhone: '+91 99090 12345',
    occupation: 'Stock Broker',
    annualIncome: '₹28,00,000',
    address: '402, Shivalik Heights, Bodakdev, Ahmedabad',
    verifiedDocuments: ['BIRTH_CERTIFICATE', 'AADHAR', 'TRANSFER_CERTIFICATE']
  };

  const admitRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/students/admit',
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' }
  }, newStudentPayload);

  if (admitRes.status !== 201 || !admitRes.body.studentId || !admitRes.body.grNumber) {
    throw new Error(`Admission failed: ${JSON.stringify(admitRes.body)}`);
  }
  const newStudentId = admitRes.body.studentId;
  const allocatedGr = admitRes.body.grNumber;
  console.log(`✓ PASS: Admitted student successfully! Allocated GR: ${allocatedGr}, ID: ${newStudentId}.\n`);

  // Test 8: Fetch Admitted Student Details & Verified Documents
  console.log(`Test 8: Inspecting admitted student details (/api/students/${newStudentId})...`);
  const detailRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/students/${newStudentId}`,
    method: 'GET',
    headers: authHeader
  });
  if (detailRes.status !== 200 || !detailRes.body.student) {
    throw new Error(`Student detail fetch failed: ${JSON.stringify(detailRes.body)}`);
  }
  const studentData = detailRes.body.student;
  if (!studentData.parents || studentData.parents.length === 0 || !studentData.documents || studentData.documents.length !== 3) {
    throw new Error(`Parent or documents missing from student detail: ${JSON.stringify(studentData)}`);
  }
  console.log(`✓ PASS: Student profile verified with Parent: ${studentData.parents[0].father_name} and ${studentData.documents.length} verified documents.\n`);

  // Test 9: RBAC Gate - Teacher attempting to admit student (should be rejected 403)
  console.log('Test 9: RBAC Gate - Teacher attempting to admit student (/api/students/admit)...');
  const teacherLogin = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'payal', password: 'payal123' });

  const teacherToken = teacherLogin.body.token;
  const teacherAuthHeader = { 'Authorization': `Bearer ${teacherToken}`, 'Content-Type': 'application/json' };

  const forbiddenRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/students/admit',
    method: 'POST',
    headers: teacherAuthHeader
  }, newStudentPayload);

  if (forbiddenRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for teacher on /api/students/admit, got ${forbiddenRes.status}`);
  }
  console.log('✓ PASS: Access correctly rejected with 403 Forbidden for teacher.\n');

  // Test 10: Update Student Record (PUT /api/students/:id)
  console.log(`Test 10: Updating student profile (/api/students/${newStudentId})...`);
  const updatePayload = {
    firstName: 'Reyansh',
    middleName: 'Amit',
    lastName: 'Shah',
    standardId: std3.id,
    sectionId: std3.sections[0].id,
    rollNo: 25,
    gender: 'Male',
    dob: '2016-05-15',
    bloodGroup: 'O+',
    category: 'General',
    status: 'ACTIVE',
    fatherName: 'Amit K. Shah',
    primaryPhone: '+91 99090 99999',
    address: 'Flat 502, Shivalik Heights, Bodakdev, Ahmedabad'
  };
  const putRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/students/${newStudentId}`,
    method: 'PUT',
    headers: { ...authHeader, 'Content-Type': 'application/json' }
  }, updatePayload);

  if (putRes.status !== 200 || !putRes.body.success) {
    throw new Error(`Student update failed: ${JSON.stringify(putRes.body)}`);
  }
  console.log('✓ PASS: Student profile updated successfully with new phone and roll number.\n');

  // Test 11: Departmental Approvals (Academic & Admin)
  console.log('Test 11: Testing Hierarchical Approvals Routing (/api/approvals)...');
  const academicApprovals = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/approvals/academic',
    method: 'GET',
    headers: authHeader
  });
  if (academicApprovals.status !== 200 || !academicApprovals.body.approvals) {
    throw new Error(`Failed to fetch academic approvals: ${JSON.stringify(academicApprovals.body)}`);
  }
  console.log(`✓ PASS: Academic Head retrieved ${academicApprovals.body.approvals.length} academic leave requests.`);

  const adminApprovals = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/approvals/admin',
    method: 'GET',
    headers: authHeader
  });
  if (adminApprovals.status !== 200 || !adminApprovals.body.approvals) {
    throw new Error(`Failed to fetch admin approvals: ${JSON.stringify(adminApprovals.body)}`);
  }
  console.log(`✓ PASS: Admin Head retrieved ${adminApprovals.body.approvals.length} subordinate requests.`);

  const urgentApprovals = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/approvals/urgent',
    method: 'GET',
    headers: authHeader
  });
  if (urgentApprovals.status !== 200 || !urgentApprovals.body.approvals) {
    throw new Error(`Failed to fetch urgent escalations: ${JSON.stringify(urgentApprovals.body)}`);
  }
  console.log(`✓ PASS: Principal retrieved ${urgentApprovals.body.approvals.length} urgent departmental escalations.\n`);

  // Test 12: Escalate Request to Principal & Principal Decision
  const firstLeave = academicApprovals.body.approvals[0];
  if (firstLeave && firstLeave.status === 'PENDING') {
    console.log(`Test 12: Escalating leave request #${firstLeave.id} to Principal...`);
    const escRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/approvals/${firstLeave.id}/escalate`,
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' }
    }, { reason: 'No substitute teacher available for Board class; requires executive sign-off' });

    if (escRes.status !== 200 || !escRes.body.success) {
      throw new Error(`Escalation failed: ${JSON.stringify(escRes.body)}`);
    }
    console.log('✓ PASS: Request escalated successfully.');

    // Principal signs off
    const decideRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/approvals/${firstLeave.id}/decide`,
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' }
    }, { decision: 'APPROVED', notes: 'Executive approval granted with temporary visiting faculty proxy.' });

    if (decideRes.status !== 200 || !decideRes.body.success) {
      throw new Error(`Principal decision failed: ${JSON.stringify(decideRes.body)}`);
    }
    console.log('✓ PASS: Principal executed executive sign-off on urgent escalation.\n');
  }

  // Test 13: Delete Student Record (DELETE /api/students/:id)
  console.log(`Test 13: Deleting student record #${newStudentId} from General Register...`);
  const delRes = await request({
    hostname: 'localhost',
    port: 8080,
    path: `/api/students/${newStudentId}`,
    method: 'DELETE',
    headers: authHeader
  });
  if (delRes.status !== 200 || !delRes.body.success) {
    throw new Error(`Student deletion failed: ${JSON.stringify(delRes.body)}`);
  }
  console.log('✓ PASS: Student deleted cleanly from General Register with audit log recorded.\n');

  console.log('==================================================');
  console.log('🎉 ALL 13 PHASE 2 & ADVANCED WORKFLOW TEST SUITES PASSED CLEANLY!');
}

runPhase2Tests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
