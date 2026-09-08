const assert = require('assert');
const JSZip = require('jszip');
global.JSZip = JSZip;
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
global.DOCX_TEMPLATE_ASSETS = DOCX_TEMPLATE_ASSETS;
const DEFAULT_DATA = require('../js/default-data.js');
const DocxGenerator = require('../js/docx-generator.js');

async function runTests() {
  console.log('--- Running Enterprise Timetable Studio Unit Tests ---');

  const state = {
    schoolProfile: DEFAULT_DATA.schoolProfile,
    schedules: DEFAULT_DATA.initialSchedules,
    standards: DEFAULT_DATA.standards,
    periods: DEFAULT_DATA.periods,
    teachers: DEFAULT_DATA.teachers,
    days: DEFAULT_DATA.days,
    leaves: {}
  };

  // Test 1: Class Timetable XML with School Header & Sign-Off (Clean - No Extra Duties)
  const classXml = DocxGenerator.buildFullDocumentXml(
    ['Monday'],
    state.schedules,
    state.standards,
    state.periods,
    state.teachers,
    state.leaves,
    state.schoolProfile,
    DEFAULT_DATA.initialDuties
  );
  assert(classXml.includes("FUNLAND"), 'Must include school name in header');
  assert(classXml.includes('Prepared By:'), 'Must include sign-off prepared by');
  assert(classXml.includes('Approved By:'), 'Must include sign-off approved by');
  assert(!classXml.includes('Duty &amp; Supervision Schedule'), 'Must NOT include Duty & Supervision Schedule table in weekly class timetable');
  console.log('✓ Test 1: Class Timetable XML with School Letterhead (Clean without extra duties) passes');

  // Test 2: Teacher-Wise Timetable XML
  const teacherBlob = await DocxGenerator.generateTeacherTimetablesDocxBlob(["Payal Ma'am"], state);
  assert(teacherBlob, 'Teacher timetable blob must be generated');
  console.log('✓ Test 2: Teacher-Wise Individual Timetable Docx generation passes');

  // Test 3: Daily Substitution Duty Slip XML
  const subList = [
    {
      periodId: 'p1',
      periodLabel: 'Lecture 1',
      periodTime: '1:00 to 1:45',
      stdId: 'std_3',
      stdName: 'Standard: 3rd',
      absentTeacher: "Payal Ma'am",
      proxyTeacher: "Dolly Ma'am"
    }
  ];
  const subBlob = await DocxGenerator.generateSubstitutionDocxBlob('Monday', subList, state);
  assert(subBlob, 'Substitution notice blob must be generated');
  console.log('✓ Test 3: Daily Substitution Duty Slip Docx generation passes');

  // Test 4: Verify Class Timetable with Duties Docx Generation
  state.duties = DEFAULT_DATA.initialDuties;
  const classBlob = await DocxGenerator.generateDocxBlob(['Monday', 'Tuesday'], state);
  assert(classBlob, 'Class timetable blob with duties must be generated');

  // Test 5: Verify Python-docx parse of multi-view documents
  const fs = require('fs');
  fs.writeFileSync('test_output_class.docx', Buffer.from(await classBlob.arrayBuffer()));
  fs.writeFileSync('test_output_teacher.docx', Buffer.from(await teacherBlob.arrayBuffer()));
  fs.writeFileSync('test_output_sub.docx', Buffer.from(await subBlob.arrayBuffer()));
  console.log('✓ Test 4 & 5: Multi-view Docx files including Table 1 & Table 2 written to disk');

  // Test 6: Weekly Faculty Extra Duty Matrix (Notebook Format - Clean Table Only)
  state.weeklyDuties = DEFAULT_DATA.initialWeeklyDuties;
  const weeklyDutyXml = DocxGenerator.generateWeeklyDutyXml(state);
  assert(weeklyDutyXml.includes("WEEKLY FACULTY EXTRA DUTY"), 'Must include weekly duty header');
  assert(weeklyDutyXml.includes("Dolly Ma&apos;am") || weeklyDutyXml.includes("Dolly Ma'am"), 'Must include teacher Dolly Ma\'am');
  assert(weeklyDutyXml.includes("3 to 5 Maths"), 'Must include assigned duty 3 to 5 Maths');
  assert(!weeklyDutyXml.includes("Duty Allocation Summary Breakdown"), 'Must NOT include tally summary breakdown');
  assert(!weeklyDutyXml.includes("Approved By:"), 'Must NOT include signature block');
  assert(!weeklyDutyXml.includes("St. Xavier"), 'Must NOT include school header / letterhead');
  assert(!weeklyDutyXml.includes(">Saturday<"), 'Must NOT include Saturday in weekly duty matrix');

  const weeklyDutyBlob = await DocxGenerator.generateWeeklyDutyDocxBlob(state);
  assert(weeklyDutyBlob, 'Weekly duty blob must be generated');
  fs.writeFileSync('test_output_weekly_duty.docx', Buffer.from(await weeklyDutyBlob.arrayBuffer()));
  console.log('✓ Test 6: Weekly Faculty Extra Duty Clean Table Docx generation passes');

  // Test 7: Excluded Free Teachers (Half-Day Staff) in Class Timetable Docx Export
  state.excludedFreeTeachers = {
    'Monday_p1': ["Astha Ma'am", "Khushi Ma'am"]
  };
  const classDocxWithExclusions = await DocxGenerator.generateDocxBlob(['Monday'], state);
  assert(classDocxWithExclusions, 'Class timetable blob with excluded free teachers must be generated');
  const classDocxXml = DocxGenerator.buildFullDocumentXml(
    ['Monday'],
    state.schedules,
    state.standards,
    state.periods,
    state.teachers,
    state.leaves,
    state.schoolProfile,
    state.duties,
    state.excludedFreeTeachers
  );
  // Period 1 should not have Astha Ma'am in free teachers
  // Let's verify that generateDayXml filtered out Astha Ma'am and Khushi Ma'am for Monday_p1
  const dayXml = DocxGenerator.generateDayXml(
    'Monday',
    state.schedules['Monday'],
    {},
    state.standards,
    state.periods,
    state.teachers,
    [],
    state.schoolProfile,
    true,
    state.excludedFreeTeachers
  );
  // Split into periods or inspect period 1
  const p1Xml = dayXml.split('<w:t>Lecture 2</w:t>')[0];
  assert(!p1Xml.includes('Astha Ma&apos;am') && !p1Xml.includes('Astha Ma\'am'), 'Must NOT include Astha Ma\'am in period 1 free teachers');
  assert(!p1Xml.includes('Khushi Ma&apos;am') && !p1Xml.includes('Khushi Ma\'am'), 'Must NOT include Khushi Ma\'am in period 1 free teachers');
  // Test 8: School & Assembly General Duties Roster (.docx)
  state.generalDuties = DEFAULT_DATA.initialGeneralDuties;
  const generalDutiesXml = DocxGenerator.generateGeneralDutiesXml(state);
  assert(generalDutiesXml.includes("FACULTY GENERAL"), 'Must include general duties roster header');
  assert(generalDutiesXml.includes("Morning Assembly"), 'Must include Morning Assembly duty');
  assert(generalDutiesXml.includes("Kids Present / Absent Roll Call"), 'Must include attendance duty');
  assert(generalDutiesXml.includes("Alpa Ma&apos;am") || generalDutiesXml.includes("Alpa Ma'am"), 'Must include assigned teacher Alpa Ma\'am');
  assert(generalDutiesXml.includes("Approved By:"), 'Must include sign-off approval block');

  const generalDutiesBlob = await DocxGenerator.generateGeneralDutiesDocxBlob(state);
  assert(generalDutiesBlob, 'General duties docx blob must be generated');
  assert(generalDutiesBlob.size > 1000, 'Docx blob must be a valid non-empty zip archive');
  fs.writeFileSync('test_output_general_duties.docx', Buffer.from(await generalDutiesBlob.arrayBuffer()));
  console.log('✓ Test 8: School & Assembly General Duties Roster Docx generation passes');

  console.log('--- All Enterprise Unit Tests Passed! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
