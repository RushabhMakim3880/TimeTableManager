const fs = require('fs');
const path = require('path');

// Usage: node scripts/sync_backup_to_defaults.js <path-to-downloaded-backup.json>
const backupFile = process.argv[2];

if (!backupFile) {
  console.log(`
Usage: node scripts/sync_backup_to_defaults.js <path-to-backup.json>

Example:
  node scripts/sync_backup_to_defaults.js "C:/Users/YourName/Downloads/school_timetable_backup_2026-09-09.json"

This script copies your filled schedules, teachers, duties, and school profile
directly into 'js/default-data.js' so that when pushed to Netlify, your filled data
is visible to EVERYONE by default!
`);
  process.exit(1);
}

const resolvedPath = path.resolve(backupFile);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found at ${resolvedPath}`);
  process.exit(1);
}

try {
  const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  const currentDefaultData = require('../js/default-data.js');

  const updatedDefaultData = {
    schoolProfile: data.schoolProfile || currentDefaultData.schoolProfile,
    standards: data.standards || currentDefaultData.standards,
    periods: data.periods || currentDefaultData.periods,
    morningPeriods: data.morningPeriods || currentDefaultData.morningPeriods || [
      { id: 'm1', name: 'Period 1', time: '7:30 to 8:15', isRecess: false },
      { id: 'm2', name: 'Period 2', time: '8:15 to 9:00', isRecess: false },
      { id: 'm3', name: 'Period 3', time: '9:00 to 9:45', isRecess: false },
      { id: 'm4', name: 'Period 4', time: '10:05 to 10:50', isRecess: false },
      { id: 'm5', name: 'Period 5', time: '10:50 to 11:35', isRecess: false },
      { id: 'm6', name: 'Period 6', time: '11:35 to 12:15', isRecess: false }
    ],
    teachers: data.teachers || currentDefaultData.teachers,
    teacherProfiles: data.teacherProfiles || currentDefaultData.teacherProfiles,
    subjects: data.subjects || currentDefaultData.subjects,
    days: data.days || currentDefaultData.days,
    initialSchedules: data.schedules || currentDefaultData.initialSchedules,
    weeklyDutyPresets: currentDefaultData.weeklyDutyPresets,
    initialWeeklyDuties: data.weeklyDuties || currentDefaultData.initialWeeklyDuties,
    generalDutyPresets: currentDefaultData.generalDutyPresets,
    initialGeneralDuties: data.generalDuties || currentDefaultData.initialGeneralDuties,
    dutyPresets: data.dutyPresets || currentDefaultData.dutyPresets,
    initialDuties: data.duties || currentDefaultData.initialDuties
  };

  const fileContent = `// Default presets for School Timetable Management System
// Auto-synchronized from user backup data on ${new Date().toISOString()}

const DEFAULT_DATA = ${JSON.stringify(updatedDefaultData, null, 2)};

// Node.js module export support for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_DATA;
}
`;

  fs.writeFileSync(path.join(__dirname, '../js/default-data.js'), fileContent, 'utf8');
  console.log(`✓ Successfully synchronized ${resolvedPath} into js/default-data.js!`);
  console.log(`✓ Now, whenever you push to Netlify, this filled timetable will load for EVERYONE by default.`);
} catch (err) {
  console.error(`Error parsing backup file:`, err.message);
  process.exit(1);
}
