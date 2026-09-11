/**
 * TimeTable Studio - Local Auto-Save Server
 * Serves static files and automatically saves browser edits to js/default-data.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8080;
const DIRECTORY = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function saveStateToDefaultData(state) {
  const defaultDataPath = path.join(DIRECTORY, 'js', 'default-data.js');
  let currentDefaultData = {};
  // Clear require cache for fresh load
  try {
    delete require.cache[require.resolve(defaultDataPath)];
    currentDefaultData = require(defaultDataPath);
  } catch (e) {
    // If not required cleanly, fallback
  }

  // Deep merge schedules so morning & afternoon standards are both preserved
  const mergedSchedules = JSON.parse(JSON.stringify(currentDefaultData.initialSchedules || {}));
  if (state.schedules) {
    Object.keys(state.schedules).forEach(day => {
      if (!mergedSchedules[day]) mergedSchedules[day] = {};
      const daySlots = state.schedules[day] || {};
      Object.keys(daySlots).forEach(pId => {
        if (!mergedSchedules[day][pId]) mergedSchedules[day][pId] = {};
        Object.assign(mergedSchedules[day][pId], daySlots[pId]);
      });
    });
  }

  // Deep merge shifts so morning periods and schedules are preserved
  const mergedShifts = JSON.parse(JSON.stringify(currentDefaultData.shifts || {}));
  if (state.shifts) {
    if (state.shifts.morning) {
      if (!mergedShifts.morning) mergedShifts.morning = {};
      Object.assign(mergedShifts.morning, state.shifts.morning);
      if (!mergedShifts.morning.periods || mergedShifts.morning.periods.length === 0) {
        mergedShifts.morning.periods = (currentDefaultData.shifts && currentDefaultData.shifts.morning && currentDefaultData.shifts.morning.periods) || [];
      }
      if (!mergedShifts.morning.schedules || Object.keys(mergedShifts.morning.schedules).length === 0) {
        mergedShifts.morning.schedules = (currentDefaultData.shifts && currentDefaultData.shifts.morning && currentDefaultData.shifts.morning.schedules) || {};
      }
    }
    if (state.shifts.afternoon) {
      if (!mergedShifts.afternoon) mergedShifts.afternoon = {};
      Object.assign(mergedShifts.afternoon, state.shifts.afternoon);
    }
  }

  // Merge standards
  let mergedStandards = currentDefaultData.standards || [];
  if (state.standards && state.standards.length > 0) {
    const stdMap = {};
    mergedStandards.forEach(s => { stdMap[s.id] = s; });
    state.standards.forEach(s => { stdMap[s.id] = Object.assign({}, stdMap[s.id] || {}, s); });
    mergedStandards = Object.values(stdMap);
  }

  // Merge teachers to guarantee morning faculty are always present
  const morningFaculty = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am", "Yamin Ma'am"];
  const mergedTeachers = [...(state.teachers || currentDefaultData.teachers || [])];
  morningFaculty.forEach(t => {
    if (!mergedTeachers.includes(t)) mergedTeachers.push(t);
  });

  const mergedTeacherProfiles = Object.assign({}, currentDefaultData.teacherProfiles || {}, state.teacherProfiles || {});

  const updatedDefaultData = {
    schoolProfile: state.schoolProfile || currentDefaultData.schoolProfile || {},
    standards: mergedStandards,
    periods: state.periods || currentDefaultData.periods || [],
    shifts: mergedShifts,
    classTeachers: state.classTeachers || currentDefaultData.classTeachers || {},
    attendanceDuties: state.attendanceDuties || currentDefaultData.attendanceDuties || [],
    teachers: mergedTeachers,
    teacherProfiles: mergedTeacherProfiles,
    subjects: state.subjects || currentDefaultData.subjects || [],
    days: state.days || currentDefaultData.days || [],
    includeSaturday: (state.includeSaturday !== undefined) ? state.includeSaturday : (currentDefaultData.includeSaturday || false),
    initialSchedules: mergedSchedules,
    weeklyDutyPresets: currentDefaultData.weeklyDutyPresets || [],
    initialWeeklyDuties: state.weeklyDuties || currentDefaultData.initialWeeklyDuties || {},
    generalDutyPresets: currentDefaultData.generalDutyPresets || [],
    initialGeneralDuties: state.generalDuties || currentDefaultData.initialGeneralDuties || [],
    dutyPresets: state.dutyPresets || currentDefaultData.dutyPresets || [],
    initialDuties: state.duties || currentDefaultData.initialDuties || {},
    excludedFreeTeachers: state.excludedFreeTeachers || currentDefaultData.excludedFreeTeachers || {}
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

const server = http.createServer((req, res) => {
  // Handle Auto-Save API
  if (req.method === 'POST' && req.url === '/api/save-state') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const state = JSON.parse(body);
        saveStateToDefaultData(state);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Saved to js/default-data.js' }));
      } catch (err) {
        console.error('Error saving state to default-data.js:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // Handle Static Files
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(path.join(DIRECTORY, reqPath));
  if (!safePath.startsWith(DIRECTORY)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(safePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}/index.html`;
  console.log('='.repeat(60));
  console.log('  TimeTable Studio - Local Auto-Save Server');
  console.log('='.repeat(60));
  console.log(`  Server running at: ${url}`);
  console.log(`  Edits made here are automatically written to js/default-data.js`);
  console.log(`  Whenever you git push, your filled data will be live on Netlify!`);
  console.log('='.repeat(60));
});
