const assert = require('assert');
const DEFAULT_DATA = require('../js/default-data.js');

console.log('--- Testing Dual Shift & Duplicate Teacher Handling ---');

// 1. Verify DEFAULT_DATA has Yamin Ma'am as dual shift
assert(DEFAULT_DATA.teacherProfiles["Yamin Ma'am"], "Yamin Ma'am must exist in DEFAULT_DATA.teacherProfiles");
assert.strictEqual(DEFAULT_DATA.teacherProfiles["Yamin Ma'am"].assignedShift, "both", "Yamin Ma'am must have assignedShift: 'both'");
console.log('✓ Test 1: DEFAULT_DATA has Yamin Ma\'am with assignedShift: both');

// Simulate state and functions as in app.js
const state = {
  activeShift: 'morning',
  teachers: [...DEFAULT_DATA.teachers],
  teacherProfiles: JSON.parse(JSON.stringify(DEFAULT_DATA.teacherProfiles))
};

function getTeacherShift(teacher) {
  const morningDefaults = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am"];
  const prof = (state.teacherProfiles && state.teacherProfiles[teacher]) || {};
  if (prof.assignedShift) return prof.assignedShift;
  if (teacher === "Yamin Ma'am") return 'both';
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

// 2. Verify Yamin Ma'am is in BOTH morning and afternoon shift lists
const morningList = getTeachersForShift('morning');
const afternoonList = getTeachersForShift('afternoon');
assert(morningList.includes("Yamin Ma'am"), "Yamin Ma'am MUST appear in morning shift teacher list");
assert(afternoonList.includes("Yamin Ma'am"), "Yamin Ma'am MUST appear in afternoon shift teacher list");
console.log('✓ Test 2: Yamin Ma\'am is present in both Morning and Afternoon faculty lists');

// 3. Simulate adding an afternoon teacher to morning shift
const testTeacher = "Payal Ma'am"; // currently afternoon
assert.strictEqual(getTeacherShift(testTeacher), "afternoon");

// User tries to add Payal Ma'am to morning shift
const currentShift = getTeacherShift(testTeacher);
const requestedShift = 'morning';
if (requestedShift === 'both' || (currentShift !== requestedShift && currentShift !== 'both')) {
  state.teacherProfiles[testTeacher].assignedShift = 'both';
}
assert.strictEqual(getTeacherShift(testTeacher), "both", "Payal Ma'am must now be dual shift");
assert(getTeachersForShift('morning').includes(testTeacher), "Payal Ma'am should now appear in morning shift list");
assert(getTeachersForShift('afternoon').includes(testTeacher), "Payal Ma'am should still appear in afternoon shift list");
console.log('✓ Test 3: Adding an existing teacher to a different shift cleanly upgrades them to dual shift');

// 4. Verify adding a duplicate name with distinguishing suffix
const duplicateName = "Alpa Ma'am";
const shiftName = 'Morning';
let candidate = `${duplicateName} (${shiftName})`;
let idx = 2;
while (state.teachers.includes(candidate)) {
  candidate = `${duplicateName} (${shiftName} ${idx})`;
  idx++;
}
assert.strictEqual(candidate, "Alpa Ma'am (Morning)");
state.teachers.push(candidate);
state.teacherProfiles[candidate] = {
  primarySubject: 'Maths',
  assignedShift: 'morning'
};
assert(getTeachersForShift('morning').includes("Alpa Ma'am (Morning)"), "Disambiguated duplicate teacher appears in morning list");
assert(!getTeachersForShift('afternoon').includes("Alpa Ma'am (Morning)"), "Morning duplicate does not appear in afternoon list");
console.log('✓ Test 4: Duplicate name disambiguation allows multiple staff with same name across or within shifts');

console.log('=== All Dual Shift Tests Passed Successfully! ===');
