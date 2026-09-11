const assert = require('assert');
const JSZip = require('jszip');
global.JSZip = JSZip;
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
global.DOCX_TEMPLATE_ASSETS = DOCX_TEMPLATE_ASSETS;
const DEFAULT_DATA = require('../js/default-data.js');
const DocxGenerator = require('../js/docx-generator.js');

function testFreeTeachersLogic() {
  console.log('--- Testing Removable Free Teachers (Half-Day Faculty) Feature ---');

  const afternoonPeriods = (DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.afternoon && DEFAULT_DATA.shifts.afternoon.periods) || DEFAULT_DATA.periods;
  const state = {
    schoolProfile: DEFAULT_DATA.schoolProfile,
    schedules: JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules)),
    standards: DEFAULT_DATA.standards.filter(s => s.shift === 'afternoon'),
    periods: afternoonPeriods,
    teachers: [...DEFAULT_DATA.teachers],
    days: [...DEFAULT_DATA.days],
    leaves: {},
    substitutions: {},
    excludedFreeTeachers: {}
  };

  const period = state.periods[0]; // p1
  const day = 'Monday';
  const dayData = state.schedules[day] || {};
  const activeTeachers = state.teachers;

  // 1. Initial State: Determine free teachers for p1
  const pSlots = dayData[period.id] || {};
  const busyTeachers = [];
  state.standards.forEach(std => {
    const slot = pSlots[std.id];
    if (slot && slot.teacher && slot.teacher.trim()) {
      busyTeachers.push(slot.teacher.trim());
    }
  });

  let excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[`${day}_${period.id}`]) || [];
  let freeTeachers = activeTeachers.filter(t => !busyTeachers.includes(t) && !excludedForPeriod.includes(t));
  let removedTeachers = activeTeachers.filter(t => !busyTeachers.includes(t) && excludedForPeriod.includes(t));

  console.log('Initial Free Teachers in Period 1:', freeTeachers);
  assert(freeTeachers.length > 0, 'There should be free teachers in Period 1');
  assert.strictEqual(removedTeachers.length, 0, 'Initially no removed teachers');

  const teacherToRemove = freeTeachers[0]; // e.g. Astha Ma'am or Khushi Ma'am
  console.log(`Simulating half-day removal of: ${teacherToRemove}`);

  // 2. Remove teacher
  const key = `${day}_${period.id}`;
  if (!state.excludedFreeTeachers[key]) state.excludedFreeTeachers[key] = [];
  state.excludedFreeTeachers[key].push(teacherToRemove);

  // Recompute
  excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[key]) || [];
  freeTeachers = activeTeachers.filter(t => !busyTeachers.includes(t) && !excludedForPeriod.includes(t));
  removedTeachers = activeTeachers.filter(t => !busyTeachers.includes(t) && excludedForPeriod.includes(t));

  console.log('Updated Free Teachers in Period 1:', freeTeachers);
  console.log('Removed Teachers:', removedTeachers);
  assert(!freeTeachers.includes(teacherToRemove), 'Removed teacher must NOT be in free teachers list');
  assert(removedTeachers.includes(teacherToRemove), 'Removed teacher must be in removedTeachers list');
  assert.strictEqual(removedTeachers.length, 1);

  // 3. Test Docx export with exclusion
  const dayXml = DocxGenerator.generateDayXml(
    day,
    state.schedules[day],
    {},
    state.standards,
    state.periods,
    state.teachers,
    [],
    state.schoolProfile,
    true,
    state.excludedFreeTeachers
  );
  const p1Xml = dayXml.split('<w:t>Lecture 2</w:t>')[0];
  const teacherEscaped = teacherToRemove.replace("'", "&apos;");
  assert(!p1Xml.includes(teacherEscaped) && !p1Xml.includes(teacherToRemove), 'Removed teacher must NOT appear in Word docx period 1');
  console.log(`✓ Verified: ${teacherToRemove} successfully excluded from Word Docx period 1`);

  // 4. Verify no Restore feature exists: teacher stays removed cleanly
  assert(!freeTeachers.includes(teacherToRemove), 'Removed teacher remains cleanly deleted from free teachers');
  console.log('--- All Removable Free Teachers Flow Tests Passed (No Restore)! ---');
}

testFreeTeachersLogic();
