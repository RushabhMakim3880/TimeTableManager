const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.js', 'utf8');

const idRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const idsInJs = new Set();
while ((match = idRegex.exec(js)) !== null) {
  idsInJs.add(match[1]);
}

let missing = 0;
for (const id of idsInJs) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    console.error('MISSING ID IN HTML:', id);
    missing++;
  }
}

if (missing === 0) {
  console.log(`✓ All ${idsInJs.size} DOM getElementById calls in app.js exist perfectly in index.html!`);
} else {
  console.error(`${missing} IDs missing!`);
  process.exit(1);
}

// Check view-tab-btn data-view values
const viewTabRegex = /class="view-tab-btn[^"]*"[^>]*data-view="([^"]+)"/g;
const viewsInHtml = [];
while ((match = viewTabRegex.exec(html)) !== null) {
  viewsInHtml.push(match[1]);
}
console.log('✓ Found navigation view tabs:', viewsInHtml.join(', '));

// Check view sections
viewsInHtml.forEach(view => {
  const sectionId = `section-${view}`;
  if (!html.includes(`id="${sectionId}"`)) {
    console.error(`Missing section for view: ${sectionId}`);
    process.exit(1);
  }
});
console.log('✓ All view sections matched!');
