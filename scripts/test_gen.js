const fs = require('fs');
const JSZip = require('jszip');
const DOCX_TEMPLATE_ASSETS = require('../js/template-assets.js');
const DEFAULT_DATA = require('../js/default-data.js');
const DocxGenerator = require('../js/docx-generator.js');

async function run() {
  const state = {
    schedules: DEFAULT_DATA.initialSchedules,
    standards: DEFAULT_DATA.standards,
    periods: DEFAULT_DATA.periods,
    teachers: DEFAULT_DATA.teachers,
    leaves: {}
  };

  const docXml = DocxGenerator.buildFullDocumentXml(
    ['Monday', 'Tuesday'],
    state.schedules,
    state.standards,
    state.periods,
    state.teachers,
    state.leaves
  );

  console.log('Generated XML characters:', docXml.length);

  const zip = new JSZip();
  for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
    zip.file(path, content);
  }
  zip.file('word/document.xml', docXml);

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  fs.writeFileSync('Test_Weekly.docx', buffer);
  console.log('Saved Test_Weekly.docx successfully! Size:', buffer.length, 'bytes');
}

run().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
