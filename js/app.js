/**
 * app.js
 * Core application logic for School Timetable Management System
 * Executive Academic & Institutional Theme
 */

(function() {
  'use strict';

  // --- Storage Key ---
  const STORAGE_KEY = 'school_timetable_mgmt_v2';

  // --- Application State ---
  let state = {
    currentDay: 'Monday',
    standards: [],
    periods: [],
    teachers: [],
    subjects: [],
    days: [],
    schedules: {},
    leaves: {} // { "Monday": ["Teacher Name"] }
  };

  // --- Modal / Popover Editing State ---
  let editingCell = {
    day: null,
    periodId: null,
    stdId: null,
    subject: '',
    teacher: ''
  };

  // --- DOM Elements Cache ---
  const DOM = {
    saveBadge: document.getElementById('save-status-badge'),
    dayTabsContainer: document.getElementById('day-tabs-container'),
    attendanceChipsContainer: document.getElementById('attendance-chips-container'),
    conflictBanner: document.getElementById('conflict-banner'),
    conflictMessage: document.getElementById('conflict-message'),
    displayDayName: document.getElementById('display-day-name'),
    displayDayStats: document.getElementById('display-day-stats'),
    timetableThead: document.getElementById('timetable-thead'),
    timetableTbody: document.getElementById('timetable-tbody'),
    btnDownloadSingleDay: document.getElementById('btn-download-single-day'),
    btnDownloadDayName: document.getElementById('btn-download-day-name'),
    btnDownloadAllDays: document.getElementById('btn-download-all-days'),
    btnPrintView: document.getElementById('btn-print-view'),
    btnOpenCopyModal: document.getElementById('btn-open-copy-modal'),
    btnClearCurrentDay: document.getElementById('btn-clear-current-day'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnImportJson: document.getElementById('btn-import-json'),
    importFileInput: document.getElementById('import-file-input'),
    btnResetData: document.getElementById('btn-reset-data'),
    toastContainer: document.getElementById('toast-container'),

    // Period Popover
    periodModal: document.getElementById('period-modal'),
    periodModalTitle: document.getElementById('period-modal-title'),
    btnClosePeriodModal: document.getElementById('btn-close-period-modal'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    modalSubjectChips: document.getElementById('modal-subject-chips'),
    modalCustomSubject: document.getElementById('modal-custom-subject'),
    modalTeacherChips: document.getElementById('modal-teacher-chips'),
    modalCustomTeacher: document.getElementById('modal-custom-teacher'),
    btnModalClearCell: document.getElementById('btn-modal-clear-cell'),
    btnModalSaveCell: document.getElementById('btn-modal-save-cell'),

    // Copy Modal
    copyModal: document.getElementById('copy-modal'),
    btnCloseCopyModal: document.getElementById('btn-close-copy-modal'),
    btnCancelCopy: document.getElementById('btn-cancel-copy'),
    btnConfirmCopy: document.getElementById('btn-confirm-copy'),
    copySourceDay: document.getElementById('copy-source-day'),
    copyTargetDay: document.getElementById('copy-target-day'),

    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    btnCloseSettingsModal: document.getElementById('btn-close-settings-modal'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    settingsTeachersList: document.getElementById('settings-teachers-list'),
    settingsTeacherCount: document.getElementById('settings-teacher-count'),
    settingsNewTeacher: document.getElementById('settings-new-teacher'),
    btnAddTeacher: document.getElementById('btn-add-teacher'),
    settingsSubjectsList: document.getElementById('settings-subjects-list'),
    settingsSubjectCount: document.getElementById('settings-subject-count'),
    settingsNewSubject: document.getElementById('settings-new-subject'),
    btnAddSubject: document.getElementById('btn-add-subject')
  };

  // --- Initialize App ---
  function init() {
    loadState();
    setupEventListeners();
    renderAll();
  }

  // --- State Persistence ---
  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        state = Object.assign({}, state, parsed);
      } catch (e) {
        console.warn('Failed to parse saved state, loading defaults', e);
        resetToDefaults();
      }
    } else {
      // Also check old key if migrated
      const oldSaved = localStorage.getItem('timetable_studio_v1_state');
      if (oldSaved) {
        try {
          state = Object.assign({}, state, JSON.parse(oldSaved));
        } catch (e) {
          resetToDefaults();
        }
      } else {
        resetToDefaults();
      }
    }
  }

  function resetToDefaults() {
    state.currentDay = 'Monday';
    state.standards = JSON.parse(JSON.stringify(DEFAULT_DATA.standards));
    state.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.periods));
    state.teachers = JSON.parse(JSON.stringify(DEFAULT_DATA.teachers));
    state.subjects = JSON.parse(JSON.stringify(DEFAULT_DATA.subjects));
    state.days = JSON.parse(JSON.stringify(DEFAULT_DATA.days));
    state.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules));
    state.leaves = {};
    saveState(true);
  }

  function saveState(silent = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!silent && DOM.saveBadge) {
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Saved';
      setTimeout(() => {
        DOM.saveBadge.innerHTML = '<span class="dot"></span> Auto-Saved';
      }, 1500);
    }
  }

  // --- Rendering Functions ---

  function renderAll() {
    renderDayTabs();
    renderAttendance();
    renderTable();
    updateExportBar();
  }

  function renderDayTabs() {
    DOM.dayTabsContainer.innerHTML = '';
    state.days.forEach(day => {
      const tab = document.createElement('button');
      tab.className = `day-tab-btn ${day === state.currentDay ? 'active' : ''}`;
      
      // Count filled slots for this day
      const dayData = state.schedules[day] || {};
      let filled = 0;
      let total = state.periods.length * state.standards.length;
      state.periods.forEach(p => {
        const pSlots = dayData[p.id] || {};
        state.standards.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].subject && pSlots[s.id].teacher) {
            filled++;
          }
        });
      });

      tab.innerHTML = `
        <span>${escapeHtml(day)}</span>
        <span class="day-tab-badge">${filled}/${total}</span>
      `;

      tab.addEventListener('click', () => {
        state.currentDay = day;
        saveState(true);
        renderAll();
      });

      DOM.dayTabsContainer.appendChild(tab);
    });

    DOM.displayDayName.textContent = state.currentDay;
    DOM.btnDownloadDayName.textContent = state.currentDay;
  }

  function renderAttendance() {
    DOM.attendanceChipsContainer.innerHTML = '';
    const dayLeaves = state.leaves[state.currentDay] || [];

    state.teachers.forEach(teacher => {
      const isOnLeave = dayLeaves.includes(teacher);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `teacher-badge-btn ${isOnLeave ? 'on-leave' : ''}`;
      btn.innerHTML = `
        <span class="dot"></span>
        <span>${escapeHtml(teacher)}</span>
        ${isOnLeave ? '<span style="font-size: 11px; opacity: 0.8;">(On Leave)</span>' : ''}
      `;
      btn.title = isOnLeave 
        ? `${teacher} is on leave today (Click to mark Present)` 
        : `${teacher} is present (Click to mark On Leave)`;

      btn.addEventListener('click', () => {
        toggleTeacherLeave(teacher);
      });

      DOM.attendanceChipsContainer.appendChild(btn);
    });
  }

  function toggleTeacherLeave(teacher) {
    if (!state.leaves[state.currentDay]) {
      state.leaves[state.currentDay] = [];
    }
    const idx = state.leaves[state.currentDay].indexOf(teacher);
    if (idx > -1) {
      state.leaves[state.currentDay].splice(idx, 1);
      showToast(`${teacher} marked Present for ${state.currentDay}`, 'success');
    } else {
      state.leaves[state.currentDay].push(teacher);
      showToast(`${teacher} marked On Leave for ${state.currentDay}`, 'error');
    }
    saveState();
    renderAttendance();
    renderTable();
  }

  function renderTable() {
    const dayData = state.schedules[state.currentDay] || {};
    const dayLeaves = state.leaves[state.currentDay] || [];
    const activeTeachers = state.teachers.filter(t => !dayLeaves.includes(t));

    // 1. Render Table Header
    let theadHtml = `
      <tr>
        <th class="col-lecture-w">Period / Timing</th>`;
    state.standards.forEach(std => {
      const base = std.baseName || std.name.replace(/rd|th|st|nd/i, '');
      const sup = std.sup || (std.name.match(/rd|th|st|nd/i) ? std.name.match(/rd|th|st|nd/i)[0] : '');
      theadHtml += `<th class="col-std-w">${escapeHtml(base)}<sup>${escapeHtml(sup)}</sup></th>`;
    });
    theadHtml += `
        <th class="col-free-w">Free Teachers</th>
      </tr>`;
    DOM.timetableThead.innerHTML = theadHtml;

    // 2. Track Conflicts across the day
    const allConflicts = [];

    // 3. Render Table Body (Periods)
    let tbodyHtml = '';

    state.periods.forEach((period, pIdx) => {
      // Formal Recess break divider between Lecture 3 and Lecture 4 (at index 3)
      if (pIdx === 3) {
        tbodyHtml += `
          <tr class="recess-break-row">
            <td colspan="${state.standards.length + 2}">
              RECESS BREAK • 3:15 PM TO 3:45 PM (30 MINUTES)
            </td>
          </tr>`;
      }

      const pSlots = dayData[period.id] || {};

      // Map teacher -> [stdId, ...] to detect double bookings
      const teacherAllocation = {};
      state.standards.forEach(std => {
        const slot = pSlots[std.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          const t = slot.teacher.trim();
          if (!teacherAllocation[t]) teacherAllocation[t] = [];
          teacherAllocation[t].push(std.name);
        }
      });

      // Check conflicts in this period
      const busyTeachers = Object.keys(teacherAllocation);
      busyTeachers.forEach(t => {
        if (teacherAllocation[t].length > 1) {
          allConflicts.push({
            period: period.label,
            teacher: t,
            standards: teacherAllocation[t]
          });
        }
      });

      // Calculate free teachers: active teachers not assigned in this period
      const freeTeachers = activeTeachers.filter(t => !busyTeachers.includes(t));

      // Row HTML
      tbodyHtml += `
        <tr>
          <!-- Period Number & Time -->
          <td class="period-header-cell">
            <div class="period-header-num">${escapeHtml(period.label)}</div>
            <div class="period-header-time">${escapeHtml(period.time)}</div>
          </td>`;

      // Standard Cells
      state.standards.forEach(std => {
        const slot = pSlots[std.id] || { subject: '', teacher: '' };
        const hasContent = slot.subject || slot.teacher;
        const isConflict = slot.teacher && teacherAllocation[slot.teacher.trim()] && teacherAllocation[slot.teacher.trim()].length > 1;

        tbodyHtml += `
          <td class="grid-period-cell ${isConflict ? 'has-conflict' : ''}" data-period="${period.id}" data-std="${std.id}">
            <div class="grid-cell-inner">`;

        if (hasContent) {
          tbodyHtml += `
              <div class="subject-label">${escapeHtml(slot.subject || '-')}</div>
              <div class="teacher-sublabel">(${escapeHtml(slot.teacher || 'Unassigned')})</div>`;
        } else {
          tbodyHtml += `
              <div class="empty-prompt">+ Assign Period</div>`;
        }

        tbodyHtml += `
            </div>
          </td>`;
      });

      // Free Teachers Cell
      tbodyHtml += `
          <td class="free-staff-cell">
            <div class="free-staff-flow">`;

      if (freeTeachers.length === 0) {
        tbodyHtml += `<span class="free-staff-none">None Free</span>`;
      } else {
        freeTeachers.forEach(t => {
          tbodyHtml += `<div class="free-staff-name">${escapeHtml(t)}</div>`;
        });
      }

      tbodyHtml += `
            </div>
          </td>
        </tr>`;
    });

    DOM.timetableTbody.innerHTML = tbodyHtml;

    // Attach click listeners to period cells
    document.querySelectorAll('.grid-period-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const periodId = cell.getAttribute('data-period');
        const stdId = cell.getAttribute('data-std');
        openPeriodModal(periodId, stdId);
      });
    });

    // 4. Update Conflict Banner
    if (allConflicts.length > 0) {
      DOM.conflictBanner.classList.add('visible');
      let msg = `<strong>Schedule Conflict Detected in ${state.currentDay}:</strong> `;
      const conflictSnippets = allConflicts.map(c => 
        `<strong>${c.teacher}</strong> is assigned to multiple classes in <strong>${c.period}</strong> (${c.standards.join(' & ')})`
      );
      DOM.conflictMessage.innerHTML = msg + conflictSnippets.join('; ');
    } else {
      DOM.conflictBanner.classList.remove('visible');
    }

    // 5. Update Stats
    DOM.displayDayStats.textContent = `Standards: 3rd to 8th • Lectures: 1 to 6`;
  }

  function updateExportBar() {
    DOM.btnDownloadDayName.textContent = state.currentDay;
  }

  // --- Fast In-Place Popover: Assign Period ---
  function openPeriodModal(periodId, stdId) {
    editingCell.day = state.currentDay;
    editingCell.periodId = periodId;
    editingCell.stdId = stdId;

    const period = state.periods.find(p => p.id === periodId);
    const std = state.standards.find(s => s.id === stdId);
    const dayData = state.schedules[state.currentDay] || {};
    const pSlots = dayData[periodId] || {};
    const currentSlot = pSlots[stdId] || { subject: '', teacher: '' };

    editingCell.subject = currentSlot.subject || '';
    editingCell.teacher = currentSlot.teacher || '';

    DOM.periodModalTitle.innerHTML = `
      Assign Period: <strong>${escapeHtml(period.label)} (${escapeHtml(period.time)})</strong>
      • <span>${escapeHtml(std.name)}</span>
    `;

    // 1. Render Subject Pills
    DOM.modalSubjectChips.innerHTML = '';
    state.subjects.forEach(subj => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `pill-choice ${editingCell.subject === subj ? 'selected' : ''}`;
      pill.textContent = subj;
      pill.addEventListener('click', () => {
        editingCell.subject = subj;
        DOM.modalCustomSubject.value = '';
        renderModalChips();
      });
      DOM.modalSubjectChips.appendChild(pill);
    });
    DOM.modalCustomSubject.value = state.subjects.includes(editingCell.subject) ? '' : editingCell.subject;

    // 2. Render Teacher Pills with availability check
    renderTeacherChipsInModal(periodId, stdId);

    DOM.periodModal.classList.add('active');
  }

  function renderModalChips() {
    // Update subject chips selected state
    document.querySelectorAll('#modal-subject-chips .pill-choice').forEach(c => {
      if (c.textContent === editingCell.subject) {
        c.classList.add('selected');
      } else {
        c.classList.remove('selected');
      }
    });
  }

  function renderTeacherChipsInModal(periodId, currentStdId) {
    DOM.modalTeacherChips.innerHTML = '';
    const dayData = state.schedules[state.currentDay] || {};
    const pSlots = dayData[periodId] || {};
    const dayLeaves = state.leaves[state.currentDay] || [];

    // Map of teacher -> standard they are currently assigned to in this period
    const busyIn = {};
    state.standards.forEach(s => {
      if (s.id !== currentStdId) {
        const slot = pSlots[s.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          busyIn[slot.teacher.trim()] = s.name.replace('Standard: ', '');
        }
      }
    });

    state.teachers.forEach(teacher => {
      const pill = document.createElement('button');
      pill.type = 'button';
      const isSelected = (editingCell.teacher === teacher);
      const isBusy = !!busyIn[teacher];
      const isOnLeave = dayLeaves.includes(teacher);

      pill.className = `pill-choice ${isSelected ? 'selected' : ''} ${isBusy ? 'is-busy' : ''} ${isOnLeave ? 'is-leave' : ''}`;
      
      let badge = '';
      if (isOnLeave) {
        badge = ' <span style="font-size: 10.5px;">(On Leave)</span>';
      } else if (isBusy) {
        badge = ` <span style="font-size: 10.5px;">(In ${busyIn[teacher]})</span>`;
      }

      pill.innerHTML = `<span>${escapeHtml(teacher)}</span>${badge}`;

      pill.addEventListener('click', () => {
        editingCell.teacher = teacher;
        DOM.modalCustomTeacher.value = '';
        renderTeacherChipsInModal(periodId, currentStdId);
      });

      DOM.modalTeacherChips.appendChild(pill);
    });

    DOM.modalCustomTeacher.value = state.teachers.includes(editingCell.teacher) ? '' : editingCell.teacher;
  }

  function saveModalCell() {
    // Take from inputs if typed
    const customSubj = DOM.modalCustomSubject.value.trim();
    if (customSubj) {
      editingCell.subject = customSubj;
      if (!state.subjects.includes(customSubj)) {
        state.subjects.push(customSubj);
      }
    }

    const customTeacher = DOM.modalCustomTeacher.value.trim();
    if (customTeacher) {
      editingCell.teacher = customTeacher;
      if (!state.teachers.includes(customTeacher)) {
        state.teachers.push(customTeacher);
      }
    }

    // Save into schedule
    if (!state.schedules[editingCell.day]) {
      state.schedules[editingCell.day] = {};
    }
    if (!state.schedules[editingCell.day][editingCell.periodId]) {
      state.schedules[editingCell.day][editingCell.periodId] = {};
    }

    state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId] = {
      subject: editingCell.subject,
      teacher: editingCell.teacher
    };

    saveState();
    closePeriodModal();
    renderAll();
    showToast('Assignment updated', 'success');
  }

  function clearModalCell() {
    if (state.schedules[editingCell.day] &&
        state.schedules[editingCell.day][editingCell.periodId]) {
      delete state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId];
    }
    saveState();
    closePeriodModal();
    renderAll();
    showToast('Assignment cleared', 'info');
  }

  function closePeriodModal() {
    DOM.periodModal.classList.remove('active');
  }

  // --- Modal: Copy / Duplicate Schedule ---
  function openCopyModal() {
    DOM.copySourceDay.innerHTML = '';
    DOM.copyTargetDay.innerHTML = '';

    state.days.forEach(day => {
      const optSrc = document.createElement('option');
      optSrc.value = day;
      optSrc.textContent = day;
      if (day === state.currentDay) optSrc.selected = true;
      DOM.copySourceDay.appendChild(optSrc);
    });

    const optAll = document.createElement('option');
    optAll.value = '__ALL_OTHER__';
    optAll.textContent = 'All Other Weekdays (Tuesday through Saturday)';
    DOM.copyTargetDay.appendChild(optAll);

    state.days.forEach(day => {
      if (day !== state.currentDay) {
        const optTgt = document.createElement('option');
        optTgt.value = day;
        optTgt.textContent = day;
        DOM.copyTargetDay.appendChild(optTgt);
      }
    });

    DOM.copyModal.classList.add('active');
  }

  function closeCopyModal() {
    DOM.copyModal.classList.remove('active');
  }

  function executeCopySchedule() {
    const src = DOM.copySourceDay.value;
    const tgt = DOM.copyTargetDay.value;

    const sourceData = state.schedules[src];
    if (!sourceData) {
      showToast(`Source day ${src} has no schedule!`, 'error');
      return;
    }

    if (tgt === '__ALL_OTHER__') {
      state.days.forEach(d => {
        if (d !== src) {
          state.schedules[d] = JSON.parse(JSON.stringify(sourceData));
        }
      });
      showToast(`Schedule duplicated from ${src} to all weekdays`, 'success');
    } else {
      state.schedules[tgt] = JSON.parse(JSON.stringify(sourceData));
      showToast(`Schedule duplicated from ${src} to ${tgt}`, 'success');
      state.currentDay = tgt;
    }

    saveState();
    closeCopyModal();
    renderAll();
  }

  // --- Clear Day ---
  function clearCurrentDay() {
    if (confirm(`Are you sure you want to clear all allocated periods for ${state.currentDay}?`)) {
      state.schedules[state.currentDay] = {};
      saveState();
      renderAll();
      showToast(`${state.currentDay} timetable cleared`, 'info');
    }
  }

  // --- Settings / Roster Modal ---
  function openSettingsModal() {
    renderSettingsLists();
    DOM.settingsModal.classList.add('active');
  }

  function closeSettingsModal() {
    DOM.settingsModal.classList.remove('active');
    renderAll();
  }

  function renderSettingsLists() {
    // Teachers List
    DOM.settingsTeachersList.innerHTML = '';
    DOM.settingsTeacherCount.textContent = state.teachers.length;
    state.teachers.forEach(t => {
      const tag = document.createElement('span');
      tag.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12.5px;';
      tag.innerHTML = `
        <span>${escapeHtml(t)}</span>
        <button style="background: none; border: none; color: var(--status-danger); cursor: pointer; font-size: 14px; line-height: 1;" title="Remove teacher">&times;</button>
      `;
      tag.querySelector('button').addEventListener('click', () => {
        removeTeacher(t);
      });
      DOM.settingsTeachersList.appendChild(tag);
    });

    // Subjects List
    DOM.settingsSubjectsList.innerHTML = '';
    DOM.settingsSubjectCount.textContent = state.subjects.length;
    state.subjects.forEach(s => {
      const tag = document.createElement('span');
      tag.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12.5px;';
      tag.innerHTML = `
        <span>${escapeHtml(s)}</span>
        <button style="background: none; border: none; color: var(--status-danger); cursor: pointer; font-size: 14px; line-height: 1;" title="Remove subject">&times;</button>
      `;
      tag.querySelector('button').addEventListener('click', () => {
        removeSubject(s);
      });
      DOM.settingsSubjectsList.appendChild(tag);
    });
  }

  function addTeacher() {
    const name = DOM.settingsNewTeacher.value.trim();
    if (!name) return;
    if (state.teachers.includes(name)) {
      showToast('Teacher already exists in roster', 'error');
      return;
    }
    state.teachers.push(name);
    DOM.settingsNewTeacher.value = '';
    saveState();
    renderSettingsLists();
    showToast(`Added ${name} to roster`, 'success');
  }

  function removeTeacher(name) {
    if (confirm(`Remove ${name} from teachers roster?`)) {
      state.teachers = state.teachers.filter(t => t !== name);
      saveState();
      renderSettingsLists();
      showToast(`Removed ${name}`, 'info');
    }
  }

  function addSubject() {
    const name = DOM.settingsNewSubject.value.trim();
    if (!name) return;
    if (state.subjects.includes(name)) {
      showToast('Subject already exists', 'error');
      return;
    }
    state.subjects.push(name);
    DOM.settingsNewSubject.value = '';
    saveState();
    renderSettingsLists();
    showToast(`Added subject ${name}`, 'success');
  }

  function removeSubject(name) {
    if (confirm(`Remove subject ${name}?`)) {
      state.subjects = state.subjects.filter(s => s !== name);
      saveState();
      renderSettingsLists();
      showToast(`Removed subject ${name}`, 'info');
    }
  }

  // --- Export Actions ---

  async function downloadSingleDayDocx() {
    try {
      showToast(`Generating ${state.currentDay}.docx...`, 'info');
      const blob = await DocxGenerator.generateDocxBlob([state.currentDay], state);
      DocxGenerator.triggerDownload(blob, `${state.currentDay}_TimeTable.docx`);
      showToast(`${state.currentDay}.docx exported successfully`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating Word document: ' + err.message, 'error');
    }
  }

  async function downloadAllDaysDocx() {
    try {
      showToast('Generating Full Week Timetable (.docx)...', 'info');
      const blob = await DocxGenerator.generateDocxBlob(state.days, state);
      DocxGenerator.triggerDownload(blob, 'Weekly_School_TimeTable.docx');
      showToast('Full Week Word document exported successfully', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error generating Word document: ' + err.message, 'error');
    }
  }

  function exportJsonBackup() {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported as JSON backup', 'success');
  }

  function importJsonRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.schedules && parsed.teachers) {
          state = Object.assign({}, state, parsed);
          saveState();
          renderAll();
          showToast('Data successfully restored from backup', 'success');
        } else {
          showToast('Invalid backup JSON format', 'error');
        }
      } catch (err) {
        showToast('Error reading JSON backup', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- Toasts ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span style="font-weight: bold;">${icon}</span>
      <span>${escapeHtml(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 2800);
  }

  // --- Utility Functions ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Export Bar
    DOM.btnDownloadSingleDay.addEventListener('click', downloadSingleDayDocx);
    DOM.btnDownloadAllDays.addEventListener('click', downloadAllDaysDocx);
    DOM.btnPrintView.addEventListener('click', () => window.print());

    // Day Actions
    DOM.btnOpenCopyModal.addEventListener('click', openCopyModal);
    DOM.btnClearCurrentDay.addEventListener('click', clearCurrentDay);

    // Header Actions
    DOM.btnOpenSettings.addEventListener('click', openSettingsModal);
    DOM.btnExportJson.addEventListener('click', exportJsonBackup);
    DOM.btnImportJson.addEventListener('click', () => DOM.importFileInput.click());
    DOM.importFileInput.addEventListener('change', importJsonRestore);
    DOM.btnResetData.addEventListener('click', () => {
      if (confirm('Reset timetable to original template data from Monday.docx?')) {
        resetToDefaults();
        renderAll();
        showToast('Reset to original template data', 'info');
      }
    });

    // Period Popover Actions
    DOM.btnClosePeriodModal.addEventListener('click', closePeriodModal);
    if (DOM.btnModalCancel) {
      DOM.btnModalCancel.addEventListener('click', closePeriodModal);
    }
    DOM.btnModalSaveCell.addEventListener('click', saveModalCell);
    DOM.btnModalClearCell.addEventListener('click', clearModalCell);
    DOM.modalCustomSubject.addEventListener('input', () => {
      editingCell.subject = DOM.modalCustomSubject.value;
      renderModalChips();
    });
    DOM.modalCustomTeacher.addEventListener('input', () => {
      editingCell.teacher = DOM.modalCustomTeacher.value;
    });

    // Copy Modal Actions
    DOM.btnCloseCopyModal.addEventListener('click', closeCopyModal);
    DOM.btnCancelCopy.addEventListener('click', closeCopyModal);
    DOM.btnConfirmCopy.addEventListener('click', executeCopySchedule);

    // Settings Modal Actions
    DOM.btnCloseSettingsModal.addEventListener('click', closeSettingsModal);
    DOM.btnCloseSettings.addEventListener('click', closeSettingsModal);
    DOM.btnAddTeacher.addEventListener('click', addTeacher);
    DOM.btnAddSubject.addEventListener('click', addSubject);
    DOM.settingsNewTeacher.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTeacher(); });
    DOM.settingsNewSubject.addEventListener('keydown', (e) => { if (e.key === 'Enter') addSubject(); });

    // Close Modals on background click
    [DOM.periodModal, DOM.copyModal, DOM.settingsModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closePeriodModal();
        closeCopyModal();
        closeSettingsModal();
      }
    });
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
