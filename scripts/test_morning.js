const fs = require('fs');
const assert = require('assert');
const path = require('path');
const JSZip = require('jszip');
global.JSZip = JSZip;
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
global.DOCX_TEMPLATE_ASSETS = DOCX_TEMPLATE_ASSETS;
const DocxGenerator = require('../js/docx-generator.js');
const DEFAULT_DATA = require('../js/default-data.js');
global.DEFAULT_DATA = DEFAULT_DATA;

async function testMorningSystem() {
  console.log('=== Running Morning System Comprehensive Tests ===');

  // 1. Verify default-data.js has complete morning data
  assert(DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.morning, 'shifts.morning must exist');
  assert.strictEqual(DEFAULT_DATA.shifts.morning.periods.length, 5, 'Must have 5 morning periods');
  assert.strictEqual(DEFAULT_DATA.shifts.morning.periods[0].time, '8:20 to 9:05', 'Period 1 time must be 8:20 to 9:05');
  assert.strictEqual(DEFAULT_DATA.shifts.morning.periods[1].time, '9:05 to 9:50', 'Period 2 time must be 9:05 to 9:50');
  assert.strictEqual(DEFAULT_DATA.shifts.morning.periods[2].time, '10:10 to 10:55', 'Period 3 time must be 10:10 to 10:55');
  assert.strictEqual(DEFAULT_DATA.shifts.morning.periods[3].time, '10:55 to 11:40', 'Period 4 time must be 10:55 to 11:40');
  assert.strictEqual(DEFAULT_DATA.shifts.morning.periods[4].time, '11:40 to 12:20', 'Period 5 time must be 11:40 to 12:20');

  // 2. Standards
  const morningStds = DEFAULT_DATA.standards.filter(s => s.shift === 'morning');
  assert.strictEqual(morningStds.length, 5, 'Must have 5 morning standards');
  const mStdIds = morningStds.map(s => s.id);
  assert.deepStrictEqual(mStdIds, ['std_fg', 'std_lkg', 'std_hkg', 'std_1', 'std_2'], 'Standards IDs must match');

  // 3. Teachers & Profiles
  const morningTeachers = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am", "Yamin Ma'am"];
  morningTeachers.forEach(t => {
    assert(DEFAULT_DATA.teachers.includes(t), `Teacher ${t} must be in teachers array`);
    assert(DEFAULT_DATA.teacherProfiles[t], `Teacher ${t} must have profile`);
    const shift = DEFAULT_DATA.teacherProfiles[t].assignedShift;
    assert(shift === 'morning' || shift === 'both', `Teacher ${t} shift must be morning or both`);
  });

  // 4. Schedules check across Monday-Friday
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  days.forEach(day => {
    const daySched = DEFAULT_DATA.shifts.morning.schedules[day];
    assert(daySched, `Schedule for ${day} must exist`);
    ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(pId => {
      assert(daySched[pId], `Period ${pId} on ${day} must exist`);
      mStdIds.forEach(stdId => {
        const slot = daySched[pId][stdId];
        assert(slot, `Slot for ${stdId} in ${pId} on ${day} must exist`);
        assert(slot.subject, `Slot for ${stdId} in ${pId} on ${day} must have subject: found empty`);
      });
    });
  });

  // Verify merged slots in Monday
  const monP1 = DEFAULT_DATA.shifts.morning.schedules.Monday.p1;
  assert.strictEqual(monP1.std_lkg.colSpan, 2, 'LKG Monday p1 must have colSpan 2');
  assert.strictEqual(monP1.std_hkg.isMergedChild, true, 'HKG Monday p1 must be merged child');
  assert.strictEqual(monP1.std_1.colSpan, 2, '1st Monday p1 must have colSpan 2');
  assert.strictEqual(monP1.std_2.isMergedChild, true, '2nd Monday p1 must be merged child');

  console.log('✓ Test 1: Morning Default Data & Schedules Integrity passes');

  // 5. Docx Export Test for Morning Shift
  const state = JSON.parse(JSON.stringify(DEFAULT_DATA));
  state.activeShift = 'morning';
  state.currentDay = 'Monday';
  state.leaves = {};
  state.excludedFreeTeachers = {};
  state.schedules = DEFAULT_DATA.initialSchedules;

  const morningDocxBlob = await DocxGenerator.generateDocxBlob(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], state);
  assert(morningDocxBlob && morningDocxBlob.size > 2000, 'Morning docx blob must be generated and valid');
  const buffer = Buffer.from(await morningDocxBlob.arrayBuffer());
  fs.writeFileSync('test_output_morning_schedule.docx', buffer);
  console.log('✓ Test 2: Morning Full Week Docx Export generated test_output_morning_schedule.docx');

  console.log('--- All Morning System Tests Passed! ---');
}

testMorningSystem().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
