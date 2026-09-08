/**
 * docx-generator.js
 * Generates Word (.docx) documents matching Monday.docx specifications:
 * - A4 Landscape (16838 x 11906 dxa)
 * - 0.5 inch (720 dxa) margins
 * - Centered 14pt bold title for each day
 * - TableGrid with centered vertical & horizontal alignment
 * - Standard headers with superscript suffixes (3rd, 4th, etc.)
 * - Bold Subject with (Teacher Name)
 * - Auto-calculated Free Teachers in the 8th column
 * - Clean page breaks between days for full-week export
 */

const DocxGenerator = (function() {

  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/[<>&'"]/g, function(c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  // Column widths matching Monday.docx
  const COL_WIDTHS_DXA = [1565, 1972, 1973, 1973, 2004, 2004, 2004, 1893];
  const COL_WIDTHS_PCT = [509, 641, 641, 641, 651, 651, 651, 616];

  /**
   * Generates the XML for a single day's timetable (Title + Table)
   */
  function generateDayXml(dayName, daySchedule, standards, periods, allTeachers, leaveTeachers, isLastDay) {
    // 1. Calculate active teachers (excluding those on leave)
    const activeTeachers = allTeachers.filter(t => !(leaveTeachers || []).includes(t));

    let xml = '';

    // Day Title (Centered, Bold, 28 half-points = 14pt)
    xml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:rPr>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="28"/>
          <w:szCs w:val="28"/>
          <w:lang w:val="en-US"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="28"/>
          <w:szCs w:val="28"/>
          <w:lang w:val="en-US"/>
        </w:rPr>
        <w:t>${escapeXml(dayName)}</w:t>
      </w:r>
    </w:p>`;

    // Table begin
    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
      </w:tblPr>
      <w:tblGrid>`;
    COL_WIDTHS_DXA.forEach(w => {
      xml += `<w:gridCol w:w="${w}"/>`;
    });
    xml += `</w:tblGrid>`;

    // Row 0: Table Header
    xml += `
      <w:tr>
        <w:trPr>
          <w:tblHeader/>
        </w:trPr>
        <!-- Col 0: Empty corner cell -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${COL_WIDTHS_PCT[0]}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
          </w:p>
        </w:tc>`;

    // Standards columns (Col 1 to 6)
    standards.forEach((std, sIdx) => {
      const pctWidth = COL_WIDTHS_PCT[sIdx + 1] || 641;
      const base = std.baseName || ('Standard: ' + std.name.replace(/\D/g, ''));
      const sup = std.sup || (std.name.match(/[a-z]+/i) ? std.name.match(/[a-z]+/i)[0] : '');

      xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${pctWidth}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(base)}</w:t>
            </w:r>
            ${sup ? `
            <w:r>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:vertAlign w:val="superscript"/>
                <w:lang w:val="en-US"/>
              </w:rPr>
              <w:t>${escapeXml(sup)}</w:t>
            </w:r>` : ''}
          </w:p>
        </w:tc>`;
    });

    // Col 7: Free Teachers Header
    xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${COL_WIDTHS_PCT[7]}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
              <w:t>Free Teachers</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>`;

    // Row 1 to N: Period Rows
    periods.forEach(period => {
      const pData = (daySchedule && daySchedule[period.id]) || {};

      // Calculate Assigned Teachers in this period
      const assignedTeachers = [];
      standards.forEach(std => {
        const slot = pData[std.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          assignedTeachers.push(slot.teacher.trim());
        }
      });

      // Calculate Free Teachers: Active teachers not assigned in this period
      const freeTeachers = activeTeachers.filter(t => !assignedTeachers.includes(t.trim()));

      xml += `
      <w:tr>
        <!-- Col 0: Lecture Number & Timing -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${COL_WIDTHS_PCT[0]}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
              <w:t>${escapeXml(period.label)}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
              <w:t>${escapeXml(period.time)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;

      // Standard Columns (Subject & Teacher)
      standards.forEach((std, sIdx) => {
        const pctWidth = COL_WIDTHS_PCT[sIdx + 1] || 641;
        const slot = pData[std.id] || { subject: '', teacher: '' };
        const hasSubject = slot.subject && slot.subject.trim();
        const hasTeacher = slot.teacher && slot.teacher.trim();

        xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${pctWidth}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
            </w:pPr>
            ${hasSubject ? `
            <w:r>
              <w:rPr>
                <w:b/>
                <w:bCs/>
                <w:lang w:val="en-US"/>
              </w:rPr>
              <w:t>${escapeXml(slot.subject)}</w:t>
            </w:r>` : ''}
          </w:p>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
            ${hasTeacher ? `
            <w:r>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
              <w:t>(${escapeXml(slot.teacher)})</w:t>
            </w:r>` : ''}
          </w:p>
        </w:tc>`;
      });

      // Free Teachers Column
      xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${COL_WIDTHS_PCT[7]}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>`;

      if (freeTeachers.length === 0) {
        xml += `
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr><w:lang w:val="en-US"/><w:color w:val="777777"/></w:rPr>
              <w:t>-</w:t>
            </w:r>
          </w:p>`;
      } else {
        freeTeachers.forEach(tName => {
          xml += `
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr><w:lang w:val="en-US"/></w:rPr>
              <w:t>${escapeXml(tName)}</w:t>
            </w:r>
          </w:p>`;
        });
      }

      xml += `
        </w:tc>
      </w:tr>`;
    });

    // Table end
    xml += `
    </w:tbl>`;

    // Page break between days (if not the last day)
    if (!isLastDay) {
      xml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:rPr><w:lang w:val="en-US"/></w:rPr>
        </w:pPr>
      </w:p>
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:rPr><w:lang w:val="en-US"/></w:rPr>
        </w:pPr>
        <w:r>
          <w:rPr><w:lang w:val="en-US"/></w:rPr>
          <w:br w:type="page"/>
        </w:r>
      </w:p>`;
    }

    return xml;
  }

  /**
   * Builds the complete word/document.xml string
   */
  function buildFullDocumentXml(daysToExport, schedules, standards, periods, teachers, leavesMap) {
    let bodyXml = '';

    daysToExport.forEach((day, index) => {
      const isLast = (index === daysToExport.length - 1);
      const daySchedule = schedules[day] || {};
      const dayLeaves = leavesMap[day] || [];
      bodyXml += generateDayXml(day, daySchedule, standards, periods, teachers, dayLeaves, isLast);
    });

    // Landscape A4 section properties matching Monday.docx
    bodyXml += `
      <w:sectPr>
        <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
        <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="709" w:footer="709" w:gutter="0"/>
        <w:cols w:space="708"/>
        <w:docGrid w:linePitch="360"/>
      </w:sectPr>`;

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document 
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" 
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" 
  xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" 
  xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/10/21/chartex" 
  xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/9/chartex" 
  xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/10/chartex" 
  xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/11/chartex" 
  xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/12/chartex" 
  xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/13/chartex" 
  xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/14/chartex" 
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" 
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" 
  xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" 
  xmlns:o="urn:schemas-microsoft-com:office:office" 
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" 
  xmlns:v="urn:schemas-microsoft-com:vml" 
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" 
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" 
  xmlns:w10="urn:schemas-microsoft-com:office:word" 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" 
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" 
  xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" 
  xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" 
  xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" 
  xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" 
  xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" 
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" 
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" 
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" 
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" 
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;
  }

  /**
   * Generates a zip Blob containing the full docx
   */
  async function generateDocxBlob(daysToExport, state) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required to build Word documents.');
    }

    const zip = new JSZip();

    // 1. Populate all static template files
    if (typeof DOCX_TEMPLATE_ASSETS !== 'undefined') {
      for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
        zip.file(path, content);
      }
    } else {
      throw new Error('DOCX_TEMPLATE_ASSETS is missing.');
    }

    // 2. Generate dynamic document.xml
    const docXml = buildFullDocumentXml(
      daysToExport,
      state.schedules,
      state.standards,
      state.periods,
      state.teachers,
      state.leaves || {}
    );
    zip.file('word/document.xml', docXml);

    // 3. Generate Blob
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return blob;
  }

  /**
   * Downloads a blob as a file in the browser
   */
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  return {
    generateDayXml,
    buildFullDocumentXml,
    generateDocxBlob,
    triggerDownload
  };

})();

// Export for Node test environment if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocxGenerator;
}
