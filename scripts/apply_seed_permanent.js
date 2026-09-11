const fs = require('fs');
const path = require('path');

const morningSchedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'morning_schedule.json'), 'utf-8'));
const defaultData = require('../js/default-data.js');

// 1. Morning Periods (exact 5 periods)
const morningPeriods = [
  { id: 'p1', number: 1, label: 'Lecture 1', time: '8:20 to 9:05' },
  { id: 'p2', number: 2, label: 'Lecture 2', time: '9:05 to 9:50' },
  { id: 'p3', number: 3, label: 'Lecture 3', time: '10:10 to 10:55' },
  { id: 'p4', number: 4, label: 'Lecture 4', time: '10:55 to 11:40' },
  { id: 'p5', number: 5, label: 'Lecture 5', time: '11:40 to 12:20' }
];

if (!defaultData.shifts) defaultData.shifts = {};
if (!defaultData.shifts.morning) defaultData.shifts.morning = {};
defaultData.shifts.morning.periods = morningPeriods;
defaultData.shifts.morning.schedules = morningSchedule;

// 2. Standards (5 morning standards)
const morningStandards = [
  { id: 'std_fg', name: 'FG', baseName: 'FG', sup: '', shift: 'morning', room: 'Pre-Primary Hall', section: 'A' },
  { id: 'std_lkg', name: 'L.K.G', baseName: 'L.K.G', sup: '', shift: 'morning', room: 'Room KG-1', section: 'A' },
  { id: 'std_hkg', name: 'H.K.G', baseName: 'H.K.G', sup: '', shift: 'morning', room: 'Room KG-2', section: 'A' },
  { id: 'std_1', name: 'Standard: 1st', baseName: 'Standard: 1', sup: 'st', shift: 'morning', room: 'Room 001', section: 'A' },
  { id: 'std_2', name: 'Standard: 2nd', baseName: 'Standard: 2', sup: 'nd', shift: 'morning', room: 'Room 002', section: 'A' }
];

const afternoonStandards = (defaultData.standards || []).filter(s => s.shift === 'afternoon');
defaultData.standards = [...morningStandards, ...afternoonStandards];

// 3. Teachers
const morningFaculty = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am", "Yamin Ma'am"];
morningFaculty.forEach(t => {
  if (!defaultData.teachers.includes(t)) {
    defaultData.teachers.push(t);
  }
});

// 4. Teacher Profiles
if (!defaultData.teacherProfiles) defaultData.teacherProfiles = {};
defaultData.teacherProfiles["Rakshita Ma'am"] = {
  primarySubject: "Maths",
  assignedShift: "morning",
  maxPeriods: 5,
  workSchedule: "full_day",
  halfDayAvailability: "all"
};
defaultData.teacherProfiles["Neelam Ma'am"] = {
  primarySubject: "English",
  assignedShift: "morning",
  maxPeriods: 5,
  workSchedule: "full_day",
  halfDayAvailability: "all"
};
defaultData.teacherProfiles["Geetanjali Ma'am"] = {
  primarySubject: "Gymnastics",
  assignedShift: "morning",
  maxPeriods: 5,
  workSchedule: "full_day",
  halfDayAvailability: "all"
};
defaultData.teacherProfiles["Yamin Ma'am"] = {
  primarySubject: "Drawing",
  assignedShift: "both",
  maxPeriods: 6,
  workSchedule: "full_day",
  halfDayAvailability: "all"
};

// Ensure all other teachers have assignedShift: afternoon
Object.keys(defaultData.teacherProfiles).forEach(t => {
  if (!morningFaculty.includes(t)) {
    defaultData.teacherProfiles[t].assignedShift = "afternoon";
  }
});

// 5. Subjects
const morningSubjects = ['Extra Activity', 'Articulation', 'Gymnastics', 'Games', 'Drawing', 'English', 'Maths', 'A', 'R'];
morningSubjects.forEach(s => {
  if (!defaultData.subjects.includes(s)) {
    defaultData.subjects.push(s);
  }
});

// 6. Merge into initialSchedules
if (!defaultData.initialSchedules) defaultData.initialSchedules = {};
Object.keys(morningSchedule).forEach(day => {
  if (!defaultData.initialSchedules[day]) defaultData.initialSchedules[day] = {};
  const dayData = morningSchedule[day];
  Object.keys(dayData).forEach(pId => {
    if (!defaultData.initialSchedules[day][pId]) defaultData.initialSchedules[day][pId] = {};
    const pSlots = dayData[pId];
    Object.keys(pSlots).forEach(stdId => {
      defaultData.initialSchedules[day][pId][stdId] = JSON.parse(JSON.stringify(pSlots[stdId]));
    });
  });
});

// 7. Write to default-data.js
const defaultDataFileContent = `// Default presets for School Timetable Management System
// Auto-synchronized with Morning & Afternoon schedules on ${new Date().toISOString()}

const DEFAULT_DATA = ${JSON.stringify(defaultData, null, 2)};

// Node.js module export support for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_DATA;
}
`;

fs.writeFileSync(path.join(__dirname, '../js/default-data.js'), defaultDataFileContent, 'utf-8');
console.log('Successfully wrote js/default-data.js');

// 8. Write to data/timetable-backup.json
let backupData = {};
try {
  backupData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/timetable-backup.json'), 'utf-8'));
} catch(e) {
  backupData = {};
}

backupData.schoolProfile = defaultData.schoolProfile;
backupData.standards = defaultData.standards;
backupData.periods = defaultData.periods;
backupData.teachers = defaultData.teachers;
backupData.teacherProfiles = defaultData.teacherProfiles;
backupData.subjects = defaultData.subjects;
backupData.shifts = defaultData.shifts;
backupData.schedules = defaultData.initialSchedules;
backupData.classTeachers = defaultData.classTeachers;
backupData.days = defaultData.days;
backupData.dutyPresets = defaultData.dutyPresets;
backupData.initialDuties = defaultData.initialDuties;
backupData.weeklyDutyPresets = defaultData.weeklyDutyPresets;
backupData.initialWeeklyDuties = defaultData.initialWeeklyDuties;
backupData.generalDutyPresets = defaultData.generalDutyPresets;
backupData.initialGeneralDuties = defaultData.initialGeneralDuties;
backupData.attendanceDuties = defaultData.attendanceDuties;

fs.writeFileSync(path.join(__dirname, '../data/timetable-backup.json'), JSON.stringify(backupData, null, 2), 'utf-8');
console.log('Successfully wrote data/timetable-backup.json');
