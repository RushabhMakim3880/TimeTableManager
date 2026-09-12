/**
 * docx-generator.js - Enterprise Academic Edition
 * Generates Word (.docx) documents with institutional standards:
 * - Official School Header / Letterhead (Name, Affiliation, Academic Session)
 * - Table 1: Class-Wise Master Timetable
 * - Table 2: Extra Duty & Supervision Schedule for Free Staff
 * - Official Sign-Off Block (Prepared by, Verified by, Approved by Principal)
 * - Teacher-Wise Individual Schedules
 * - Daily Substitution & Proxy Duty Slips
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
   * Generates institutional school letterhead XML
   */
  function generateSchoolHeaderXml(schoolProfile, subTitle) {
    const profile = schoolProfile || {};
    const name = profile.name || "School Timetable Management";
    const affiliation = profile.affiliation || "";
    const session = profile.academicYear || "";

    let xml = `
    <!-- Institutional School Header -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="60"/>
        <w:rPr>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="32"/>
          <w:szCs w:val="32"/>
          <w:color w:val="1E3A8A"/>
          <w:lang w:val="en-US"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="32"/>
          <w:szCs w:val="32"/>
          <w:color w:val="1E3A8A"/>
          <w:lang w:val="en-US"/>
        </w:rPr>
        <w:t>${escapeXml(name)}</w:t>
      </w:r>
    </w:p>`;

    if (affiliation || session) {
      xml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:after="100"/>
          <w:rPr>
            <w:sz w:val="18"/>
            <w:szCs w:val="18"/>
            <w:color w:val="475569"/>
            <w:lang w:val="en-US"/>
          </w:rPr>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:sz w:val="18"/>
            <w:szCs w:val="18"/>
            <w:color w:val="475569"/>
            <w:lang w:val="en-US"/>
          </w:rPr>
          <w:t>${escapeXml(affiliation)} • ${escapeXml(session)}</w:t>
        </w:r>
      </w:p>`;
    }

    if (subTitle) {
      xml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:after="140"/>
          <w:rPr>
            <w:b/>
            <w:bCs/>
            <w:sz w:val="24"/>
            <w:szCs w:val="24"/>
            <w:color w:val="0F172A"/>
            <w:lang w:val="en-US"/>
          </w:rPr>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:bCs/>
            <w:sz w:val="24"/>
            <w:szCs w:val="24"/>
            <w:color w:val="0F172A"/>
            <w:lang w:val="en-US"/>
          </w:rPr>
          <w:t>${escapeXml(subTitle)}</w:t>
        </w:r>
      </w:p>`;
    }

    return xml;
  }

  /**
   * Generates formal administrative sign-off block XML
   */
  function generateSignOffBlockXml(schoolProfile) {
    const profile = schoolProfile || {};
    const prep = profile.preparedBy || "Timetable Coordinator";
    const ver = profile.verifiedBy || "Academic Head";
    const app = profile.approvedBy || "Principal";

    return `
    <w:p><w:pPr><w:spacing w:before="160" w:after="60"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblBorders>
          <w:top w:val="none"/>
          <w:left w:val="none"/>
          <w:bottom w:val="none"/>
          <w:right w:val="none"/>
          <w:insideH w:val="none"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="5000"/>
        <w:gridCol w:w="5000"/>
        <w:gridCol w:w="5000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:p>
            <w:pPr><w:jc w:val="left"/><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>Prepared By: ________________</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(prep)}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>Verified By: ________________</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(ver)}</w:t></w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:p>
            <w:pPr><w:jc w:val="right"/><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:sz w:val="18"/><w:color w:val="64748B"/></w:rPr><w:t>Approved By: ________________</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="right"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="334155"/></w:rPr><w:t>${escapeXml(app)}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>`;
  }

  /**
   * Generates Table 2: Duty & Supervision Table for Free Teachers
   */
  function generateDutyTableXml(dayName, dayDuties, periods, standards, daySchedule, activeTeachers) {
    let dutiesList = [];

    periods.forEach(p => {
      const pSlots = (daySchedule && daySchedule[p.id]) || {};
      const busy = [];
      standards.forEach(s => {
        if (pSlots[s.id] && pSlots[s.id].teacher && pSlots[s.id].teacher.trim()) {
          busy.push(pSlots[s.id].teacher.trim());
        }
      });

      const freeTeachers = activeTeachers.filter(t => !busy.includes(t));
      const pDuties = (dayDuties && dayDuties[p.id]) || {};

      freeTeachers.forEach(t => {
        const dObj = pDuties[t] || { duty: 'Lesson Planning & Preparation', location: 'Staff Room' };
        dutiesList.push({
          periodLabel: p.label,
          periodTime: p.time,
          teacher: t,
          duty: dObj.duty || 'Lesson Planning & Preparation',
          location: dObj.location || 'Staff Room'
        });
      });
    });

    let xml = `
    <!-- Subheading for Duty & Supervision Table -->
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="80"/>
        <w:rPr>
          <w:b/>
          <w:sz w:val="22"/>
          <w:color w:val="1E3A8A"/>
          <w:lang w:val="en-US"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="22"/>
          <w:color w:val="1E3A8A"/>
          <w:lang w:val="en-US"/>
        </w:rPr>
        <w:t>Duty &amp; Supervision Schedule for Non-Teaching Staff • ${escapeXml(dayName)}</w:t>
      </w:r>
    </w:p>`;

    if (dutiesList.length === 0) {
      xml += `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>All faculty fully occupied with classroom lectures.</w:t></w:r></w:p>`;
      return xml;
    }

    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2200"/>
        <w:gridCol w:w="2800"/>
        <w:gridCol w:w="3800"/>
        <w:gridCol w:w="3500"/>
        <w:gridCol w:w="2500"/>
      </w:tblGrid>
      <w:tr>
        <w:trPr><w:tblHeader/></w:trPr>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>Period / Time</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>Free Faculty Member</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>Assigned Duty / Task</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>Location / Instructions</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="19"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="19"/></w:rPr><w:t>Staff Signature</w:t></w:r></w:p></w:tc>
      </w:tr>`;

    dutiesList.forEach(item => {
      xml += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.periodLabel)}</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(item.periodTime)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr><w:t>${escapeXml(item.teacher)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(item.duty)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="475569"/></w:rPr><w:t>${escapeXml(item.location)}</w:t></w:r></w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>_______________</w:t></w:r></w:p>
        </w:tc>
      </w:tr>`;
    });

    xml += `</w:tbl>`;
    return xml;
  }

  /**
   * Generates the XML for a single day's class timetable + duty schedule
   */
  function generateDayXml(dayName, daySchedule, dayDuties, standards, periods, allTeachers, leaveTeachers, schoolProfile, isLastDay, excludedFreeTeachersMap) {
    const isMorning = standards.length === 5 || standards.some(s => s.shift === 'morning');
    const activeTeachers = allTeachers.filter(t => {
      if ((leaveTeachers || []).includes(t)) return false;
      return true;
    });

    const colWidthsDxa = isMorning
      ? [1600, 2040, 2040, 2040, 2040, 2040, 2600]
      : COL_WIDTHS_DXA;
    const colWidthsPct = isMorning
      ? [533, 680, 680, 680, 680, 680, 867]
      : COL_WIDTHS_PCT;

    let xml = '';

    // School Header + Day Title
    xml += generateSchoolHeaderXml(schoolProfile, `${dayName} • Academic Schedule`);

    // Table 1: Class Timetable
    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
      </w:tblPr>
      <w:tblGrid>`;
    colWidthsDxa.forEach(w => {
      xml += `<w:gridCol w:w="${w}"/>`;
    });
    xml += `</w:tblGrid>`;

    // Row 0: Table Header
    xml += `
      <w:tr>
        <w:trPr><w:tblHeader/></w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidthsPct[0]}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="20"/><w:lang w:val="en-US"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:lang w:val="en-US"/></w:rPr><w:t>Period / Time</w:t></w:r>
          </w:p>
        </w:tc>`;

    // Standards columns
    standards.forEach((std, sIdx) => {
      const pctWidth = colWidthsPct[sIdx + 1] || 680;
      const base = std.baseName || (std.name.includes('Standard:') ? 'Standard: ' + std.name.replace(/\D/g, '') : std.name);
      let sup = (std.sup !== undefined && std.sup !== '') ? std.sup : '';
      if (!sup && (std.name.includes('1st') || std.name.includes('2nd') || std.name.includes('3rd') || std.name.includes('th'))) {
        const m = std.name.match(/1st|2nd|3rd|\d+th/i);
        if (m) sup = m[0].replace(/\d+/g, '');
      }

      xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${pctWidth}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
            <w:r>
              <w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr>
              <w:t xml:space="preserve">${escapeXml(base)}</w:t>
            </w:r>
            ${sup ? `
            <w:r>
              <w:rPr><w:b/><w:bCs/><w:vertAlign w:val="superscript"/><w:lang w:val="en-US"/></w:rPr>
              <w:t>${escapeXml(sup)}</w:t>
            </w:r>` : ''}
          </w:p>
        </w:tc>`;
    });

    // Free Teachers Header
    const freeColPct = colWidthsPct[colWidthsPct.length - 1] || 867;
    xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${freeColPct}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:jc w:val="center"/>
              <w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr>
            </w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr><w:t>Free Teachers</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>`;

    // Period Rows
    periods.forEach((period, pIdx) => {
      // Recess break row placement (morning index 2: 9:50-10:10; afternoon index 3: 3:15-3:45)
      const isMorningRecess = isMorning && pIdx === 2;
      const isAfternoonRecess = !isMorning && pIdx === 3;
      if (isMorningRecess || isAfternoonRecess) {
        const recessText = isMorning
          ? 'MORNING RECESS BREAK • 9:50 AM TO 10:10 AM (20 MINUTES)'
          : 'AFTERNOON RECESS BREAK • 3:15 PM TO 3:45 PM (30 MINUTES)';
        xml += `
        <w:tr>
          <w:tc>
            <w:tcPr>
              <w:gridSpan w:val="${standards.length + 2}"/>
              <w:tcW w:w="5000" w:type="pct"/>
              <w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>
              <w:vAlign w:val="center"/>
            </w:tcPr>
            <w:p>
              <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/><w:lang w:val="en-US"/></w:rPr></w:pPr>
              <w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/><w:lang w:val="en-US"/></w:rPr><w:t>${escapeXml(recessText)}</w:t></w:r>
            </w:p>
          </w:tc>
        </w:tr>`;
      }

      const pData = (daySchedule && daySchedule[period.id]) || {};

      const assignedTeachers = [];
      standards.forEach(std => {
        const slot = pData[std.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          assignedTeachers.push(slot.teacher.trim());
        }
      });

      const excludedForPeriod = (excludedFreeTeachersMap && excludedFreeTeachersMap[`${dayName}_${period.id}`]) || [];
      const freeTeachers = activeTeachers.filter(t => !assignedTeachers.includes(t.trim()) && !excludedForPeriod.includes(t.trim()));

      xml += `
      <w:tr>
        <!-- Col 0: Lecture Number & Timing -->
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidthsPct[0]}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr><w:t>${escapeXml(period.label)}</w:t></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${escapeXml(period.time)}</w:t></w:r>
          </w:p>
        </w:tc>`;

      // Standard Columns with support for cell merges (colSpan)
      let sIdx = 0;
      while (sIdx < standards.length) {
        const std = standards[sIdx];
        const slot = pData[std.id] || { subject: '', teacher: '' };

        if (slot.isMergedChild) {
          sIdx++;
          continue;
        }

        const span = slot.colSpan && slot.colSpan > 1 ? slot.colSpan : 1;
        let combinedPct = 0;
        for (let k = 0; k < span; k++) {
          combinedPct += (colWidthsPct[sIdx + 1 + k] || 680);
        }

        const hasSubject = slot.subject && slot.subject.trim();
        const hasTeacher = slot.teacher && slot.teacher.trim();

        xml += `
        <w:tc>
          <w:tcPr>
            ${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}
            <w:tcW w:w="${combinedPct}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr></w:pPr>
            ${hasSubject ? `
            <w:r><w:rPr><w:b/><w:bCs/><w:lang w:val="en-US"/></w:rPr><w:t>${escapeXml(slot.subject)}</w:t></w:r>` : ''}
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>
            ${hasTeacher ? `
            <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>(${escapeXml(slot.teacher)})</w:t></w:r>` : ''}
          </w:p>
        </w:tc>`;

        sIdx += span;
      }

      // Free Teachers Column
      xml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${freeColPct}" w:type="pct"/>
            <w:vAlign w:val="center"/>
          </w:tcPr>`;

      if (freeTeachers.length === 0) {
        xml += `
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:lang w:val="en-US"/><w:color w:val="777777"/></w:rPr><w:t>-</w:t></w:r>
          </w:p>`;
      } else {
        freeTeachers.forEach(tName => {
          xml += `
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>
            <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:t>${escapeXml(tName)}</w:t></w:r>
          </w:p>`;
        });
      }

      xml += `
        </w:tc>
      </w:tr>`;
    });

    xml += `</w:tbl>`;

    // Append formal sign-off block (Extra duties are now managed & exported separately in their own dedicated tab)
    xml += generateSignOffBlockXml(schoolProfile);

    // Page break between days
    if (!isLastDay) {
      xml += `
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:br w:type="page"/></w:r>
      </w:p>`;
    }

    return xml;
  }

  /**
   * Generates a clean 1-page individual weekly timetable for a specific teacher.
   * Outputs ONLY teacher's name and the Monday-to-Friday table (no headers, subtitles, workloads, Saturday, or signatures).
   */
  function generateTeacherWeeklyXml(teacherName, state, isLastTeacher) {
    const { periods, standards, schedules } = state;
    const includeSat = !!(state && state.includeSaturday);
    const teacherDays = includeSat 
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    let xml = '';

    // Only Teacher's Name as header
    xml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="120" w:after="240"/>
        <w:rPr>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="36"/>
          <w:szCs w:val="36"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:bCs/>
          <w:sz w:val="36"/>
          <w:szCs w:val="36"/>
          <w:color w:val="1E3A8A"/>
        </w:rPr>
        <w:t>${escapeXml(teacherName)}</w:t>
      </w:r>
    </w:p>`;

    // Table: Periods as rows, Days as columns
    const dayColWidth = includeSat ? '2100' : '2600';
    let teacherTblGrid = `<w:gridCol w:w="2200"/>`;
    teacherDays.forEach(() => {
      teacherTblGrid += `<w:gridCol w:w="${dayColWidth}"/>`;
    });

    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
      </w:tblPr>
      <w:tblGrid>
        ${teacherTblGrid}
      </w:tblGrid>`;

    // Header Row: Days (Mon to Fri only, Saturday excluded)
    xml += `
      <w:tr>
        <w:trPr><w:tblHeader/></w:trPr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Period / Time</w:t></w:r></w:p>
        </w:tc>`;
    teacherDays.forEach(d => {
      xml += `
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(d)}</w:t></w:r></w:p>
        </w:tc>`;
    });
    xml += `</w:tr>`;

    // Period Rows
    periods.forEach(p => {
      xml += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(p.label)}</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(p.time)}</w:t></w:r></w:p>
        </w:tc>`;

      teacherDays.forEach(d => {
        const dSched = schedules[d] || {};
        const pSlots = dSched[p.id] || {};
        let assignedClass = null;
        let assignedSubj = null;

        standards.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].teacher && pSlots[s.id].teacher.trim() === teacherName) {
            assignedClass = s.name.replace('Standard: ', 'Std ');
            assignedSubj = pSlots[s.id].subject;
          }
        });

        xml += `
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>`;

        if (assignedClass && assignedSubj) {
          xml += `
            <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(assignedSubj)}</w:t></w:r></w:p>
            <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr><w:t>(${escapeXml(assignedClass)})</w:t></w:r></w:p>`;
        } else {
          xml += `
            <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:color w:val="94A3B8"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="94A3B8"/></w:rPr><w:t>-- FREE --</w:t></w:r></w:p>`;
        }

        xml += `</w:tc>`;
      });

      xml += `</w:tr>`;
    });

    xml += `</w:tbl>`;

    if (!isLastTeacher) {
      xml += `
      <w:p>
        <w:pPr><w:jc w:val="center"/><w:rPr><w:lang w:val="en-US"/></w:rPr></w:pPr>
        <w:r><w:rPr><w:lang w:val="en-US"/></w:rPr><w:br w:type="page"/></w:r>
      </w:p>`;
    }

    return xml;
  }

  /**
   * Generates formal Daily Substitution & Proxy Duty Slip
   */
  function generateSubstitutionNoticeXml(dayName, substitutionList, state) {
    const { schoolProfile } = state;
    let xml = '';

    xml += generateSchoolHeaderXml(schoolProfile, `DAILY FACULTY SUBSTITUTION & PROXY DUTY NOTICE`);

    xml += `
    <w:p>
      <w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="20"/><w:color w:val="B91C1C"/></w:rPr><w:t>Date / Day: ${escapeXml(dayName)} • Emergency Relief Duty Roster</w:t></w:r>
    </w:p>`;

    if (!substitutionList || substitutionList.length === 0) {
      xml += `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>No teacher substitutions recorded for ${escapeXml(dayName)}. All regular staff on duty.</w:t></w:r></w:p>`;
    } else {
      xml += `
      <w:tbl>
        <w:tblPr>
          <w:tblStyle w:val="TableGrid"/>
          <w:tblW w:w="5000" w:type="pct"/>
        </w:tblPr>
        <w:tblGrid>
          <w:gridCol w:w="2000"/>
          <w:gridCol w:w="2200"/>
          <w:gridCol w:w="2500"/>
          <w:gridCol w:w="3000"/>
          <w:gridCol w:w="3000"/>
          <w:gridCol w:w="2500"/>
        </w:tblGrid>
        <w:tr>
          <w:trPr><w:tblHeader/></w:trPr>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Period</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Timing</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Class / Std</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Absent Teacher</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="15803D"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="15803D"/></w:rPr><w:t>Proxy Staff Assigned</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Staff Signature</w:t></w:r></w:p></w:tc>
        </w:tr>`;

      substitutionList.forEach(sub => {
        xml += `
        <w:tr>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(sub.periodLabel || sub.periodId)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(sub.periodTime || '')}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(sub.stdName || sub.stdId)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:strike/><w:color w:val="B91C1C"/></w:rPr></w:pPr><w:r><w:rPr><w:strike/><w:color w:val="B91C1C"/></w:rPr><w:t>${escapeXml(sub.absentTeacher)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="15803D"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="15803D"/></w:rPr><w:t>${escapeXml(sub.proxyTeacher)}</w:t></w:r></w:p></w:tc>
          <w:tc><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>_______________</w:t></w:r></w:p></w:tc>
        </w:tr>`;
      });

      xml += `</w:tbl>`;
    }

    xml += generateSignOffBlockXml(schoolProfile);
    return xml;
  }

  /**
   * Wraps body XML with standard OpenXML document tags and A4 landscape section
   */
  function wrapDocumentXml(bodyXml) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document 
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" 
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" 
  xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" 
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" 
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" 
  xmlns:o="urn:schemas-microsoft-com:office:office" 
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" 
  xmlns:v="urn:schemas-microsoft-com:vml" 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="709" w:footer="709" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  /**
   * Builds the complete word/document.xml for Class-Wise Timetables
   */
  function buildFullDocumentXml(daysToExport, schedules, standards, periods, teachers, leavesMap, schoolProfile, dutiesMap, excludedFreeTeachersMap) {
    let bodyXml = '';

    daysToExport.forEach((day, index) => {
      const isLast = (index === daysToExport.length - 1);
      const daySchedule = schedules[day] || {};
      const dayDuties = (dutiesMap && dutiesMap[day]) || {};
      const dayLeaves = (leavesMap && leavesMap[day]) || [];
      bodyXml += generateDayXml(day, daySchedule, dayDuties, standards, periods, teachers, dayLeaves, schoolProfile, isLast, excludedFreeTeachersMap);
    });

    return wrapDocumentXml(bodyXml);
  }

  /**
   * Generates a zip Blob containing the full docx
   */
  async function generateDocxBlob(daysToExport, state) {
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library is required to build Word documents.');
    }

    const zip = new JSZip();

    if (typeof DOCX_TEMPLATE_ASSETS !== 'undefined') {
      for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
        zip.file(path, content);
      }
    } else {
      throw new Error('DOCX_TEMPLATE_ASSETS is missing.');
    }

    const activeShift = state.activeShift || 'afternoon';
    const standardsList = (state.standards && Array.isArray(state.standards)) ? state.standards : ((typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.standards) || []);
    const exportStandards = activeShift === 'morning'
      ? standardsList.filter(s => s.shift === 'morning')
      : (activeShift === 'afternoon' ? standardsList.filter(s => s.shift === 'afternoon') : standardsList);

    const defaultMorningPeriods = (state.shifts && state.shifts.morning && state.shifts.morning.periods && state.shifts.morning.periods.length > 0)
      ? state.shifts.morning.periods
      : (typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.morning ? DEFAULT_DATA.shifts.morning.periods : []);

    const exportPeriods = (activeShift === 'morning' && defaultMorningPeriods.length > 0)
      ? defaultMorningPeriods
      : (state.periods || (typeof DEFAULT_DATA !== 'undefined' ? DEFAULT_DATA.periods : []));

    const teachersList = (state.teachers && Array.isArray(state.teachers)) ? state.teachers : ((typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.teachers) || []);
    const morningTeacherList = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am", "Yamin Ma'am"];
    const exportTeachers = activeShift === 'morning'
      ? teachersList.filter(t => {
          const prof = (state.teacherProfiles && state.teacherProfiles[t]) || {};
          return prof.assignedShift === 'morning' || prof.assignedShift === 'both' || morningTeacherList.includes(t);
        })
      : (activeShift === 'afternoon'
        ? teachersList.filter(t => {
            const prof = (state.teacherProfiles && state.teacherProfiles[t]) || {};
            return prof.assignedShift === 'afternoon' || prof.assignedShift === 'both' || (!prof.assignedShift && !morningTeacherList.includes(t));
          })
        : teachersList);

    const effectiveDaysToExport = (daysToExport || []).filter(d => {
      if (state && state.includeSaturday) return true;
      return d.toLowerCase() !== 'saturday';
    });

    const docXml = buildFullDocumentXml(
      effectiveDaysToExport,
      state.schedules,
      exportStandards,
      exportPeriods,
      exportTeachers,
      state.leaves || {},
      state.schoolProfile || {},
      state.duties || {},
      state.excludedFreeTeachers || {}
    );
    zip.file('word/document.xml', docXml);

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Generates Teacher-Wise Timetable Blob
   */
  async function generateTeacherTimetablesDocxBlob(teachersToExport, state) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is required.');
    const zip = new JSZip();

    for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
      zip.file(path, content);
    }

    let bodyXml = '';
    teachersToExport.forEach((tName, idx) => {
      const isLast = (idx === teachersToExport.length - 1);
      bodyXml += generateTeacherWeeklyXml(tName, state, isLast);
    });

    zip.file('word/document.xml', wrapDocumentXml(bodyXml));

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Generates Daily Substitution Duty Slip Blob
   */
  async function generateSubstitutionDocxBlob(dayName, substitutionList, state) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is required.');
    const zip = new JSZip();

    for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
      zip.file(path, content);
    }

    const bodyXml = generateSubstitutionNoticeXml(dayName, substitutionList, state);
    zip.file('word/document.xml', wrapDocumentXml(bodyXml));

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Generates Weekly Faculty Extra Duty Roster (Notebook Format)
   */
  /**
   * Generates Weekly Faculty Extra Duty Roster
   * Output strictly contains:
   * 1. Centered Title: WEEKLY FACULTY EXTRA DUTY
   * 2. Clean table with Faculty Member, Monday, Tuesday, Wednesday, Thursday, Friday, Total
   * Nothing else (no school header, no summary tally breakdown, no sign-offs).
   */
  function generateWeeklyDutyXml(state) {
    const { teachers, days } = state;
    const workingDays = (days || []).filter(d => d.toLowerCase() !== 'saturday');
    const weeklyDuties = state.weeklyDuties || {};
    let xml = '';

    // Centered Title Only
    xml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="140" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="24"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>WEEKLY FACULTY EXTRA DUTY</w:t>
      </w:r>
    </w:p>`;

    // Format duty text helper (converts short codes to full subject names)
    function formatDutyText(val) {
      if (!val || !val.trim()) return '-';
      return val.trim()
        .replace(/\bEng\b/g, 'English')
        .replace(/\bGuj\b/g, 'Gujarati')
        .replace(/\bSci\b/g, 'Science')
        .replace(/\bEnv\b/g, 'Environment');
    }

    // Filter faculty members who have duties assigned across Mon-Fri
    const activeTeachers = (teachers || []).filter(t => {
      const tDuties = weeklyDuties[t] || {};
      return workingDays.some(d => (tDuties[d] || '').trim() !== '');
    });
    const teachersToRender = activeTeachers.length > 0 ? activeTeachers : (teachers || []);

    // Table Grid: 1 col for Faculty Member, 5 cols for Weekdays, 1 col for Total
    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2800"/>`;
    workingDays.forEach(() => {
      xml += `<w:gridCol w:w="2200"/>`;
    });
    xml += `<w:gridCol w:w="1200"/>
      </w:tblGrid>
      <w:tr>
        <w:trPr>
          <w:tblHeader/>
          <w:cantSplit/>
        </w:trPr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>Faculty Member</w:t></w:r></w:p>
        </w:tc>`;

    workingDays.forEach(d => {
      xml += `
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(d)}</w:t></w:r></w:p>
        </w:tc>`;
    });

    xml += `
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>Total</w:t></w:r></w:p>
        </w:tc>
      </w:tr>`;

    // Rows for each faculty member
    teachersToRender.forEach(t => {
      const tDuties = weeklyDuties[t] || {};
      let tCount = 0;

      xml += `
      <w:tr>
        <w:trPr><w:cantSplit/></w:trPr>
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr><w:t> ${escapeXml(t)}</w:t></w:r></w:p>
        </w:tc>`;

      workingDays.forEach(d => {
        const rawVal = (tDuties[d] || '').trim();
        if (rawVal) tCount++;
        const formattedVal = formatDutyText(rawVal);

        xml += `
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr>${rawVal ? '<w:b/>' : ''}<w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr></w:pPr><w:r><w:rPr>${rawVal ? '<w:b/>' : ''}<w:sz w:val="18"/><w:color w:val="0F172A"/></w:rPr><w:t>${escapeXml(formattedVal)}</w:t></w:r></w:p>
        </w:tc>`;
      });

      xml += `
        <w:tc>
          <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0D9488"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="0D9488"/></w:rPr><w:t>${tCount}</w:t></w:r></w:p>
        </w:tc>
      </w:tr>`;
    });

    xml += `</w:tbl>`;
    return xml;
  }

  async function generateWeeklyDutyDocxBlob(state) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is required.');
    const zip = new JSZip();

    for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
      zip.file(path, content);
    }

    const bodyXml = generateWeeklyDutyXml(state);
    zip.file('word/document.xml', wrapDocumentXml(bodyXml));

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Generates General & Special School Duties Roster (Assembly, Attendance, Recess, Gate, etc.)
   */
  function generateGeneralDutiesXml(state) {
    const { schoolProfile } = state;
    const generalDuties = state.generalDuties || [];
    const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let xml = '';

    xml += generateSchoolHeaderXml(schoolProfile, `FACULTY GENERAL & SPECIAL SCHOOL DUTIES ROSTER`);

    xml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="140"/>
        <w:rPr><w:sz w:val="19"/><w:color w:val="1E3A8A"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="19"/><w:color w:val="1E3A8A"/></w:rPr>
        <w:t>Institutional Responsibilities, Assembly Supervision &amp; Student Welfare Allocations (Day-Wise)</w:t>
      </w:r>
    </w:p>`;

    // Table Grid: 8 columns (Duty / Timing / Mon / Tue / Wed / Thu / Fri / Guidelines)
    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:w="5000" w:type="pct"/>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="3000"/>
        <w:gridCol w:w="2200"/>
        <w:gridCol w:w="1600"/>
        <w:gridCol w:w="1600"/>
        <w:gridCol w:w="1600"/>
        <w:gridCol w:w="1600"/>
        <w:gridCol w:w="1600"/>
        <w:gridCol w:w="2800"/>
      </w:tblGrid>
      <w:tr>
        <w:trPr><w:tblHeader/></w:trPr>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Duty / Responsibility</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Timing &amp; Area</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Monday</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Tuesday</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Wednesday</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Thursday</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Friday</w:t></w:r></w:p></w:tc>
        <w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr><w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Operational Guidelines</w:t></w:r></w:p></w:tc>
      </w:tr>`;

    if (generalDuties.length === 0) {
      xml += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="8"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="777777"/></w:rPr><w:t>No general school duties assigned yet.</w:t></w:r></w:p>
        </w:tc>
      </w:tr>`;
    } else {
      generalDuties.forEach(d => {
        const dutyName = (d.dutyName || '').trim();
        const alloc = d.allocations || {};
        const notes = (d.notes || '-').trim();

        xml += `
        <w:tr>
          <w:tc>
            <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/><w:color w:val="1E3A8A"/></w:rPr><w:t>${escapeXml(dutyName)}</w:t></w:r></w:p>
          </w:tc>
          <w:tc>
            <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/><w:sz w:val="17"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/></w:rPr><w:t>${escapeXml(d.time || '-')}</w:t></w:r></w:p>
            ${d.location ? `<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:sz w:val="15"/><w:color w:val="64748B"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="15"/><w:color w:val="64748B"/></w:rPr><w:t>Area: ${escapeXml(d.location)}</w:t></w:r></w:p>` : ''}
          </w:tc>`;

        daysList.forEach(day => {
          const teacher = alloc[day] || (d.teacher && (!d.days || d.days.includes(day)) ? d.teacher : '');
          xml += `
          <w:tc>
            <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="1E3A8A"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="1E3A8A"/></w:rPr><w:t>${escapeXml(teacher || '-')}</w:t></w:r></w:p>
          </w:tc>`;
        });

        xml += `
          <w:tc>
            <w:tcPr><w:vAlign w:val="center"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:sz w:val="17"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="17"/></w:rPr><w:t>${escapeXml(notes)}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>`;
      });
    }

    xml += `</w:tbl>`;
    xml += generateSignOffBlockXml(schoolProfile);
    return xml;
  }

  async function generateGeneralDutiesDocxBlob(state) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is required.');
    const zip = new JSZip();

    for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
      zip.file(path, content);
    }

    const bodyXml = generateGeneralDutiesXml(state);
    zip.file('word/document.xml', wrapDocumentXml(bodyXml));

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  /**
   * Generates a 1-page individual weekly timetable for a specific class.
   * Shows school header, Class & Class Teacher, and the 6-day x 6-period table.
   */
  function generateClassWeeklyXml(stdId, state, isLastClass) {
    const { standards, periods, schedules, schoolProfile, classTeachers, shifts } = state;
    const std = (standards || []).find(s => s.id === stdId) || { id: stdId, name: stdId };
    const classTeacherName = (classTeachers && classTeachers[stdId]) || '';
    const shiftKey = std.shift || 'afternoon';
    const shiftsConfig = shifts || (typeof DEFAULT_DATA !== 'undefined' ? DEFAULT_DATA.shifts : null) || {};
    const shiftInfo = shiftsConfig[shiftKey] || {};
    const defaultMorningPeriods = [
      { id: 'p1', number: 1, label: 'Lecture 1', time: '8:20 to 9:05' },
      { id: 'p2', number: 2, label: 'Lecture 2', time: '9:05 to 9:50' },
      { id: 'p3', number: 3, label: 'Lecture 3', time: '10:10 to 10:55' },
      { id: 'p4', number: 4, label: 'Lecture 4', time: '10:55 to 11:40' },
      { id: 'p5', number: 5, label: 'Lecture 5', time: '11:40 to 12:20' }
    ];
    const classPeriods = (shiftInfo.periods && shiftInfo.periods.length > 0) 
      ? shiftInfo.periods 
      : (shiftKey === 'morning' ? defaultMorningPeriods : periods);
    const days = (state && state.includeSaturday)
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayColWidth = (days.length === 6) ? '1500' : '1800';
    const dayPctWidth = (days.length === 6) ? '700' : '840';

    const subTitle = `CLASS TIMETABLE: ${std.name.toUpperCase()} • CLASS TEACHER: ${classTeacherName || 'UNASSIGNED'} • ROOM: ${std.room || 'CLASSROOM'}`;
    let xml = generateSchoolHeaderXml(schoolProfile, subTitle);

    let tblGridXml = `<w:gridCol w:w="1200"/>`;
    days.forEach(() => {
      tblGridXml += `<w:gridCol w:w="${dayColWidth}"/>`;
    });

    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        ${tblGridXml}
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="800" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Period / Time</w:t></w:r></w:p>
        </w:tc>`;

    days.forEach(day => {
      xml += `
        <w:tc>
          <w:tcPr><w:tcW w:w="${dayPctWidth}" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>${escapeXml(day)}</w:t></w:r></w:p>
        </w:tc>`;
    });
    xml += `</w:tr>`;

    classPeriods.forEach((period, pIdx) => {
      const isMorningRecess = shiftKey === 'morning' && pIdx === 2;
      const isAfternoonRecess = shiftKey !== 'morning' && pIdx === 3;
      if (isMorningRecess || isAfternoonRecess) {
        const recessText = shiftKey === 'morning'
          ? 'MORNING RECESS BREAK • 9:50 AM TO 10:10 AM (20 MINUTES)'
          : 'AFTERNOON RECESS BREAK • 3:15 PM TO 3:45 PM (30 MINUTES)';
        xml += `
        <w:tr>
          <w:tc>
            <w:tcPr><w:gridSpan w:val="${days.length + 1}"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:tcPr>
            <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="475569"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="475569"/></w:rPr><w:t>${escapeXml(recessText)}</w:t></w:r></w:p>
          </w:tc>
        </w:tr>`;
      }

      xml += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="800" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(period.label)}</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(period.time)}</w:t></w:r></w:p>
        </w:tc>`;

      days.forEach(day => {
        const daySchedule = (schedules && schedules[day]) || {};
        const pSlots = daySchedule[period.id] || {};
        const slot = pSlots[stdId] || { subject: '', teacher: '' };
        const hasSubj = slot.subject && slot.subject.trim();
        const hasTeacher = slot.teacher && slot.teacher.trim();

        xml += `
        <w:tc>
          <w:tcPr><w:tcW w:w="700" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr>${hasSubj ? `<w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(slot.subject)}</w:t></w:r>` : `<w:r><w:rPr><w:color w:val="94A3B8"/></w:rPr><w:t>-</w:t></w:r>`}</w:p>
          ${hasTeacher ? `<w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:sz w:val="16"/><w:color w:val="475569"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="475569"/></w:rPr><w:t>(${escapeXml(slot.teacher)})</w:t></w:r></w:p>` : ''}
        </w:tc>`;
      });

      xml += `</w:tr>`;
    });

    xml += `</w:tbl>`;

    xml += `
    <w:p><w:pPr><w:spacing w:before="300" w:after="100"/></w:pPr></w:p>
    <w:tbl>
      <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="3333"/><w:gridCol w:w="3333"/><w:gridCol w:w="3334"/></w:tblGrid>
      <w:tr>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Prepared by: Timetable In-Charge</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Class Teacher: ${escapeXml(classTeacherName || '____________')}</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:sz w:val="18"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="18"/></w:rPr><w:t>Approved by: Principal</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>`;

    if (!isLastClass) {
      xml += `
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    return xml;
  }

  async function generateClassTimetablesDocxBlob(stdIds, state) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is required.');
    const zip = new JSZip();

    for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
      zip.file(path, content);
    }

    let combinedXml = '';
    const list = Array.isArray(stdIds) ? stdIds : [stdIds];
    list.forEach((stdId, idx) => {
      combinedXml += generateClassWeeklyXml(stdId, state, idx === list.length - 1);
    });

    zip.file('word/document.xml', wrapDocumentXml(combinedXml));

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
  }

  function generateAttendanceDutiesXml(state) {
    const { attendanceDuties, schoolProfile } = state;
    const subTitle = "FACULTY DAILY ATTENDANCE & ROLL CALL DUTY ROSTER";
    const duties = attendanceDuties || [];
    const includeSat = !!(state && state.includeSaturday);
    const days = includeSat 
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] 
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dutyDayColWidth = includeSat ? '1000' : '1200';
    const dutyDayPctWidth = includeSat ? '700' : '840';

    let dutyTblGrid = `<w:gridCol w:w="1200"/>`;
    days.forEach(() => {
      dutyTblGrid += `<w:gridCol w:w="${dutyDayColWidth}"/>`;
    });

    let xml = generateSchoolHeaderXml(schoolProfile, subTitle);

    xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="pct"/>
        <w:jc w:val="center"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        ${dutyTblGrid}
      </w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="800" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>Duty Shift &amp; Title</w:t></w:r></w:p></w:tc>`;

    days.forEach(d => {
      xml += `
        <w:tc><w:tcPr><w:tcW w:w="${dutyDayPctWidth}" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="1E3A8A"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr></w:pPr><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/></w:rPr><w:t>${escapeXml(d)}</w:t></w:r></w:p></w:tc>`;
    });
    xml += `
      </w:tr>`;

    duties.forEach(duty => {
      xml += `
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w:w="800" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(duty.title || duty.dutyName || 'Attendance Duty')}</w:t></w:r></w:p>
          <w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="16"/><w:color w:val="64748B"/></w:rPr><w:t>${escapeXml(duty.time || '')}${duty.location ? ' • ' + escapeXml(duty.location) : ''}</w:t></w:r></w:p>
        </w:tc>`;

      days.forEach(d => {
        const tName = (duty.allocations && duty.allocations[d]) || '-';
        xml += `
        <w:tc>
          <w:tcPr><w:tcW w:w="700" w:type="pct"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${escapeXml(tName)}</w:t></w:r></w:p>
        </w:tc>`;
      });

      xml += `</w:tr>`;
    });

    xml += `</w:tbl>`;
    xml += generateSignOffBlockXml(schoolProfile);
    return xml;
  }

  async function generateAttendanceDutiesDocxBlob(state) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip is required.');
    const zip = new JSZip();

    for (const [path, content] of Object.entries(DOCX_TEMPLATE_ASSETS)) {
      zip.file(path, content);
    }

    const bodyXml = generateAttendanceDutiesXml(state);
    zip.file('word/document.xml', wrapDocumentXml(bodyXml));

    return await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
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
    generateTeacherTimetablesDocxBlob,
    generateSubstitutionDocxBlob,
    generateWeeklyDutyXml,
    generateWeeklyDutyDocxBlob,
    generateGeneralDutiesXml,
    generateGeneralDutiesDocxBlob,
    generateClassWeeklyXml,
    generateClassTimetablesDocxBlob,
    generateAttendanceDutiesXml,
    generateAttendanceDutiesDocxBlob,
    triggerDownload
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocxGenerator;
}
