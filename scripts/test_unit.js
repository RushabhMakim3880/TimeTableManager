const assert = require('assert');
const JSZip = require('jszip');
global.JSZip = JSZip;
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
global.DOCX_TEMPLATE_ASSETS = DOCX_TEMPLATE_ASSETS;
const DEFAULT_DATA = require('../js/default-data.js');
global.DEFAULT_DATA = DEFAULT_DATA;
const DocxGenerator = require('../js/docx-generator.js');

async function runTests() {
  console.log('--- Running Enterprise Timetable Studio Unit Tests ---');

  const state = {
    schoolProfile: DEFAULT_DATA.schoolProfile,
    schedules: DEFAULT_DATA.initialSchedules,
    standards: DEFAULT_DATA.standards,
    periods: DEFAULT_DATA.periods,
    shifts: DEFAULT_DATA.shifts,
    classTeachers: DEFAULT_DATA.classTeachers,
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

  // Test 9: Class-Wise Weekly Timetable Docx for Afternoon Shift (e.g. Standard 3rd)
  state.classTeachers = DEFAULT_DATA.classTeachers;
  state.includeSaturday = false; // Deactivated by default
  const classWeeklyXml3Default = DocxGenerator.generateClassWeeklyXml('std_3', state, true);
  assert(classWeeklyXml3Default.toUpperCase().includes("STANDARD: 3RD"), 'Must include standard 3rd in header');
  assert(classWeeklyXml3Default.toUpperCase().includes("CLASS TEACHER:"), 'Must include Class Teacher header label');
  assert(classWeeklyXml3Default.includes("Priya Ma&apos;am") || classWeeklyXml3Default.includes("Priya Ma'am"), 'Must include Class Teacher Priya Ma\'am');
  assert(classWeeklyXml3Default.includes("RECESS BREAK • 3:15 PM"), 'Must include Afternoon Recess Break timing');
  assert(classWeeklyXml3Default.includes("Monday") && !classWeeklyXml3Default.includes("<w:t>Saturday</w:t>"), 'Must NOT include Saturday when deactivated');
  assert(classWeeklyXml3Default.includes('<w:gridSpan w:val="6"/>'), 'Recess break must span 6 columns when Saturday deactivated');

  // Test toggling Saturday activated
  state.includeSaturday = true;
  const classWeeklyXml3WithSat = DocxGenerator.generateClassWeeklyXml('std_3', state, true);
  assert(classWeeklyXml3WithSat.includes("<w:t>Saturday</w:t>"), 'Must include Saturday when activated');
  assert(classWeeklyXml3WithSat.includes('<w:gridSpan w:val="7"/>'), 'Recess break must span 7 columns when Saturday activated');
  state.includeSaturday = false; // Reset to default deactivated
  
  const classWeeklyBlob3 = await DocxGenerator.generateClassTimetablesDocxBlob(['std_3'], state);
  assert(classWeeklyBlob3, 'Class weekly docx blob must be generated');
  assert(classWeeklyBlob3.size > 1000, 'Class weekly docx blob must be valid zip');
  fs.writeFileSync('test_output_class_weekly_std3.docx', Buffer.from(await classWeeklyBlob3.arrayBuffer()));
  console.log('✓ Test 9: Class-Wise Weekly Timetable (Afternoon - Std 3rd) Docx generation passes (verified 5-day & 6-day)');

  // Test 10: Class-Wise Weekly Timetable Docx for Morning Shift (e.g. LKG & 1st)
  const classWeeklyXmlLkg = DocxGenerator.generateClassWeeklyXml('std_lkg', state, true);
  assert(classWeeklyXmlLkg.toUpperCase().includes("L.K.G") || classWeeklyXmlLkg.toUpperCase().includes("LKG"), 'Must include L.K.G in header');
  assert(classWeeklyXmlLkg.includes("RECESS BREAK • 9:50 AM"), 'Must include Morning Recess Break timing');
  assert(classWeeklyXmlLkg.includes("8:20"), 'Must include morning period timing');

  const classWeeklyBlobMorning = await DocxGenerator.generateClassTimetablesDocxBlob(['std_lkg', 'std_1'], state);
  assert(classWeeklyBlobMorning && classWeeklyBlobMorning.size > 1000, 'Morning class timetables blob must be valid');
  fs.writeFileSync('test_output_class_weekly_morning.docx', Buffer.from(await classWeeklyBlobMorning.arrayBuffer()));
  console.log('✓ Test 10: Class-Wise Weekly Timetable (Morning - LKG & 1st) Docx generation passes');

  // Test 11: Dedicated Attendance Duty & Roll-Call Roster (.docx)
  state.attendanceDuties = DEFAULT_DATA.attendanceDuties;
  state.includeSaturday = false;
  const attendanceDutiesXmlDefault = DocxGenerator.generateAttendanceDutiesXml(state);
  assert(attendanceDutiesXmlDefault.includes("ATTENDANCE"), 'Must include attendance duty title');
  assert(attendanceDutiesXmlDefault.includes("Morning Shift Attendance") || attendanceDutiesXmlDefault.includes("Morning"), 'Must include morning shift duty');
  assert(attendanceDutiesXmlDefault.includes("Dolly Ma&apos;am") || attendanceDutiesXmlDefault.includes("Dolly Ma'am"), 'Must include Monday assigned teacher Dolly Ma\'am');
  assert(!attendanceDutiesXmlDefault.includes("<w:t>Saturday</w:t>"), 'Must NOT include Saturday in attendance duty when deactivated');

  // Verify Payal Ma'am (assigned on Saturday) appears when Saturday is activated
  state.includeSaturday = true;
  const attendanceDutiesXmlWithSat = DocxGenerator.generateAttendanceDutiesXml(state);
  assert(attendanceDutiesXmlWithSat.includes("Payal Ma&apos;am") || attendanceDutiesXmlWithSat.includes("Payal Ma'am"), 'Must include Saturday assigned teacher Payal Ma\'am when Saturday activated');
  assert(attendanceDutiesXmlWithSat.includes("<w:t>Saturday</w:t>"), 'Must include Saturday column when activated');
  state.includeSaturday = false; // Reset to default

  const attendanceDutiesBlob = await DocxGenerator.generateAttendanceDutiesDocxBlob(state);
  assert(attendanceDutiesBlob && attendanceDutiesBlob.size > 1000, 'Attendance duty docx blob must be valid');
  fs.writeFileSync('test_output_attendance_duties.docx', Buffer.from(await attendanceDutiesBlob.arrayBuffer()));
  console.log('✓ Test 11: Dedicated Daily Attendance Duty Roster Docx generation passes (verified 5-day & 6-day)');

  console.log('--- All Enterprise Unit Tests Passed! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
