const assert = require('assert');
const fs = require('fs');

// 1. Verify default-data.js and timetable-backup.json
console.log('--- Testing Default Data & Backup Integrity ---');
const DEFAULT_DATA = require('../js/default-data.js');
const backupData = JSON.parse(fs.readFileSync('data/timetable-backup.json', 'utf8'));

assert(DEFAULT_DATA.teacherProfiles["Kavita Ma'am"], "Kavita Ma'am must exist in DEFAULT_DATA.teacherProfiles");
assert.strictEqual(DEFAULT_DATA.teacherProfiles["Kavita Ma'am"].primarySubject, "", "Kavita Ma'am primarySubject must be defined string (not undefined)");
assert(backupData.teacherProfiles["Kavita Ma'am"], "Kavita Ma'am must exist in backupData.teacherProfiles");
assert.strictEqual(backupData.teacherProfiles["Kavita Ma'am"].primarySubject, "", "Kavita Ma'am primarySubject in backup must be defined string");
console.log("✓ Test 1: Kavita Ma'am profile has valid primarySubject string in defaults & backup");

// 2. Verify shift separation logic
console.log('--- Testing Teacher Shift Separation Logic ---');
const state = {
  activeShift: 'afternoon',
  teachers: [...DEFAULT_DATA.teachers],
  teacherProfiles: JSON.parse(JSON.stringify(DEFAULT_DATA.teacherProfiles)),
  standards: JSON.parse(JSON.stringify(DEFAULT_DATA.standards))
};

function getTeacherShift(teacher) {
  const morningDefaults = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am"];
  const prof = (state.teacherProfiles && state.teacherProfiles[teacher]) || {};
  if (prof.assignedShift) return prof.assignedShift;
  if (morningDefaults.includes(teacher)) return 'morning';
  return 'afternoon';
}

function getTeachersForShift(shift = state.activeShift) {
  if (!shift || shift === 'all') {
    return state.teachers || [];
  }
  return (state.teachers || []).filter(t => {
    const tShift = getTeacherShift(t);
    if (shift === 'morning') {
      return tShift === 'morning' || tShift === 'both';
    }
    if (shift === 'afternoon') {
      return tShift === 'afternoon' || tShift === 'both';
    }
    return true;
  });
}

// Check afternoon shift
const afternoonTeachers = getTeachersForShift('afternoon');
console.log('Afternoon Teachers Count:', afternoonTeachers.length, afternoonTeachers);
assert(!afternoonTeachers.includes("Rakshita Ma'am"), "Rakshita Ma'am must NOT be in afternoon shift");
assert(!afternoonTeachers.includes("Neelam Ma'am"), "Neelam Ma'am must NOT be in afternoon shift");
assert(!afternoonTeachers.includes("Geetanjali Ma'am"), "Geetanjali Ma'am must NOT be in afternoon shift");
assert(afternoonTeachers.includes("Payal Ma'am"), "Payal Ma'am must be in afternoon shift");
assert(afternoonTeachers.includes("Alpa Ma'am"), "Alpa Ma'am must be in afternoon shift");
console.log("✓ Test 2: Afternoon shift strictly excludes morning faculty");

// Check morning shift
const morningTeachers = getTeachersForShift('morning');
console.log('Morning Teachers Count:', morningTeachers.length, morningTeachers);
assert(morningTeachers.includes("Rakshita Ma'am"), "Rakshita Ma'am must be in morning shift");
assert(morningTeachers.includes("Neelam Ma'am"), "Neelam Ma'am must be in morning shift");
assert(morningTeachers.includes("Geetanjali Ma'am"), "Geetanjali Ma'am must be in morning shift");
assert(!morningTeachers.includes("Payal Ma'am"), "Payal Ma'am must NOT be in morning shift");
assert(!morningTeachers.includes("Alpa Ma'am"), "Alpa Ma'am must NOT be in morning shift");
assert(!morningTeachers.includes("Taniya Ma'am"), "Taniya Ma'am must NOT be in morning shift");
console.log("✓ Test 3: Morning shift strictly excludes afternoon faculty");

// 3. Verify Class Shift Scoping for Modal
console.log('--- Testing Modal & Standard Scoping ---');
const std3rd = state.standards.find(s => s.id === 'std_3');
const stdShift3rd = (std3rd && std3rd.shift) || 'afternoon';
const allowedFor3rd = getTeachersForShift(stdShift3rd);
assert(!allowedFor3rd.includes("Rakshita Ma'am"), "Standard 3rd (afternoon) must not allow Rakshita Ma'am");

const stdNursery = state.standards.find(s => s.id === 'std_fg' || s.id === 'std_nursery');
const stdShiftNursery = (stdNursery && stdNursery.shift) || 'morning';
const allowedForNursery = getTeachersForShift(stdShiftNursery);
assert(!allowedForNursery.includes("Payal Ma'am"), "Nursery (morning) must not allow Payal Ma'am");
assert(allowedForNursery.includes("Neelam Ma'am"), "Nursery (morning) must allow Neelam Ma'am");
console.log("✓ Test 4: Modal standard shift scoping correctly isolates teachers");

// 4. Verify Firestore Sanitizer
console.log('--- Testing Firestore Undefined Sanitizer ---');
function sanitizeForFirestore(val) {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map(item => (item === undefined ? null : sanitizeForFirestore(item)));
  }
  const clean = {};
  Object.keys(val).forEach(key => {
    const v = val[key];
    if (v !== undefined) {
      clean[key] = sanitizeForFirestore(v);
    }
  });
  return clean;
}

const badPayload = {
  teacherProfiles: {
    "Kavita Ma'am": {
      primarySubject: undefined,
      maxPeriods: 5
    },
    "Test Ma'am": {
      notes: undefined,
      arrayWithUndefined: [1, undefined, 3]
    }
  },
  undefinedField: undefined
};

const sanitized = sanitizeForFirestore(badPayload);
assert(!('undefinedField' in sanitized), "Root undefined field must be omitted");
assert(!('primarySubject' in sanitized.teacherProfiles["Kavita Ma'am"]), "Undefined primarySubject must be omitted from object");
assert(!('notes' in sanitized.teacherProfiles["Test Ma'am"]), "Undefined notes must be omitted");
assert.strictEqual(sanitized.teacherProfiles["Test Ma'am"].arrayWithUndefined[1], null, "Undefined in arrays must be converted to null for Firestore");

// Double check JSON serialization
const jsonStr = JSON.stringify(sanitized);
assert(!jsonStr.includes('undefined'), "JSON payload must contain zero occurrences of undefined");
console.log("✓ Test 5: sanitizeForFirestore successfully eliminates all undefined fields");

console.log('=== All Shift Separation & Firebase Tests Passed! ===');
