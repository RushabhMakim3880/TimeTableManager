/**
 * app.js - Enterprise Academic Timetable ERP Engine
 * Multi-Perspective Views, School Branding, Substitution Manager, Workload Analytics
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'school_timetable_mgmt_v4';

  // --- Core Application State ---
  let state = {
    activeView: 'class-view',
    currentDay: 'Monday',
    selectedTeacher: '',
    activeShift: 'afternoon', // 'morning' | 'afternoon' | 'all'
    classViewMode: 'day-grid', // 'day-grid' | 'class-weekly'
    selectedClassStandard: 'std_3',
    schoolProfile: {},
    standards: [],
    periods: [],
    shifts: {},
    classTeachers: {},
    attendanceDuties: [],
    teachers: [],
    teacherProfiles: {},
    subjects: [],
    days: [],
    includeSaturday: false,
    schedules: {},
    leaves: {}, // { "Monday": ["Teacher Name"] }
    substitutions: {}, // { "Monday": [ { periodId, stdId, absentTeacher, proxyTeacher } ] }
    dutyPresets: [],
    duties: {}, // { "Monday": { "p1": { "Teacher Name": { duty: "Library Supervision", location: "Central Library" } } } }
    weeklyDuties: {}, // { "Teacher Name": { "Monday": "3 to 5 Maths", "Friday": "3 to 5 Maths" } }
    excludedFreeTeachers: {}, // { "Monday_p1": ["Teacher Name"] }
    generalDuties: [], // [ { id, dutyName, allocations: { Monday: '...', ... }, time, location, notes } ]
    activeGeneralDutyDay: 'all' // 'all' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
  };

  // --- In-Place Period Popover State ---
  let editingCell = {
    day: null,
    periodId: null,
    stdId: null,
    subject: '',
    teacher: ''
  };

  // --- In-Place Duty Popover State ---
  let editingDutyCell = {
    teacher: null,
    day: null,
    selectedGrade: '',
    selectedSubject: '',
    customText: ''
  };

  // --- String Escaping & Sanitization Helpers ---
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeXml(str) {
    return escapeHtml(str);
  }

  if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.escapeXml = escapeXml;
  }

  // --- DOM Elements ---
  const DOM = {
    // Header & Branding
    headerSchoolName: document.getElementById('header-school-name'),
    headerSchoolMeta: document.getElementById('header-school-meta'),
    headerSchoolLogo: document.getElementById('header-school-logo'),
    defaultBrandIcon: document.getElementById('default-brand-icon'),
    saveBadge: document.getElementById('save-status-badge'),
    btnOpenSchoolProfile: document.getElementById('btn-open-school-profile'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnImportJson: document.getElementById('btn-import-json'),
    importFileInput: document.getElementById('import-file-input'),

    // View Navigation
    viewTabBtns: document.querySelectorAll('.view-tab-btn'),
    viewSections: document.querySelectorAll('.view-section'),

    // Class View & Shift Controls
    shiftSelectorGroup: document.getElementById('shift-selector-group'),
    btnShiftMorning: document.getElementById('btn-shift-morning'),
    btnShiftAfternoon: document.getElementById('btn-shift-afternoon'),
    btnShiftAll: document.getElementById('btn-shift-all'),
    classModeToggle: document.getElementById('class-mode-toggle'),
    btnModeDayGrid: document.getElementById('btn-mode-day-grid'),
    btnModeClassWeekly: document.getElementById('btn-mode-class-weekly'),
    dayGridContainer: document.getElementById('day-grid-container'),
    classWeeklyContainer: document.getElementById('class-weekly-container'),

    // Class-Wise Weekly View
    classWeeklyStdTabs: document.getElementById('class-weekly-std-tabs'),
    classHeaderCard: document.getElementById('class-header-card'),
    classWeeklyShiftBadge: document.getElementById('class-weekly-shift-badge'),
    classWeeklyTitle: document.getElementById('class-weekly-title'),
    classWeeklyTeacherName: document.getElementById('class-weekly-teacher-name'),
    classWeeklyRoom: document.getElementById('class-weekly-room'),
    classWeeklyLectureCount: document.getElementById('class-weekly-lecture-count'),
    btnExportClassDocx: document.getElementById('btn-export-class-docx'),
    btnPrintClass: document.getElementById('btn-print-class'),
    btnClearSingleClassWeekly: document.getElementById('btn-clear-single-class-weekly'),
    classWeeklyTable: document.getElementById('class-weekly-table'),
    classWeeklyThead: document.getElementById('class-weekly-thead'),
    classWeeklyTbody: document.getElementById('class-weekly-tbody'),

    // Day Grid View
    dayTabsContainer: document.getElementById('day-tabs-container'),
    attendanceChipsContainer: document.getElementById('attendance-chips-container'),
    conflictBanner: document.getElementById('conflict-banner'),
    conflictMessage: document.getElementById('conflict-message'),
    displayDayName: document.getElementById('display-day-name'),
    displayDayStats: document.getElementById('display-day-stats'),
    timetableThead: document.getElementById('timetable-thead'),
    timetableTbody: document.getElementById('timetable-tbody'),
    btnToggleSaturday: document.getElementById('btn-toggle-saturday'),
    btnToggleSaturdayIcon: document.getElementById('btn-toggle-saturday-icon'),
    btnToggleSaturdayText: document.getElementById('btn-toggle-saturday-text'),
    btnOpenCopyModal: document.getElementById('btn-open-copy-modal'),
    btnClearCurrentDay: document.getElementById('btn-clear-current-day'),
    btnClearFullTimetable: document.getElementById('btn-clear-full-timetable'),

    // Teacher View
    selectTeacherFilter: document.getElementById('select-teacher-filter'),
    displayTeacherName: document.getElementById('display-teacher-name'),
    teacherLoadStat: document.getElementById('teacher-load-stat'),
    teacherFreeStat: document.getElementById('teacher-free-stat'),
    teacherGridThead: document.getElementById('teacher-grid-thead'),
    teacherGridTbody: document.getElementById('teacher-grid-tbody'),
    btnDownloadTeacherDocx: document.getElementById('btn-download-teacher-docx'),
    btnDownloadAllTeachersDocx: document.getElementById('btn-download-all-teachers-docx'),

    // Weekly Duty View (Notebook Matrix)
    weeklyDutyTbody: document.getElementById('weekly-duty-tbody'),
    weeklyDutySummaryContainer: document.getElementById('weekly-duty-summary-container'),
    weeklyDutyTotalBadge: document.getElementById('weekly-duty-total-badge'),
    btnDownloadWeeklyDutyDocx: document.getElementById('btn-download-weekly-duty-docx'),
    btnPrintDutyView: document.getElementById('btn-print-duty-view'),
    btnClearAllWeeklyDuties: document.getElementById('btn-clear-all-weekly-duties'),

    // Duty Cell Popover Modal
    dutyCellModal: document.getElementById('duty-cell-modal'),
    dutyCellModalTitle: document.getElementById('duty-cell-modal-title'),
    btnCloseDutyCellModal: document.getElementById('btn-close-duty-cell-modal'),
    modalDutyPresetPills: document.getElementById('modal-duty-preset-pills'),
    modalDutyGradePills: document.getElementById('modal-duty-grade-pills'),
    modalDutySubjectPills: document.getElementById('modal-duty-subject-pills'),
    modalDutyCustomText: document.getElementById('modal-duty-custom-text'),
    btnModalClearDuty: document.getElementById('btn-modal-clear-duty'),
    btnModalCancelDuty: document.getElementById('btn-modal-cancel-duty'),
    btnModalSaveDuty: document.getElementById('btn-modal-save-duty'),

    // School & Assembly General Duties
    generalDutyThead: document.getElementById('general-duty-thead'),
    generalDutyTbody: document.getElementById('general-duty-tbody'),
    generalDutyTotalBadge: document.getElementById('general-duty-total-badge'),
    generalDutyDayTabs: document.getElementById('general-duty-day-tabs'),
    selectGeneralDutyFilterTeacher: document.getElementById('select-general-duty-filter-teacher'),
    btnAddGeneralDuty: document.getElementById('btn-add-general-duty'),
    btnDownloadGeneralDutiesDocx: document.getElementById('btn-download-general-duties-docx'),
    btnPrintGeneralDuties: document.getElementById('btn-print-general-duties'),
    btnClearAllGeneralDuties: document.getElementById('btn-clear-all-general-duties'),

    // Dedicated Attendance Duty Roster
    attendanceDutyTable: document.getElementById('attendance-duty-table'),
    attendanceDutyTbody: document.getElementById('attendance-duty-tbody'),
    btnDownloadAttendanceDutiesDocx: document.getElementById('btn-download-attendance-duties-docx'),

    // General Duty Modal
    generalDutyModal: document.getElementById('general-duty-modal'),
    generalDutyModalTitle: document.getElementById('general-duty-modal-title'),
    btnCloseGeneralDutyModal: document.getElementById('btn-close-general-duty-modal'),
    inputGeneralDutyId: document.getElementById('input-general-duty-id'),
    modalGeneralDutyPresetsContainer: document.getElementById('modal-general-duty-presets-container'),
    inputGeneralDutyName: document.getElementById('input-general-duty-name'),
    selectGeneralDutyQuickTeacher: document.getElementById('select-general-duty-quick-teacher'),
    btnGdutyApplyAllDays: document.getElementById('btn-gduty-apply-all-days'),
    gdutyDayAllocationsContainer: document.getElementById('gduty-day-allocations-container'),
    inputGeneralDutyTime: document.getElementById('input-general-duty-time'),
    inputGeneralDutyLocation: document.getElementById('input-general-duty-location'),
    inputGeneralDutyNotes: document.getElementById('input-general-duty-notes'),
    btnCancelGeneralDuty: document.getElementById('btn-cancel-general-duty'),
    btnSaveGeneralDuty: document.getElementById('btn-save-general-duty'),

    // Substitution View
    subDaySelect: document.getElementById('sub-day-select'),
    subAbsentSelectionContainer: document.getElementById('sub-absent-selection-container'),
    subVacantCount: document.getElementById('sub-vacant-count'),
    btnAutoAssignAllProxies: document.getElementById('btn-auto-assign-all-proxies'),
    substitutionTbody: document.getElementById('substitution-tbody'),
    btnDownloadSubstitutionDocx: document.getElementById('btn-download-substitution-docx'),

    // Workload View
    workloadBarsContainer: document.getElementById('workload-bars-container'),
    complianceAlertsContainer: document.getElementById('compliance-alerts-container'),
    subjectDistributionContainer: document.getElementById('subject-distribution-container'),
    kpiTotalLectures: document.getElementById('kpi-total-lectures'),
    kpiAvgLoad: document.getElementById('kpi-avg-load'),
    kpiMaxTeacher: document.getElementById('kpi-max-teacher'),
    kpiMaxPeriods: document.getElementById('kpi-max-periods'),
    kpiComplianceStatus: document.getElementById('kpi-compliance-status'),
    kpiComplianceSubtext: document.getElementById('kpi-compliance-subtext'),
    workloadStaffCount: document.getElementById('workload-staff-count'),

    // Sticky Export Bar
    exportBarTitle: document.getElementById('export-bar-title'),
    exportBarDesc: document.getElementById('export-bar-desc'),
    btnDownloadSingleDay: document.getElementById('btn-download-single-day'),
    btnDownloadDayName: document.getElementById('btn-download-day-name'),
    btnDownloadAllDays: document.getElementById('btn-download-all-days'),
    btnPrintView: document.getElementById('btn-print-view'),

    // Period Popover Modal
    periodModal: document.getElementById('period-modal'),
    periodModalTitle: document.getElementById('period-modal-title'),
    btnClosePeriodModal: document.getElementById('btn-close-period-modal'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    modalQuickPairs: document.getElementById('modal-quick-pairs'),
    modalSubjectChips: document.getElementById('modal-subject-chips'),
    modalSubjectHint: document.getElementById('modal-subject-hint'),
    modalCustomSubject: document.getElementById('modal-custom-subject'),
    modalTeacherChips: document.getElementById('modal-teacher-chips'),
    modalTeacherHint: document.getElementById('modal-teacher-hint'),
    modalCustomTeacher: document.getElementById('modal-custom-teacher'),
    btnModalClearCell: document.getElementById('btn-modal-clear-cell'),
    btnModalSaveCell: document.getElementById('btn-modal-save-cell'),
    modalMergeSection: document.getElementById('modal-merge-section'),
    modalMergeStatusBadge: document.getElementById('modal-merge-status-badge'),
    btnModalMergeNextClass: document.getElementById('btn-modal-merge-next-class'),
    btnModalMergeNextLecture: document.getElementById('btn-modal-merge-next-lecture'),
    btnModalSplitCell: document.getElementById('btn-modal-split-cell'),
    modalMergeHint: document.getElementById('modal-merge-hint'),

    // School Profile Modal
    schoolProfileModal: document.getElementById('school-profile-modal'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),
    inputSchoolName: document.getElementById('input-school-name'),
    inputSchoolAffiliation: document.getElementById('input-school-affiliation'),
    inputAcademicYear: document.getElementById('input-academic-year'),
    inputAcademicTerm: document.getElementById('input-academic-term'),
    inputLogoFile: document.getElementById('input-logo-file'),
    btnRemoveLogo: document.getElementById('btn-remove-logo'),
    inputSignPrep: document.getElementById('input-sign-prep'),
    inputSignVer: document.getElementById('input-sign-ver'),
    inputSignApp: document.getElementById('input-sign-app'),
    btnSaveSchoolProfile: document.getElementById('btn-save-school-profile'),

    // Copy Modal
    copyModal: document.getElementById('copy-modal'),
    btnCloseCopyModal: document.getElementById('btn-close-copy-modal'),
    btnCancelCopy: document.getElementById('btn-cancel-copy'),
    btnConfirmCopy: document.getElementById('btn-confirm-copy'),
    copySourceDay: document.getElementById('copy-source-day'),
    copyTargetDay: document.getElementById('copy-target-day'),

    // Confirm Clear Modal
    confirmClearModal: document.getElementById('confirm-clear-modal'),
    confirmClearModalTitle: document.getElementById('confirm-clear-modal-title'),
    confirmClearTitleText: document.getElementById('confirm-clear-title-text'),
    confirmClearModalBody: document.getElementById('confirm-clear-modal-body'),
    btnCloseClearModal: document.getElementById('btn-close-clear-modal'),
    btnCancelClearModal: document.getElementById('btn-cancel-clear-modal'),
    btnProceedClearModal: document.getElementById('btn-proceed-clear-modal'),

    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    btnCloseSettingsModal: document.getElementById('btn-close-settings-modal'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    settingsTeachersList: document.getElementById('settings-teachers-list'),
    settingsTeacherCount: document.getElementById('settings-teacher-count'),
    settingsNewTeacher: document.getElementById('settings-new-teacher'),
    settingsNewTeacherShift: document.getElementById('settings-new-teacher-shift'),
    btnAddTeacher: document.getElementById('btn-add-teacher'),
    settingsSubjectsList: document.getElementById('settings-subjects-list'),
    settingsSubjectCount: document.getElementById('settings-subject-count'),
    settingsNewSubject: document.getElementById('settings-new-subject'),
    btnAddSubject: document.getElementById('btn-add-subject'),
    settingsTeacherSubjectMapping: document.getElementById('settings-teacher-subject-mapping'),
    settingsClassTeacherMapping: document.getElementById('settings-class-teacher-mapping'),
    settingIncludeSaturday: document.getElementById('setting-include-saturday'),
    attendanceDutyThSaturday: document.getElementById('attendance-duty-th-saturday'),

    // Cloud Database Modal (Firebase Firestore)
    btnOpenCloudDb: document.getElementById('btn-open-cloud-db'),
    cloudDbModal: document.getElementById('cloud-db-modal'),
    btnCloseCloudDbModal: document.getElementById('btn-close-cloud-db-modal'),
    btnCloseCloudDbFooter: document.getElementById('btn-close-cloud-db-footer'),
    btnSaveCloudConfig: document.getElementById('btn-save-cloud-config'),
    btnDisconnectCloud: document.getElementById('btn-disconnect-cloud'),
    btnCloudSyncNow: document.getElementById('btn-cloud-sync-now'),
    btnCloudFetchNow: document.getElementById('btn-cloud-fetch-now'),
    cloudStatusCard: document.getElementById('cloud-status-card'),
    cloudStatusDot: document.getElementById('cloud-status-dot'),
    cloudStatusTitle: document.getElementById('cloud-status-title'),
    cloudStatusDesc: document.getElementById('cloud-status-desc'),
    fbInputApiKey: document.getElementById('fb-input-apiKey'),
    fbInputProjectId: document.getElementById('fb-input-projectId'),
    fbInputAuthDomain: document.getElementById('fb-input-authDomain'),
    fbInputAppId: document.getElementById('fb-input-appId'),
    fbInputRawSnippet: document.getElementById('fb-input-rawSnippet'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // --- Initialize App ---
  function init() {
    loadState();
    setupEventListeners();
    renderSchoolProfile();
    if (window.location.hash) {
      const hashView = window.location.hash.replace('#', '');
      if (['class-view', 'teacher-view', 'duty-view', 'general-duty-view', 'substitution-view', 'workload-view'].includes(hashView)) {
        state.activeView = hashView;
      }
    }
    renderAll();
    switchView(state.activeView || 'class-view');
    window.addEventListener('hashchange', () => {
      const hashView = window.location.hash.replace('#', '');
      if (hashView && ['class-view', 'teacher-view', 'duty-view', 'general-duty-view', 'substitution-view', 'workload-view'].includes(hashView)) {
        switchView(hashView);
      }
    });
    // On local startup, ensure disk matches current localStorage state
    syncStateToDisk();

    // Initialize Firebase Firestore Cloud Database
    initCloudSyncIntegration();
  }

  // --- State Persistence ---
  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        state = Object.assign({}, state, JSON.parse(saved));
      } catch (e) {
        resetToDefaults();
      }
    } else {
      // Migrate from v3 if available and not old placeholder
      const v3 = localStorage.getItem('school_timetable_mgmt_v3');
      if (v3) {
        try {
          const old = JSON.parse(v3);
          if (old.schoolProfile && old.schoolProfile.name && old.schoolProfile.name.includes('Xavier')) {
            resetToDefaults();
          } else {
            state = Object.assign({}, state, old);
            saveState(true);
          }
        } catch(e) {
          resetToDefaults();
        }
      } else {
        resetToDefaults();
      }
    }

    // Guarantee that if any browser has old demo placeholder or ERP data cached, it resets to clean Funland DEFAULT_DATA
    const hasErpArtifacts = state.standards && state.standards.some(s => s.id === 'std_nursery' || s.id === 'std_jr_kg');
    if (!state.schoolProfile || !state.schoolProfile.name || state.schoolProfile.name.includes('Xavier') || hasErpArtifacts) {
      resetToDefaults();
      saveState(true);
    }

    // Merge standards from DEFAULT_DATA to guarantee morning standards (FG, LKG, HKG, 1st, 2nd) are present
    if (DEFAULT_DATA.standards && Array.isArray(DEFAULT_DATA.standards)) {
      if (!state.standards || state.standards.length === 0) {
        state.standards = JSON.parse(JSON.stringify(DEFAULT_DATA.standards));
      } else {
        const existingStdIds = state.standards.map(s => s.id);
        DEFAULT_DATA.standards.forEach(defStd => {
          if (!existingStdIds.includes(defStd.id)) {
            state.standards.push(JSON.parse(JSON.stringify(defStd)));
          } else {
            const current = state.standards.find(s => s.id === defStd.id);
            if (current) {
              if (!current.shift) current.shift = defStd.shift;
              if (!current.room) current.room = defStd.room;
              if (!current.baseName) current.baseName = defStd.baseName;
              if (!current.sup) current.sup = defStd.sup;
            }
          }
        });
      }
    }

    // Shifts Configuration
    if (!state.shifts || Object.keys(state.shifts).length === 0) {
      state.shifts = JSON.parse(JSON.stringify(DEFAULT_DATA.shifts || {}));
    } else {
      if (!state.shifts.morning) state.shifts.morning = {};
      state.shifts.morning.periods = [
        { id: 'p1', number: 1, label: 'Lecture 1', time: '8:20 to 9:05' },
        { id: 'p2', number: 2, label: 'Lecture 2', time: '9:05 to 9:50' },
        { id: 'p3', number: 3, label: 'Lecture 3', time: '10:10 to 10:55' },
        { id: 'p4', number: 4, label: 'Lecture 4', time: '10:55 to 11:40' },
        { id: 'p5', number: 5, label: 'Lecture 5', time: '11:40 to 12:20' }
      ];
      if (DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.morning && DEFAULT_DATA.shifts.morning.schedules) {
        state.shifts.morning.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.shifts.morning.schedules));
      }
      if (!state.shifts.afternoon) state.shifts.afternoon = {};
      if (!state.shifts.afternoon.periods || state.shifts.afternoon.periods.length === 0) {
        state.shifts.afternoon.periods = (DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.afternoon && DEFAULT_DATA.shifts.afternoon.periods && DEFAULT_DATA.shifts.afternoon.periods.length > 0)
          ? JSON.parse(JSON.stringify(DEFAULT_DATA.shifts.afternoon.periods))
          : (DEFAULT_DATA.periods ? JSON.parse(JSON.stringify(DEFAULT_DATA.periods)) : []);
      }
    }

    // Guarantee teachers from DEFAULT_DATA (including morning faculty) are present
    if (DEFAULT_DATA.teachers && Array.isArray(DEFAULT_DATA.teachers)) {
      if (!state.teachers || state.teachers.length === 0) {
        state.teachers = JSON.parse(JSON.stringify(DEFAULT_DATA.teachers));
      } else {
        DEFAULT_DATA.teachers.forEach(t => {
          if (!state.teachers.includes(t)) state.teachers.push(t);
        });
      }
    }

    // Guarantee teacher profiles from DEFAULT_DATA are present
    if (DEFAULT_DATA.teacherProfiles) {
      if (!state.teacherProfiles) state.teacherProfiles = {};
      Object.keys(DEFAULT_DATA.teacherProfiles).forEach(t => {
        if (!state.teacherProfiles[t]) {
          state.teacherProfiles[t] = Object.assign({}, DEFAULT_DATA.teacherProfiles[t]);
        } else {
          if (!state.teacherProfiles[t].assignedShift) {
            state.teacherProfiles[t].assignedShift = DEFAULT_DATA.teacherProfiles[t].assignedShift || 'afternoon';
          }
          if (state.teacherProfiles[t].primarySubject === undefined) {
            state.teacherProfiles[t].primarySubject = DEFAULT_DATA.teacherProfiles[t].primarySubject || '';
          }
        }
      });
    }

    // Guarantee subjects from DEFAULT_DATA are present
    if (DEFAULT_DATA.subjects && Array.isArray(DEFAULT_DATA.subjects)) {
      if (!state.subjects || state.subjects.length === 0) {
        state.subjects = JSON.parse(JSON.stringify(DEFAULT_DATA.subjects));
      } else {
        DEFAULT_DATA.subjects.forEach(s => {
          if (!state.subjects.includes(s)) state.subjects.push(s);
        });
      }
    }

    // Populate initial schedules for morning & afternoon standards
    if (!state.schedules) state.schedules = {};
    if (DEFAULT_DATA.initialSchedules) {
      Object.keys(DEFAULT_DATA.initialSchedules).forEach(day => {
        if (!state.schedules[day]) state.schedules[day] = {};
        const daySlots = DEFAULT_DATA.initialSchedules[day] || {};
        Object.keys(daySlots).forEach(pId => {
          if (!state.schedules[day][pId]) state.schedules[day][pId] = {};
          const pSlot = daySlots[pId] || {};
          Object.keys(pSlot).forEach(stdId => {
            const current = state.schedules[day][pId][stdId];
            if (!current || (!current.subject && !current.teacher)) {
              state.schedules[day][pId][stdId] = JSON.parse(JSON.stringify(pSlot[stdId]));
            }
          });
        });
      });
    }

    // Explicit guarantee: Force seed all 5 morning standards (FG, LKG, HKG, 1st, 2nd) for Monday through Friday from morning schedule source
    const morningStdIds = ['std_fg', 'std_lkg', 'std_hkg', 'std_1', 'std_2'];
    const morningSchedSource = (DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.morning && DEFAULT_DATA.shifts.morning.schedules) || DEFAULT_DATA.initialSchedules || {};
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
      if (!state.schedules[day]) state.schedules[day] = {};
      const srcDay = morningSchedSource[day] || {};
      ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(pId => {
        if (!state.schedules[day][pId]) state.schedules[day][pId] = {};
        const srcSlots = srcDay[pId] || {};
        morningStdIds.forEach(stdId => {
          const current = state.schedules[day][pId][stdId];
          if (!current || !current.subject || (srcSlots[stdId] && current.subject === '' && srcSlots[stdId].subject !== '')) {
            if (srcSlots[stdId]) {
              state.schedules[day][pId][stdId] = JSON.parse(JSON.stringify(srcSlots[stdId]));
            }
          }
        });
      });
    });

    // Class Teachers Mapping
    if (!state.classTeachers || Object.keys(state.classTeachers).length === 0) {
      state.classTeachers = JSON.parse(JSON.stringify(DEFAULT_DATA.classTeachers || {}));
    } else if (DEFAULT_DATA.classTeachers) {
      Object.keys(DEFAULT_DATA.classTeachers).forEach(k => {
        if (!state.classTeachers[k]) state.classTeachers[k] = DEFAULT_DATA.classTeachers[k];
      });
    }

    // Attendance Duties Roster
    if (!state.attendanceDuties || !Array.isArray(state.attendanceDuties) || state.attendanceDuties.length === 0) {
      state.attendanceDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.attendanceDuties || []));
    }

    // Active Shift & Class View Mode
    if (!state.activeShift) {
      state.activeShift = 'afternoon';
    }
    if (!state.classViewMode) {
      state.classViewMode = 'day-grid';
    }
    if (!state.selectedClassStandard) {
      state.selectedClassStandard = state.activeShift === 'morning' ? 'std_fg' : 'std_3';
    }

    if (!state.dutyPresets || state.dutyPresets.length === 0) {
      state.dutyPresets = JSON.parse(JSON.stringify(DEFAULT_DATA.dutyPresets || []));
    }
    if (!state.duties) {
      state.duties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialDuties || {}));
    }
    if (!state.weeklyDuties || Object.keys(state.weeklyDuties).length === 0) {
      state.weeklyDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialWeeklyDuties || {}));
    }
    if (!state.excludedFreeTeachers) {
      state.excludedFreeTeachers = {};
    }
    if (!state.generalDuties || !Array.isArray(state.generalDuties) || state.generalDuties.length === 0) {
      state.generalDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialGeneralDuties || []));
    } else {
      // Normalize legacy structure to day-wise allocations
      state.generalDuties.forEach(item => {
        if (!item.allocations || typeof item.allocations !== 'object') {
          item.allocations = {};
          const dList = Array.isArray(item.days) ? item.days : (item.days ? [item.days] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
          ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
            if (dList.includes(day) && item.teacher) {
              item.allocations[day] = item.teacher;
            } else {
              item.allocations[day] = '';
            }
          });
        }
      });
    }
    if (!state.activeGeneralDutyDay) {
      state.activeGeneralDutyDay = 'all';
    }

    if (!state.teacherProfiles || Object.keys(state.teacherProfiles).length === 0) {
      state.teacherProfiles = JSON.parse(JSON.stringify(DEFAULT_DATA.teacherProfiles || {}));
    } else {
      Object.keys(DEFAULT_DATA.teacherProfiles).forEach(t => {
        if (!state.teacherProfiles[t]) {
          state.teacherProfiles[t] = Object.assign({}, DEFAULT_DATA.teacherProfiles[t]);
        } else {
          if (!state.teacherProfiles[t].primarySubject && DEFAULT_DATA.teacherProfiles[t].primarySubject) {
            state.teacherProfiles[t].primarySubject = DEFAULT_DATA.teacherProfiles[t].primarySubject;
          }
          if (state.teacherProfiles[t].primarySubject === undefined) {
            state.teacherProfiles[t].primarySubject = '';
          }
          if (!state.teacherProfiles[t].assignedShift) {
            state.teacherProfiles[t].assignedShift = DEFAULT_DATA.teacherProfiles[t].assignedShift || 'afternoon';
          }
        }
      });
    }

    // Clean any undefined or missing properties in state.teacherProfiles
    Object.keys(state.teacherProfiles).forEach(t => {
      const prof = state.teacherProfiles[t];
      if (prof.primarySubject === undefined) prof.primarySubject = '';
      if (!prof.assignedShift) {
        prof.assignedShift = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am"].includes(t) ? 'morning' : 'afternoon';
      }
    });

    if (!state.selectedTeacher && state.teachers.length > 0) {
      state.selectedTeacher = state.teachers[0];
    }
    if (typeof state.includeSaturday === 'undefined') {
      state.includeSaturday = (typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.includeSaturday) || false;
    }
    if (!state.includeSaturday && state.currentDay === 'Saturday') {
      state.currentDay = 'Monday';
    }
    normalizeStateStandards(state);
  }

  const CANONICAL_STANDARDS_ORDER = {
    'std_fg': 1,
    'std_nursery': 1,
    'std_lkg': 2,
    'std_jr_kg': 2,
    'std_hkg': 3,
    'std_sr_kg': 3,
    'std_1': 4,
    'std_2': 5,
    'std_3': 6,
    'std_4': 7,
    'std_5': 8,
    'std_6': 9,
    'std_7': 10,
    'std_8': 11
  };

  const CANONICAL_STANDARDS_INFO = {
    'std_fg': { id: 'std_fg', name: 'FG', baseName: 'FG', sup: '', shift: 'morning', room: 'Pre-Primary Hall' },
    'std_nursery': { id: 'std_fg', name: 'FG', baseName: 'FG', sup: '', shift: 'morning', room: 'Pre-Primary Hall' },
    'std_lkg': { id: 'std_lkg', name: 'LKG', baseName: 'LKG', sup: '', shift: 'morning', room: 'Room KG-1' },
    'std_jr_kg': { id: 'std_lkg', name: 'LKG', baseName: 'LKG', sup: '', shift: 'morning', room: 'Room KG-1' },
    'std_hkg': { id: 'std_hkg', name: 'HKG', baseName: 'HKG', sup: '', shift: 'morning', room: 'Room KG-2' },
    'std_sr_kg': { id: 'std_hkg', name: 'HKG', baseName: 'HKG', sup: '', shift: 'morning', room: 'Room KG-2' },
    'std_1': { id: 'std_1', name: 'Standard: 1st', baseName: 'Standard: 1', sup: 'st', shift: 'morning', room: 'Room 001' },
    'std_2': { id: 'std_2', name: 'Standard: 2nd', baseName: 'Standard: 2', sup: 'nd', shift: 'morning', room: 'Room 002' },
    'std_3': { id: 'std_3', name: 'Standard: 3rd', baseName: 'Standard: 3', sup: 'rd', shift: 'afternoon', room: 'Room 101' },
    'std_4': { id: 'std_4', name: 'Standard: 4th', baseName: 'Standard: 4', sup: 'th', shift: 'afternoon', room: 'Room 102' },
    'std_5': { id: 'std_5', name: 'Standard: 5th', baseName: 'Standard: 5', sup: 'th', shift: 'afternoon', room: 'Room 103' },
    'std_6': { id: 'std_6', name: 'Standard: 6th', baseName: 'Standard: 6', sup: 'th', shift: 'afternoon', room: 'Room 201' },
    'std_7': { id: 'std_7', name: 'Standard: 7th', baseName: 'Standard: 7', sup: 'th', shift: 'afternoon', room: 'Room 202' },
    'std_8': { id: 'std_8', name: 'Standard: 8th', baseName: 'Standard: 8', sup: 'th', shift: 'afternoon', room: 'Room 203' }
  };

  function sortStandardsIncrementally(standards) {
    if (!Array.isArray(standards)) return standards;
    return standards.sort((a, b) => {
      const orderA = CANONICAL_STANDARDS_ORDER[a.id] !== undefined ? CANONICAL_STANDARDS_ORDER[a.id] : 99;
      const orderB = CANONICAL_STANDARDS_ORDER[b.id] !== undefined ? CANONICAL_STANDARDS_ORDER[b.id] : 99;
      return orderA - orderB;
    });
  }

  function normalizeStateStandards(s) {
    if (!s) return;
    if (s.standards && Array.isArray(s.standards)) {
      const seen = new Set();
      const cleaned = [];

      s.standards.forEach(std => {
        let key = std.id;
        if (std.name === 'Nursery' || std.baseName === 'Nursery') key = 'std_fg';
        else if (std.name === 'Jr. KG' || std.baseName === 'Jr. KG') key = 'std_lkg';
        else if (std.name === 'Sr. KG' || std.baseName === 'Sr. KG') key = 'std_hkg';

        const info = CANONICAL_STANDARDS_INFO[key] || CANONICAL_STANDARDS_INFO[std.id];
        if (info) {
          std.id = info.id;
          std.name = info.name;
          std.baseName = info.baseName;
          std.sup = info.sup;
          std.shift = info.shift;
          if (!std.room) std.room = info.room;
        }
        if (!seen.has(std.id)) {
          seen.add(std.id);
          cleaned.push(std);
        }
      });

      // Ensure all 11 default standards exist in state
      if (DEFAULT_DATA.standards && Array.isArray(DEFAULT_DATA.standards)) {
        DEFAULT_DATA.standards.forEach(defStd => {
          if (!seen.has(defStd.id)) {
            seen.add(defStd.id);
            cleaned.push(JSON.parse(JSON.stringify(defStd)));
          }
        });
      }

      s.standards = sortStandardsIncrementally(cleaned);
    }
    if (s.schedules) {
      Object.keys(s.schedules).forEach(day => {
        const dObj = s.schedules[day] || {};
        Object.keys(dObj).forEach(pId => {
          const pSlot = dObj[pId] || {};
          if (pSlot.std_nursery && !pSlot.std_fg) {
            pSlot.std_fg = pSlot.std_nursery;
            delete pSlot.std_nursery;
          }
          if (pSlot.std_jr_kg && !pSlot.std_lkg) {
            pSlot.std_lkg = pSlot.std_jr_kg;
            delete pSlot.std_jr_kg;
          }
          if (pSlot.std_sr_kg && !pSlot.std_hkg) {
            pSlot.std_hkg = pSlot.std_sr_kg;
            delete pSlot.std_sr_kg;
          }
        });
      });
    }
    if (s.classTeachers) {
      if (s.classTeachers.std_nursery && !s.classTeachers.std_fg) {
        s.classTeachers.std_fg = s.classTeachers.std_nursery;
        delete s.classTeachers.std_nursery;
      }
      if (s.classTeachers.std_jr_kg && !s.classTeachers.std_lkg) {
        s.classTeachers.std_lkg = s.classTeachers.std_jr_kg;
        delete s.classTeachers.std_jr_kg;
      }
      if (s.classTeachers.std_sr_kg && !s.classTeachers.std_hkg) {
        s.classTeachers.std_hkg = s.classTeachers.std_sr_kg;
        delete s.classTeachers.std_sr_kg;
      }
    }
  }

  // --- Shift-Aware Faculty Segregation Helpers ---
  function getTeacherShift(teacher) {
    const morningDefaults = ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am"];
    const prof = (state.teacherProfiles && state.teacherProfiles[teacher]) || {};
    if (prof.assignedShift) return prof.assignedShift;
    if (morningDefaults.includes(teacher)) return 'morning';
    return 'afternoon';
  }

  function getTeachersForShift(shift = state.activeShift) {
    if (!shift || shift === 'all') {
      return state.teachers || [];
    }
    return (state.teachers || []).filter(t => {
      const tShift = getTeacherShift(t);
      if (shift === 'morning') {
        return tShift === 'morning' || tShift === 'both';
      }
      if (shift === 'afternoon') {
        return tShift === 'afternoon' || tShift === 'both';
      }
      return true;
    });
  }

  function resetToDefaults() {
    state.activeView = 'class-view';
    state.currentDay = 'Monday';
    state.activeShift = 'afternoon';
    state.classViewMode = 'day-grid';
    state.selectedClassStandard = 'std_3';
    state.schoolProfile = JSON.parse(JSON.stringify(DEFAULT_DATA.schoolProfile));
    state.standards = JSON.parse(JSON.stringify(DEFAULT_DATA.standards));
    state.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.periods));
    state.shifts = JSON.parse(JSON.stringify(DEFAULT_DATA.shifts || {}));
    state.classTeachers = JSON.parse(JSON.stringify(DEFAULT_DATA.classTeachers || {}));
    state.attendanceDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.attendanceDuties || []));
    state.teachers = JSON.parse(JSON.stringify(DEFAULT_DATA.teachers));
    state.teacherProfiles = JSON.parse(JSON.stringify(DEFAULT_DATA.teacherProfiles || {}));
    state.subjects = JSON.parse(JSON.stringify(DEFAULT_DATA.subjects));
    state.days = JSON.parse(JSON.stringify(DEFAULT_DATA.days));
    state.includeSaturday = (typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.includeSaturday) || false;
    state.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules));
    state.leaves = {};
    state.substitutions = {};
    state.dutyPresets = JSON.parse(JSON.stringify(DEFAULT_DATA.dutyPresets || []));
    state.duties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialDuties || {}));
    state.weeklyDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialWeeklyDuties || {}));
    state.excludedFreeTeachers = {};
    state.generalDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialGeneralDuties || []));
    state.selectedTeacher = state.teachers[0];
    saveState(true);
  }

  function saveState(silent = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Auto-save to local disk (when running on localhost server)
    syncStateToDisk();

    // Auto-save to Firebase Firestore Cloud (multi-device cloud sync)
    if (window.FirebaseSync && window.FirebaseSync.isConfigured()) {
      window.FirebaseSync.save(state);
    } else {
      if (!silent && DOM.saveBadge) {
        DOM.saveBadge.className = 'status-pill cloud-unconfigured';
        DOM.saveBadge.innerHTML = '<span class="dot"></span> Saved Locally';
        DOM.saveBadge.title = 'Saved in browser. Click here to connect Cloud Database (Firebase) for Netlify.';
      }
    }
  }

  let syncDiskTimeout = null;
  function syncStateToDisk() {
    // Only auto-save to disk when running on local development server
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;

    if (syncDiskTimeout) clearTimeout(syncDiskTimeout);
    syncDiskTimeout = setTimeout(() => {
      fetch('/api/save-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      })
      .then(res => {
        if (res.ok && DOM.saveBadge && (!window.FirebaseSync || !window.FirebaseSync.isConfigured())) {
          DOM.saveBadge.title = 'Saved to browser & disk (js/default-data.js)';
        }
      })
      .catch(() => {
        // Silent catch if server is static
      });
    }, 350);
  }

  // --- Cloud Database (Firebase Firestore) Integration ---
  function initCloudSyncIntegration() {
    if (!window.FirebaseSync) return;

    // Listen for connection / sync status updates
    window.FirebaseSync.onStatusChange(updateCloudStatusUI);

    // If configured, initialize connection
    if (window.FirebaseSync.isConfigured()) {
      window.FirebaseSync.init().then(async (res) => {
        if (res.success) {
          // Attempt to pull existing cloud document
          const cloudData = await window.FirebaseSync.fetch();
          if (cloudData && cloudData.schedules) {
            console.log('[Firebase Sync] Hydrating timetable from Cloud Firestore');
            state = Object.assign({}, state, cloudData);
            normalizeStateStandards(state);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            renderSchoolProfile();
            renderAll();
            showToast('Loaded latest timetable from Cloud Firestore', 'success');
          } else if (cloudData && cloudData._emptyDoc) {
            // Document confirmed empty: seed initial timetable to Firestore
            console.log('[Firebase Sync] Cloud empty. Seeding initial timetable to Firestore');
            window.FirebaseSync.save(state, { immediate: true });
          } else {
            console.log('[Firebase Sync] Cloud fetch skipped seeding due to offline/network status');
          }

          // Start listening to real-time changes made on other devices
          window.FirebaseSync.listen(handleRemoteCloudUpdate);
        }
      });
    } else {
      updateCloudStatusUI('unconfigured');
    }
  }

  function handleRemoteCloudUpdate(cloudData) {
    if (!cloudData || !cloudData.schedules) return;
    console.log('[Firebase Sync] Remote timetable update received from another device');
    state = Object.assign({}, state, cloudData);
    normalizeStateStandards(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderSchoolProfile();
    renderAll();
    showToast('Timetable updated from another device in real time', 'info');
  }

  function updateCloudStatusUI(status, details = {}) {
    if (!DOM.saveBadge) return;

    const lastSavedText = details.lastSavedAt ? details.lastSavedAt.toLocaleTimeString() : '';

    if (status === 'synced') {
      DOM.saveBadge.className = 'status-pill cloud-synced';
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Cloud Synced';
      DOM.saveBadge.title = `Saved to Google Firebase Firestore (${lastSavedText}). Click to open Cloud Settings.`;
    } else if (status === 'syncing') {
      DOM.saveBadge.className = 'status-pill cloud-syncing';
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Syncing...';
      DOM.saveBadge.title = 'Uploading timetable changes to Cloud Firestore...';
    } else if (status === 'offline') {
      DOM.saveBadge.className = 'status-pill cloud-offline';
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Offline (Saved)';
      DOM.saveBadge.title = 'Offline: Changes saved locally and will sync to Cloud once reconnected.';
    } else if (status === 'connected') {
      DOM.saveBadge.className = 'status-pill cloud-synced';
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Cloud Connected';
      DOM.saveBadge.title = 'Connected to Firestore. Click to open Cloud Settings.';
    } else if (status === 'error') {
      DOM.saveBadge.className = 'status-pill cloud-offline';
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Cloud Error';
      DOM.saveBadge.title = details.message || 'Error connecting to Firestore. Click for details.';
    } else {
      // unconfigured
      DOM.saveBadge.className = 'status-pill cloud-unconfigured';
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Saved Locally';
      DOM.saveBadge.title = 'Saved in browser. Click here to connect Cloud Database (Firebase) for Netlify.';
    }

    // Update modal card status if present
    if (DOM.cloudStatusCard && DOM.cloudStatusTitle && DOM.cloudStatusDesc) {
      DOM.cloudStatusCard.className = `cloud-status-box ${status === 'synced' ? 'connected' : status}`;
      if (status === 'synced' || status === 'connected') {
        DOM.cloudStatusTitle.textContent = 'Connected to Cloud Firestore';
        DOM.cloudStatusDesc.textContent = `Multi-device cloud synchronization is active.${lastSavedText ? ' Last synced at ' + lastSavedText : ''}`;
      } else if (status === 'syncing') {
        DOM.cloudStatusTitle.textContent = 'Syncing with Cloud...';
        DOM.cloudStatusDesc.textContent = details.message || 'Saving state to Firestore...';
      } else if (status === 'offline') {
        DOM.cloudStatusTitle.textContent = 'Offline Mode (Local Auto-Save)';
        DOM.cloudStatusDesc.textContent = 'You are currently offline. Edits are saved in local storage and will sync automatically when back online.';
      } else if (status === 'error') {
        DOM.cloudStatusTitle.textContent = 'Firebase Connection Error';
        DOM.cloudStatusDesc.textContent = details.message || 'Check your Firebase keys and Firestore database rules.';
      } else {
        DOM.cloudStatusTitle.textContent = 'Firebase Cloud Sync: Offline / Local Mode';
        DOM.cloudStatusDesc.textContent = 'Enter your free Firebase configuration below to enable multi-device sync.';
      }
    }
  }

  function openCloudDbModal() {
    if (!DOM.cloudDbModal) return;
    const cfg = window.FirebaseSync ? window.FirebaseSync.getConfig() : null;
    if (cfg) {
      if (DOM.fbInputApiKey) DOM.fbInputApiKey.value = cfg.apiKey || '';
      if (DOM.fbInputProjectId) DOM.fbInputProjectId.value = cfg.projectId || '';
      if (DOM.fbInputAuthDomain) DOM.fbInputAuthDomain.value = cfg.authDomain || '';
      if (DOM.fbInputAppId) DOM.fbInputAppId.value = cfg.appId || '';
    }
    updateCloudStatusUI(window.FirebaseSync ? window.FirebaseSync.getStatus() : 'unconfigured', {
      lastSavedAt: window.FirebaseSync ? window.FirebaseSync.getLastSavedAt() : null
    });
    DOM.cloudDbModal.classList.add('active');
  }

  function parseFirebaseSnippet(raw) {
    if (!raw || !raw.trim()) return null;
    const str = raw.trim();
    try {
      return JSON.parse(str);
    } catch (e) {}

    const extract = (key) => {
      const match = str.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
      return match ? match[1] : '';
    };

    const apiKey = extract('apiKey');
    const projectId = extract('projectId');
    const authDomain = extract('authDomain');
    const appId = extract('appId');
    const storageBucket = extract('storageBucket');
    const messagingSenderId = extract('messagingSenderId');

    if (apiKey || projectId) {
      return { apiKey, projectId, authDomain, appId, storageBucket, messagingSenderId };
    }
    return null;
  }

  async function handleSaveCloudConfig() {
    let cfg = null;
    const raw = DOM.fbInputRawSnippet ? DOM.fbInputRawSnippet.value.trim() : '';
    if (raw) {
      cfg = parseFirebaseSnippet(raw);
    }
    if (!cfg) {
      cfg = {
        apiKey: DOM.fbInputApiKey ? DOM.fbInputApiKey.value.trim() : '',
        projectId: DOM.fbInputProjectId ? DOM.fbInputProjectId.value.trim() : '',
        authDomain: DOM.fbInputAuthDomain ? DOM.fbInputAuthDomain.value.trim() : '',
        appId: DOM.fbInputAppId ? DOM.fbInputAppId.value.trim() : ''
      };
    }

    if (!cfg.apiKey || !cfg.projectId) {
      showToast('Please enter at least an API Key and Project ID', 'error');
      return;
    }

    if (DOM.fbInputApiKey) DOM.fbInputApiKey.value = cfg.apiKey;
    if (DOM.fbInputProjectId) DOM.fbInputProjectId.value = cfg.projectId;
    if (DOM.fbInputAuthDomain) DOM.fbInputAuthDomain.value = cfg.authDomain || '';
    if (DOM.fbInputAppId) DOM.fbInputAppId.value = cfg.appId || '';

    showToast('Connecting to Firebase Firestore...', 'info');
    const res = await window.FirebaseSync.saveConfig(cfg);
    if (res.success) {
      showToast('Successfully connected to Firebase Firestore!', 'success');
      // Sync current timetable to Cloud
      await window.FirebaseSync.save(state, { immediate: true });
      window.FirebaseSync.listen(handleRemoteCloudUpdate);
      setTimeout(() => {
        if (DOM.cloudDbModal) DOM.cloudDbModal.classList.remove('active');
      }, 900);
    } else {
      showToast('Connection failed: ' + (res.error ? res.error.message : (res.reason || 'Check keys')), 'error');
    }
  }

  function handleDisconnectCloud() {
    if (confirm('Disconnect from Firebase Cloud Database? The app will continue saving locally in this browser.')) {
      if (window.FirebaseSync) window.FirebaseSync.clearConfig();
      if (DOM.fbInputApiKey) DOM.fbInputApiKey.value = '';
      if (DOM.fbInputProjectId) DOM.fbInputProjectId.value = '';
      if (DOM.fbInputAuthDomain) DOM.fbInputAuthDomain.value = '';
      if (DOM.fbInputAppId) DOM.fbInputAppId.value = '';
      if (DOM.fbInputRawSnippet) DOM.fbInputRawSnippet.value = '';
      showToast('Disconnected from Cloud Database', 'info');
    }
  }

  async function handleCloudSyncNow() {
    if (!window.FirebaseSync || !window.FirebaseSync.isConfigured()) {
      showToast('Firebase is not configured. Please enter credentials first.', 'error');
      return;
    }
    showToast('Uploading timetable to Cloud Firestore...', 'info');
    const res = await window.FirebaseSync.save(state, { immediate: true });
    if (res.success) {
      showToast('Cloud sync complete!', 'success');
    } else {
      showToast('Sync failed: ' + (res.error ? res.error.message : 'Unknown error'), 'error');
    }
  }

  async function handleCloudFetchNow() {
    if (!window.FirebaseSync || !window.FirebaseSync.isConfigured()) {
      showToast('Firebase is not configured. Please enter credentials first.', 'error');
      return;
    }
    showToast('Fetching latest timetable from Cloud Firestore...', 'info');
    const cloudData = await window.FirebaseSync.fetch();
    if (cloudData && cloudData.schedules) {
      state = Object.assign({}, state, cloudData);
      normalizeStateStandards(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderSchoolProfile();
      renderAll();
      showToast('Timetable loaded from Cloud Firestore', 'success');
    } else {
      showToast('No timetable found in Cloud Firestore yet', 'info');
    }
  }

  // --- School Profile & Branding ---
  function renderSchoolProfile() {
    const prof = state.schoolProfile || {};
    DOM.headerSchoolName.textContent = prof.name || "School Timetable Management";
    DOM.headerSchoolMeta.textContent = `${prof.affiliation || ''} • ${prof.academicYear || ''}`;

    if (prof.logoBase64) {
      DOM.headerSchoolLogo.src = prof.logoBase64;
      DOM.headerSchoolLogo.style.display = 'block';
      DOM.defaultBrandIcon.style.display = 'none';
    } else {
      DOM.headerSchoolLogo.style.display = 'none';
      DOM.defaultBrandIcon.style.display = 'flex';
    }
  }

  function openSchoolProfileModal() {
    const prof = state.schoolProfile || {};
    DOM.inputSchoolName.value = prof.name || '';
    DOM.inputSchoolAffiliation.value = prof.affiliation || '';
    DOM.inputAcademicYear.value = prof.academicYear || '';
    DOM.inputAcademicTerm.value = prof.term || '';
    DOM.inputSignPrep.value = prof.preparedBy || '';
    DOM.inputSignVer.value = prof.verifiedBy || '';
    DOM.inputSignApp.value = prof.approvedBy || '';
    DOM.schoolProfileModal.classList.add('active');
  }

  function saveSchoolProfile() {
    state.schoolProfile.name = DOM.inputSchoolName.value.trim() || "School Timetable Management";
    state.schoolProfile.affiliation = DOM.inputSchoolAffiliation.value.trim();
    state.schoolProfile.academicYear = DOM.inputAcademicYear.value.trim();
    state.schoolProfile.term = DOM.inputAcademicTerm.value.trim();
    state.schoolProfile.preparedBy = DOM.inputSignPrep.value.trim();
    state.schoolProfile.verifiedBy = DOM.inputSignVer.value.trim();
    state.schoolProfile.approvedBy = DOM.inputSignApp.value.trim();

    saveState();
    renderSchoolProfile();
    DOM.schoolProfileModal.classList.remove('active');
    showToast('School profile updated successfully', 'success');
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      state.schoolProfile.logoBase64 = evt.target.result;
      saveState();
      renderSchoolProfile();
      showToast('School logo uploaded', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    state.schoolProfile.logoBase64 = '';
    DOM.inputLogoFile.value = '';
    saveState();
    renderSchoolProfile();
    showToast('School logo removed', 'info');
  }

  // --- View Switcher ---
  function switchView(viewName) {
    state.activeView = viewName;
    DOM.viewTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });
    DOM.viewSections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `section-${viewName}`);
    });

    if (viewName === 'teacher-view') renderTeacherView();
    if (viewName === 'duty-view') renderWeeklyDutyView();
    if (viewName === 'general-duty-view') renderGeneralDutyView();
    if (viewName === 'substitution-view') renderSubstitutionView();
    if (viewName === 'workload-view') renderWorkloadView();
    if (viewName === 'class-view') renderClassView();

    updateExportBar();
  }

  function renderAll() {
    updateSaturdayToggleUi();
    renderClassView();
    renderTeacherView();
    renderWeeklyDutyView();
    renderGeneralDutyView();
    renderSubstitutionView();
    renderWorkloadView();
    updateExportBar();
  }

  function getActiveDays() {
    const allDays = (state.days && state.days.length > 0) ? state.days : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (state.includeSaturday) return allDays;
    return allDays.filter(d => d.toLowerCase() !== 'saturday');
  }

  function updateSaturdayToggleUi() {
    const isSat = !!state.includeSaturday;
    if (DOM.btnToggleSaturday) {
      DOM.btnToggleSaturday.classList.toggle('active', isSat);
      if (DOM.btnToggleSaturdayText) {
        DOM.btnToggleSaturdayText.textContent = isSat ? 'Saturday: On' : 'Saturday: Off';
      }
      DOM.btnToggleSaturday.title = isSat 
        ? 'Saturday is active across timetables & Word documents. Click to deactivate/hide.' 
        : 'Saturday is hidden across timetables & Word documents. Click to activate/show.';
    }
    if (DOM.settingIncludeSaturday) {
      DOM.settingIncludeSaturday.checked = isSat;
    }
  }

  function toggleSaturdayVisibility(newValue) {
    state.includeSaturday = (typeof newValue === 'boolean') ? newValue : !state.includeSaturday;
    if (!state.includeSaturday && state.currentDay === 'Saturday') {
      state.currentDay = 'Monday';
    }
    updateSaturdayToggleUi();
    saveState();
    renderAll();
    showToast(state.includeSaturday ? 'Saturday enabled across timetables and exports' : 'Saturday hidden from all timetables and exports', 'info');
  }

  // --- Shift & Format Helpers ---
  function getShiftPeriods(shiftKey) {
    if (shiftKey === 'morning') {
      if (state.shifts && state.shifts.morning && Array.isArray(state.shifts.morning.periods) && state.shifts.morning.periods.length > 0) {
        return state.shifts.morning.periods;
      }
      if (typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.morning && DEFAULT_DATA.shifts.morning.periods) {
        return DEFAULT_DATA.shifts.morning.periods;
      }
    }
    if (shiftKey === 'afternoon') {
      if (state.shifts && state.shifts.afternoon && Array.isArray(state.shifts.afternoon.periods) && state.shifts.afternoon.periods.length > 0) {
        return state.shifts.afternoon.periods;
      }
      if (typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.shifts && DEFAULT_DATA.shifts.afternoon && DEFAULT_DATA.shifts.afternoon.periods) {
        return DEFAULT_DATA.shifts.afternoon.periods;
      }
    }
    return state.periods;
  }

  function updateShiftControlUI() {
    if (!DOM.shiftSelectorGroup) return;
    DOM.shiftSelectorGroup.querySelectorAll('.shift-pill-btn').forEach(btn => {
      const shift = btn.getAttribute('data-shift');
      btn.classList.toggle('active', shift === state.activeShift);
    });
  }

  function updateClassModeControlUI() {
    if (!DOM.classModeToggle) return;
    DOM.classModeToggle.querySelectorAll('.mode-btn').forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      btn.classList.toggle('active', mode === state.classViewMode);
    });
  }

  // --- 1. Class Timetable View Rendering ---
  function renderClassView() {
    updateShiftControlUI();
    updateClassModeControlUI();

    if (state.classViewMode === 'class-weekly') {
      if (DOM.dayGridContainer) DOM.dayGridContainer.style.display = 'none';
      if (DOM.classWeeklyContainer) DOM.classWeeklyContainer.style.display = 'block';
      renderClassWeeklyView();
    } else {
      if (DOM.dayGridContainer) DOM.dayGridContainer.style.display = 'block';
      if (DOM.classWeeklyContainer) DOM.classWeeklyContainer.style.display = 'none';
      renderDayTabs();
      renderAttendance();
      renderClassTable();
    }
  }

  function renderDayTabs() {
    if (!DOM.dayTabsContainer) return;
    DOM.dayTabsContainer.innerHTML = '';

    let visibleStds = state.standards;
    if (state.activeShift === 'morning') {
      visibleStds = state.standards.filter(s => s.shift === 'morning');
    } else if (state.activeShift === 'afternoon') {
      visibleStds = state.standards.filter(s => s.shift === 'afternoon');
    }
    if (visibleStds.length === 0) visibleStds = state.standards;
    visibleStds = sortStandardsIncrementally(visibleStds.slice());

    const shiftPeriods = getShiftPeriods(state.activeShift);
    const activeDays = getActiveDays();
    if (!activeDays.includes(state.currentDay)) {
      state.currentDay = activeDays[0] || 'Monday';
    }

    activeDays.forEach(day => {
      const tab = document.createElement('button');
      tab.className = `day-tab-btn ${day === state.currentDay ? 'active' : ''}`;
      
      const dayData = state.schedules[day] || {};
      let filled = 0;
      const total = shiftPeriods.length * visibleStds.length;
      shiftPeriods.forEach(p => {
        const pSlots = dayData[p.id] || {};
        visibleStds.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].subject && pSlots[s.id].teacher) filled++;
        });
      });

      tab.innerHTML = `<span>${escapeHtml(day)}</span><span class="day-tab-badge">${filled}/${total}</span>`;
      tab.addEventListener('click', () => {
        state.currentDay = day;
        saveState(true);
        renderClassView();
      });
      DOM.dayTabsContainer.appendChild(tab);
    });

    if (DOM.displayDayName) DOM.displayDayName.textContent = state.currentDay;
    if (DOM.btnDownloadDayName) DOM.btnDownloadDayName.textContent = state.currentDay;
  }

  function renderAttendance() {
    if (!DOM.attendanceChipsContainer) return;
    DOM.attendanceChipsContainer.innerHTML = '';
    const dayLeaves = state.leaves[state.currentDay] || [];

    const shiftTeachers = getTeachersForShift(state.activeShift);

    shiftTeachers.forEach(teacher => {
      const isOnLeave = dayLeaves.includes(teacher);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `teacher-badge-btn ${isOnLeave ? 'on-leave' : ''}`;
      btn.innerHTML = `<span class="dot"></span><span>${escapeHtml(teacher)}</span>${isOnLeave ? '<span style="font-size: 11px; opacity: 0.8;">(On Leave)</span>' : ''}`;
      btn.addEventListener('click', () => toggleTeacherLeave(teacher));
      DOM.attendanceChipsContainer.appendChild(btn);
    });
  }

  function toggleTeacherLeave(teacher) {
    if (!state.leaves[state.currentDay]) state.leaves[state.currentDay] = [];
    const idx = state.leaves[state.currentDay].indexOf(teacher);
    if (idx > -1) {
      state.leaves[state.currentDay].splice(idx, 1);
      showToast(`${teacher} marked Present for ${state.currentDay}`, 'success');
    } else {
      state.leaves[state.currentDay].push(teacher);
      showToast(`${teacher} marked On Leave for ${state.currentDay}`, 'error');
    }
    saveState();
    renderClassView();
    renderSubstitutionView();
  }

  function renderClassTable() {
    if (!DOM.timetableThead || !DOM.timetableTbody) return;

    const dayData = state.schedules[state.currentDay] || {};
    const dayLeaves = state.leaves[state.currentDay] || [];
    const activeTeachers = state.teachers.filter(t => !dayLeaves.includes(t));

    // Determine visible standards by active shift
    let visibleStandards = state.standards;
    if (state.activeShift === 'morning') {
      visibleStandards = state.standards.filter(s => s.shift === 'morning');
    } else if (state.activeShift === 'afternoon') {
      visibleStandards = state.standards.filter(s => s.shift === 'afternoon');
    }
    if (visibleStandards.length === 0) visibleStandards = state.standards;
    visibleStandards = sortStandardsIncrementally(visibleStandards.slice());

    const displayPeriods = getShiftPeriods(state.activeShift);

    // Header
    let theadHtml = `<tr><th class="col-lecture-w">Period / Timing</th>`;
    visibleStandards.forEach(std => {
      const base = std.baseName || std.name.replace(/rd|th|st|nd/i, '');
      const sup = std.sup || (std.name.match(/rd|th|st|nd/i) ? std.name.match(/rd|th|st|nd/i)[0] : '');
      const ct = (state.classTeachers && state.classTeachers[std.id]) || '';
      theadHtml += `
        <th class="col-std-w">
          <div>${escapeHtml(base)}<sup>${escapeHtml(sup)}</sup></div>
          ${ct ? `<div style="font-size: 10px; font-weight: 500; opacity: 0.85; margin-top: 2px;">CT: ${escapeHtml(ct)}</div>` : ''}
        </th>`;
    });
    theadHtml += `<th class="col-free-w">Free Teachers</th></tr>`;
    DOM.timetableThead.innerHTML = theadHtml;

    const allConflicts = [];
    let tbodyHtml = '';

    displayPeriods.forEach((period, pIdx) => {
      const isMorningRecess = state.activeShift === 'morning' && pIdx === 2;
      const isAfternoonRecess = state.activeShift !== 'morning' && pIdx === 3;
      if (isMorningRecess || isAfternoonRecess) {
        const recessText = state.activeShift === 'morning'
          ? 'MORNING RECESS BREAK • 9:50 AM TO 10:10 AM (20 MINUTES)'
          : (state.activeShift === 'afternoon'
              ? 'AFTERNOON RECESS BREAK • 3:15 PM TO 3:45 PM (30 MINUTES)'
              : 'RECESS BREAK • Morning: 9:50–10:10 AM | Afternoon: 3:15–3:45 PM');

        tbodyHtml += `
          <tr class="recess-break-row">
            <td colspan="${visibleStandards.length + 2}">${recessText}</td>
          </tr>`;
      }

      const pSlots = dayData[period.id] || {};
      const shiftTeacherAllocation = {
        morning: {},
        afternoon: {}
      };

      state.standards.forEach(std => {
        const stdShift = std.shift || 'afternoon';
        const slot = pSlots[std.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          const t = slot.teacher.trim();
          if (!shiftTeacherAllocation[stdShift]) shiftTeacherAllocation[stdShift] = {};
          if (!shiftTeacherAllocation[stdShift][t]) shiftTeacherAllocation[stdShift][t] = [];
          shiftTeacherAllocation[stdShift][t].push(std.name);
        }
      });

      // Free and busy teachers determined by the active shift perspective
      let busyTeachers = [];
      if (state.activeShift === 'morning') {
        busyTeachers = Object.keys(shiftTeacherAllocation.morning);
      } else if (state.activeShift === 'afternoon') {
        busyTeachers = Object.keys(shiftTeacherAllocation.afternoon);
      } else {
        busyTeachers = Array.from(new Set([
          ...Object.keys(shiftTeacherAllocation.morning),
          ...Object.keys(shiftTeacherAllocation.afternoon)
        ]));
      }

      // Check conflicts ONLY within the same shift (morning vs afternoon do not conflict)
      ['morning', 'afternoon'].forEach(sh => {
        if (state.activeShift === 'all' || state.activeShift === sh) {
          const alloc = shiftTeacherAllocation[sh] || {};
          Object.keys(alloc).forEach(t => {
            if (alloc[t].length > 1) {
              const shiftTitle = sh === 'morning' ? 'Morning Shift' : 'Afternoon Shift';
              allConflicts.push({
                period: state.activeShift === 'all' ? `${period.label} (${shiftTitle})` : period.label,
                teacher: t,
                standards: alloc[t]
              });
            }
          });
        }
      });

      const excludedKey = `${state.currentDay}_${period.id}`;
      const excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[excludedKey]) || [];
      const shiftFaculty = getTeachersForShift(state.activeShift);
      const shiftActiveTeachers = shiftFaculty.filter(t => !dayLeaves.includes(t));

      const freeTeachers = shiftActiveTeachers.filter(t => !busyTeachers.includes(t) && !excludedForPeriod.includes(t));
      const removedTeachers = shiftActiveTeachers.filter(t => !busyTeachers.includes(t) && excludedForPeriod.includes(t));

      tbodyHtml += `
        <tr>
          <td class="period-header-cell">
            <div class="period-header-num">${escapeHtml(period.label)}</div>
            <div class="period-header-time">${escapeHtml(period.time)}</div>
          </td>`;

      visibleStandards.forEach(std => {
        const slot = pSlots[std.id] || { subject: '', teacher: '' };
        if (slot.isMergedChild) {
          return;
        }

        const colSpan = slot.colSpan && slot.colSpan > 1 ? slot.colSpan : 1;
        const rowSpan = slot.rowSpan && slot.rowSpan > 1 ? slot.rowSpan : 1;
        const hasContent = slot.subject || slot.teacher;
        const stdShift = std.shift || 'afternoon';

        const isMultiRoom = slot.teacher &&
          shiftTeacherAllocation[stdShift] &&
          shiftTeacherAllocation[stdShift][slot.teacher.trim()] &&
          shiftTeacherAllocation[stdShift][slot.teacher.trim()].length > 1;

        let isCombined = false;
        let isConflict = false;
        if (isMultiRoom) {
          const tName = slot.teacher.trim();
          const stds = shiftTeacherAllocation[stdShift][tName] || [];
          const subjs = stds.map(sName => {
            const f = state.standards.find(s => s.name === sName);
            return f && pSlots[f.id] ? pSlots[f.id].subject : '';
          });
          const allSame = subjs.every(s => s === slot.subject);
          if (allSame || colSpan > 1) {
            isCombined = true;
          } else {
            isConflict = true;
          }
        }

        const isMerged = colSpan > 1 || rowSpan > 1;
        let cellClass = 'grid-period-cell';
        if (isConflict) cellClass += ' has-conflict';
        else if (isCombined) cellClass += ' combined-class';
        if (isMerged) cellClass += ' is-merged';

        let badgeHtml = '';
        if (colSpan > 1) {
          const mNames = (slot.mergedStds || []).map(sid => {
            const found = state.standards.find(s => s.id === sid);
            return found ? (found.baseName || found.name) : sid;
          }).join(' + ');
          badgeHtml = `<div class="merged-badge">🔗 Combined (${escapeHtml(mNames)})</div>`;
        } else if (rowSpan > 1) {
          badgeHtml = `<div class="merged-badge">⏳ Double Period (${rowSpan} Lecs)</div>`;
        }

        tbodyHtml += `
          <td class="${cellClass}" data-period="${period.id}" data-std="${std.id}" ${colSpan > 1 ? `colspan="${colSpan}"` : ''} ${rowSpan > 1 ? `rowspan="${rowSpan}"` : ''}>
            <div class="grid-cell-inner">`;

        if (hasContent) {
          tbodyHtml += `
              <div class="subject-label">${escapeHtml(slot.subject || '-')}</div>
              <div class="teacher-sublabel">(${escapeHtml(slot.teacher || 'Unassigned')})</div>
              ${badgeHtml}`;
        } else {
          tbodyHtml += `<div class="empty-prompt">+ Assign Period</div>`;
        }

        tbodyHtml += `</div></td>`;
      });

      tbodyHtml += `
          <td class="free-staff-cell">
            <div class="free-staff-flow">`;
      if (freeTeachers.length === 0) {
        tbodyHtml += `<span class="free-staff-none">None Free</span>`;
      } else {
        freeTeachers.forEach(t => {
          tbodyHtml += `
            <div class="free-staff-item">
              <span class="free-staff-name" title="${escapeHtml(t)}">${escapeHtml(t)}</span>
              <button type="button" class="btn-remove-free-teacher" data-day="${escapeHtml(state.currentDay)}" data-period="${escapeHtml(period.id)}" data-teacher="${escapeHtml(t)}" title="Remove ${escapeHtml(t)} from free list">&times;</button>
            </div>`;
        });
      }
      tbodyHtml += `</div></td></tr>`;
    });

    DOM.timetableTbody.innerHTML = tbodyHtml;

    DOM.timetableTbody.querySelectorAll('.grid-period-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        openPeriodModal(cell.getAttribute('data-period'), cell.getAttribute('data-std'));
      });
    });

    DOM.timetableTbody.querySelectorAll('.btn-remove-free-teacher').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = btn.getAttribute('data-day');
        const periodId = btn.getAttribute('data-period');
        const teacher = btn.getAttribute('data-teacher');
        removeFreeTeacher(day, periodId, teacher);
      });
    });

    if (allConflicts.length > 0) {
      DOM.conflictBanner.classList.add('visible');
      const conflictSnippets = allConflicts.map(c => 
        `<strong>${c.teacher}</strong> is allocated to multiple classes in <strong>${c.period}</strong> (${c.standards.join(' & ')})`
      );
      DOM.conflictMessage.innerHTML = `<strong>Schedule Conflict Detected in ${state.currentDay}:</strong> ` + conflictSnippets.join('; ');
    } else {
      DOM.conflictBanner.classList.remove('visible');
    }

    if (DOM.displayDayStats) {
      if (state.activeShift === 'morning') {
        DOM.displayDayStats.textContent = `Standards: FG to 2nd (Morning) • Lectures: 1 to 5 (8:20 AM – 12:20 PM)`;
      } else if (state.activeShift === 'afternoon') {
        DOM.displayDayStats.textContent = `Standards: 3rd to 8th (Afternoon) • Lectures: 1 to 6 (1:00 PM – 5:50 PM)`;
      } else {
        DOM.displayDayStats.textContent = `All Standards (FG to 8th) • Morning & Afternoon Shifts`;
      }
    }
  }

  // --- Class-Wise Weekly Matrix View Rendering ---
  function renderClassWeeklyView() {
    if (!DOM.classWeeklyContainer) return;

    let availableStds = state.standards;
    if (state.activeShift === 'morning') {
      availableStds = state.standards.filter(s => s.shift === 'morning');
    } else if (state.activeShift === 'afternoon') {
      availableStds = state.standards.filter(s => s.shift === 'afternoon');
    }
    if (availableStds.length === 0) availableStds = state.standards;
    availableStds = sortStandardsIncrementally(availableStds.slice());

    // Validate selectedClassStandard
    if (!availableStds.some(s => s.id === state.selectedClassStandard)) {
      state.selectedClassStandard = availableStds[0].id;
    }

    const currentStd = state.standards.find(s => s.id === state.selectedClassStandard) || availableStds[0];
    const isMorning = currentStd.shift === 'morning';
    const shiftPeriods = getShiftPeriods(isMorning ? 'morning' : 'afternoon');
    const classTeacherName = (state.classTeachers && state.classTeachers[currentStd.id]) || 'Unassigned';

    // 1. Render class tabs
    if (DOM.classWeeklyStdTabs) {
      DOM.classWeeklyStdTabs.innerHTML = '';
      availableStds.forEach(std => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `class-pill-btn ${std.id === state.selectedClassStandard ? 'active' : ''}`;
        const shiftIcon = std.shift === 'morning' ? '☀️' : '🌙';
        const base = std.baseName || std.name.replace(/rd|th|st|nd/i, '');
        const sup = std.sup || (std.name.match(/rd|th|st|nd/i) ? std.name.match(/rd|th|st|nd/i)[0] : '');
        btn.innerHTML = `<span>${shiftIcon} ${escapeHtml(base)}<sup>${escapeHtml(sup)}</sup></span>`;
        btn.onclick = () => {
          state.selectedClassStandard = std.id;
          saveState(true);
          renderClassWeeklyView();
        };
        DOM.classWeeklyStdTabs.appendChild(btn);
      });
    }

    // 2. Populate Class Header Card
    if (DOM.classWeeklyShiftBadge) {
      DOM.classWeeklyShiftBadge.textContent = isMorning ? '☀️ Morning Shift (7:30 AM – 12:30 PM)' : '🌙 Afternoon Shift (1:00 PM – 5:50 PM)';
      DOM.classWeeklyShiftBadge.className = `shift-badge-pill ${isMorning ? 'morning' : 'afternoon'}`;
    }
    if (DOM.classWeeklyTitle) {
      DOM.classWeeklyTitle.textContent = `${currentStd.name} Weekly Timetable`;
    }
    if (DOM.classWeeklyTeacherName) {
      DOM.classWeeklyTeacherName.textContent = classTeacherName;
    }
    if (DOM.classWeeklyRoom) {
      DOM.classWeeklyRoom.textContent = currentStd.room || 'Room TBA';
    }

    // Count weekly lectures
    const activeDays = getActiveDays();
    let weeklyLectures = 0;
    activeDays.forEach(day => {
      const daySlots = state.schedules[day] || {};
      shiftPeriods.forEach(p => {
        const slot = daySlots[p.id]?.[currentStd.id];
        if (slot && slot.subject && slot.subject.trim()) weeklyLectures++;
      });
    });
    if (DOM.classWeeklyLectureCount) {
      DOM.classWeeklyLectureCount.textContent = `${weeklyLectures} Lectures / Week`;
    }

    // 3. Render Weekly Table Header
    if (DOM.classWeeklyThead) {
      let theadHtml = `<tr><th style="width: 16%;">Period / Timing</th>`;
      const colWidth = activeDays.length === 5 ? '16.8%' : '14%';
      activeDays.forEach(day => {
        theadHtml += `<th style="width: ${colWidth};">${escapeHtml(day)}</th>`;
      });
      theadHtml += `</tr>`;
      DOM.classWeeklyThead.innerHTML = theadHtml;
    }

    // 4. Render Weekly Table Body
    if (DOM.classWeeklyTbody) {
      let tbodyHtml = '';
      shiftPeriods.forEach((period, pIdx) => {
        if (pIdx === 3) {
          const recessTime = isMorning ? '9:45 AM TO 10:15 AM (30 MINUTES)' : '3:15 PM TO 3:45 PM (30 MINUTES)';
          tbodyHtml += `
            <tr class="recess-break-row">
              <td colspan="${activeDays.length + 1}">${isMorning ? 'MORNING' : 'AFTERNOON'} RECESS BREAK • ${recessTime}</td>
            </tr>`;
        }

        tbodyHtml += `
          <tr>
            <td class="period-header-cell">
              <div class="period-header-num">${escapeHtml(period.label)}</div>
              <div class="period-header-time">${escapeHtml(period.time)}</div>
            </td>`;

        activeDays.forEach(day => {
          const slot = state.schedules[day]?.[period.id]?.[currentStd.id] || { subject: '', teacher: '' };
          const hasContent = slot.subject || slot.teacher;

          tbodyHtml += `
            <td class="grid-period-cell" data-day="${escapeHtml(day)}" data-period="${escapeHtml(period.id)}" data-std="${escapeHtml(currentStd.id)}">
              <div class="grid-cell-inner">`;

          if (hasContent) {
            tbodyHtml += `
              <div class="subject-label">${escapeHtml(slot.subject || '-')}</div>
              <div class="teacher-sublabel">(${escapeHtml(slot.teacher || 'Unassigned')})</div>`;
          } else {
            tbodyHtml += `<div class="empty-prompt">+ Assign Period</div>`;
          }

          tbodyHtml += `</div></td>`;
        });

        tbodyHtml += `</tr>`;
      });

      DOM.classWeeklyTbody.innerHTML = tbodyHtml;

      // Click cell to open popover with day override
      DOM.classWeeklyTbody.querySelectorAll('.grid-period-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const day = cell.getAttribute('data-day');
          const pId = cell.getAttribute('data-period');
          const sId = cell.getAttribute('data-std');
          openPeriodModal(pId, sId, day);
        });
      });
    }
  }

  function removeFreeTeacher(day, periodId, teacher) {
    if (!state.excludedFreeTeachers) state.excludedFreeTeachers = {};
    const key = `${day}_${periodId}`;
    if (!state.excludedFreeTeachers[key]) {
      state.excludedFreeTeachers[key] = [];
    }
    if (!state.excludedFreeTeachers[key].includes(teacher)) {
      state.excludedFreeTeachers[key].push(teacher);
    }
    saveState();
    renderClassTable();
    renderSubstitutionView();
    showToast(`Removed ${teacher} from Free Teachers (${day} ${periodId.toUpperCase()})`, 'info');
  }

  // --- 2. Teacher-Wise Individual Timetable Rendering ---
  function renderTeacherView() {
    DOM.selectTeacherFilter.innerHTML = '';
    const shiftTeachers = getTeachersForShift(state.activeShift);
    if (shiftTeachers.length > 0 && !shiftTeachers.includes(state.selectedTeacher)) {
      state.selectedTeacher = shiftTeachers[0];
    }
    shiftTeachers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      if (t === state.selectedTeacher) opt.selected = true;
      DOM.selectTeacherFilter.appendChild(opt);
    });

    DOM.selectTeacherFilter.onchange = function() {
      state.selectedTeacher = this.value;
      renderTeacherGrid();
    };

    renderTeacherGrid();
  }

  function renderTeacherGrid() {
    const shiftTeachers = getTeachersForShift(state.activeShift);
    const teacher = (shiftTeachers.includes(state.selectedTeacher) ? state.selectedTeacher : shiftTeachers[0]) || state.teachers[0];
    DOM.displayTeacherName.textContent = `${teacher} • Weekly Timetable`;

    // Filter to active days
    const teacherDays = getActiveDays();
    const prof = (state.teacherProfiles && state.teacherProfiles[teacher]) || {};
    const tShift = prof.assignedShift === 'morning' ? 'morning' : 'afternoon';
    const teacherPeriods = getShiftPeriods(tShift);

    // Compute load stats
    let totalAssigned = 0;
    teacherDays.forEach(d => {
      const dSched = state.schedules[d] || {};
      teacherPeriods.forEach(p => {
        const pSlots = dSched[p.id] || {};
        state.standards.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].teacher && pSlots[s.id].teacher.trim() === teacher) totalAssigned++;
        });
      });
    });

    const totalSlots = teacherDays.length * teacherPeriods.length;
    DOM.teacherLoadStat.textContent = totalAssigned;
    DOM.teacherFreeStat.textContent = totalSlots - totalAssigned;

    // Thead
    let theadHtml = `<tr><th style="width: 14%;">Period / Time</th>`;
    const colW = teacherDays.length === 5 ? '17.2%' : '14.3%';
    teacherDays.forEach(d => {
      theadHtml += `<th style="width: ${colW};">${escapeHtml(d)}</th>`;
    });
    theadHtml += `</tr>`;
    DOM.teacherGridThead.innerHTML = theadHtml;

    // Tbody
    let tbodyHtml = '';
    teacherPeriods.forEach(p => {
      tbodyHtml += `
        <tr>
          <td class="period-header-cell">
            <div class="period-header-num">${escapeHtml(p.label)}</div>
            <div class="period-header-time">${escapeHtml(p.time)}</div>
          </td>`;

      teacherDays.forEach(d => {
        const dSched = state.schedules[d] || {};
        const pSlots = dSched[p.id] || {};
        let assignedClass = null;
        let assignedSubj = null;

        state.standards.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].teacher && pSlots[s.id].teacher.trim() === teacher) {
            assignedClass = s.name.replace('Standard: ', 'Std ');
            assignedSubj = pSlots[s.id].subject;
          }
        });

        if (assignedClass && assignedSubj) {
          tbodyHtml += `
            <td style="background: var(--primary-light); padding: 8px;">
              <div style="font-weight: 700; color: var(--text-primary); font-size: 13.5px;">${escapeHtml(assignedSubj)}</div>
              <div style="font-weight: 600; color: var(--primary-navy); font-size: 12px;">(${escapeHtml(assignedClass)})</div>
            </td>`;
        } else {
          tbodyHtml += `
            <td style="color: var(--text-dim); font-size: 12px; background: #ffffff;">
              -- Free --
            </td>`;
        }
      });

      tbodyHtml += `</tr>`;
    });

    DOM.teacherGridTbody.innerHTML = tbodyHtml;
  }

  // --- 2b. Weekly Extra Duty Roster (Notebook Matrix Format) ---
  function getDutyBadgeClass(dutyText) {
    if (!dutyText || !dutyText.trim()) return 'empty';
    const lower = dutyText.toLowerCase();
    if (lower.includes('math')) return 'maths';
    if (lower.includes('sci') && lower.includes('eng')) return 'sci-eng';
    if (lower.includes('eng')) return 'eng';
    if (lower.includes('sci')) return 'sci';
    if (lower.includes('env')) return 'env';
    if (lower.includes('guj')) return 'guj';
    return 'generic';
  }

  function renderWeeklyDutyView() {
    if (!DOM.weeklyDutyTbody) return;
    if (!state.weeklyDuties) state.weeklyDuties = {};

    let tbodyHtml = '';
    const tallyMap = {};
    let grandTotal = 0;

    state.teachers.forEach(teacher => {
      const teacherDuties = state.weeklyDuties[teacher] || {};
      let teacherCount = 0;

      const avatarInitial = teacher.charAt(0).toUpperCase();

      let rowHtml = `<tr>
        <td>
          <div class="duty-teacher-cell">
            <span class="duty-teacher-avatar">${escapeHtml(avatarInitial)}</span>
            <span class="duty-teacher-name">${escapeHtml(teacher)}</span>
          </div>
        </td>`;

      const workingDays = state.days.filter(d => d.toLowerCase() !== 'saturday');
      workingDays.forEach(day => {
        const duty = teacherDuties[day] || '';
        if (duty && duty.trim()) {
          teacherCount++;
          grandTotal++;
          const cleanDuty = duty.trim();
          tallyMap[cleanDuty] = (tallyMap[cleanDuty] || 0) + 1;
          const badgeClass = getDutyBadgeClass(cleanDuty);

          rowHtml += `<td>
            <button type="button" class="duty-cell-btn" data-teacher="${escapeHtml(teacher)}" data-day="${escapeHtml(day)}" title="Click to configure duty">
              <span class="duty-badge ${badgeClass}">${escapeHtml(cleanDuty)}</span>
            </button>
          </td>`;
        } else {
          rowHtml += `<td>
            <button type="button" class="duty-cell-btn" data-teacher="${escapeHtml(teacher)}" data-day="${escapeHtml(day)}" title="Click to assign duty">
              <span class="duty-badge-empty">--</span>
            </button>
          </td>`;
        }
      });

      rowHtml += `<td style="font-weight: 700; color: var(--primary-navy); background: ${teacherCount > 0 ? 'var(--primary-light)' : 'transparent'};">
        ${teacherCount}
      </td></tr>`;

      tbodyHtml += rowHtml;
    });

    DOM.weeklyDutyTbody.innerHTML = tbodyHtml;

    // Attach click handlers to all duty cell buttons
    DOM.weeklyDutyTbody.querySelectorAll('.duty-cell-btn').forEach(btn => {
      btn.onclick = () => {
        const teacher = btn.getAttribute('data-teacher');
        const day = btn.getAttribute('data-day');
        openDutyCellModal(teacher, day);
      };
    });

    // Update Grand Total Badge
    if (DOM.weeklyDutyTotalBadge) {
      DOM.weeklyDutyTotalBadge.textContent = `Total Assigned: ${grandTotal} Duties`;
    }

    // Render Notebook Tally breakdown
    if (DOM.weeklyDutySummaryContainer) {
      const tallyKeys = Object.keys(tallyMap);
      if (tallyKeys.length === 0) {
        DOM.weeklyDutySummaryContainer.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 12px; color: var(--text-muted); font-size: 13px; text-align: center;">
            No extra duties assigned yet. Click any cell in the matrix above or choose from presets to assign.
          </div>`;
      } else {
        // Sort for consistent display
        tallyKeys.sort();
        let summaryHtml = '';
        tallyKeys.forEach(dutyName => {
          const count = tallyMap[dutyName];
          const badgeClass = getDutyBadgeClass(dutyName);
          summaryHtml += `
            <div class="duty-summary-card">
              <span class="duty-summary-label">
                <span class="duty-badge ${badgeClass}" style="margin-right: 4px;">•</span>
                ${escapeHtml(dutyName)}
              </span>
              <span class="duty-summary-count">${count}</span>
            </div>`;
        });
        DOM.weeklyDutySummaryContainer.innerHTML = summaryHtml;
      }
    }
  }

  function openDutyCellModal(teacher, day) {
    editingDutyCell.teacher = teacher;
    editingDutyCell.day = day;
    editingDutyCell.selectedGrade = '';
    editingDutyCell.selectedSubject = '';

    const currentDuty = (state.weeklyDuties[teacher] && state.weeklyDuties[teacher][day]) || '';
    editingDutyCell.customText = currentDuty;

    DOM.dutyCellModalTitle.innerHTML = `Assign Duty: <strong>${escapeHtml(teacher)}</strong> • <span>${escapeHtml(day)}</span>`;
    DOM.modalDutyCustomText.value = currentDuty;

    // Render Preset Pills
    const presets = (DEFAULT_DATA && DEFAULT_DATA.weeklyDutyPresets) || [
      '3 to 5 Maths', '3 to 5 Eng', '3 to 5 Env', '3 to 5 Guj',
      '6 to 8 Sci', '6 to 8 Eng', '6 to 8 Maths', '6 to 8 Guj',
      '6 to 8 Sci/Eng', 'Library Duty', 'Exam Supervision'
    ];

    DOM.modalDutyPresetPills.innerHTML = '';
    presets.forEach(pText => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `pill-choice ${pText === currentDuty ? 'active' : ''}`;
      pill.textContent = pText;
      pill.onclick = () => {
        DOM.modalDutyCustomText.value = pText;
        DOM.modalDutyPresetPills.querySelectorAll('.pill-choice').forEach(b => b.classList.remove('active'));
        pill.classList.add('active');
        // Clear manual grade/subj highlights
        DOM.modalDutyGradePills.querySelectorAll('.pill-choice').forEach(b => b.classList.remove('active'));
        DOM.modalDutySubjectPills.querySelectorAll('.pill-choice').forEach(b => b.classList.remove('active'));
        editingDutyCell.selectedGrade = '';
        editingDutyCell.selectedSubject = '';
      };
      DOM.modalDutyPresetPills.appendChild(pill);
    });

    // Reset Grade & Subject Pill states
    DOM.modalDutyGradePills.querySelectorAll('.pill-choice').forEach(b => {
      b.classList.remove('active');
      b.onclick = () => {
        DOM.modalDutyGradePills.querySelectorAll('.pill-choice').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        editingDutyCell.selectedGrade = b.getAttribute('data-grade');
        updateComposedDutyText();
      };
    });

    DOM.modalDutySubjectPills.querySelectorAll('.pill-choice').forEach(b => {
      b.classList.remove('active');
      b.onclick = () => {
        DOM.modalDutySubjectPills.querySelectorAll('.pill-choice').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        editingDutyCell.selectedSubject = b.getAttribute('data-subj');
        updateComposedDutyText();
      };
    });

    DOM.dutyCellModal.classList.add('active');
    setTimeout(() => DOM.modalDutyCustomText.focus(), 50);
  }

  function updateComposedDutyText() {
    const grade = editingDutyCell.selectedGrade;
    const subj = editingDutyCell.selectedSubject;
    if (grade && subj) {
      DOM.modalDutyCustomText.value = `${grade} ${subj}`;
    } else if (subj) {
      DOM.modalDutyCustomText.value = subj;
    } else if (grade) {
      DOM.modalDutyCustomText.value = grade;
    }
  }

  function saveDutyModalCell() {
    if (!editingDutyCell.teacher || !editingDutyCell.day) return;
    const text = DOM.modalDutyCustomText.value.trim();

    if (!state.weeklyDuties) state.weeklyDuties = {};
    if (!state.weeklyDuties[editingDutyCell.teacher]) state.weeklyDuties[editingDutyCell.teacher] = {};

    if (text) {
      state.weeklyDuties[editingDutyCell.teacher][editingDutyCell.day] = text;
    } else {
      delete state.weeklyDuties[editingDutyCell.teacher][editingDutyCell.day];
    }

    saveState();
    renderWeeklyDutyView();
    DOM.dutyCellModal.classList.remove('active');
    showToast(`Duty updated for ${editingDutyCell.teacher}`, 'success');
  }

  function clearDutyModalCell() {
    if (!editingDutyCell.teacher || !editingDutyCell.day) return;

    if (state.weeklyDuties && state.weeklyDuties[editingDutyCell.teacher]) {
      delete state.weeklyDuties[editingDutyCell.teacher][editingDutyCell.day];
    }

    saveState();
    renderWeeklyDutyView();
    DOM.dutyCellModal.classList.remove('active');
    showToast(`Duty cleared for ${editingDutyCell.teacher}`, 'info');
  }

  function clearAllWeeklyDuties() {
    if (!confirm('Are you sure you want to clear all weekly extra duty assignments across all staff?')) return;
    state.weeklyDuties = {};
    saveState();
    renderWeeklyDutyView();
    showToast('All weekly duty assignments cleared', 'info');
  }

  // --- School & Assembly General Duties Engine ---
  function renderGeneralDutyView() {
    if (!DOM.generalDutyTbody) return;

    // Populate filter dropdown with faculty
    const selectedFilterTeacher = DOM.selectGeneralDutyFilterTeacher ? DOM.selectGeneralDutyFilterTeacher.value : '';
    if (DOM.selectGeneralDutyFilterTeacher && DOM.selectGeneralDutyFilterTeacher.options.length <= 1) {
      DOM.selectGeneralDutyFilterTeacher.innerHTML = '<option value="">All Faculty Members</option>';
      state.teachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        DOM.selectGeneralDutyFilterTeacher.appendChild(opt);
      });
      DOM.selectGeneralDutyFilterTeacher.value = selectedFilterTeacher;
    }

    const currentDayTab = state.activeGeneralDutyDay || 'all';
    const duties = state.generalDuties || [];
    const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Filter duties
    const filteredDuties = selectedFilterTeacher
      ? duties.filter(d => {
          if (!d.allocations) return d.teacher === selectedFilterTeacher;
          if (currentDayTab === 'all') {
            return Object.values(d.allocations).includes(selectedFilterTeacher);
          } else {
            return d.allocations[currentDayTab] === selectedFilterTeacher;
          }
        })
      : duties;

    if (DOM.generalDutyTotalBadge) {
      DOM.generalDutyTotalBadge.textContent = `Total Duties: ${duties.length}`;
    }

    // Sync Day Tabs UI active class
    if (DOM.generalDutyDayTabs) {
      DOM.generalDutyDayTabs.querySelectorAll('.day-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-day') === currentDayTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Render Table Header according to mode
    if (DOM.generalDutyThead) {
      if (currentDayTab === 'all') {
        DOM.generalDutyThead.innerHTML = `
          <tr>
            <th class="align-left" style="width: 22%;">Duty / Responsibility</th>
            <th class="align-left" style="width: 15%;">Timing &amp; Area</th>
            <th class="align-center" style="width: 10%;">Monday</th>
            <th class="align-center" style="width: 10%;">Tuesday</th>
            <th class="align-center" style="width: 10%;">Wednesday</th>
            <th class="align-center" style="width: 10%;">Thursday</th>
            <th class="align-center" style="width: 10%;">Friday</th>
            <th class="align-left" style="width: 17%;">Guidelines / Notes</th>
            <th class="align-center" style="width: 6%;">Action</th>
          </tr>
        `;
      } else {
        DOM.generalDutyThead.innerHTML = `
          <tr>
            <th class="align-left" style="width: 26%;">Duty / Responsibility</th>
            <th class="align-left" style="width: 20%;">Assigned Faculty (${escapeHtml(currentDayTab)})</th>
            <th class="align-left" style="width: 18%;">Timing &amp; Area</th>
            <th class="align-left" style="width: 26%;">Guidelines / Notes</th>
            <th class="align-center" style="width: 10%;">Action</th>
          </tr>
        `;
      }
    }

    const colSpan = currentDayTab === 'all' ? 9 : 5;

    if (filteredDuties.length === 0) {
      DOM.generalDutyTbody.innerHTML = `
        <tr>
          <td colspan="${colSpan}" style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
            <div style="font-size: 26px; margin-bottom: 8px;">📋</div>
            <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px; font-size: 14px;">No School Duties Found for Current Filter</div>
            <div style="font-size: 12.5px;">Click <strong>+ Add New Duty</strong> to assign day-wise morning assembly, roll call, or gate duties.</div>
          </td>
        </tr>`;
      return;
    }

    let tbodyHtml = '';

    if (currentDayTab === 'all') {
      filteredDuties.forEach((item, index) => {
        const alloc = item.allocations || {};
        
        let daysCellsHtml = '';
        daysList.forEach(day => {
          const teacherName = alloc[day] || (item.teacher && (!item.days || item.days.includes(day)) ? item.teacher : '');
          if (teacherName) {
            const initial = teacherName.charAt(0).toUpperCase();
            daysCellsHtml += `
              <td class="align-center">
                <span class="duty-day-teacher-chip" title="${escapeHtml(teacherName)}">
                  <span class="chip-avatar">${escapeHtml(initial)}</span>
                  <span class="chip-name">${escapeHtml(teacherName)}</span>
                </span>
              </td>`;
          } else {
            daysCellsHtml += `
              <td class="align-center">
                <span class="duty-day-empty-text">–</span>
              </td>`;
          }
        });

        tbodyHtml += `
          <tr data-id="${escapeHtml(item.id)}">
            <td class="align-left">
              <span class="general-duty-name">${escapeHtml(item.dutyName)}</span>
              <span style="font-size: 11px; font-weight: 600; color: var(--primary-navy); background: var(--primary-light); padding: 1px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">Duty #${index + 1}</span>
            </td>
            <td class="align-left">
              <div class="general-duty-timing-box">
                <span class="general-duty-time-text">${escapeHtml(item.time || 'General Duty Hours')}</span>
                ${item.location ? `<span class="general-duty-loc-text">📍 ${escapeHtml(item.location)}</span>` : ''}
              </div>
            </td>
            ${daysCellsHtml}
            <td class="align-left">
              <div class="general-duty-notes-text">${escapeHtml(item.notes || '-')}</div>
            </td>
            <td class="align-center">
              <div style="display: inline-flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn-duty-action edit-general-duty" data-id="${escapeHtml(item.id)}" title="Edit Duty &amp; Allocations">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button type="button" class="btn-duty-action delete delete-general-duty" data-id="${escapeHtml(item.id)}" title="Delete Duty">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      });
    } else {
      // Single Day View (e.g. Monday)
      filteredDuties.forEach((item, index) => {
        const alloc = item.allocations || {};
        const teacherName = alloc[currentDayTab] || (item.teacher && (!item.days || item.days.includes(currentDayTab)) ? item.teacher : '');
        const initial = teacherName ? teacherName.charAt(0).toUpperCase() : '?';

        tbodyHtml += `
          <tr data-id="${escapeHtml(item.id)}">
            <td class="align-left">
              <span class="general-duty-name">${escapeHtml(item.dutyName)}</span>
              <span style="font-size: 11px; font-weight: 600; color: var(--primary-navy); background: var(--primary-light); padding: 1px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">Duty #${index + 1}</span>
            </td>
            <td class="align-left">
              ${teacherName ? `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="duty-teacher-avatar">${escapeHtml(initial)}</span>
                  <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(teacherName)}</span>
                </div>
              ` : `<span class="duty-day-empty-text">Unassigned for ${escapeHtml(currentDayTab)}</span>`}
            </td>
            <td class="align-left">
              <div class="general-duty-timing-box">
                <span class="general-duty-time-text">${escapeHtml(item.time || 'General Duty Hours')}</span>
                ${item.location ? `<span class="general-duty-loc-text">📍 ${escapeHtml(item.location)}</span>` : ''}
              </div>
            </td>
            <td class="align-left">
              <div class="general-duty-notes-text">${escapeHtml(item.notes || '-')}</div>
            </td>
            <td class="align-center">
              <div style="display: inline-flex; gap: 4px; justify-content: center;">
                <button type="button" class="btn-duty-action edit-general-duty" data-id="${escapeHtml(item.id)}" title="Edit Duty &amp; Allocations">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button type="button" class="btn-duty-action delete delete-general-duty" data-id="${escapeHtml(item.id)}" title="Delete Duty">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      });
    }

    DOM.generalDutyTbody.innerHTML = tbodyHtml;

    // Wire up row edit/delete buttons
    DOM.generalDutyTbody.querySelectorAll('.edit-general-duty').forEach(btn => {
      btn.onclick = () => openGeneralDutyModal(btn.getAttribute('data-id'));
    });
    DOM.generalDutyTbody.querySelectorAll('.delete-general-duty').forEach(btn => {
      btn.onclick = () => deleteGeneralDuty(btn.getAttribute('data-id'));
    });

    renderAttendanceDutyTable();
  }

  function renderAttendanceDutyTable() {
    if (!DOM.attendanceDutyTbody) return;
    DOM.attendanceDutyTbody.innerHTML = '';

    const duties = state.attendanceDuties || [];
    if (duties.length === 0) {
      DOM.attendanceDutyTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No attendance duties configured.</td></tr>`;
      return;
    }

    duties.forEach(duty => {
      const tr = document.createElement('tr');
      const isMorning = duty.shift === 'morning';

      let firstCol = `
        <td style="vertical-align: top; padding: 10px 12px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span class="shift-badge-pill ${isMorning ? 'morning' : 'afternoon'}" style="font-size: 11px;">
              ${escapeHtml(duty.shiftLabel || (isMorning ? '☀️ Morning' : '🌙 Afternoon'))}
            </span>
          </div>
          <div style="font-weight: 700; color: var(--text-primary); font-size: 13.5px; margin-bottom: 2px;">
            ${escapeHtml(duty.title || duty.dutyName || 'Attendance Duty')}
          </div>
          <div style="font-size: 11.5px; color: var(--primary-navy); font-weight: 600; margin-bottom: 4px;">
            ⏱️ ${escapeHtml(duty.time || '')}${duty.location ? ' • 📍 ' + escapeHtml(duty.location) : ''}
          </div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.35;">
            ${escapeHtml(duty.description || duty.notes || '')}
          </div>
        </td>`;

      if (DOM.attendanceDutyThSaturday) {
        DOM.attendanceDutyThSaturday.style.display = state.includeSaturday ? '' : 'none';
      }

      let dayCols = '';
      getActiveDays().forEach(day => {
        const assignedTeacher = (duty.allocations && duty.allocations[day]) || '';
        
        const dutyShift = duty.shift || (duty.id && duty.id.includes('morning') ? 'morning' : 'afternoon');
        const allowedTeachers = getTeachersForShift(dutyShift);
        let teacherOptions = `<option value="">-- Unassigned --</option>`;
        allowedTeachers.forEach(t => {
          teacherOptions += `<option value="${escapeHtml(t)}" ${t === assignedTeacher ? 'selected' : ''}>${escapeHtml(t)}</option>`;
        });

        dayCols += `
          <td style="vertical-align: middle; padding: 8px 6px; text-align: center;">
            <select class="popover-input attendance-duty-select" data-duty-id="${escapeHtml(duty.id)}" data-day="${escapeHtml(day)}" style="font-size: 12px; padding: 6px 4px; width: 100%; font-weight: 600;">
              ${teacherOptions}
            </select>
          </td>`;
      });

      tr.innerHTML = firstCol + dayCols;
      DOM.attendanceDutyTbody.appendChild(tr);
    });

    // Wire change events for inline instant-save
    DOM.attendanceDutyTbody.querySelectorAll('.attendance-duty-select').forEach(sel => {
      sel.onchange = function() {
        const dutyId = this.getAttribute('data-duty-id');
        const day = this.getAttribute('data-day');
        const teacher = this.value;

        const dutyItem = state.attendanceDuties.find(d => d.id === dutyId);
        if (dutyItem) {
          if (!dutyItem.allocations) dutyItem.allocations = {};
          dutyItem.allocations[day] = teacher;
          saveState();
          showToast(`Assigned ${teacher || 'None'} to ${dutyItem.title || dutyItem.dutyName || 'Attendance Duty'} (${day})`, 'success');
        }
      };
    });
  }

  function renderGeneralDutyPresets() {
    if (!DOM.modalGeneralDutyPresetsContainer) return;
    DOM.modalGeneralDutyPresetsContainer.innerHTML = '';
    const presets = DEFAULT_DATA.generalDutyPresets || [];
    presets.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pill-choice';
      btn.textContent = p.name;
      btn.onclick = () => {
        DOM.inputGeneralDutyName.value = p.name;
        if (p.time) DOM.inputGeneralDutyTime.value = p.time;
        if (p.location) DOM.inputGeneralDutyLocation.value = p.location;
        if (p.notes) DOM.inputGeneralDutyNotes.value = p.notes;
      };
      DOM.modalGeneralDutyPresetsContainer.appendChild(btn);
    });
  }

  function openGeneralDutyModal(dutyId = null) {
    renderGeneralDutyPresets();

    const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Populate Quick Apply Teacher Select
    if (DOM.selectGeneralDutyQuickTeacher) {
      DOM.selectGeneralDutyQuickTeacher.innerHTML = '<option value="">-- Choose Faculty to Apply to All Days --</option>';
      state.teachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        DOM.selectGeneralDutyQuickTeacher.appendChild(opt);
      });
    }

    // Populate 5 Day Select dropdowns
    daysList.forEach(day => {
      const selectEl = document.getElementById(`select-gduty-day-${day}`);
      if (selectEl) {
        selectEl.innerHTML = '<option value="">-- Unassigned --</option>';
        state.teachers.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          selectEl.appendChild(opt);
        });
      }
    });

    if (dutyId) {
      // Edit Mode
      const duty = (state.generalDuties || []).find(d => d.id === dutyId);
      if (!duty) return;
      DOM.generalDutyModalTitle.textContent = 'Edit School Duty & Faculty Allocations';
      DOM.inputGeneralDutyId.value = duty.id;
      DOM.inputGeneralDutyName.value = duty.dutyName || '';
      DOM.inputGeneralDutyTime.value = duty.time || '';
      DOM.inputGeneralDutyLocation.value = duty.location || '';
      DOM.inputGeneralDutyNotes.value = duty.notes || '';

      const alloc = duty.allocations || {};
      daysList.forEach(day => {
        const selectEl = document.getElementById(`select-gduty-day-${day}`);
        if (selectEl) {
          const assigned = alloc[day] || (duty.teacher && (!duty.days || duty.days.includes(day)) ? duty.teacher : '');
          selectEl.value = assigned || '';
        }
      });
      if (DOM.selectGeneralDutyQuickTeacher) DOM.selectGeneralDutyQuickTeacher.value = '';
    } else {
      // Add Mode
      DOM.generalDutyModalTitle.textContent = 'Add New School Duty & Faculty Allocations';
      DOM.inputGeneralDutyId.value = '';
      DOM.inputGeneralDutyName.value = '';
      DOM.inputGeneralDutyTime.value = '12:45 PM – 1:00 PM';
      DOM.inputGeneralDutyLocation.value = '';
      DOM.inputGeneralDutyNotes.value = '';

      daysList.forEach(day => {
        const selectEl = document.getElementById(`select-gduty-day-${day}`);
        if (selectEl) selectEl.value = '';
      });
      if (DOM.selectGeneralDutyQuickTeacher) DOM.selectGeneralDutyQuickTeacher.value = '';
    }

    DOM.generalDutyModal.classList.add('active');
    setTimeout(() => DOM.inputGeneralDutyName.focus(), 50);
  }

  function saveGeneralDuty() {
    const dutyName = DOM.inputGeneralDutyName.value.trim();

    if (!dutyName) {
      showToast('Please enter a duty name', 'error');
      DOM.inputGeneralDutyName.focus();
      return;
    }

    const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const allocations = {};
    let atLeastOneDay = false;

    daysList.forEach(day => {
      const selectEl = document.getElementById(`select-gduty-day-${day}`);
      const val = selectEl ? selectEl.value.trim() : '';
      allocations[day] = val;
      if (val) atLeastOneDay = true;
    });

    if (!atLeastOneDay) {
      showToast('Please assign at least one day or faculty member', 'warning');
      return;
    }

    const time = DOM.inputGeneralDutyTime.value.trim();
    const location = DOM.inputGeneralDutyLocation.value.trim();
    const notes = DOM.inputGeneralDutyNotes.value.trim();
    const existingId = DOM.inputGeneralDutyId.value.trim();

    if (!state.generalDuties) state.generalDuties = [];

    // Derive primary teacher and days array for backward compatibility
    const assignedDays = daysList.filter(d => !!allocations[d]);
    const firstAssignedTeacher = allocations[assignedDays[0]] || '';

    if (existingId) {
      const idx = state.generalDuties.findIndex(d => d.id === existingId);
      if (idx > -1) {
        state.generalDuties[idx] = {
          id: existingId,
          dutyName,
          allocations,
          teacher: firstAssignedTeacher,
          days: assignedDays,
          time,
          location,
          notes
        };
        showToast(`Duty "${dutyName}" updated`, 'success');
      }
    } else {
      const newId = `gd_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      state.generalDuties.push({
        id: newId,
        dutyName,
        allocations,
        teacher: firstAssignedTeacher,
        days: assignedDays,
        time,
        location,
        notes
      });
      showToast(`Duty "${dutyName}" added successfully`, 'success');
    }

    saveState();
    renderGeneralDutyView();
    DOM.generalDutyModal.classList.remove('active');
  }

  function deleteGeneralDuty(dutyId) {
    if (!state.generalDuties) return;
    const duty = state.generalDuties.find(d => d.id === dutyId);
    const dutyName = duty ? duty.dutyName : 'duty';
    if (confirm(`Remove "${dutyName}" from general duties roster?`)) {
      state.generalDuties = state.generalDuties.filter(d => d.id !== dutyId);
      saveState();
      renderGeneralDutyView();
      showToast(`Duty removed`, 'info');
    }
  }

  function clearAllGeneralDuties() {
    if (!confirm('Are you sure you want to clear all school & assembly duties?')) return;
    state.generalDuties = [];
    saveState();
    renderGeneralDutyView();
    showToast('All school duties cleared', 'info');
  }

  async function exportGeneralDutiesDocx() {
    try {
      showToast('Generating School & Assembly Duties Roster (.docx)...', 'info');
      const blob = await DocxGenerator.generateGeneralDutiesDocxBlob(state);
      DocxGenerator.triggerDownload(blob, `School_General_Duties_Roster_${state.schoolProfile.academicYear || '2026-2027'}.docx`);
      showToast('Duty roster exported successfully', 'success');
    } catch (err) {
      showToast('Error exporting docx: ' + err.message, 'error');
    }
  }

  // --- 3. Daily Substitution & Proxy Engine ---
  function renderSubstitutionView() {
    // Populate Day dropdown
    DOM.subDaySelect.innerHTML = '';
    const activeDays = getActiveDays();
    if (!activeDays.includes(state.currentDay)) {
      state.currentDay = activeDays[0] || 'Monday';
    }
    activeDays.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      if (d === state.currentDay) opt.selected = true;
      DOM.subDaySelect.appendChild(opt);
    });

    DOM.subDaySelect.onchange = function() {
      state.currentDay = this.value;
      renderSubstitutionView();
    };

    const targetDay = DOM.subDaySelect.value || state.currentDay;
    const dayLeaves = state.leaves[targetDay] || [];

    // Absent Staff toggles
    DOM.subAbsentSelectionContainer.innerHTML = '';
    const shiftTeachers = getTeachersForShift(state.activeShift);
    shiftTeachers.forEach(t => {
      const isAbsent = dayLeaves.includes(t);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `teacher-badge-btn ${isAbsent ? 'on-leave' : ''}`;
      btn.innerHTML = `<span class="dot"></span><span>${escapeHtml(t)}</span>${isAbsent ? ' (Absent)' : ''}`;
      btn.onclick = () => {
        toggleTeacherLeave(t);
      };
      DOM.subAbsentSelectionContainer.appendChild(btn);
    });

    // Calculate Vacant periods for active shift
    const daySched = state.schedules[targetDay] || {};
    const vacantList = [];
    const shiftPeriods = getShiftPeriods(state.activeShift);
    const shiftStandards = state.standards.filter(s => state.activeShift === 'all' || (s.shift || 'afternoon') === state.activeShift);

    shiftPeriods.forEach(p => {
      const pSlots = daySched[p.id] || {};
      shiftStandards.forEach(s => {
        const slot = pSlots[s.id];
        if (slot && slot.teacher && dayLeaves.includes(slot.teacher.trim())) {
          vacantList.push({
            periodId: p.id,
            periodLabel: p.label,
            periodTime: p.time,
            stdId: s.id,
            stdName: s.name,
            subject: slot.subject,
            absentTeacher: slot.teacher.trim()
          });
        }
      });
    });

    DOM.subVacantCount.textContent = vacantList.length;

    if (!state.substitutions[targetDay]) state.substitutions[targetDay] = {};
    const currentSubs = state.substitutions[targetDay];

    if (vacantList.length === 0) {
      DOM.substitutionTbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 24px; color: var(--text-muted); text-align: center;">
            ✓ No absent teachers selected for ${escapeHtml(targetDay)}. All classes covered by regular faculty.
          </td>
        </tr>`;
      return;
    }

    // Render Vacant Rows with smart proxy selector
    let tbodyHtml = '';
    vacantList.forEach((vacant, idx) => {
      const subKey = `${vacant.periodId}_${vacant.stdId}`;
      const assignedProxy = currentSubs[subKey] || '';

      // Find free teachers for this period
      const busyInThisPeriod = [];
      const pSlots = daySched[vacant.periodId] || {};
      state.standards.forEach(s => {
        const sl = pSlots[s.id];
        if (sl && sl.teacher && !dayLeaves.includes(sl.teacher.trim())) {
          busyInThisPeriod.push(sl.teacher.trim());
        }
      });

      const stdObj = state.standards.find(s => s.id === vacant.stdId);
      const stdShift = (stdObj && stdObj.shift) || state.activeShift || 'afternoon';
      const allowedCandidates = getTeachersForShift(stdShift);
      const excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[`${targetDay}_${vacant.periodId}`]) || [];
      const freeCandidates = allowedCandidates.filter(t => !dayLeaves.includes(t) && !busyInThisPeriod.includes(t) && !excludedForPeriod.includes(t));

      tbodyHtml += `
        <tr>
          <td><strong>${escapeHtml(vacant.periodLabel)}</strong></td>
          <td>${escapeHtml(vacant.periodTime)}</td>
          <td><strong>${escapeHtml(vacant.stdName)}</strong></td>
          <td>${escapeHtml(vacant.subject)} <br><span style="text-decoration: line-through; color: var(--status-danger); font-size: 11.5px;">(${escapeHtml(vacant.absentTeacher)})</span></td>
          <td>
            <select class="proxy-select-dropdown" data-key="${subKey}">
              <option value="">-- Choose Free Staff Proxy --</option>`;

      freeCandidates.forEach(cand => {
        const isSel = (assignedProxy === cand);
        tbodyHtml += `<option value="${escapeHtml(cand)}" ${isSel ? 'selected' : ''}>${escapeHtml(cand)} (Available)</option>`;
      });

      tbodyHtml += `
            </select>
          </td>
          <td>
            ${assignedProxy ? `<span class="proxy-assigned-tag">✓ Assigned</span>` : `<span style="color: var(--status-warning); font-size: 11.5px;">Pending</span>`}
          </td>
        </tr>`;
    });

    DOM.substitutionTbody.innerHTML = tbodyHtml;

    document.querySelectorAll('.proxy-select-dropdown').forEach(sel => {
      sel.onchange = function() {
        const key = this.getAttribute('data-key');
        currentSubs[key] = this.value;
        saveState();
        renderSubstitutionView();
        showToast('Proxy staff updated', 'success');
      };
    });

    DOM.btnAutoAssignAllProxies.onclick = () => autoAssignBestProxies(vacantList, targetDay, daySched, dayLeaves);
  }

  function autoAssignBestProxies(vacantList, targetDay, daySched, dayLeaves) {
    if (!state.substitutions[targetDay]) state.substitutions[targetDay] = {};
    const currentSubs = state.substitutions[targetDay];

    vacantList.forEach(vacant => {
      const subKey = `${vacant.periodId}_${vacant.stdId}`;
      if (!currentSubs[subKey]) {
        // Find free candidates
        const busy = [];
        const pSlots = daySched[vacant.periodId] || {};
        state.standards.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].teacher && !dayLeaves.includes(pSlots[s.id].teacher.trim())) {
            busy.push(pSlots[s.id].teacher.trim());
          }
        });
        const stdObj = state.standards.find(s => s.id === vacant.stdId);
        const stdShift = (stdObj && stdObj.shift) || state.activeShift || 'afternoon';
        const allowedCandidates = getTeachersForShift(stdShift);
        const excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[`${targetDay}_${vacant.periodId}`]) || [];
        const free = allowedCandidates.filter(t => !dayLeaves.includes(t) && !busy.includes(t) && !excludedForPeriod.includes(t));
        if (free.length > 0) {
          currentSubs[subKey] = free[0];
        }
      }
    });

    saveState();
    renderSubstitutionView();
    showToast('Auto-assigned free staff proxies for all vacant classes', 'success');
  }

  // --- 4. Workload Analytics View (Executive Dashboard Edition) ---
  function renderWorkloadView() {
    // We compute metrics strictly for active instructional days (Monday through Friday)
    const workingDays = state.days.filter(d => d.toLowerCase() !== 'saturday');
    const shiftPeriods = getShiftPeriods(state.activeShift);
    const totalWorkingPeriods = workingDays.length * shiftPeriods.length; // 5 * periods
    const shiftTeachers = getTeachersForShift(state.activeShift);

    // 1. Calculate weekly periods and subject breakdown per teacher
    const teacherWeeklyLoad = {};
    const teacherSubjects = {};
    shiftTeachers.forEach(t => {
      teacherWeeklyLoad[t] = 0;
      teacherSubjects[t] = {};
    });

    let totalScheduledPeriods = 0;
    // Track daily consecutive periods for fatigue check
    let fatigueInstances = 0;

    workingDays.forEach(d => {
      const dSched = state.schedules[d] || {};

      // Daily consecutive check per teacher
      shiftTeachers.forEach(t => {
        let consecutive = 0;
        let maxConsecutiveInDay = 0;
        shiftPeriods.forEach(p => {
          const pSlots = dSched[p.id] || {};
          let teachesThisPeriod = false;
          state.standards.forEach(s => {
            if (pSlots[s.id] && pSlots[s.id].teacher && pSlots[s.id].teacher.trim() === t) {
              teachesThisPeriod = true;
            }
          });
          if (teachesThisPeriod) {
            consecutive++;
            if (consecutive > maxConsecutiveInDay) maxConsecutiveInDay = consecutive;
          } else {
            consecutive = 0;
          }
        });
        if (maxConsecutiveInDay >= 4) {
          fatigueInstances++;
        }
      });

      // Aggregate total workload and subject frequencies
      shiftPeriods.forEach(p => {
        const pSlots = dSched[p.id] || {};
        state.standards.forEach(s => {
          const slot = pSlots[s.id];
          if (slot && slot.teacher) {
            const t = slot.teacher.trim();
            if (teacherWeeklyLoad[t] !== undefined) {
              teacherWeeklyLoad[t]++;
              totalScheduledPeriods++;
              if (slot.subject) {
                const subj = slot.subject.trim();
                teacherSubjects[t][subj] = (teacherSubjects[t][subj] || 0) + 1;
              }
            }
          }
        });
      });
    });

    const teacherCount = shiftTeachers.length || 1;
    const avgLoad = (totalScheduledPeriods / teacherCount).toFixed(1);

    // Sorted teachers
    const sortedTeachers = Object.keys(teacherWeeklyLoad).sort((a, b) => teacherWeeklyLoad[b] - teacherWeeklyLoad[a]);
    const maxTeacher = sortedTeachers[0] || '--';
    const maxPeriods = maxTeacher !== '--' ? teacherWeeklyLoad[maxTeacher] : 0;
    const maxPct = Math.min(100, Math.round((maxPeriods / totalWorkingPeriods) * 100));

    // Overload checks (> 26 is considered labor ceiling)
    const overloadedTeachers = sortedTeachers.filter(t => teacherWeeklyLoad[t] > 26);
    const isCompliant = overloadedTeachers.length === 0;

    // 2. Update KPI Stat Cards
    if (DOM.kpiTotalLectures) DOM.kpiTotalLectures.textContent = totalScheduledPeriods;
    if (DOM.kpiAvgLoad) DOM.kpiAvgLoad.innerHTML = `${avgLoad} <span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">periods/wk</span>`;
    if (DOM.kpiMaxTeacher) DOM.kpiMaxTeacher.textContent = maxTeacher;
    if (DOM.kpiMaxPeriods) DOM.kpiMaxPeriods.textContent = `${maxPeriods} / ${totalWorkingPeriods} periods (${maxPct}% capacity)`;
    
    if (DOM.kpiComplianceStatus) {
      if (isCompliant) {
        DOM.kpiComplianceStatus.textContent = '100% Compliant';
        DOM.kpiComplianceStatus.style.color = '#059669';
      } else {
        DOM.kpiComplianceStatus.textContent = `${overloadedTeachers.length} Overload`;
        DOM.kpiComplianceStatus.style.color = '#dc2626';
      }
    }
    if (DOM.kpiComplianceSubtext) {
      DOM.kpiComplianceSubtext.textContent = isCompliant 
        ? 'All faculty ≤ 26 periods ceiling' 
        : `${overloadedTeachers.length} faculty member(s) exceed ceiling`;
    }
    if (DOM.workloadStaffCount) {
      DOM.workloadStaffCount.textContent = `${shiftTeachers.length} Staff Members (${state.activeShift === 'morning' ? 'Morning Shift' : 'Afternoon Shift'})`;
    }

    // 3. Render Rich Teacher Workload Rows
    let barsHtml = '';
    sortedTeachers.forEach(t => {
      const load = teacherWeeklyLoad[t];
      const pct = Math.min(100, Math.round((load / totalWorkingPeriods) * 100));
      const freePeriods = Math.max(0, totalWorkingPeriods - load);

      // Primary subject
      const subjs = teacherSubjects[t] || {};
      const sortedSubjs = Object.keys(subjs).sort((a, b) => subjs[b] - subjs[a]);
      const primarySubj = sortedSubjs[0] || 'Faculty';

      // Status pill & color category
      let statusClass = 'moderate';
      let statusLabel = `Moderate (${load}/${totalWorkingPeriods})`;
      if (load > 26) {
        statusClass = 'overload';
        statusLabel = `Overload (${load}/${totalWorkingPeriods})`;
      } else if (load >= 22) {
        statusClass = 'heavy';
        statusLabel = `High Load (${load}/${totalWorkingPeriods})`;
      } else if (load >= 16) {
        statusClass = 'optimal';
        statusLabel = `Optimal (${load}/${totalWorkingPeriods})`;
      }

      // Initial letters for avatar
      const initials = t.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'T';

      barsHtml += `
        <div class="workload-teacher-row">
          <div class="workload-avatar">${escapeHtml(initials)}</div>
          <div class="workload-info">
            <div class="workload-header-line">
              <div class="workload-teacher-name-group">
                <span class="workload-teacher-title">${escapeHtml(t)}</span>
                <span class="workload-primary-subj">${escapeHtml(primarySubj)}</span>
              </div>
              <span class="workload-status-pill ${statusClass}">${statusLabel}</span>
            </div>
            <div class="workload-progress-bg">
              <div class="workload-progress-fill ${statusClass}" style="width: ${pct}%;"></div>
            </div>
            <div class="workload-footer-line">
              <span>Available Free Time: <strong>${freePeriods} periods</strong></span>
              <span><strong>${pct}%</strong> Capacity Utilized</span>
            </div>
          </div>
        </div>`;
    });
    DOM.workloadBarsContainer.innerHTML = barsHtml;

    // 4. Render Pedagogical Compliance & Faculty Health Diagnostics
    const totalPotentialCapacity = shiftTeachers.length * totalWorkingPeriods;
    const totalFreePrepPeriods = Math.max(0, totalPotentialCapacity - totalScheduledPeriods);

    let diagHtml = '';
    // Diagnostic 1: Labor Ceiling
    if (isCompliant) {
      diagHtml += `
        <div class="diagnostic-card success">
          <div class="diagnostic-icon" style="color: #059669;">✓</div>
          <div class="diagnostic-content">
            <div class="diagnostic-title">Weekly Labor Ceiling (≤ 26 Periods)</div>
            <div class="diagnostic-desc">All ${shiftTeachers.length} faculty members operate strictly within institutional guidelines. No burnout risks detected.</div>
          </div>
        </div>`;
    } else {
      diagHtml += `
        <div class="diagnostic-card warning">
          <div class="diagnostic-icon" style="color: #d97706;">⚠️</div>
          <div class="diagnostic-content">
            <div class="diagnostic-title">Weekly Labor Ceiling Exceeded</div>
            <div class="diagnostic-desc">${overloadedTeachers.map(t => `<strong>${escapeHtml(t)}</strong> (${teacherWeeklyLoad[t]} periods)`).join(', ')} exceed the 26-period limit. Rebalance via substitution.</div>
          </div>
        </div>`;
    }

    // Diagnostic 2: Consecutive Lecture Fatigue Check
    if (fatigueInstances === 0) {
      diagHtml += `
        <div class="diagnostic-card success">
          <div class="diagnostic-icon" style="color: #059669;">✓</div>
          <div class="diagnostic-content">
            <div class="diagnostic-title">Pacing &amp; Rest Interval Health</div>
            <div class="diagnostic-desc">No faculty member is scheduled for 4+ consecutive lectures in a single day. Teaching rhythm ensures high alertness.</div>
          </div>
        </div>`;
    } else {
      diagHtml += `
        <div class="diagnostic-card warning">
          <div class="diagnostic-icon" style="color: #d97706;">⚠️</div>
          <div class="diagnostic-content">
            <div class="diagnostic-title">Consecutive Lecture Fatigue Warning</div>
            <div class="diagnostic-desc">${fatigueInstances} instance(s) of 4+ consecutive periods detected. Recommend inserting preparation intervals.</div>
          </div>
        </div>`;
    }

    // Diagnostic 3: Free Capacity Reserve
    diagHtml += `
      <div class="diagnostic-card info">
        <div class="diagnostic-icon" style="color: #2563eb;">ℹ️</div>
        <div class="diagnostic-content">
          <div class="diagnostic-title">Preparation &amp; Proxy Capacity Buffer</div>
          <div class="diagnostic-desc"><strong>${totalFreePrepPeriods} periods</strong> of unallocated time available across faculty this week for lesson planning, grading, and substitution coverage.</div>
        </div>
      </div>`;

    DOM.complianceAlertsContainer.innerHTML = diagHtml;

    // 5. Render Subject Curriculum Allocation Table
    let subjDistHtml = `
      <table>
        <thead>
          <tr>
            <th>Subject</th>`;
    state.standards.forEach(s => {
      subjDistHtml += `<th>${escapeHtml(s.name.replace('Standard: ', 'Std '))}</th>`;
    });
    subjDistHtml += `
            <th class="subject-row-total">Total</th>
          </tr>
        </thead>
        <tbody>`;

    const standardTotals = {};
    state.standards.forEach(s => standardTotals[s.id] = 0);
    let grandTotal = 0;

    state.subjects.forEach(subj => {
      let rowTotal = 0;
      subjDistHtml += `<tr><td><strong>${escapeHtml(subj)}</strong></td>`;
      state.standards.forEach(std => {
        let count = 0;
        workingDays.forEach(d => {
          const dSched = state.schedules[d] || {};
          state.periods.forEach(p => {
            const slot = (dSched[p.id] || {})[std.id];
            if (slot && slot.subject && slot.subject.trim() === subj) count++;
          });
        });
        rowTotal += count;
        standardTotals[std.id] += count;
        grandTotal += count;
        subjDistHtml += `<td>${count > 0 ? `<span class="subject-count-pill">${count}</span>` : '<span class="subject-count-zero">-</span>'}</td>`;
      });
      subjDistHtml += `<td class="subject-row-total">${rowTotal > 0 ? rowTotal : '-'}</td></tr>`;
    });

    subjDistHtml += `
        </tbody>
        <tfoot>
          <tr>
            <td>Total Periods</td>`;
    state.standards.forEach(std => {
      subjDistHtml += `<td>${standardTotals[std.id]}</td>`;
    });
    subjDistHtml += `
            <td class="subject-row-total">${grandTotal}</td>
          </tr>
        </tfoot>
      </table>`;
    DOM.subjectDistributionContainer.innerHTML = subjDistHtml;
  }

  // --- Dynamic Export Bar Updates ---
  function updateExportBar() {
    if (state.activeView === 'class-view') {
      if (state.classViewMode === 'class-weekly') {
        const curStd = state.standards.find(s => s.id === state.selectedClassStandard) || state.standards[0];
        const spanText = state.includeSaturday ? 'Monday-to-Saturday' : 'Monday-to-Friday';
        DOM.exportBarTitle.textContent = `Export ${curStd ? curStd.name : 'Class'} Weekly Timetable`;
        DOM.exportBarDesc.textContent = `Generates official ${spanText} schedule for ${curStd ? curStd.name : 'this class'} with Class Teacher in-charge & room details.`;
        DOM.btnDownloadSingleDay.style.display = 'none';
        DOM.btnDownloadAllDays.textContent = "Download Class Word (.docx)";
      } else {
        DOM.exportBarTitle.textContent = "Export Official Class Timetables";
        DOM.exportBarDesc.textContent = `Generates formatted Word (.docx) for ${state.currentDay} or full week with school letterhead.`;
        DOM.btnDownloadSingleDay.style.display = 'inline-flex';
        DOM.btnDownloadDayName.textContent = state.currentDay;
        DOM.btnDownloadAllDays.textContent = "Download Full Week (.docx)";
      }
    } else if (state.activeView === 'teacher-view') {
      DOM.exportBarTitle.textContent = "Export Individual Faculty Timetables";
      DOM.exportBarDesc.textContent = "Outputs individual 1-page weekly schedules for each staff member.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download All Staff Schedules (.docx)";
    } else if (state.activeView === 'duty-view') {
      DOM.exportBarTitle.textContent = "Export Faculty Extra Duties Matrix";
      DOM.exportBarDesc.textContent = "Outputs standalone official faculty extra duty matrix with subject & grade tally breakdown (.docx).";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Extra Duties (.docx)";
    } else if (state.activeView === 'general-duty-view') {
      DOM.exportBarTitle.textContent = "Export School & Assembly Duties Roster";
      DOM.exportBarDesc.textContent = "Outputs official faculty special & assembly duties roster with administrative guidelines (.docx).";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Duty Roster (.docx)";
    } else if (state.activeView === 'substitution-view') {
      DOM.exportBarTitle.textContent = "Export Daily Substitution Notice";
      DOM.exportBarDesc.textContent = "Outputs formal administrative duty notice for staff room notice boards.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Substitution Notice (.docx)";
    } else {
      DOM.exportBarTitle.textContent = "Export Timetable Data";
      DOM.exportBarDesc.textContent = "Outputs Word documents or CSV records.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Full Week (.docx)";
    }
  }

  // --- In-Place Popover Actions ---
  function openPeriodModal(periodId, stdId, dayOverride = null) {
    const targetDay = dayOverride || state.currentDay;
    const dayData = state.schedules[targetDay] || {};
    const pSlots = dayData[periodId] || {};
    let currentSlot = pSlots[stdId] || { subject: '', teacher: '' };

    // If this is a child of a merged cell, resolve the root parent
    let activeStdId = stdId;
    let activePeriodId = periodId;
    if (currentSlot.isMergedChild) {
      if (currentSlot.parentStdId) activeStdId = currentSlot.parentStdId;
      if (currentSlot.parentPeriodId) activePeriodId = currentSlot.parentPeriodId;
      currentSlot = (dayData[activePeriodId] && dayData[activePeriodId][activeStdId]) || currentSlot;
    }

    editingCell.day = targetDay;
    editingCell.periodId = activePeriodId;
    editingCell.stdId = activeStdId;

    const std = state.standards.find(s => s.id === activeStdId);
    const isMorning = std && std.shift === 'morning';
    const shiftPeriods = getShiftPeriods(isMorning ? 'morning' : 'afternoon');
    const period = shiftPeriods.find(p => p.id === activePeriodId) || state.periods.find(p => p.id === activePeriodId) || { label: activePeriodId, time: '' };

    const dayLeaves = state.leaves[targetDay] || [];

    editingCell.subject = currentSlot.subject || '';
    editingCell.teacher = currentSlot.teacher || '';

    DOM.periodModalTitle.innerHTML = `Assign Period: <strong>${escapeHtml(period.label)} (${escapeHtml(period.time)})</strong> • <span>${escapeHtml(std ? std.name : activeStdId)}</span> <small style="font-weight: 500; color: var(--primary-navy);">[${escapeHtml(targetDay)}]</small>`;
    if (DOM.modalSubjectHint) DOM.modalSubjectHint.textContent = '';
    if (DOM.modalTeacherHint) DOM.modalTeacherHint.textContent = '';

    const busyIn = {};
    const activeSlots = dayData[activePeriodId] || {};
    state.standards.forEach(s => {
      if (s.id !== activeStdId) {
        const slot = activeSlots[s.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          busyIn[slot.teacher.trim()] = s.name.replace('Standard: ', '');
        }
      }
    });

    const activeStd = state.standards.find(s => s.id === activeStdId);
    const cellShift = (activeStd && activeStd.shift) || state.activeShift || 'afternoon';
    const allowedTeachers = getTeachersForShift(cellShift);

    // 1. Quick Pairs (1-Click Fast Assign)
    if (DOM.modalQuickPairs) {
      DOM.modalQuickPairs.innerHTML = '';
      allowedTeachers.forEach(teacher => {
        const prof = state.teacherProfiles[teacher] || {};
        const primarySubj = prof.primarySubject || '';
        if (!primarySubj) return;

        const isBusy = !!busyIn[teacher];
        const isOnLeave = dayLeaves.includes(teacher);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pill-choice quick-pair-pill ${isBusy ? 'is-busy' : ''} ${isOnLeave ? 'is-leave' : ''}`;
        
        let badge = '';
        if (isOnLeave) badge = ' <span style="font-size: 10px;">(Leave)</span>';
        else if (isBusy) badge = ` <span style="font-size: 10px;">(In Std ${busyIn[teacher]})</span>`;

        btn.innerHTML = `<span><strong>${escapeHtml(primarySubj)}</strong> • ${escapeHtml(teacher)}</span>${badge}`;
        btn.title = isOnLeave ? `${teacher} is on leave` : (isBusy ? `${teacher} is teaching in Std ${busyIn[teacher]}` : `1-Click Assign: ${primarySubj} (${teacher})`);

        btn.onclick = () => {
          if (isOnLeave) {
            if (!confirm(`${teacher} is marked on leave today. Assign anyway?`)) return;
          } else if (isBusy) {
            if (!confirm(`${teacher} is already teaching in Std ${busyIn[teacher]}. Assign anyway?`)) return;
          }

          editingCell.subject = primarySubj;
          editingCell.teacher = teacher;
          saveModalCell();
        };

        DOM.modalQuickPairs.appendChild(btn);
      });
    }

    // 2. Subjects
    renderModalSubjectChips(activePeriodId, activeStdId, busyIn, dayLeaves);
    DOM.modalCustomSubject.value = state.subjects.includes(editingCell.subject) ? '' : editingCell.subject;

    // 3. Teachers
    renderTeacherChipsInModal(activePeriodId, activeStdId, busyIn, dayLeaves);

    // 4. Merge Controls
    updateModalMergeControls();

    DOM.periodModal.classList.add('active');
  }

  function renderModalSubjectChips(periodId, stdId, busyIn, dayLeaves) {
    DOM.modalSubjectChips.innerHTML = '';
    const std = state.standards.find(s => s.id === stdId);
    const cellShift = (std && std.shift) || state.activeShift || 'afternoon';
    const allowedTeachers = getTeachersForShift(cellShift);

    state.subjects.forEach(subj => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `pill-choice ${editingCell.subject === subj ? 'selected' : ''}`;
      pill.textContent = subj;
      pill.onclick = () => {
        editingCell.subject = subj;
        DOM.modalCustomSubject.value = '';

        // Auto-assign or suggest matching teacher for this subject
        const candidates = allowedTeachers.filter(t => {
          const p = state.teacherProfiles[t];
          return p && p.primarySubject && p.primarySubject.toLowerCase() === subj.toLowerCase();
        });

        if (candidates.length === 1) {
          editingCell.teacher = candidates[0];
          DOM.modalCustomTeacher.value = '';
          if (DOM.modalSubjectHint) DOM.modalSubjectHint.textContent = `Auto-selected: ${candidates[0]}`;
        } else if (candidates.length > 1) {
          const freeCandidates = candidates.filter(t => !busyIn[t] && !dayLeaves.includes(t));
          if (freeCandidates.length === 1 && (!editingCell.teacher || !candidates.includes(editingCell.teacher))) {
            editingCell.teacher = freeCandidates[0];
            DOM.modalCustomTeacher.value = '';
            if (DOM.modalSubjectHint) DOM.modalSubjectHint.textContent = `Auto-selected free staff: ${freeCandidates[0]}`;
          } else if (DOM.modalSubjectHint) {
            DOM.modalSubjectHint.textContent = `Taught by: ${candidates.join(', ')}`;
          }
        } else {
          if (DOM.modalSubjectHint) DOM.modalSubjectHint.textContent = '';
        }

        renderModalChips();
        renderTeacherChipsInModal(periodId, stdId, busyIn, dayLeaves);
      };
      DOM.modalSubjectChips.appendChild(pill);
    });
  }

  function renderModalChips() {
    document.querySelectorAll('#modal-subject-chips .pill-choice').forEach(c => {
      c.classList.toggle('selected', c.textContent === editingCell.subject);
    });
  }

  function renderTeacherChipsInModal(periodId, currentStdId, busyIn, dayLeaves) {
    DOM.modalTeacherChips.innerHTML = '';
    const std = state.standards.find(s => s.id === currentStdId);
    const cellShift = (std && std.shift) || state.activeShift || 'afternoon';
    const allowedTeachers = getTeachersForShift(cellShift);

    allowedTeachers.forEach(teacher => {
      const pill = document.createElement('button');
      pill.type = 'button';
      const isSelected = (editingCell.teacher === teacher);
      const isBusy = !!busyIn[teacher];
      const isOnLeave = dayLeaves.includes(teacher);

      const prof = state.teacherProfiles[teacher] || {};
      const primarySubj = prof.primarySubject || '';
      const matchesSelectedSubj = editingCell.subject && primarySubj && (primarySubj.toLowerCase() === editingCell.subject.toLowerCase());

      pill.className = `pill-choice ${isSelected ? 'selected' : ''} ${matchesSelectedSubj && !isSelected ? 'suggested' : ''} ${isBusy ? 'is-busy' : ''} ${isOnLeave ? 'is-leave' : ''}`;
      
      let subjTag = primarySubj ? `<span class="pill-subj-tag">${escapeHtml(primarySubj)}</span>` : '';
      let badge = '';
      if (isOnLeave) badge = ' <span style="font-size: 10.5px;">(On Leave)</span>';
      else if (isBusy) badge = ` <span style="font-size: 10.5px;">(In ${busyIn[teacher]})</span>`;

      pill.innerHTML = `<span>${escapeHtml(teacher)}</span>${subjTag}${badge}`;
      pill.onclick = () => {
        editingCell.teacher = teacher;
        DOM.modalCustomTeacher.value = '';

        // Auto-assign subject assigned to this teacher!
        if (primarySubj) {
          editingCell.subject = primarySubj;
          DOM.modalCustomSubject.value = '';
          if (DOM.modalTeacherHint) DOM.modalTeacherHint.textContent = `Auto-selected: ${primarySubj}`;
        }

        renderModalChips();
        renderTeacherChipsInModal(periodId, currentStdId, busyIn, dayLeaves);
      };
      DOM.modalTeacherChips.appendChild(pill);
    });

    DOM.modalCustomTeacher.value = state.teachers.includes(editingCell.teacher) ? '' : editingCell.teacher;
  }

  function updateModalMergeControls() {
    if (!DOM.btnModalMergeNextClass || !DOM.btnModalMergeNextLecture || !DOM.btnModalSplitCell) return;

    const dayData = state.schedules[editingCell.day] || {};
    const pSlots = dayData[editingCell.periodId] || {};
    const slot = pSlots[editingCell.stdId] || {};

    const isMergedParent = (slot.colSpan && slot.colSpan > 1) || (slot.rowSpan && slot.rowSpan > 1);
    const isMergedChild = !!slot.isMergedChild;
    const isMerged = isMergedParent || isMergedChild;

    // Determine next standard in current shift
    const std = state.standards.find(s => s.id === editingCell.stdId);
    const currentShift = (std && std.shift) || state.activeShift || 'afternoon';
    const shiftStds = state.standards.filter(s => s.shift === currentShift);
    const sortedStds = sortStandardsIncrementally(shiftStds.slice());
    const currentStdIdx = sortedStds.findIndex(s => s.id === editingCell.stdId);
    const hasNextClass = (currentStdIdx >= 0 && currentStdIdx < sortedStds.length - 1);
    const nextStd = hasNextClass ? sortedStds[currentStdIdx + 1] : null;

    // Determine next lecture in current shift
    const shiftPeriods = getShiftPeriods(currentShift);
    const currentPIdx = shiftPeriods.findIndex(p => p.id === editingCell.periodId);
    const hasNextLecture = (currentPIdx >= 0 && currentPIdx < shiftPeriods.length - 1);
    const nextPeriod = hasNextLecture ? shiftPeriods[currentPIdx + 1] : null;

    if (DOM.modalMergeStatusBadge) {
      if (isMerged) {
        let label = 'Merged';
        if (slot.colSpan && slot.colSpan > 1) label = `Merged (${slot.colSpan} Classes)`;
        else if (slot.rowSpan && slot.rowSpan > 1) label = `Merged (${slot.rowSpan} Lectures)`;
        else if (isMergedChild) label = 'Merged (Combined Class)';
        DOM.modalMergeStatusBadge.textContent = label;
        DOM.modalMergeStatusBadge.style.display = 'inline-block';
      } else {
        DOM.modalMergeStatusBadge.style.display = 'none';
      }
    }

    if (DOM.modalMergeHint) {
      if (isMerged) {
        DOM.modalMergeHint.textContent = 'This slot is currently merged. Click "Split / Unmerge" to separate into individual class periods.';
      } else {
        DOM.modalMergeHint.textContent = 'Merge with adjacent classes (e.g. LKG + HKG) or next lecture for combined sessions.';
      }
    }

    DOM.btnModalMergeNextClass.style.display = isMerged ? 'none' : (hasNextClass ? 'inline-flex' : 'none');
    if (hasNextClass && nextStd) {
      DOM.btnModalMergeNextClass.innerHTML = `<i class="fa-solid fa-arrows-left-right"></i> Merge with ${escapeHtml(nextStd.name)}`;
    }

    DOM.btnModalMergeNextLecture.style.display = isMerged ? 'none' : (hasNextLecture ? 'inline-flex' : 'none');
    if (hasNextLecture && nextPeriod) {
      DOM.btnModalMergeNextLecture.innerHTML = `<i class="fa-solid fa-arrows-up-down"></i> Merge with ${escapeHtml(nextPeriod.label)}`;
    }

    DOM.btnModalSplitCell.style.display = isMerged ? 'inline-flex' : 'none';
  }

  function mergeWithNextClass() {
    const std = state.standards.find(s => s.id === editingCell.stdId);
    const currentShift = (std && std.shift) || state.activeShift || 'afternoon';
    const shiftStds = state.standards.filter(s => s.shift === currentShift);
    const sortedStds = sortStandardsIncrementally(shiftStds.slice());
    const currentStdIdx = sortedStds.findIndex(s => s.id === editingCell.stdId);
    if (currentStdIdx < 0 || currentStdIdx >= sortedStds.length - 1) {
      showToast('No adjacent class to merge with', 'warning');
      return;
    }
    const nextStd = sortedStds[currentStdIdx + 1];

    if (!state.schedules[editingCell.day]) state.schedules[editingCell.day] = {};
    if (!state.schedules[editingCell.day][editingCell.periodId]) state.schedules[editingCell.day][editingCell.periodId] = {};

    const customSubj = DOM.modalCustomSubject.value.trim() || editingCell.subject || 'Extra Activity';
    const customTeacher = DOM.modalCustomTeacher.value.trim() || editingCell.teacher || '';

    // Parent cell
    state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId] = {
      subject: customSubj,
      teacher: customTeacher,
      colSpan: 2,
      mergedStds: [editingCell.stdId, nextStd.id]
    };

    // Child cell
    state.schedules[editingCell.day][editingCell.periodId][nextStd.id] = {
      subject: customSubj,
      teacher: customTeacher,
      isMergedChild: true,
      parentStdId: editingCell.stdId,
      parentPeriodId: editingCell.periodId
    };

    saveState();
    updateModalMergeControls();
    renderAll();
    showToast(`Merged ${std ? std.name : editingCell.stdId} with ${nextStd.name}`, 'success');
  }

  function mergeWithNextLecture() {
    const std = state.standards.find(s => s.id === editingCell.stdId);
    const currentShift = (std && std.shift) || state.activeShift || 'afternoon';
    const shiftPeriods = getShiftPeriods(currentShift);
    const currentPIdx = shiftPeriods.findIndex(p => p.id === editingCell.periodId);
    if (currentPIdx < 0 || currentPIdx >= shiftPeriods.length - 1) {
      showToast('No next lecture to merge with', 'warning');
      return;
    }
    const nextPeriod = shiftPeriods[currentPIdx + 1];

    if (!state.schedules[editingCell.day]) state.schedules[editingCell.day] = {};
    if (!state.schedules[editingCell.day][editingCell.periodId]) state.schedules[editingCell.day][editingCell.periodId] = {};
    if (!state.schedules[editingCell.day][nextPeriod.id]) state.schedules[editingCell.day][nextPeriod.id] = {};

    const customSubj = DOM.modalCustomSubject.value.trim() || editingCell.subject || '';
    const customTeacher = DOM.modalCustomTeacher.value.trim() || editingCell.teacher || '';

    // Parent cell
    state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId] = {
      subject: customSubj,
      teacher: customTeacher,
      rowSpan: 2,
      mergedPeriods: [editingCell.periodId, nextPeriod.id]
    };

    // Child cell in next period
    state.schedules[editingCell.day][nextPeriod.id][editingCell.stdId] = {
      subject: customSubj,
      teacher: customTeacher,
      isMergedChild: true,
      parentStdId: editingCell.stdId,
      parentPeriodId: editingCell.periodId
    };

    saveState();
    updateModalMergeControls();
    renderAll();
    showToast(`Merged ${editingCell.periodId} with ${nextPeriod.label}`, 'success');
  }

  function splitCell() {
    const dayData = state.schedules[editingCell.day] || {};
    const pSlots = dayData[editingCell.periodId] || {};
    const slot = pSlots[editingCell.stdId] || {};

    let rootStdId = editingCell.stdId;
    let rootPeriodId = editingCell.periodId;

    if (slot.isMergedChild) {
      if (slot.parentStdId) rootStdId = slot.parentStdId;
      if (slot.parentPeriodId) rootPeriodId = slot.parentPeriodId;
    }

    const rootSlot = (dayData[rootPeriodId] && dayData[rootPeriodId][rootStdId]) || slot;

    // Unmerge across standards
    if (rootSlot.mergedStds && Array.isArray(rootSlot.mergedStds)) {
      rootSlot.mergedStds.forEach(sId => {
        if (dayData[rootPeriodId] && dayData[rootPeriodId][sId]) {
          const sSlot = dayData[rootPeriodId][sId];
          delete sSlot.colSpan;
          delete sSlot.mergedStds;
          delete sSlot.isMergedChild;
          delete sSlot.parentStdId;
          delete sSlot.parentPeriodId;
        }
      });
    }

    // Unmerge across periods
    if (rootSlot.mergedPeriods && Array.isArray(rootSlot.mergedPeriods)) {
      rootSlot.mergedPeriods.forEach(pId => {
        if (dayData[pId] && dayData[pId][rootStdId]) {
          const sSlot = dayData[pId][rootStdId];
          delete sSlot.rowSpan;
          delete sSlot.mergedPeriods;
          delete sSlot.isMergedChild;
          delete sSlot.parentStdId;
          delete sSlot.parentPeriodId;
        }
      });
    }

    delete rootSlot.colSpan;
    delete rootSlot.rowSpan;
    delete rootSlot.mergedStds;
    delete rootSlot.mergedPeriods;
    delete rootSlot.isMergedChild;
    delete rootSlot.parentStdId;
    delete rootSlot.parentPeriodId;

    delete slot.colSpan;
    delete slot.rowSpan;
    delete slot.mergedStds;
    delete slot.mergedPeriods;
    delete slot.isMergedChild;
    delete slot.parentStdId;
    delete slot.parentPeriodId;

    saveState();
    updateModalMergeControls();
    renderAll();
    showToast('Cells unmerged and split into individual slots', 'success');
  }

  function saveModalCell() {
    const customSubj = DOM.modalCustomSubject.value.trim();
    if (customSubj) {
      editingCell.subject = customSubj;
      if (!state.subjects.includes(customSubj)) state.subjects.push(customSubj);
    }

    const customTeacher = DOM.modalCustomTeacher.value.trim();
    if (customTeacher) {
      editingCell.teacher = customTeacher;
      if (!state.teachers.includes(customTeacher)) state.teachers.push(customTeacher);
    }

    if (!state.schedules[editingCell.day]) state.schedules[editingCell.day] = {};
    if (!state.schedules[editingCell.day][editingCell.periodId]) state.schedules[editingCell.day][editingCell.periodId] = {};

    const existingSlot = state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId] || {};
    state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId] = Object.assign({}, existingSlot, {
      subject: editingCell.subject,
      teacher: editingCell.teacher
    });

    // Synchronize to merged children if cell is merged across standards
    if (existingSlot.mergedStds && Array.isArray(existingSlot.mergedStds)) {
      existingSlot.mergedStds.forEach(sId => {
        if (sId !== editingCell.stdId) {
          if (!state.schedules[editingCell.day][editingCell.periodId][sId]) state.schedules[editingCell.day][editingCell.periodId][sId] = {};
          Object.assign(state.schedules[editingCell.day][editingCell.periodId][sId], {
            subject: editingCell.subject,
            teacher: editingCell.teacher,
            isMergedChild: true,
            parentStdId: editingCell.stdId,
            parentPeriodId: editingCell.periodId
          });
        }
      });
    }

    // Synchronize to merged children if cell is merged across periods
    if (existingSlot.mergedPeriods && Array.isArray(existingSlot.mergedPeriods)) {
      existingSlot.mergedPeriods.forEach(pId => {
        if (pId !== editingCell.periodId) {
          if (!state.schedules[editingCell.day][pId]) state.schedules[editingCell.day][pId] = {};
          if (!state.schedules[editingCell.day][pId][editingCell.stdId]) state.schedules[editingCell.day][pId][editingCell.stdId] = {};
          Object.assign(state.schedules[editingCell.day][pId][editingCell.stdId], {
            subject: editingCell.subject,
            teacher: editingCell.teacher,
            isMergedChild: true,
            parentStdId: editingCell.stdId,
            parentPeriodId: editingCell.periodId
          });
        }
      });
    }

    saveState();
    DOM.periodModal.classList.remove('active');
    renderAll();
    showToast('Assignment updated', 'success');
  }

  function clearModalCell() {
    splitCell();
    if (state.schedules[editingCell.day] && state.schedules[editingCell.day][editingCell.periodId]) {
      delete state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId];
    }
    saveState();
    DOM.periodModal.classList.remove('active');
    renderAll();
    showToast('Assignment cleared', 'info');
  }

  // --- Copy / Duplicate Schedule ---
  function openCopyModal() {
    DOM.copySourceDay.innerHTML = '';
    DOM.copyTargetDay.innerHTML = '';

    const activeDays = getActiveDays();
    activeDays.forEach(day => {
      const optSrc = document.createElement('option');
      optSrc.value = day;
      optSrc.textContent = day;
      if (day === state.currentDay) optSrc.selected = true;
      DOM.copySourceDay.appendChild(optSrc);
    });

    const optAll = document.createElement('option');
    optAll.value = '__ALL_OTHER__';
    optAll.textContent = state.includeSaturday
      ? 'All Other Weekdays (Tuesday through Saturday)'
      : 'All Other Weekdays (Tuesday through Friday)';
    DOM.copyTargetDay.appendChild(optAll);

    activeDays.forEach(day => {
      if (day !== state.currentDay) {
        const optTgt = document.createElement('option');
        optTgt.value = day;
        optTgt.textContent = day;
        DOM.copyTargetDay.appendChild(optTgt);
      }
    });

    DOM.copyModal.classList.add('active');
  }

  function executeCopySchedule() {
    const src = DOM.copySourceDay.value;
    const tgt = DOM.copyTargetDay.value;
    const sourceData = state.schedules[src];
    if (!sourceData) {
      showToast(`Source day ${src} has no schedule!`, 'error');
      return;
    }

    const activeDays = getActiveDays();
    if (tgt === '__ALL_OTHER__') {
      activeDays.forEach(d => {
        if (d !== src) state.schedules[d] = JSON.parse(JSON.stringify(sourceData));
      });
      if (state.excludedFreeTeachers) {
        activeDays.forEach(d => {
          if (d !== src) {
            state.periods.forEach(p => {
              const srcKey = `${src}_${p.id}`;
              const tgtKey = `${d}_${p.id}`;
              if (state.excludedFreeTeachers[srcKey]) {
                state.excludedFreeTeachers[tgtKey] = [...state.excludedFreeTeachers[srcKey]];
              } else {
                delete state.excludedFreeTeachers[tgtKey];
              }
            });
          }
        });
      }
      showToast(`Schedule duplicated from ${src} to all active weekdays`, 'success');
    } else {
      state.schedules[tgt] = JSON.parse(JSON.stringify(sourceData));
      if (state.excludedFreeTeachers) {
        state.periods.forEach(p => {
          const srcKey = `${src}_${p.id}`;
          const tgtKey = `${tgt}_${p.id}`;
          if (state.excludedFreeTeachers[srcKey]) {
            state.excludedFreeTeachers[tgtKey] = [...state.excludedFreeTeachers[srcKey]];
          } else {
            delete state.excludedFreeTeachers[tgtKey];
          }
        });
      }
      showToast(`Schedule duplicated from ${src} to ${tgt}`, 'success');
      state.currentDay = tgt;
    }

    saveState();
    DOM.copyModal.classList.remove('active');
    renderAll();
  }

  function getShiftStandards(shiftKey) {
    let stds = state.standards;
    if (shiftKey && shiftKey !== 'all') {
      stds = state.standards.filter(s => (s.shift || 'afternoon') === shiftKey);
    }
    return sortStandardsIncrementally(stds.slice());
  }

  let activeClearAction = null;

  function openClearModal(type) {
    activeClearAction = type;
    const shift = state.activeShift || 'afternoon';
    const day = state.currentDay || 'Monday';

    let titleText = 'Confirm Clear Schedule';
    let bodyHtml = '';

    if (type === 'day') {
      titleText = `Clear ${escapeHtml(day)} Schedule`;
      if (shift === 'morning') {
        const morningStds = getShiftStandards('morning');
        bodyHtml = `
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
              ⚠️ Clear Morning Shift for ${escapeHtml(day)}?
            </div>
            <div style="color: #7f1d1d; font-size: 12.5px; margin-bottom: 10px;">
              This will clear all periods for the <strong>Morning Shift</strong> classes on <strong>${escapeHtml(day)}</strong>:
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${morningStds.map(s => `<span style="background: #fee2e2; color: #991b1b; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5;">${escapeHtml(s.name)}</span>`).join('')}
            </div>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 14px; color: #065f46; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; line-height: 1;">✓</span>
            <span><strong>Shift Isolation:</strong> Afternoon Shift classes (3rd to 8th) will remain 100% untouched and safe.</span>
          </div>`;
      } else if (shift === 'afternoon') {
        const afternoonStds = getShiftStandards('afternoon');
        bodyHtml = `
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
              ⚠️ Clear Afternoon Shift for ${escapeHtml(day)}?
            </div>
            <div style="color: #7f1d1d; font-size: 12.5px; margin-bottom: 10px;">
              This will clear all periods for the <strong>Afternoon Shift</strong> classes on <strong>${escapeHtml(day)}</strong>:
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${afternoonStds.map(s => `<span style="background: #fee2e2; color: #991b1b; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5;">${escapeHtml(s.name)}</span>`).join('')}
            </div>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 14px; color: #065f46; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; line-height: 1;">✓</span>
            <span><strong>Shift Isolation:</strong> Morning Shift classes (FG, LKG, HKG, 1st, 2nd) will remain 100% untouched and safe.</span>
          </div>`;
      } else {
        bodyHtml = `
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px;">
            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
              ⚠️ Clear All Classes for ${escapeHtml(day)}?
            </div>
            <div style="color: #7f1d1d; font-size: 12.5px;">
              You are currently in <strong>All Classes</strong> view. This will clear periods for both Morning and Afternoon shifts on <strong>${escapeHtml(day)}</strong>.
            </div>
          </div>`;
      }
    } else if (type === 'full') {
      const dayRangeText = state.includeSaturday ? 'all 6 days (Monday to Saturday)' : 'all 5 days (Monday to Friday)';
      const dayRangeSimple = state.includeSaturday ? 'Monday to Saturday' : 'Monday to Friday';
      titleText = 'Clear Whole Weekly Timetable';
      if (shift === 'morning') {
        const morningStds = getShiftStandards('morning');
        bodyHtml = `
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
              ⚠️ Clear Whole Morning Shift Timetable?
            </div>
            <div style="color: #7f1d1d; font-size: 12.5px; margin-bottom: 10px;">
              This will clear the entire weekly timetable across ${dayRangeText} for all <strong>Morning Shift</strong> classes:
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${morningStds.map(s => `<span style="background: #fee2e2; color: #991b1b; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5;">${escapeHtml(s.name)}</span>`).join('')}
            </div>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 14px; color: #065f46; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; line-height: 1;">✓</span>
            <span><strong>Shift Isolation:</strong> Afternoon Shift classes (3rd to 8th) will NOT be affected and remain completely untouched.</span>
          </div>`;
      } else if (shift === 'afternoon') {
        const afternoonStds = getShiftStandards('afternoon');
        bodyHtml = `
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
              ⚠️ Clear Whole Afternoon Shift Timetable?
            </div>
            <div style="color: #7f1d1d; font-size: 12.5px; margin-bottom: 10px;">
              This will clear the entire weekly timetable across ${dayRangeText} for all <strong>Afternoon Shift</strong> classes:
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${afternoonStds.map(s => `<span style="background: #fee2e2; color: #991b1b; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border-radius: 4px; border: 1px solid #fca5a5;">${escapeHtml(s.name)}</span>`).join('')}
            </div>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 14px; color: #065f46; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px; line-height: 1;">✓</span>
            <span><strong>Shift Isolation:</strong> Morning Shift classes (FG to 2nd) will NOT be affected and remain completely untouched.</span>
          </div>`;
      } else {
        bodyHtml = `
          <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px;">
            <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
              ⚠️ Clear Entire School Timetable?
            </div>
            <div style="color: #7f1d1d; font-size: 12.5px;">
              You are in <strong>All Classes</strong> view. This will clear the entire weekly timetable across all classes for ${dayRangeSimple}.
            </div>
          </div>`;
      }
    } else if (type === 'class') {
      const stdId = state.selectedClassStandard;
      const std = state.standards.find(s => s.id === stdId) || { name: stdId };
      const stdName = std.name || stdId;
      const dayRangeSimple = state.includeSaturday ? 'Monday to Saturday' : 'Monday to Friday';
      titleText = `Clear ${escapeHtml(stdName)} Weekly Schedule`;
      bodyHtml = `
        <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #991b1b; font-size: 13.5px; margin-bottom: 6px;">
            ⚠️ Clear All Periods for ${escapeHtml(stdName)}?
          </div>
          <div style="color: #7f1d1d; font-size: 12.5px;">
            This will clear all scheduled periods for <strong>${escapeHtml(stdName)}</strong> from ${dayRangeSimple}.
          </div>
        </div>
        <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 14px; color: #065f46; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px; line-height: 1;">✓</span>
          <span><strong>Protection:</strong> All other classes across both shifts will remain completely untouched.</span>
        </div>`;
    }

    if (DOM.confirmClearTitleText) DOM.confirmClearTitleText.textContent = titleText;
    if (DOM.confirmClearModalBody) DOM.confirmClearModalBody.innerHTML = bodyHtml;
    if (DOM.confirmClearModal) DOM.confirmClearModal.classList.add('active');
  }

  function closeClearModal() {
    if (DOM.confirmClearModal) DOM.confirmClearModal.classList.remove('active');
    activeClearAction = null;
  }

  function handleConfirmClearAction() {
    const action = activeClearAction;
    closeClearModal();
    if (action === 'day') {
      executeClearCurrentDay();
    } else if (action === 'full') {
      executeClearFullTimetable();
    } else if (action === 'class') {
      executeClearSingleClassWeekly();
    }
  }

  function clearCurrentDay() {
    openClearModal('day');
  }

  function executeClearCurrentDay() {
    const shift = state.activeShift || 'afternoon';
    let toastMsg = '';

    if (shift === 'morning') {
      toastMsg = `${state.currentDay} (Morning Shift) cleared`;
    } else if (shift === 'afternoon') {
      toastMsg = `${state.currentDay} (Afternoon Shift) cleared`;
    } else {
      toastMsg = `${state.currentDay} timetable cleared`;
    }

    const stdsToClear = getShiftStandards(shift).map(s => s.id);
    if (shift === 'morning') {
      ['std_fg', 'std_lkg', 'std_hkg', 'std_1', 'std_2', 'std_nursery', 'std_jr_kg', 'std_sr_kg'].forEach(id => {
        if (!stdsToClear.includes(id)) stdsToClear.push(id);
      });
    }

    if (state.schedules && state.schedules[state.currentDay]) {
      Object.keys(state.schedules[state.currentDay]).forEach(pId => {
        if (state.schedules[state.currentDay][pId]) {
          stdsToClear.forEach(sId => {
            delete state.schedules[state.currentDay][pId][sId];
          });
        }
      });
    }

    if (state.excludedFreeTeachers) {
      Object.keys(state.excludedFreeTeachers).forEach(k => {
        if (k.startsWith(`${state.currentDay}_`)) {
          delete state.excludedFreeTeachers[k];
        }
      });
    }

    saveState(false);
    if (window.FirebaseSync && window.FirebaseSync.isConfigured()) {
      window.FirebaseSync.save(state, { immediate: true });
    }
    renderAll();
    showToast(toastMsg, 'info');
  }

  function clearFullTimetable() {
    openClearModal('full');
  }

  function executeClearFullTimetable() {
    const shift = state.activeShift || 'afternoon';
    let toastMsg = '';

    if (shift === 'morning') {
      toastMsg = 'Morning Shift weekly timetable cleared';
    } else if (shift === 'afternoon') {
      toastMsg = 'Afternoon Shift weekly timetable cleared';
    } else {
      toastMsg = 'Entire school timetable cleared';
    }

    const stdsToClear = getShiftStandards(shift).map(s => s.id);
    if (shift === 'morning') {
      ['std_fg', 'std_lkg', 'std_hkg', 'std_1', 'std_2', 'std_nursery', 'std_jr_kg', 'std_sr_kg'].forEach(id => {
        if (!stdsToClear.includes(id)) stdsToClear.push(id);
      });
    }

    state.days.forEach(day => {
      if (state.schedules && state.schedules[day]) {
        Object.keys(state.schedules[day]).forEach(pId => {
          if (state.schedules[day][pId]) {
            stdsToClear.forEach(sId => {
              delete state.schedules[day][pId][sId];
            });
          }
        });
      }
    });

    state.excludedFreeTeachers = {};
    saveState(false);
    if (window.FirebaseSync && window.FirebaseSync.isConfigured()) {
      window.FirebaseSync.save(state, { immediate: true });
    }
    renderAll();
    showToast(toastMsg, 'info');
  }

  function clearSingleClassWeekly() {
    openClearModal('class');
  }

  function executeClearSingleClassWeekly() {
    const stdId = state.selectedClassStandard;
    const std = state.standards.find(s => s.id === stdId) || { name: stdId };
    const stdName = std.name || stdId;

    state.days.forEach(day => {
      if (state.schedules && state.schedules[day]) {
        Object.keys(state.schedules[day]).forEach(pId => {
          if (state.schedules[day][pId]) {
            delete state.schedules[day][pId][stdId];
          }
        });
      }
    });

    saveState(false);
    if (window.FirebaseSync && window.FirebaseSync.isConfigured()) {
      window.FirebaseSync.save(state, { immediate: true });
    }
    renderAll();
    showToast(`${stdName} weekly schedule cleared`, 'info');
  }

  // --- Settings & Roster Modal ---
  function openSettingsModal() {
    renderSettingsLists();
    DOM.settingsModal.classList.add('active');
  }

  function renderSettingsLists() {
    DOM.settingsTeachersList.innerHTML = '';
    DOM.settingsTeacherCount.textContent = state.teachers.length;
    state.teachers.forEach(t => {
      const prof = state.teacherProfiles[t] || {};
      const tShift = prof.assignedShift || (["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am"].includes(t) ? 'morning' : 'afternoon');
      const isMorn = tShift === 'morning';

      const tag = document.createElement('span');
      tag.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12.5px;';
      tag.innerHTML = `
        <span style="font-size: 10.5px; padding: 1px 5px; border-radius: 3px; font-weight: 600; ${isMorn ? 'background: #fef3c7; color: #92400e;' : 'background: #e0e7ff; color: #3730a3;'}">
          ${isMorn ? '☀️ Morning' : '🌙 Afternoon'}
        </span>
        <span>${escapeHtml(t)}</span>
        <button style="background: none; border: none; color: var(--status-danger); cursor: pointer; font-size: 14px; line-height: 1;" title="Remove teacher">&times;</button>`;

      tag.querySelector('button').onclick = () => {
        if (confirm(`Remove ${t} from teachers roster?`)) {
          state.teachers = state.teachers.filter(item => item !== t);
          saveState();
          renderSettingsLists();
          renderAll();
        }
      };
      DOM.settingsTeachersList.appendChild(tag);
    });

    DOM.settingsSubjectsList.innerHTML = '';
    DOM.settingsSubjectCount.textContent = state.subjects.length;
    state.subjects.forEach(s => {
      const tag = document.createElement('span');
      tag.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12.5px;';
      tag.innerHTML = `<span>${escapeHtml(s)}</span><button style="background: none; border: none; color: var(--status-danger); cursor: pointer; font-size: 14px; line-height: 1;">&times;</button>`;
      tag.querySelector('button').onclick = () => {
        if (confirm(`Remove subject ${s}?`)) {
          state.subjects = state.subjects.filter(item => item !== s);
          saveState();
          renderSettingsLists();
          renderAll();
        }
      };
      DOM.settingsSubjectsList.appendChild(tag);
    });

    // Faculty Subject Mapping
    if (DOM.settingsTeacherSubjectMapping) {
      DOM.settingsTeacherSubjectMapping.innerHTML = '';
      state.teachers.forEach(teacher => {
        const row = document.createElement('div');
        row.className = 'teacher-subject-row';
        const currentSubj = (state.teacherProfiles[teacher] && state.teacherProfiles[teacher].primarySubject) || '';
        const tShift = (state.teacherProfiles[teacher] && state.teacherProfiles[teacher].assignedShift) || (["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am"].includes(teacher) ? 'morning' : 'afternoon');
        const isMorn = tShift === 'morning';

        let opts = `<option value="">-- Unassigned --</option>`;
        state.subjects.forEach(s => {
          opts += `<option value="${escapeHtml(s)}" ${s === currentSubj ? 'selected' : ''}>${escapeHtml(s)}</option>`;
        });

        row.innerHTML = `
          <div class="teacher-name-label" style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 10px; padding: 1px 4px; border-radius: 3px; font-weight: 600; ${isMorn ? 'background: #fef3c7; color: #92400e;' : 'background: #e0e7ff; color: #3730a3;'}">
              ${isMorn ? '☀️' : '🌙'}
            </span>
            <span>${escapeHtml(teacher)}</span>
          </div>
          <select class="mapping-select" data-teacher="${escapeHtml(teacher)}">
            ${opts}
          </select>`;

        row.querySelector('select').onchange = function() {
          const t = this.getAttribute('data-teacher');
          if (!state.teacherProfiles[t]) state.teacherProfiles[t] = {};
          state.teacherProfiles[t].primarySubject = this.value;
          saveState();
          showToast(`Assigned ${this.value || 'None'} to ${t}`, 'success');
        };

        DOM.settingsTeacherSubjectMapping.appendChild(row);
      });
    }

    // Class Teacher Duty Assignment (Assign Class In-Charge for Each Standard)
    if (DOM.settingsClassTeacherMapping) {
      DOM.settingsClassTeacherMapping.innerHTML = '';
      const sortedStds = sortStandardsIncrementally(state.standards.slice());
      sortedStds.forEach(std => {
        const row = document.createElement('div');
        row.className = 'teacher-subject-row';
        const currentTeacher = (state.classTeachers && state.classTeachers[std.id]) || '';
        const isMorning = std.shift === 'morning';
        const allowedTeachers = getTeachersForShift(isMorning ? 'morning' : 'afternoon');

        let opts = `<option value="">-- Unassigned --</option>`;
        allowedTeachers.forEach(t => {
          opts += `<option value="${escapeHtml(t)}" ${t === currentTeacher ? 'selected' : ''}>${escapeHtml(t)}</option>`;
        });

        row.innerHTML = `
          <div class="teacher-name-label" style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px;">${isMorning ? '☀️' : '🌙'}</span>
              <strong style="font-size: 12.5px; color: var(--text-primary);">${escapeHtml(std.name)}</strong>
            </div>
            <span style="font-size: 10.5px; color: var(--text-muted);">${escapeHtml(std.room || 'Room TBA')} • ${isMorning ? 'Morning Shift' : 'Afternoon Shift'}</span>
          </div>
          <select class="mapping-select class-teacher-select" data-std="${escapeHtml(std.id)}" style="font-weight: 600;">
            ${opts}
          </select>`;

        row.querySelector('select').onchange = function() {
          const sId = this.getAttribute('data-std');
          if (!state.classTeachers) state.classTeachers = {};
          state.classTeachers[sId] = this.value;
          saveState();
          renderAll();
          showToast(`Assigned Class Teacher: ${this.value || 'None'} for ${std.name}`, 'success');
        };

        DOM.settingsClassTeacherMapping.appendChild(row);
      });
    }
  }

  function addTeacher() {
    const name = DOM.settingsNewTeacher.value.trim();
    if (!name || state.teachers.includes(name)) return;
    const shiftSelect = DOM.settingsNewTeacherShift || document.getElementById('settings-new-teacher-shift');
    const assignedShift = (shiftSelect && shiftSelect.value) || state.activeShift || 'afternoon';

    state.teachers.push(name);
    if (!state.teacherProfiles) state.teacherProfiles = {};
    state.teacherProfiles[name] = {
      primarySubject: '',
      assignedShift: assignedShift,
      halfDayAvailability: 'all',
      workSchedule: 'full_day',
      maxPeriods: 5
    };
    DOM.settingsNewTeacher.value = '';
    saveState();
    renderSettingsLists();
    renderAll();
    showToast(`Added ${name} to ${assignedShift === 'morning' ? 'Morning' : 'Afternoon'} roster`, 'success');
  }

  function addSubject() {
    const name = DOM.settingsNewSubject.value.trim();
    if (!name || state.subjects.includes(name)) return;
    state.subjects.push(name);
    DOM.settingsNewSubject.value = '';
    saveState();
    renderSettingsLists();
    renderAll();
    showToast(`Added subject ${name}`, 'success');
  }

  // --- Export Actions ---
  async function downloadSingleDayDocx() {
    try {
      showToast(`Generating ${state.currentDay}.docx with school letterhead...`, 'info');
      const blob = await DocxGenerator.generateDocxBlob([state.currentDay], state);
      DocxGenerator.triggerDownload(blob, `${state.currentDay}_TimeTable.docx`);
      showToast(`${state.currentDay}.docx exported successfully`, 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function downloadAllDaysDocx() {
    try {
      if (state.activeView === 'class-view' && state.classViewMode === 'class-weekly') {
        exportCurrentClassWeeklyDocx();
        return;
      }

      if (state.activeView === 'teacher-view') {
        const shiftTeachers = getTeachersForShift(state.activeShift);
        showToast(`Generating ${state.activeShift === 'morning' ? 'Morning' : 'Afternoon'} Staff Individual Timetables (.docx)...`, 'info');
        const blob = await DocxGenerator.generateTeacherTimetablesDocxBlob(shiftTeachers, state);
        DocxGenerator.triggerDownload(blob, `${state.activeShift === 'morning' ? 'Morning' : 'Afternoon'}_Faculty_Individual_Timetables.docx`);
        showToast('Staff Schedules exported successfully', 'success');
      } else if (state.activeView === 'duty-view') {
        downloadWeeklyDutyDocx();
      } else if (state.activeView === 'general-duty-view') {
        exportGeneralDutiesDocx();
      } else if (state.activeView === 'substitution-view') {
        downloadSubstitutionDocx();
      } else {
        showToast('Generating Full Week Timetable (.docx)...', 'info');
        const blob = await DocxGenerator.generateDocxBlob(getActiveDays(), state);
        DocxGenerator.triggerDownload(blob, 'Weekly_School_TimeTable.docx');
        showToast('Full Week Timetable exported successfully', 'success');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function exportCurrentClassWeeklyDocx() {
    try {
      const std = state.standards.find(s => s.id === state.selectedClassStandard) || state.standards[0];
      showToast(`Generating ${std.name} Weekly Timetable (.docx)...`, 'info');
      const blob = await DocxGenerator.generateClassTimetablesDocxBlob([std.id], state);
      const safeName = std.name.replace(/[^a-zA-Z0-9]/g, '_');
      DocxGenerator.triggerDownload(blob, `${safeName}_Weekly_Timetable.docx`);
      showToast(`${std.name} timetable exported successfully`, 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function exportAttendanceDutiesDocx() {
    try {
      showToast('Generating Daily Attendance Duty Roster (.docx)...', 'info');
      const blob = await DocxGenerator.generateAttendanceDutiesDocxBlob(state);
      DocxGenerator.triggerDownload(blob, 'Daily_Attendance_Duty_Roster.docx');
      showToast('Attendance Duty Roster exported successfully', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function downloadWeeklyDutyDocx() {
    try {
      showToast('Generating Weekly Faculty Extra Duty Matrix (.docx)...', 'info');
      const blob = await DocxGenerator.generateWeeklyDutyDocxBlob(state);
      DocxGenerator.triggerDownload(blob, 'Weekly_Faculty_Extra_Duties.docx');
      showToast('Weekly Extra Duties exported successfully', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function downloadSingleTeacherDocx() {
    const t = state.selectedTeacher || state.teachers[0];
    try {
      showToast(`Generating ${t} Timetable (.docx)...`, 'info');
      const blob = await DocxGenerator.generateTeacherTimetablesDocxBlob([t], state);
      DocxGenerator.triggerDownload(blob, `${t.replace(/\s+/g, '_')}_Timetable.docx`);
      showToast(`${t} timetable exported successfully`, 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function downloadSubstitutionDocx() {
    const targetDay = DOM.subDaySelect.value || state.currentDay;
    const currentSubs = state.substitutions[targetDay] || {};
    const dayLeaves = state.leaves[targetDay] || [];
    const daySched = state.schedules[targetDay] || {};

    const subList = [];
    state.periods.forEach(p => {
      const pSlots = daySched[p.id] || {};
      state.standards.forEach(s => {
        const slot = pSlots[s.id];
        if (slot && slot.teacher && dayLeaves.includes(slot.teacher.trim())) {
          const subKey = `${p.id}_${s.id}`;
          subList.push({
            periodId: p.id,
            periodLabel: p.label,
            periodTime: p.time,
            stdId: s.id,
            stdName: s.name,
            absentTeacher: slot.teacher.trim(),
            proxyTeacher: currentSubs[subKey] || 'Unassigned'
          });
        }
      });
    });

    try {
      showToast(`Generating ${targetDay} Substitution Notice (.docx)...`, 'info');
      const blob = await DocxGenerator.generateSubstitutionDocxBlob(targetDay, subList, state);
      DocxGenerator.triggerDownload(blob, `Substitution_Duty_Notice_${targetDay}.docx`);
      showToast('Substitution Notice exported successfully', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  function exportJsonBackup() {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `school_timetable_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Timetable data backed up to JSON file', 'success');
  }

  function importJsonRestore(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.schedules && parsed.teachers) {
          state = Object.assign({}, state, parsed);
          saveState();
          renderSchoolProfile();
          renderAll();
          showToast('Data restored successfully', 'success');
        } else {
          showToast('Invalid backup JSON format', 'error');
        }
      } catch (err) {
        showToast('Error parsing JSON backup', 'error');
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

    toast.innerHTML = `<span style="font-weight: bold;">${icon}</span><span>${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // --- Setup Event Listeners ---
  function setupEventListeners() {
    // View tabs
    DOM.viewTabBtns.forEach(btn => {
      btn.onclick = () => switchView(btn.getAttribute('data-view'));
    });

    // Academic Shift Selector Pills
    if (DOM.btnShiftMorning) {
      DOM.btnShiftMorning.onclick = () => {
        state.activeShift = 'morning';
        saveState(true);
        renderClassView();
      };
    }
    if (DOM.btnShiftAfternoon) {
      DOM.btnShiftAfternoon.onclick = () => {
        state.activeShift = 'afternoon';
        saveState(true);
        renderClassView();
      };
    }
    if (DOM.btnShiftAll) {
      DOM.btnShiftAll.onclick = () => {
        state.activeShift = 'all';
        saveState(true);
        renderClassView();
      };
    }

    // Class View Format Mode Toggles
    if (DOM.btnModeDayGrid) {
      DOM.btnModeDayGrid.onclick = () => {
        state.classViewMode = 'day-grid';
        saveState(true);
        renderClassView();
      };
    }
    if (DOM.btnModeClassWeekly) {
      DOM.btnModeClassWeekly.onclick = () => {
        state.classViewMode = 'class-weekly';
        saveState(true);
        renderClassView();
      };
    }

    // Class-Wise Weekly View Actions
    if (DOM.btnExportClassDocx) DOM.btnExportClassDocx.onclick = exportCurrentClassWeeklyDocx;
    if (DOM.btnPrintClass) DOM.btnPrintClass.onclick = () => window.print();
    if (DOM.btnClearSingleClassWeekly) DOM.btnClearSingleClassWeekly.onclick = clearSingleClassWeekly;

    // Dedicated Attendance Duty Actions
    if (DOM.btnDownloadAttendanceDutiesDocx) {
      DOM.btnDownloadAttendanceDutiesDocx.onclick = exportAttendanceDutiesDocx;
    }

    // School Profile Modal
    DOM.btnOpenSchoolProfile.onclick = openSchoolProfileModal;
    DOM.btnCloseProfileModal.onclick = () => DOM.schoolProfileModal.classList.remove('active');
    DOM.btnSaveSchoolProfile.onclick = saveSchoolProfile;
    DOM.inputLogoFile.onchange = handleLogoUpload;
    DOM.btnRemoveLogo.onclick = removeLogo;

    // Export Bar
    DOM.btnDownloadSingleDay.onclick = downloadSingleDayDocx;
    DOM.btnDownloadAllDays.onclick = downloadAllDaysDocx;
    DOM.btnDownloadTeacherDocx.onclick = downloadSingleTeacherDocx;
    DOM.btnDownloadAllTeachersDocx.onclick = () => {
      state.activeView = 'teacher-view';
      downloadAllDaysDocx();
    };
    DOM.btnDownloadSubstitutionDocx.onclick = downloadSubstitutionDocx;
    DOM.btnPrintView.onclick = () => window.print();

    // Day Actions
    DOM.btnOpenCopyModal.onclick = openCopyModal;
    DOM.btnClearCurrentDay.onclick = clearCurrentDay;
    if (DOM.btnClearFullTimetable) DOM.btnClearFullTimetable.onclick = clearFullTimetable;
    DOM.btnCloseCopyModal.onclick = () => DOM.copyModal.classList.remove('active');
    DOM.btnCancelCopy.onclick = () => DOM.copyModal.classList.remove('active');
    DOM.btnConfirmCopy.onclick = executeCopySchedule;

    // Confirm Clear Modal Actions
    if (DOM.btnCloseClearModal) DOM.btnCloseClearModal.onclick = closeClearModal;
    if (DOM.btnCancelClearModal) DOM.btnCancelClearModal.onclick = closeClearModal;
    if (DOM.btnProceedClearModal) DOM.btnProceedClearModal.onclick = handleConfirmClearAction;

    // Weekly Duty View (Notebook Matrix) Actions
    if (DOM.btnDownloadWeeklyDutyDocx) DOM.btnDownloadWeeklyDutyDocx.onclick = downloadWeeklyDutyDocx;
    if (DOM.btnPrintDutyView) DOM.btnPrintDutyView.onclick = () => window.print();
    if (DOM.btnClearAllWeeklyDuties) DOM.btnClearAllWeeklyDuties.onclick = clearAllWeeklyDuties;

    // School & Assembly General Duty View Actions
    if (DOM.btnAddGeneralDuty) DOM.btnAddGeneralDuty.onclick = () => openGeneralDutyModal();
    if (DOM.selectGeneralDutyFilterTeacher) DOM.selectGeneralDutyFilterTeacher.onchange = renderGeneralDutyView;
    if (DOM.btnDownloadGeneralDutiesDocx) DOM.btnDownloadGeneralDutiesDocx.onclick = exportGeneralDutiesDocx;
    if (DOM.btnPrintGeneralDuties) DOM.btnPrintGeneralDuties.onclick = () => window.print();
    if (DOM.btnClearAllGeneralDuties) DOM.btnClearAllGeneralDuties.onclick = clearAllGeneralDuties;

    // General Duty Day-Wise Tabs
    if (DOM.generalDutyDayTabs) {
      DOM.generalDutyDayTabs.querySelectorAll('.day-tab-btn').forEach(btn => {
        btn.onclick = () => {
          DOM.generalDutyDayTabs.querySelectorAll('.day-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.activeGeneralDutyDay = btn.getAttribute('data-day') || 'all';
          renderGeneralDutyView();
        };
      });
    }

    // General Duty Modal Actions
    if (DOM.btnCloseGeneralDutyModal) DOM.btnCloseGeneralDutyModal.onclick = () => DOM.generalDutyModal.classList.remove('active');
    if (DOM.btnCancelGeneralDuty) DOM.btnCancelGeneralDuty.onclick = () => DOM.generalDutyModal.classList.remove('active');
    if (DOM.btnSaveGeneralDuty) DOM.btnSaveGeneralDuty.onclick = saveGeneralDuty;
    if (DOM.btnGdutyApplyAllDays) {
      DOM.btnGdutyApplyAllDays.onclick = () => {
        const teacher = DOM.selectGeneralDutyQuickTeacher ? DOM.selectGeneralDutyQuickTeacher.value : '';
        if (!teacher) {
          showToast('Please select a faculty member to apply', 'warning');
          return;
        }
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
          const el = document.getElementById(`select-gduty-day-${day}`);
          if (el) el.value = teacher;
        });
        showToast(`Applied ${teacher} to all 5 days`, 'info');
      };
    }

    // Duty Cell Modal Actions
    if (DOM.btnCloseDutyCellModal) DOM.btnCloseDutyCellModal.onclick = () => DOM.dutyCellModal.classList.remove('active');
    if (DOM.btnModalCancelDuty) DOM.btnModalCancelDuty.onclick = () => DOM.dutyCellModal.classList.remove('active');
    if (DOM.btnModalSaveDuty) DOM.btnModalSaveDuty.onclick = saveDutyModalCell;
    if (DOM.btnModalClearDuty) DOM.btnModalClearDuty.onclick = clearDutyModalCell;
    if (DOM.modalDutyCustomText) {
      DOM.modalDutyCustomText.onkeydown = (e) => {
        if (e.key === 'Enter') saveDutyModalCell();
      };
    }

    // Header Actions
    if (DOM.btnToggleSaturday) {
      DOM.btnToggleSaturday.onclick = () => toggleSaturdayVisibility();
    }
    if (DOM.settingIncludeSaturday) {
      DOM.settingIncludeSaturday.onchange = (e) => toggleSaturdayVisibility(e.target.checked);
    }
    DOM.btnOpenSettings.onclick = openSettingsModal;
    DOM.btnCloseSettingsModal.onclick = () => DOM.settingsModal.classList.remove('active');
    DOM.btnCloseSettings.onclick = () => DOM.settingsModal.classList.remove('active');
    DOM.btnAddTeacher.onclick = addTeacher;
    DOM.btnAddSubject.onclick = addSubject;
    DOM.settingsNewTeacher.onkeydown = (e) => { if (e.key === 'Enter') addTeacher(); };
    DOM.settingsNewSubject.onkeydown = (e) => { if (e.key === 'Enter') addSubject(); };
    DOM.btnExportJson.onclick = exportJsonBackup;
    DOM.btnImportJson.onclick = () => DOM.importFileInput.click();
    DOM.importFileInput.onchange = importJsonRestore;

    // Cloud Database Modal Actions
    if (DOM.btnOpenCloudDb) DOM.btnOpenCloudDb.onclick = openCloudDbModal;
    if (DOM.saveBadge) DOM.saveBadge.onclick = openCloudDbModal;
    if (DOM.btnCloseCloudDbModal) DOM.btnCloseCloudDbModal.onclick = () => DOM.cloudDbModal.classList.remove('active');
    if (DOM.btnCloseCloudDbFooter) DOM.btnCloseCloudDbFooter.onclick = () => DOM.cloudDbModal.classList.remove('active');
    if (DOM.btnSaveCloudConfig) DOM.btnSaveCloudConfig.onclick = handleSaveCloudConfig;
    if (DOM.btnDisconnectCloud) DOM.btnDisconnectCloud.onclick = handleDisconnectCloud;
    if (DOM.btnCloudSyncNow) DOM.btnCloudSyncNow.onclick = handleCloudSyncNow;
    if (DOM.btnCloudFetchNow) DOM.btnCloudFetchNow.onclick = handleCloudFetchNow;

    if (DOM.fbInputRawSnippet) {
      DOM.fbInputRawSnippet.oninput = () => {
        const parsed = parseFirebaseSnippet(DOM.fbInputRawSnippet.value);
        if (parsed) {
          if (DOM.fbInputApiKey && parsed.apiKey) DOM.fbInputApiKey.value = parsed.apiKey;
          if (DOM.fbInputProjectId && parsed.projectId) DOM.fbInputProjectId.value = parsed.projectId;
          if (DOM.fbInputAuthDomain && parsed.authDomain) DOM.fbInputAuthDomain.value = parsed.authDomain;
          if (DOM.fbInputAppId && parsed.appId) DOM.fbInputAppId.value = parsed.appId;
        }
      };
    }

    // Period Popover Modal
    DOM.btnClosePeriodModal.onclick = () => DOM.periodModal.classList.remove('active');
    DOM.btnModalCancel.onclick = () => DOM.periodModal.classList.remove('active');
    DOM.btnModalSaveCell.onclick = saveModalCell;
    DOM.btnModalClearCell.onclick = clearModalCell;
    if (DOM.btnModalMergeNextClass) DOM.btnModalMergeNextClass.onclick = mergeWithNextClass;
    if (DOM.btnModalMergeNextLecture) DOM.btnModalMergeNextLecture.onclick = mergeWithNextLecture;
    if (DOM.btnModalSplitCell) DOM.btnModalSplitCell.onclick = splitCell;
    DOM.modalCustomSubject.oninput = () => {
      editingCell.subject = DOM.modalCustomSubject.value;
      renderModalChips();
    };
    DOM.modalCustomTeacher.oninput = () => {
      editingCell.teacher = DOM.modalCustomTeacher.value;
    };

    // Close Modals on background click
    [DOM.periodModal, DOM.dutyCellModal, DOM.generalDutyModal, DOM.copyModal, DOM.settingsModal, DOM.schoolProfileModal, DOM.cloudDbModal, DOM.confirmClearModal].forEach(m => {
      if (m) m.onclick = (e) => { if (e.target === m) m.classList.remove('active'); };
    });

    // ESC Key
    document.onkeydown = (e) => {
      if (e.key === 'Escape') {
        if (DOM.periodModal) DOM.periodModal.classList.remove('active');
        if (DOM.dutyCellModal) DOM.dutyCellModal.classList.remove('active');
        if (DOM.generalDutyModal) DOM.generalDutyModal.classList.remove('active');
        if (DOM.copyModal) DOM.copyModal.classList.remove('active');
        if (DOM.settingsModal) DOM.settingsModal.classList.remove('active');
        if (DOM.schoolProfileModal) DOM.schoolProfileModal.classList.remove('active');
        if (DOM.cloudDbModal) DOM.cloudDbModal.classList.remove('active');
        if (DOM.confirmClearModal) DOM.confirmClearModal.classList.remove('active');
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
