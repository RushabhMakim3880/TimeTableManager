const assert = require('assert');
const fs = require('fs');
const JSZip = require('jszip');
global.JSZip = JSZip;
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
global.DOCX_TEMPLATE_ASSETS = DOCX_TEMPLATE_ASSETS;
const DEFAULT_DATA = require('../js/default-data.js');
const DocxGenerator = require('../js/docx-generator.js');

async function testGeneralDutiesFlow() {
  console.log('--- Testing School & Assembly General Duties Flow ---');

  // 1. Validate Default Presets & Initial Duties
  assert(Array.isArray(DEFAULT_DATA.generalDutyPresets), 'generalDutyPresets must be an array');
  assert(DEFAULT_DATA.generalDutyPresets.length >= 5, 'Should have at least 5 default duty presets');
  const presetNames = DEFAULT_DATA.generalDutyPresets.map(p => p.name);
  console.log('Available presets:', presetNames);
  assert(presetNames.some(n => n.includes('Assembly')), 'Should have an Assembly preset');
  assert(presetNames.some(n => n.includes('Present / Absent') || n.includes('Attendance')), 'Should have an Attendance/Roll Call preset');
  assert(presetNames.some(n => n.includes('Recess') || n.includes('Corridor')), 'Should have a Recess/Corridor preset');

  assert(Array.isArray(DEFAULT_DATA.initialGeneralDuties), 'initialGeneralDuties must be an array');
  assert(DEFAULT_DATA.initialGeneralDuties.length >= 4, 'Should have at least 4 pre-filled initial general duties');
  
  // Verify day-wise allocations exist
  DEFAULT_DATA.initialGeneralDuties.forEach(d => {
    assert(d.allocations, `Duty "${d.dutyName}" must have allocations object`);
    assert(typeof d.allocations === 'object', 'allocations must be an object');
    assert(d.allocations['Monday'] !== undefined, 'Must contain Monday allocation');
  });
  console.log('✓ Step 1: Default presets & initial duties day-wise data structure valid');

  // 2. State & Duty Lifecycle
  let generalDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialGeneralDuties));
  const initialCount = generalDuties.length;

  // Add a new custom day-wise duty
  const customDuty = {
    id: `gd_${Date.now()}_123`,
    dutyName: "Kids Present / Absent Roll Call & Report",
    allocations: {
      "Monday": "Payal Ma'am",
      "Tuesday": "Alpa Ma'am",
      "Wednesday": "Manali Ma'am",
      "Thursday": "Priya Ma'am",
      "Friday": "Dolly Ma'am"
    },
    teacher: "Payal Ma'am",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    time: "1:30 PM – 1:45 PM",
    location: "Admin Office",
    notes: "Compile headcounts and submit to front desk"
  };
  generalDuties.push(customDuty);
  assert.strictEqual(generalDuties.length, initialCount + 1, 'Duty count should increment after adding custom duty');
  console.log('✓ Step 2: Custom day-wise duty successfully added');

  // Edit the custom duty allocations
  const dutyToEdit = generalDuties.find(d => d.id === customDuty.id);
  assert(dutyToEdit, 'Added duty must be found');
  dutyToEdit.dutyName = "Morning Entry & Gate Uniform Inspection";
  dutyToEdit.allocations["Monday"] = "Khushi Ma'am";
  dutyToEdit.time = "12:30 PM – 1:00 PM";
  dutyToEdit.location = "Main Front Gate";
  console.log('✓ Step 3: Day-wise duty successfully edited');

  // Filter duties by teacher across allocations
  const payalDuties = generalDuties.filter(d => 
    Object.values(d.allocations || {}).includes("Payal Ma'am")
  );
  assert(payalDuties.length >= 1, "Payal Ma'am should have assigned duties");
  console.log(`✓ Step 4: Teacher filter works (Found ${payalDuties.length} duties with Payal Ma'am)`);

  // Delete a duty
  const toDeleteId = customDuty.id;
  generalDuties = generalDuties.filter(d => d.id !== toDeleteId);
  assert.strictEqual(generalDuties.length, initialCount, 'Duty count should return to initialCount after deletion');
  console.log('✓ Step 5: Duty successfully deleted');

  // 3. Word (.docx) Generation Verification
  const testState = {
    schoolProfile: DEFAULT_DATA.schoolProfile,
    generalDuties: DEFAULT_DATA.initialGeneralDuties
  };

  const xml = DocxGenerator.generateGeneralDutiesXml(testState);
  assert(xml.includes('FACULTY GENERAL &amp; SPECIAL SCHOOL DUTIES ROSTER') || xml.includes('FACULTY GENERAL & SPECIAL SCHOOL DUTIES ROSTER'), 'Document title missing in XML');
  assert(xml.includes('Duty / Responsibility'), 'Table column header Duty / Responsibility missing');
  assert(xml.includes('Timing &amp; Area'), 'Table column header Timing & Area missing');
  assert(xml.includes('Monday'), 'Table column header Monday missing');
  assert(xml.includes('Tuesday'), 'Table column header Tuesday missing');
  assert(xml.includes('Wednesday'), 'Table column header Wednesday missing');
  assert(xml.includes('Thursday'), 'Table column header Thursday missing');
  assert(xml.includes('Friday'), 'Table column header Friday missing');
  assert(xml.includes('Operational Guidelines'), 'Table column header Operational Guidelines missing');
  assert(xml.includes('Prepared By:'), 'Sign-off Prepared By missing');
  assert(xml.includes('Approved By:'), 'Sign-off Approved By missing');
  console.log('✓ Step 6: Word XML generated with 8-column Day-Wise Grid table headers and school letterhead');

  const blob = await DocxGenerator.generateGeneralDutiesDocxBlob(testState);
  assert(blob, 'Blob must not be null');
  assert(blob.size > 2000, `Blob size (${blob.size}) should be > 2000 bytes`);
  fs.writeFileSync('test_general_duties_roster.docx', Buffer.from(await blob.arrayBuffer()));
  console.log('✓ Step 7: Word .docx binary archive created successfully (Size: ' + blob.size + ' bytes)');

  // 4. Verify DOM bindings in index.html
  const html = fs.readFileSync('index.html', 'utf8');
  const requiredIds = [
    'section-general-duty-view',
    'btn-add-general-duty',
    'select-general-duty-filter-teacher',
    'btn-download-general-duties-docx',
    'btn-print-general-duties',
    'btn-clear-all-general-duties',
    'general-duty-total-badge',
    'general-duty-day-tabs',
    'general-duty-thead',
    'general-duty-tbody',
    'general-duty-modal',
    'general-duty-modal-title',
    'btn-close-general-duty-modal',
    'input-general-duty-id',
    'modal-general-duty-presets-container',
    'input-general-duty-name',
    'select-general-duty-quick-teacher',
    'btn-gduty-apply-all-days',
    'gduty-day-allocations-container',
    'select-gduty-day-Monday',
    'select-gduty-day-Tuesday',
    'select-gduty-day-Wednesday',
    'select-gduty-day-Thursday',
    'select-gduty-day-Friday',
    'input-general-duty-time',
    'input-general-duty-location',
    'input-general-duty-notes',
    'btn-cancel-general-duty',
    'btn-save-general-duty'
  ];

  requiredIds.forEach(id => {
    assert(html.includes(`id="${id}"`), `Missing required ID in index.html: ${id}`);
  });
  console.log(`✓ Step 8: All ${requiredIds.length} required HTML IDs verified in index.html`);

  console.log('--- All General Duties Flow Tests Passed Cleanly! ---');
}

testGeneralDutiesFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
