/**
 * Automated Verification Script for Phase 1 Authentication & RBAC Engine
 */

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', err => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 1 RBAC & API Verification Suite...\n');
  let failures = 0;

  // Test 1: Principal Login
  console.log('Test 1: Principal Login with valid credentials...');
  const principalLogin = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { usernameOrEmail: 'principal', password: 'principal123' });

  if (principalLogin.statusCode === 200 && principalLogin.body.success && principalLogin.body.token) {
    console.log('✓ PASS: Principal login successful. Token received.');
  } else {
    console.error('✗ FAIL: Principal login failed:', principalLogin.body);
    failures++;
  }

  const principalToken = principalLogin.body.token;

  // Test 2: Principal /api/auth/me
  console.log('Test 2: Verifying Principal identity & permissions via /api/auth/me...');
  const principalMe = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${principalToken}` }
  });

  if (principalMe.statusCode === 200 && principalMe.body.user.roles.includes('PRINCIPAL')) {
    console.log(`✓ PASS: Principal verified. Workspaces: [${principalMe.body.user.workspaces.join(', ')}]`);
  } else {
    console.error('✗ FAIL: /api/auth/me failed:', principalMe.body);
    failures++;
  }

  // Test 3: List Users as Principal
  console.log('Test 3: Principal fetching user directory (/api/users)...');
  const userList = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${principalToken}` }
  });

  if (userList.statusCode === 200 && userList.body.users.length > 0) {
    console.log(`✓ PASS: Users list fetched successfully (${userList.body.users.length} accounts).`);
  } else {
    console.error('✗ FAIL: Fetching users failed:', userList.body);
    failures++;
  }

  // Test 4: Teacher Login (Payal Ma'am)
  console.log('Test 4: Subject Teacher login (payal / payal123)...');
  const teacherLogin = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { usernameOrEmail: 'payal', password: 'payal123' });

  if (teacherLogin.statusCode === 200 && teacherLogin.body.success) {
    console.log('✓ PASS: Teacher login successful. Role:', teacherLogin.body.user.roles);
  } else {
    console.error('✗ FAIL: Teacher login failed:', teacherLogin.body);
    failures++;
  }

  const teacherToken = teacherLogin.body.token;

  // Test 5: RBAC Enforcement - Teacher attempting to access /api/users
  console.log('Test 5: RBAC Security Gate - Teacher attempting to access /api/users...');
  const teacherForbidden = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });

  if (teacherForbidden.statusCode === 403 && teacherForbidden.body.error === 'INSUFFICIENT_PERMISSIONS') {
    console.log(`✓ PASS: Access correctly rejected with 403 Forbidden: ${teacherForbidden.body.message}`);
  } else {
    console.error('✗ FAIL: Teacher should have been forbidden, but received:', teacherForbidden.statusCode, teacherForbidden.body);
    failures++;
  }

  // Test 6: Audit Logs Inspection as Principal
  console.log('Test 6: Principal inspecting audit logs (/api/audit-logs)...');
  const auditLogs = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/audit-logs',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${principalToken}` }
  });

  if (auditLogs.statusCode === 200 && auditLogs.body.count > 0) {
    console.log(`✓ PASS: Audit logs retrieved (${auditLogs.body.count} records). Latest action: ${auditLogs.body.logs[0].action}`);
  } else {
    console.error('✗ FAIL: Failed to retrieve audit logs:', auditLogs.body);
    failures++;
  }

  // Test 7: Backward Compatibility: Auto-Save State API
  console.log('Test 7: Backward Compatibility - POST /api/save-state...');
  const saveState = await makeRequest({
    hostname: 'localhost',
    port: 8080,
    path: '/api/save-state',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { schoolProfile: { academicYear: '2026-2027' } });

  if (saveState.statusCode === 200 && saveState.body.status === 'ok') {
    console.log('✓ PASS: POST /api/save-state is working as expected.');
  } else {
    console.error('✗ FAIL: /api/save-state failed:', saveState.body);
    failures++;
  }

  console.log('\n' + '='.repeat(50));
  if (failures === 0) {
    console.log('🎉 ALL 7 TEST SUITES PASSED! Phase 1 backend verified.');
  } else {
    console.error(`💥 ${failures} tests failed!`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
