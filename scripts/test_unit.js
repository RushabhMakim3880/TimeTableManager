const assert = require('assert');
const JSZip = require('jszip');
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
const DEFAULT_DATA = require('../js/default-data.js');
const DocxGenerator = require('../js/docx-generator.js');

async function runTests() {
  console.log('--- Running Timetable Studio Unit Tests ---');

  // Test 1: Single Day XML generation
  const singleDayXml = DocxGenerator.buildFullDocumentXml(
    ['Monday'],
    DEFAULT_DATA.initialSchedules,
    DEFAULT_DATA.standards,
    DEFAULT_DATA.periods,
    DEFAULT_DATA.teachers,
    {}
  );
  assert(singleDayXml.includes('<w:t>Monday</w:t>'), 'Title must include Monday');
  assert(singleDayXml.includes('Standard: 3'), 'Must contain Standard: 3');
  assert(singleDayXml.includes('rd</w:t>'), 'Must contain superscript rd');
  assert(singleDayXml.includes('Free Teachers'), 'Must contain Free Teachers header');
  assert(!singleDayXml.includes('<w:br w:type="page"/>'), 'Single day should NOT contain a page break');
  console.log('✓ Test 1: Single Day XML passes');

  // Test 2: Multi-day export with page breaks
  const multiDayXml = DocxGenerator.buildFullDocumentXml(
    ['Monday', 'Tuesday', 'Wednesday'],
    DEFAULT_DATA.initialSchedules,
    DEFAULT_DATA.standards,
    DEFAULT_DATA.periods,
    DEFAULT_DATA.teachers,
    {}
  );
  const pageBreaks = (multiDayXml.match(/<w:br w:type="page"\/>/g) || []).length;
  assert.strictEqual(pageBreaks, 2, '3 days should have exactly 2 page breaks');
  console.log('✓ Test 2: Multi-day page breaks pass');

  // Test 3: Leave handling removes teacher from free teachers
  const leaveXml = DocxGenerator.buildFullDocumentXml(
    ['Monday'],
    DEFAULT_DATA.initialSchedules,
    DEFAULT_DATA.standards,
    DEFAULT_DATA.periods,
    DEFAULT_DATA.teachers,
    { 'Monday': ["Dolly Ma'am"] }
  );
  // In Monday Lecture 1, Dolly Ma'am would normally be free. With leave, she should not be in Lecture 1's free teachers.
  assert(!leaveXml.includes('<w:t>Dolly Ma\'am</w:t>'), 'Dolly Ma\'am on leave should not appear in document');
  console.log('✓ Test 3: Leave handling passes');

  // Test 4: Verify ZIP generation with JSZip
  const zip = new JSZip();
  for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
    zip.file(path, content);
  }
  zip.file('word/document.xml', singleDayXml);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  assert(buf.length > 5000, 'Docx zip must be greater than 5KB');
  console.log('✓ Test 4: Zip generation produces valid buffer (' + buf.length + ' bytes)');

  console.log('--- All Unit Tests Passed! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
