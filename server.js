/**
 * TimeTable Studio & Enterprise School Management ERP Server
 * Integrates SQLite database, JWT RBAC security, REST APIs, and static asset serving
 */

const http = require('http');
const app = require('./backend/app');

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}/index.html`;
  console.log('='.repeat(65));
  console.log('  School Management ERP - Enterprise Production Server');
  console.log('='.repeat(65));
  console.log(`  ✓ Server running at: ${url}`);
  console.log(`  ✓ Relational SQLite DB: backend/data/school_erp.db`);
  console.log(`  ✓ RBAC & Authentication APIs: http://localhost:${PORT}/api/auth`);
  console.log(`  ✓ Auto-save dual-write fallback operational`);
  console.log('='.repeat(65));
});

module.exports = server;
