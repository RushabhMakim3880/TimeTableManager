/**
 * Express Application Configuration
 * Integrates enterprise REST APIs, RBAC middleware, and serves static frontend assets
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const auditRoutes = require('./routes/audit');
const academicRoutes = require('./routes/academic');
const staffRoutes = require('./routes/staff');
const studentRoutes = require('./routes/students');
const approvalsRoutes = require('./routes/approvals');

const app = express();
const ROOT_DIR = path.join(__dirname, '..');

// Body parsers with large limit for timetable payload sync
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Request logging middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
  }
  next();
});

// ==========================================
// MOUNT ENTERPRISE REST API ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/approvals', approvalsRoutes);

// ==========================================
// BACKWARD COMPATIBILITY: Auto-Save State API
// ==========================================
function saveStateToDefaultData(state) {
  const defaultDataPath = path.join(ROOT_DIR, 'js', 'default-data.js');
  let currentDefaultData = {};
  try {
    currentDefaultData = require(defaultDataPath);
  } catch (e) {
    // fallback
  }

  const updatedDefaultData = {
    schoolProfile: state.schoolProfile || currentDefaultData.schoolProfile || {},
    standards: state.standards || currentDefaultData.standards || [],
    periods: state.periods || currentDefaultData.periods || [],
    teachers: state.teachers || currentDefaultData.teachers || [],
    teacherProfiles: state.teacherProfiles || currentDefaultData.teacherProfiles || {},
    subjects: state.subjects || currentDefaultData.subjects || [],
    days: state.days || currentDefaultData.days || [],
    initialSchedules: state.schedules || currentDefaultData.initialSchedules || {},
    weeklyDutyPresets: currentDefaultData.weeklyDutyPresets || [],
    initialWeeklyDuties: state.weeklyDuties || currentDefaultData.initialWeeklyDuties || {},
    generalDutyPresets: currentDefaultData.generalDutyPresets || [],
    initialGeneralDuties: state.generalDuties || currentDefaultData.initialGeneralDuties || [],
    dutyPresets: state.dutyPresets || currentDefaultData.dutyPresets || [],
    initialDuties: state.duties || currentDefaultData.initialDuties || {}
  };

  const fileContent = `// Default presets for School Timetable Management System
// Auto-synchronized from local edits on ${new Date().toISOString()}

const DEFAULT_DATA = ${JSON.stringify(updatedDefaultData, null, 2)};

// Node.js module export support for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_DATA;
}
`;

  fs.writeFileSync(defaultDataPath, fileContent, 'utf8');
  console.log(`[${new Date().toLocaleTimeString()}] ✓ Auto-saved timetable data to js/default-data.js`);
}

app.post('/api/save-state', (req, res) => {
  try {
    const state = req.body;
    saveStateToDefaultData(state);
    res.json({ status: 'ok', message: 'Saved to js/default-data.js' });
  } catch (err) {
    console.error('Error saving state:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==========================================
// STATIC ASSET SERVING
// ==========================================
app.use(express.static(ROOT_DIR, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Fallback to index.html for client-side routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.url.startsWith('/api/')) {
    return res.sendFile(path.join(ROOT_DIR, 'index.html'));
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

module.exports = app;
