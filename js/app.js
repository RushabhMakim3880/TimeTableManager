/**
 * app.js - Enterprise Academic Timetable ERP Engine
 * Multi-Perspective Views, School Branding, Substitution Manager, Workload Analytics
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'school_timetable_mgmt_v4';

  // --- Core Application State ---
  let state = {
    auth: {
      isAuthenticated: true,
      currentUser: {
        name: "Admin User",
        email: "admin@funland.edu",
        role: "Admin",
        avatar: "👑"
      }
    },
    currentShift: 'afternoon', // 'morning' | 'afternoon'
    shifts: {
      morning: {
        periods: [],
        schedules: {},
        duties: {},
        leaves: {},
        substitutions: {}
      },
      afternoon: {
        periods: [],
        schedules: {},
        duties: {},
        leaves: {},
        substitutions: {}
      }
    },
    activeView: 'dashboard-view',
    currentDay: 'Monday',
    selectedTeacher: '',
    schoolProfile: {},
    standards: [],
    periods: [],
    teachers: [],
    teacherProfiles: {},
    subjects: [],
    days: [],
    schedules: {},
    leaves: {}, // { "Monday": ["Teacher Name"] }
    substitutions: {}, // { "Monday": [ { periodId, stdId, absentTeacher, proxyTeacher } ] }
    dutyPresets: [],
    duties: {}, // { "Monday": { "p1": { "Teacher Name": { duty: "Library Supervision", location: "Central Library" } } } }
    weeklyDuties: {}, // { "Teacher Name": { "Monday": "3 to 5 Maths", "Friday": "3 to 5 Maths" } }
    excludedFreeTeachers: {}, // { "Monday_p1": ["Teacher Name"] }
    generalDuties: [], // [ { id, dutyName, allocations: { Monday: '...', ... }, time, location, notes } ]
    activeGeneralDutyDay: 'all', // 'all' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'
    classTeacherDuties: [], // [ { standardId, standardName, teacher, subject, room, shift, contact } ]
    attendanceDuties: [], // [ { id, day, shift, title, teacher, location, time, status, notes } ]
    syllabusRecords: [], // [ { id, standardId, standardName, subject, teacher, chapters, poems, grammar, completedCourse, pendingCourse, checkedTextbooks, checkedClasswork, pendingTextbooks, pendingClasswork, progressPercent } ]
    selectedClassStd: 'std_3',
    activeAttDutyDay: 'all',
    activeAttDutyShift: 'all',
    activeSyllabusStd: 'all'
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

  // --- DOM Elements ---
  const DOM = {
    // Header & Branding
    headerSchoolName: document.getElementById('header-school-name'),
    headerSchoolMeta: document.getElementById('header-school-meta'),
    headerSchoolLogo: document.getElementById('header-school-logo'),
    defaultBrandIcon: document.getElementById('default-brand-icon'),
    saveBadge: document.getElementById('save-status-badge'),

    // App Shell, Collapsible Sidebar & Topbar
    appSidebar: document.getElementById('app-sidebar'),
    btnSidebarCollapse: document.getElementById('btn-sidebar-collapse'),
    btnMobileSidebarToggle: document.getElementById('btn-mobile-sidebar-toggle'),
    topbarViewTitle: document.getElementById('topbar-view-title'),
    stickyExportBar: document.getElementById('sticky-export-bar'),
    dashBtnQuickExport: document.getElementById('dash-btn-quick-export'),

    // View Navigation
    viewTabBtns: document.querySelectorAll('.view-tab-btn'),
    viewSections: document.querySelectorAll('.view-section'),

    // Class View
    dayTabsContainer: document.getElementById('day-tabs-container'),
    attendanceChipsContainer: document.getElementById('attendance-chips-container'),
    conflictBanner: document.getElementById('conflict-banner'),
    conflictMessage: document.getElementById('conflict-message'),
    displayDayName: document.getElementById('display-day-name'),
    displayDayStats: document.getElementById('display-day-stats'),
    timetableThead: document.getElementById('timetable-thead'),
    timetableTbody: document.getElementById('timetable-tbody'),
    btnOpenCopyModal: document.getElementById('btn-open-copy-modal'),
    btnClearCurrentDay: document.getElementById('btn-clear-current-day'),

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
    btnAddSubject: document.getElementById('btn-add-subject'),
    settingsTeacherSubjectMapping: document.getElementById('settings-teacher-subject-mapping'),

    // Cloud Database Modal (Firebase Firestore)
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

    // Academic Shift Selector
    btnTopbarQuickCreate: document.getElementById('btn-topbar-quick-create'),
    headerShiftSelector: document.getElementById('header-shift-selector'),
    btnShiftMorning: document.getElementById('btn-shift-morning'),
    btnShiftAfternoon: document.getElementById('btn-shift-afternoon'),

    // User Profile Pill & Auth
    headerUserBadge: document.getElementById('header-user-badge'),
    headerUserAvatar: document.getElementById('header-user-avatar'),
    headerUserName: document.getElementById('header-user-name'),
    headerUserRole: document.getElementById('header-user-role'),
    btnLogout: document.getElementById('btn-logout'),

    // Auth Login Modal
    authLoginOverlay: document.getElementById('auth-login-overlay'),
    authLoginForm: document.getElementById('auth-login-form'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    btnAuthSubmit: document.getElementById('btn-auth-submit'),
    authErrorBanner: document.getElementById('auth-error-banner'),
    authRoleChips: document.querySelectorAll('.auth-role-chip'),

    // Dashboard View Elements
    dashLiveDateStr: document.getElementById('dash-live-date-str'),
    dashBtnShiftMorning: document.getElementById('dash-btn-shift-morning'),
    dashBtnShiftAfternoon: document.getElementById('dash-btn-shift-afternoon'),
    dashScheduleDayName: document.getElementById('dash-schedule-day-name'),
    dashTodayMatrixThead: document.getElementById('dash-today-matrix-thead'),
    dashTodayMatrixTbody: document.getElementById('dash-today-matrix-tbody'),
    dashTodayDutyRoster: document.getElementById('dash-today-duty-roster'),
    dashPeriodFreeRoster: document.getElementById('dash-period-free-roster'),

    // Dedicated Class Timetable View
    classTtStdPills: document.getElementById('class-tt-std-pills'),
    btnDownloadSelectedClassDocx: document.getElementById('btn-download-selected-class-docx'),
    btnPrintClassTimetable: document.getElementById('btn-print-class-timetable'),
    classMetaTitle: document.getElementById('class-meta-title'),
    classMetaTeacher: document.getElementById('class-meta-teacher'),
    classMetaRoom: document.getElementById('class-meta-room'),
    classMetaShift: document.getElementById('class-meta-shift'),
    classTtThead: document.getElementById('class-tt-thead'),
    classTtTbody: document.getElementById('class-tt-tbody'),

    // Class Period Slot Modal
    classCellModal: document.getElementById('class-cell-modal'),
    classCellModalTitle: document.getElementById('class-cell-modal-title'),
    btnCloseClassCellModal: document.getElementById('btn-close-class-cell-modal'),
    classCellDay: document.getElementById('class-cell-day'),
    classCellPeriodId: document.getElementById('class-cell-period-id'),
    classCellStdId: document.getElementById('class-cell-std-id'),
    classCellSubject: document.getElementById('class-cell-subject'),
    classCellTeacher: document.getElementById('class-cell-teacher'),
    classCellConflictAlert: document.getElementById('class-cell-conflict-alert'),
    classCellConflictMsg: document.getElementById('class-cell-conflict-msg'),
    btnClearClassCell: document.getElementById('btn-clear-class-cell'),
    btnCancelClassCell: document.getElementById('btn-cancel-class-cell'),
    btnSaveClassCell: document.getElementById('btn-save-class-cell'),

    // Quick-Add Trigger Buttons
    btnQuickNewSubjectSlot: document.getElementById('btn-quick-new-subject-slot'),
    btnQuickNewTeacherSlot: document.getElementById('btn-quick-new-teacher-slot'),
    btnQuickNewSubjectPeriodModal: document.getElementById('btn-quick-new-subject-period-modal'),
    btnQuickNewTeacherPeriodModal: document.getElementById('btn-quick-new-teacher-period-modal'),
    btnQuickNewClassView: document.getElementById('btn-quick-new-class-view'),
    btnQuickNewTeacherView: document.getElementById('btn-quick-new-teacher-view'),
    btnQuickNewSubjectFaculty: document.getElementById('btn-quick-new-subject-faculty'),

    // Universal Quick-Add Modal Elements
    universalQuickAddModal: document.getElementById('universal-quick-add-modal'),
    quickAddModalTitle: document.getElementById('quick-add-modal-title'),
    btnCloseQuickAddModal: document.getElementById('btn-close-quick-add-modal'),
    btnCancelQuickAdd: document.getElementById('btn-cancel-quick-add'),
    btnSaveQuickAdd: document.getElementById('btn-save-quick-add'),
    quickAddTabBtns: document.querySelectorAll('.quick-add-tab-btn'),
    quickAddPanes: document.querySelectorAll('.quick-add-pane'),
    quickAddTargetSelectId: document.getElementById('quick-add-target-select-id'),

    // Quick Subject Pane
    quickSubjectName: document.getElementById('quick-subject-name'),
    quickSubjectCode: document.getElementById('quick-subject-code'),
    quickSubjectCategory: document.getElementById('quick-subject-category'),
    quickSubjectColor: document.getElementById('quick-subject-color'),
    quickSubjectPeriods: document.getElementById('quick-subject-periods'),

    // Quick Teacher Pane
    quickTeacherName: document.getElementById('quick-teacher-name'),
    quickTeacherShift: document.getElementById('quick-teacher-shift'),
    quickTeacherSubject: document.getElementById('quick-teacher-subject'),
    quickTeacherWork: document.getElementById('quick-teacher-work'),
    quickTeacherHalfday: document.getElementById('quick-teacher-halfday'),

    // Quick Class Pane
    quickClassName: document.getElementById('quick-class-name'),
    quickClassShift: document.getElementById('quick-class-shift'),
    quickClassRoom: document.getElementById('quick-class-room'),
    quickClassCapacity: document.getElementById('quick-class-capacity'),

    // Subjects Master Panel
    cfgStatTotalSubjects: document.getElementById('cfg-stat-total-subjects'),
    cfgStatCoreSubjects: document.getElementById('cfg-stat-core-subjects'),
    cfgStatLangSubjects: document.getElementById('cfg-stat-lang-subjects'),
    cfgStatActivitySubjects: document.getElementById('cfg-stat-activity-subjects'),
    newSubjectName: document.getElementById('new-subject-name'),
    newSubjectCode: document.getElementById('new-subject-code'),
    newSubjectCategory: document.getElementById('new-subject-category'),
    newSubjectColor: document.getElementById('new-subject-color'),
    newSubjectPeriods: document.getElementById('new-subject-periods'),
    btnAddNewSubject: document.getElementById('btn-add-new-subject'),
    btnSaveSubjectsSettings: document.getElementById('btn-save-subjects-settings'),
    cfgSubjectsTbody: document.getElementById('cfg-subjects-tbody'),
    cfgSubjectCount: document.getElementById('cfg-subject-count'),
    cfgSubjectsChipsContainer: document.getElementById('cfg-subjects-chips-container'),

    // Attendance Duty View
    btnAddAttendanceDuty: document.getElementById('btn-add-attendance-duty'),
    btnPrintAttendanceDuties: document.getElementById('btn-print-attendance-duties'),
    attDutyDayTabs: document.getElementById('att-duty-day-tabs'),
    attDutyFilterShift: document.getElementById('att-duty-filter-shift'),
    attendanceDutyTbody: document.getElementById('attendance-duty-tbody'),

    // Attendance Duty Modal
    attendanceDutyModal: document.getElementById('attendance-duty-modal'),
    attModalTitle: document.getElementById('att-modal-title'),
    btnCloseAttModal: document.getElementById('btn-close-att-modal'),
    attInputEditId: document.getElementById('att-input-edit-id'),
    attInputDay: document.getElementById('att-input-day'),
    attInputShift: document.getElementById('att-input-shift'),
    attInputDuty: document.getElementById('att-input-duty'),
    attInputTeacher: document.getElementById('att-input-teacher'),
    attInputLocation: document.getElementById('att-input-location'),
    attInputTiming: document.getElementById('att-input-timing'),
    attInputStatus: document.getElementById('att-input-status'),
    btnDeleteAttDuty: document.getElementById('btn-delete-att-duty'),
    btnCancelAttModal: document.getElementById('btn-cancel-att-modal'),
    btnSaveAttDuty: document.getElementById('btn-save-att-duty'),

    // Class Teacher Duty View
    btnOpenAddClassTeacher: document.getElementById('btn-open-add-class-teacher'),
    classTeacherCardsContainer: document.getElementById('class-teacher-cards-container'),
    classTeacherCoverageBadge: document.getElementById('class-teacher-coverage-badge'),
    classTeacherTableTbody: document.getElementById('class-teacher-table-tbody'),

    // Class Teacher Modal
    classTeacherModal: document.getElementById('class-teacher-modal'),
    ctModalTitle: document.getElementById('ct-modal-title'),
    btnCloseCtModal: document.getElementById('btn-close-ct-modal'),
    ctConflictWarningBanner: document.getElementById('ct-conflict-warning-banner'),
    ctConflictTeacherName: document.getElementById('ct-conflict-teacher-name'),
    ctConflictStdName: document.getElementById('ct-conflict-std-name'),
    ctInputStandard: document.getElementById('ct-input-standard'),
    ctInputTeacher: document.getElementById('ct-input-teacher'),
    ctInputRoom: document.getElementById('ct-input-room'),
    ctInputShift: document.getElementById('ct-input-shift'),
    ctInputContact: document.getElementById('ct-input-contact'),
    btnRemoveClassTeacher: document.getElementById('btn-remove-class-teacher'),
    btnCancelCtModal: document.getElementById('btn-cancel-ct-modal'),
    btnSaveClassTeacher: document.getElementById('btn-save-class-teacher'),

    // Syllabus Management View
    btnAddSyllabusRecord: document.getElementById('btn-add-syllabus-record'),
    btnPrintSyllabusReport: document.getElementById('btn-print-syllabus-report'),
    syllabusStdTabs: document.getElementById('syllabus-std-tabs'),
    syllabusTableTbody: document.getElementById('syllabus-table-tbody'),

    // Syllabus Modal
    syllabusModal: document.getElementById('syllabus-modal'),
    sylModalTitle: document.getElementById('syl-modal-title'),
    btnCloseSylModal: document.getElementById('btn-close-syl-modal'),
    sylInputId: document.getElementById('syl-input-id'),
    sylInputStandard: document.getElementById('syl-input-standard'),
    sylInputSubject: document.getElementById('syl-input-subject'),
    sylInputTeacher: document.getElementById('syl-input-teacher'),
    sylInputChapters: document.getElementById('syl-input-chapters'),
    sylInputPoems: document.getElementById('syl-input-poems'),
    sylInputGrammar: document.getElementById('syl-input-grammar'),
    sylInputCompletedCourse: document.getElementById('syl-input-completed-course'),
    sylInputPendingCourse: document.getElementById('syl-input-pending-course'),
    sylInputCheckedTextbooks: document.getElementById('syl-input-checked-textbooks'),
    sylInputCheckedClasswork: document.getElementById('syl-input-checked-classwork'),
    sylInputPendingTextbooks: document.getElementById('syl-input-pending-textbooks'),
    sylInputPendingClasswork: document.getElementById('syl-input-pending-classwork'),
    sylInputProgress: document.getElementById('syl-input-progress'),
    sylProgressPercentVal: document.getElementById('syl-progress-percent-val'),
    btnDeleteSyllabusRecord: document.getElementById('btn-delete-syllabus-record'),
    btnCancelSylModal: document.getElementById('btn-cancel-syl-modal'),
    btnSaveSyllabusRecord: document.getElementById('btn-save-syllabus-record'),

    // Toasts
    toastContainer: document.getElementById('toast-container')
  };

  // --- Initialize App ---
  function init() {
    loadState();
    initAuth();
    initShiftSelector();
    initSettingsView();
    setupEventListeners();
    renderSchoolProfile();
    window.switchView = switchView;
    window.state = state;

    const validViews = ['dashboard-view', 'settings-view', 'class-timetable-view', 'attendance-duty-view', 'class-teacher-duty-view', 'syllabus-view', 'class-view', 'teacher-view', 'duty-view', 'general-duty-view', 'substitution-view', 'workload-view'];
    if (window.location.hash) {
      const hashView = window.location.hash.replace('#', '');
      if (validViews.includes(hashView)) {
        state.activeView = hashView;
      }
    }
    renderAll();
    switchView(state.activeView || 'dashboard-view');
    window.addEventListener('hashchange', () => {
      const hashView = window.location.hash.replace('#', '');
      if (hashView && validViews.includes(hashView)) {
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
      resetToDefaults();
    }

    // Initialize auth if missing
    if (!state.auth || !state.auth.currentUser) {
      state.auth = {
        isAuthenticated: true,
        currentUser: {
          name: "Admin User",
          email: "admin@funland.edu",
          role: "Admin",
          avatar: "👑"
        }
      };
    }

    // Ensure crestBase64 exists on schoolProfile
    if (!state.schoolProfile) state.schoolProfile = {};
    if (!state.schoolProfile.crestBase64 && DEFAULT_DATA.schoolProfile && DEFAULT_DATA.schoolProfile.crestBase64) {
      state.schoolProfile.crestBase64 = DEFAULT_DATA.schoolProfile.crestBase64;
    }

    // Ensure subjectDetails exists and has metadata for all subjects
    if (!state.subjectDetails) {
      state.subjectDetails = JSON.parse(JSON.stringify((typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.subjectDetails) || {}));
    }
    if (state.subjects && Array.isArray(state.subjects)) {
      state.subjects.forEach(sub => {
        if (!state.subjectDetails[sub]) {
          state.subjectDetails[sub] = {
            code: sub.substring(0, 4).toUpperCase(),
            category: 'Core Academic',
            color: '#2563eb',
            weeklyPeriods: 5
          };
        }
      });
    }

    // Initialize shifts structure if missing or upgrading
    if (!state.shifts) {
      state.shifts = {
        morning: {
          periods: JSON.parse(JSON.stringify(DEFAULT_DATA.morningPeriods || [])),
          schedules: {},
          duties: {},
          leaves: {},
          substitutions: {}
        },
        afternoon: {
          periods: JSON.parse(JSON.stringify(state.periods && state.periods.length ? state.periods : DEFAULT_DATA.periods)),
          schedules: JSON.parse(JSON.stringify(state.schedules && Object.keys(state.schedules).length ? state.schedules : DEFAULT_DATA.initialSchedules)),
          duties: JSON.parse(JSON.stringify(state.duties || DEFAULT_DATA.initialDuties || {})),
          leaves: JSON.parse(JSON.stringify(state.leaves || {})),
          substitutions: JSON.parse(JSON.stringify(state.substitutions || {}))
        }
      };
    }
    if (!state.currentShift) {
      state.currentShift = 'afternoon';
    }

    // Ensure afternoon shift in state.shifts has schedules if missing/empty
    if (state.shifts && state.shifts.afternoon) {
      if (!state.shifts.afternoon.schedules || Object.keys(state.shifts.afternoon.schedules).length === 0) {
        state.shifts.afternoon.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules || {}));
      }
      if (!state.shifts.afternoon.periods || state.shifts.afternoon.periods.length === 0) {
        state.shifts.afternoon.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.periods || []));
      }
    }

    // Ensure active shift periods and schedules are mounted
    if (state.shifts && state.shifts[state.currentShift]) {
      const act = state.shifts[state.currentShift];
      if (act.periods && act.periods.length) state.periods = act.periods;
      if (act.schedules && Object.keys(act.schedules).length) state.schedules = act.schedules;
    }

    if (!state.schedules || Object.keys(state.schedules).length === 0) {
      if (state.currentShift === 'afternoon' || !state.currentShift) {
        state.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules || {}));
      }
    }

    if (!state.periods || state.periods.length === 0) {
      state.periods = JSON.parse(JSON.stringify(state.currentShift === 'morning' ? (DEFAULT_DATA.morningPeriods || []) : (DEFAULT_DATA.periods || [])));
    }

    // Initialize Class Teacher Duties if missing
    if (!state.classTeacherDuties || state.classTeacherDuties.length === 0) {
      state.classTeacherDuties = [
        { id: "ct_3", standardId: "std_3", teacher: "Priya Ma'am", subject: "Gujarati", room: "Room 101", contact: "+91 98250 11223", shift: "afternoon" },
        { id: "ct_4", standardId: "std_4", teacher: "Alpa Ma'am", subject: "Maths", room: "Room 102", contact: "+91 98250 11224", shift: "afternoon" },
        { id: "ct_5", standardId: "std_5", teacher: "Payal Ma'am", subject: "English", room: "Room 103", contact: "+91 98250 11225", shift: "afternoon" },
        { id: "ct_6", standardId: "std_6", teacher: "Manali Ma'am", subject: "Computer", room: "Room 201", contact: "+91 98250 11226", shift: "afternoon" },
        { id: "ct_7", standardId: "std_7", teacher: "Sakina Ma'am", subject: "Social Science", room: "Room 202", contact: "+91 98250 11227", shift: "afternoon" },
        { id: "ct_8", standardId: "std_8", teacher: "Taniya Ma'am", subject: "Science", room: "Room 203", contact: "+91 98250 11228", shift: "afternoon" }
      ];
    }

    // Ensure standards have shift and room assigned
    if (state.standards && state.standards.length) {
      state.standards.forEach(s => {
        if (!s.shift) {
          s.shift = (s.id && (s.id.startsWith('std_m') || s.id === 'std_nursery' || s.id === 'std_jr_kg' || s.id === 'std_sr_kg' || s.id === 'std_1' || s.id === 'std_2')) ? 'morning' : 'afternoon';
        }
        if (!s.room) {
          if (s.id === 'std_3') s.room = 'Room 101';
          else if (s.id === 'std_4') s.room = 'Room 102';
          else if (s.id === 'std_5') s.room = 'Room 103';
          else if (s.id === 'std_6') s.room = 'Room 201';
          else if (s.id === 'std_7') s.room = 'Room 202';
          else if (s.id === 'std_8') s.room = 'Room 203';
          else if (s.id === 'std_1') s.room = 'Room 001';
          else if (s.id === 'std_2') s.room = 'Room 002';
          else if (s.id === 'std_nursery') s.room = 'Pre-Primary Hall';
          else if (s.id === 'std_jr_kg') s.room = 'Room KG-1';
          else if (s.id === 'std_sr_kg') s.room = 'Room KG-2';
          else s.room = 'Classroom';
        }
      });
      const hasMorning = state.standards.some(s => s.shift === 'morning');
      if (!hasMorning) {
        const morningDefaults = (DEFAULT_DATA.standards || []).filter(s => s.shift === 'morning');
        state.standards.push(...JSON.parse(JSON.stringify(morningDefaults)));
      }
    } else {
      state.standards = JSON.parse(JSON.stringify(DEFAULT_DATA.standards));
    }

    // Initialize Attendance Duties with guaranteed 4 posts across Monday to Saturday
    if (!state.attendanceDuties || state.attendanceDuties.length < 8) {
      state.attendanceDuties = [
        { id: 'att_1', day: 'Monday', title: 'Main Gate & Arrival Supervision', teacher: "Payal Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Completed' },
        { id: 'att_2', day: 'Monday', title: 'Assembly Rows & Prayer Check', teacher: "Alpa Ma'am", location: 'Assembly Ground', time: '12:45 PM – 1:00 PM', status: 'In Progress' },
        { id: 'att_3', day: 'Monday', title: 'Recess & Corridor Monitoring', teacher: "Manali Ma'am", location: 'Corridors & Canteen', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { id: 'att_4', day: 'Monday', title: 'Dispersal & Bus Order Duty', teacher: "Priya Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' },
        
        { id: 'att_5', day: 'Tuesday', title: 'Main Gate & Arrival Supervision', teacher: "Sakina Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Completed' },
        { id: 'att_6', day: 'Tuesday', title: 'Assembly Rows & Prayer Check', teacher: "Taniya Ma'am", location: 'Assembly Stage', time: '12:45 PM – 1:00 PM', status: 'In Progress' },
        { id: 'att_7', day: 'Tuesday', title: 'Recess & Corridor Monitoring', teacher: "Payal Ma'am", location: 'Corridors & Playground', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { id: 'att_8', day: 'Tuesday', title: 'Dispersal & Bus Order Duty', teacher: "Dolly Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' },

        { id: 'att_9', day: 'Wednesday', title: 'Main Gate & Arrival Supervision', teacher: "Manali Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_10', day: 'Wednesday', title: 'Assembly Rows & Prayer Check', teacher: "Priya Ma'am", location: 'Assembly Ground', time: '12:45 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_11', day: 'Wednesday', title: 'Recess & Corridor Monitoring', teacher: "Sakina Ma'am", location: 'Canteen & Water Area', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { id: 'att_12', day: 'Wednesday', title: 'Dispersal & Bus Order Duty', teacher: "Alpa Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' },

        { id: 'att_13', day: 'Thursday', title: 'Main Gate & Arrival Supervision', teacher: "Dolly Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_14', day: 'Thursday', title: 'Assembly Rows & Prayer Check', teacher: "Payal Ma'am", location: 'Assembly Ground', time: '12:45 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_15', day: 'Thursday', title: 'Recess & Corridor Monitoring', teacher: "Taniya Ma'am", location: 'Corridors & Hallways', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { id: 'att_16', day: 'Thursday', title: 'Dispersal & Bus Order Duty', teacher: "Manali Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' },

        { id: 'att_17', day: 'Friday', title: 'Main Gate & Arrival Supervision', teacher: "Alpa Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_18', day: 'Friday', title: 'Assembly Rows & Prayer Check', teacher: "Sakina Ma'am", location: 'Assembly Ground', time: '12:45 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_19', day: 'Friday', title: 'Recess & Corridor Monitoring', teacher: "Priya Ma'am", location: 'Corridors & Playground', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { id: 'att_20', day: 'Friday', title: 'Dispersal & Bus Order Duty', teacher: "Dolly Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' },

        { id: 'att_21', day: 'Saturday', title: 'Main Gate & Arrival Supervision', teacher: "Taniya Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_22', day: 'Saturday', title: 'Assembly Rows & Activity Check', teacher: "Payal Ma'am", location: 'Assembly Ground', time: '12:45 PM – 1:00 PM', status: 'Assigned' },
        { id: 'att_23', day: 'Saturday', title: 'Recess & Corridor Monitoring', teacher: "Alpa Ma'am", location: 'Corridors & Canteen', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { id: 'att_24', day: 'Saturday', title: 'Dispersal & Weekend Wrap-up', teacher: "Sakina Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' }
      ];
    }

    // Initialize Syllabus Records if missing
    if (!state.syllabusRecords || state.syllabusRecords.length === 0) {
      state.syllabusRecords = [
        { id: 'syl_1', standardId: 'std_3', standardName: 'Std 3rd', subject: 'English', teacher: "Payal Ma'am", totalChapters: 12, completedChapters: 9, progressPercent: 75, checkedTextbooks: 'All Checked', checkedClasswork: 'Verified' },
        { id: 'syl_2', standardId: 'std_4', standardName: 'Std 4th', subject: 'Maths', teacher: "Alpa Ma'am", totalChapters: 10, completedChapters: 8, progressPercent: 80, checkedTextbooks: 'All Checked', checkedClasswork: 'Verified' },
        { id: 'syl_3', standardId: 'std_5', standardName: 'Std 5th', subject: 'Gujarati', teacher: "Priya Ma'am", totalChapters: 14, completedChapters: 10, progressPercent: 71, checkedTextbooks: '14/16 Checked', checkedClasswork: 'Verified' },
        { id: 'syl_4', standardId: 'std_6', standardName: 'Std 6th', subject: 'Science', teacher: "Taniya Ma'am", totalChapters: 11, completedChapters: 8, progressPercent: 73, checkedTextbooks: 'All Checked', checkedClasswork: 'Verified' },
        { id: 'syl_5', standardId: 'std_7', standardName: 'Std 7th', subject: 'Social Science', teacher: "Sakina Ma'am", totalChapters: 15, completedChapters: 11, progressPercent: 73, checkedTextbooks: 'All Checked', checkedClasswork: 'Verified' },
        { id: 'syl_6', standardId: 'std_8', standardName: 'Std 8th', subject: 'Computer', teacher: "Manali Ma'am", totalChapters: 8, completedChapters: 7, progressPercent: 88, checkedTextbooks: 'All Checked', checkedClasswork: 'Verified' }
      ];
    }

    if (!state.selectedClassStd) {
      state.selectedClassStd = 'std_3';
    }
    if (!state.activeAttDutyDay) {
      state.activeAttDutyDay = 'all';
    }
    if (!state.activeAttDutyShift) {
      state.activeAttDutyShift = 'all';
    }
    if (!state.activeSyllabusStd) {
      state.activeSyllabusStd = 'all';
    }

    // Guarantee that if any browser has old demo placeholder cached, it upgrades to Funland DEFAULT_DATA
    if (!state.schoolProfile || !state.schoolProfile.name || state.schoolProfile.name.includes('Xavier')) {
      state.schoolProfile = JSON.parse(JSON.stringify(DEFAULT_DATA.schoolProfile));
      state.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules));
      state.weeklyDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialWeeklyDuties));
      state.generalDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialGeneralDuties));
      saveState(true);
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
      Object.keys(DEFAULT_DATA.teacherProfiles || {}).forEach(t => {
        if (!state.teacherProfiles[t]) {
          state.teacherProfiles[t] = Object.assign({}, DEFAULT_DATA.teacherProfiles[t]);
        } else if (!state.teacherProfiles[t].primarySubject) {
          state.teacherProfiles[t].primarySubject = DEFAULT_DATA.teacherProfiles[t].primarySubject;
        }
      });
    }

    // Ensure teacher profiles have assignedShift, workSchedule, and halfDayAvailability
    (state.teachers || []).forEach(t => {
      if (!state.teacherProfiles[t]) state.teacherProfiles[t] = {};
      if (!state.teacherProfiles[t].assignedShift) state.teacherProfiles[t].assignedShift = 'afternoon';
      if (!state.teacherProfiles[t].workSchedule) state.teacherProfiles[t].workSchedule = 'full_day';
      if (!state.teacherProfiles[t].halfDayAvailability) state.teacherProfiles[t].halfDayAvailability = 'all';
      if (!state.teacherProfiles[t].maxPeriods) state.teacherProfiles[t].maxPeriods = 5;
    });

    // Ensure periods are non-empty
    if (!state.periods || state.periods.length === 0) {
      state.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.periods || []));
    }

    // Ensure shifts structure exists
    if (!state.shifts) {
      state.shifts = {
        morning: {
          periods: JSON.parse(JSON.stringify(DEFAULT_DATA.morningPeriods || [])),
          schedules: {},
          duties: {},
          leaves: {},
          substitutions: {}
        },
        afternoon: {
          periods: JSON.parse(JSON.stringify(state.periods)),
          schedules: JSON.parse(JSON.stringify(state.schedules || {})),
          duties: JSON.parse(JSON.stringify(state.duties || {})),
          leaves: {},
          substitutions: {}
        }
      };
    } else {
      if (!state.shifts.morning) state.shifts.morning = {};
      if (!state.shifts.morning.periods || state.shifts.morning.periods.length === 0) {
        state.shifts.morning.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.morningPeriods || []));
      }
      if (!state.shifts.afternoon) state.shifts.afternoon = {};
      if (!state.shifts.afternoon.periods || state.shifts.afternoon.periods.length === 0) {
        state.shifts.afternoon.periods = JSON.parse(JSON.stringify(state.periods || DEFAULT_DATA.periods || []));
      }
    }

    // Ensure shiftSettings exists
    if (!state.shiftSettings) {
      state.shiftSettings = {
        morning: { label: 'Morning Shift', start: '07:30 AM', end: '12:15 PM', recess: '9:45 AM – 10:05 AM' },
        afternoon: { label: 'Afternoon Shift', start: '01:00 PM', end: '05:50 PM', recess: '3:15 PM – 3:45 PM' }
      };
    }

    if (!state.selectedTeacher && state.teachers.length > 0) {
      state.selectedTeacher = state.teachers[0];
    }
  }

  function resetToDefaults() {
    state.auth = {
      isAuthenticated: true,
      currentUser: {
        name: "Admin User",
        email: "admin@funland.edu",
        role: "Admin",
        avatar: "👑"
      }
    };
    state.currentShift = 'afternoon';
    state.shifts = {
      morning: {
        periods: JSON.parse(JSON.stringify(DEFAULT_DATA.morningPeriods || [])),
        schedules: {},
        duties: {},
        leaves: {},
        substitutions: {}
      },
      afternoon: {
        periods: JSON.parse(JSON.stringify(DEFAULT_DATA.periods)),
        schedules: JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules)),
        duties: JSON.parse(JSON.stringify(DEFAULT_DATA.initialDuties || {})),
        leaves: {},
        substitutions: {}
      }
    };
    state.activeView = 'dashboard-view';
    state.currentDay = 'Monday';
    state.schoolProfile = JSON.parse(JSON.stringify(DEFAULT_DATA.schoolProfile));
    state.standards = JSON.parse(JSON.stringify(DEFAULT_DATA.standards));
    state.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.periods));
    state.teachers = JSON.parse(JSON.stringify(DEFAULT_DATA.teachers));
    state.teacherProfiles = JSON.parse(JSON.stringify(DEFAULT_DATA.teacherProfiles || {}));
    state.subjects = JSON.parse(JSON.stringify(DEFAULT_DATA.subjects));
    state.subjectDetails = JSON.parse(JSON.stringify(DEFAULT_DATA.subjectDetails || {}));
    state.days = JSON.parse(JSON.stringify(DEFAULT_DATA.days));
    state.schedules = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSchedules));
    state.leaves = {};
    state.substitutions = {};
    state.dutyPresets = JSON.parse(JSON.stringify(DEFAULT_DATA.dutyPresets || []));
    state.duties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialDuties || {}));
    state.weeklyDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialWeeklyDuties || {}));
    state.excludedFreeTeachers = {};
    state.generalDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialGeneralDuties || []));
    state.classTeacherDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialClassTeacherDuties || []));
    state.attendanceDuties = JSON.parse(JSON.stringify(DEFAULT_DATA.initialAttendanceDuties || []));
    state.syllabusRecords = JSON.parse(JSON.stringify(DEFAULT_DATA.initialSyllabusRecords || []));
    state.selectedClassStd = 'std_3';
    state.activeAttDutyDay = 'all';
    state.activeAttDutyShift = 'all';
    state.activeSyllabusStd = 'all';
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            renderSchoolProfile();
            renderAll();
            showToast('Loaded latest timetable from Cloud Firestore', 'success');
          } else {
            // First time connection: upload current timetable to Cloud
            console.log('[Firebase Sync] Cloud empty. Seeding initial timetable to Firestore');
            window.FirebaseSync.save(state, { immediate: true });
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
      DOM.saveBadge.innerHTML = '<span class="dot"></span> Saved Locally (Cloud Offline)';
      DOM.saveBadge.title = details.message || 'Saved locally. Firestore cloud offline or not enabled.';
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

    const crestSrc = prof.crestBase64 || prof.logoBase64 || 'img/fems_crest.png';
    if (crestSrc) {
      DOM.headerSchoolLogo.src = crestSrc;
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

  // ==========================================================================
  // MODULE 1: AUTHENTICATION & MULTI-ROLE ACCESS CONTROL
  // ==========================================================================
  const DEMO_USERS = {
    Admin: {
      email: "admin@funland.edu",
      role: "Admin",
      name: "Admin User",
      avatar: "👑",
      roleLabel: "Administrator"
    },
    Principal: {
      email: "principal@funland.edu",
      role: "Principal",
      name: "Principal Sharma",
      avatar: "🎓",
      roleLabel: "Principal"
    },
    Teacher: {
      email: "priya@funland.edu",
      role: "Teacher",
      name: "Priya Ma'am",
      avatar: "👩‍🏫",
      roleLabel: "Faculty Member"
    },
    Staff: {
      email: "supervision@funland.edu",
      role: "Staff",
      name: "Office Staff",
      avatar: "📋",
      roleLabel: "Supervision Staff"
    }
  };

  function initAuth() {
    renderUserProfileBadge();

    // 1-Click Role switcher chips in login overlay
    if (DOM.authRoleChips) {
      DOM.authRoleChips.forEach(chip => {
        chip.addEventListener('click', () => {
          const role = chip.getAttribute('data-role');
          switchDemoRole(role);
        });
      });
    }

    if (DOM.btnAuthSubmit) {
      DOM.btnAuthSubmit.addEventListener('click', handleLogin);
    }
    if (DOM.btnLogout) {
      DOM.btnLogout.addEventListener('click', handleLogout);
    }
    if (DOM.headerUserBadge) {
      DOM.headerUserBadge.addEventListener('click', (e) => {
        if (e.target.closest('#btn-logout')) return;
        showLoginOverlay();
      });
    }
  }

  function renderUserProfileBadge() {
    const cur = (state.auth && state.auth.currentUser) || DEMO_USERS.Admin;
    if (DOM.headerUserAvatar) DOM.headerUserAvatar.textContent = cur.avatar || "👑";
    if (DOM.headerUserName) DOM.headerUserName.textContent = cur.name || "Admin User";
    if (DOM.headerUserRole) {
      DOM.headerUserRole.textContent = cur.role || "Administrator";
      DOM.headerUserRole.className = `user-role-tag role-${(cur.role || 'Admin').toLowerCase()}`;
    }
  }

  function switchDemoRole(role) {
    if (!DEMO_USERS[role]) return;
    const user = DEMO_USERS[role];
    if (DOM.authEmail) DOM.authEmail.value = user.email;
    if (DOM.authPassword) DOM.authPassword.value = "admin123";
    if (DOM.authRoleChips) {
      DOM.authRoleChips.forEach(c => c.classList.toggle('active', c.getAttribute('data-role') === role));
    }
    if (DOM.authErrorBanner) DOM.authErrorBanner.style.display = 'none';
  }

  function handleLogin() {
    const email = DOM.authEmail ? DOM.authEmail.value.trim().toLowerCase() : '';
    let matchedUser = null;

    for (const key of Object.keys(DEMO_USERS)) {
      if (DEMO_USERS[key].email.toLowerCase() === email) {
        matchedUser = DEMO_USERS[key];
        break;
      }
    }

    if (!matchedUser) {
      const activeChip = document.querySelector('.auth-role-chip.active');
      const role = activeChip ? activeChip.getAttribute('data-role') : 'Admin';
      matchedUser = DEMO_USERS[role] || DEMO_USERS.Admin;
    }

    state.auth = {
      isAuthenticated: true,
      currentUser: Object.assign({}, matchedUser)
    };

    saveState();
    renderUserProfileBadge();
    hideLoginOverlay();
    showToast(`Signed in as ${matchedUser.name} (${matchedUser.role})`, 'success');
  }

  function handleLogout() {
    showLoginOverlay();
    showToast('Select a demo profile or sign in to continue', 'info');
  }

  function showLoginOverlay() {
    if (DOM.authLoginOverlay) DOM.authLoginOverlay.classList.add('active');
  }

  function hideLoginOverlay() {
    if (DOM.authLoginOverlay) DOM.authLoginOverlay.classList.remove('active');
  }

  // ==========================================================================
  // MODULE 2: ACADEMIC SHIFT MANAGEMENT (MORNING VS AFTERNOON)
  // ==========================================================================
  function initShiftSelector() {
    if (DOM.btnShiftMorning) {
      DOM.btnShiftMorning.addEventListener('click', () => switchShift('morning'));
    }
    if (DOM.btnShiftAfternoon) {
      DOM.btnShiftAfternoon.addEventListener('click', () => switchShift('afternoon'));
    }
    updateShiftUI();
  }

  function switchShift(targetShift) {
    if (targetShift !== 'morning' && targetShift !== 'afternoon') return;
    if (state.currentShift === targetShift) return;

    // 1. Back up current shift's dynamic state
    if (!state.shifts) state.shifts = {};
    state.shifts[state.currentShift] = {
      periods: JSON.parse(JSON.stringify(state.periods)),
      schedules: JSON.parse(JSON.stringify(state.schedules)),
      duties: JSON.parse(JSON.stringify(state.duties || {})),
      leaves: JSON.parse(JSON.stringify(state.leaves || {})),
      substitutions: JSON.parse(JSON.stringify(state.substitutions || {}))
    };

    // 2. Set new shift
    state.currentShift = targetShift;

    // 3. Mount target shift
    if (!state.shifts[targetShift]) {
      state.shifts[targetShift] = {
        periods: targetShift === 'morning' 
          ? JSON.parse(JSON.stringify(DEFAULT_DATA.morningPeriods || []))
          : JSON.parse(JSON.stringify(DEFAULT_DATA.periods)),
        schedules: {},
        duties: {},
        leaves: {},
        substitutions: {}
      };
    }

    const next = state.shifts[targetShift];
    state.periods = JSON.parse(JSON.stringify(next.periods || (targetShift === 'morning' ? DEFAULT_DATA.morningPeriods : DEFAULT_DATA.periods)));
    state.schedules = JSON.parse(JSON.stringify(next.schedules || {}));
    state.duties = JSON.parse(JSON.stringify(next.duties || {}));
    state.leaves = JSON.parse(JSON.stringify(next.leaves || {}));
    state.substitutions = JSON.parse(JSON.stringify(next.substitutions || {}));

    updateShiftUI();
    saveState();
    renderAll();

    const label = targetShift === 'morning' ? 'Morning Shift (7:30 AM – 12:15 PM)' : 'Afternoon Shift (1:00 PM – 5:50 PM)';
    showToast(`Switched to ${label}`, 'info');
  }

  function updateShiftUI() {
    const isMorning = state.currentShift === 'morning';
    if (DOM.btnShiftMorning) DOM.btnShiftMorning.classList.toggle('active', isMorning);
    if (DOM.btnShiftAfternoon) DOM.btnShiftAfternoon.classList.toggle('active', !isMorning);
    const btnHeroM = document.getElementById('dash-btn-shift-morning');
    const btnHeroA = document.getElementById('dash-btn-shift-afternoon');
    if (btnHeroM) btnHeroM.classList.toggle('active', isMorning);
    if (btnHeroA) btnHeroA.classList.toggle('active', !isMorning);
  }

  function getActiveStandards(shift = state.currentShift) {
    const list = state.standards || [];
    const filtered = list.filter(s => (s.shift || 'afternoon') === shift);
    return filtered.length > 0 ? filtered : list;
  }

  function getStandardsForShift(shift) {
    const list = state.standards || [];
    return list.filter(s => (s.shift || 'afternoon') === shift);
  }

  // ==========================================================================
  // MODULE 3: EXECUTIVE SCHOOL MANAGEMENT DASHBOARD (REBUILT FROM SCRATCH)
  // ==========================================================================
  function renderDashboard() {
    // 1. Live Date in Hero
    const dateStrEl = document.getElementById('dash-live-date-str');
    if (dateStrEl) {
      const now = new Date();
      dateStrEl.textContent = `${state.currentDay}, ${now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }

    // Synchronize Shift Switcher buttons in Dashboard Hero
    const btnHeroM = document.getElementById('dash-btn-shift-morning');
    const btnHeroA = document.getElementById('dash-btn-shift-afternoon');
    const isMorning = state.currentShift === 'morning';
    if (btnHeroM) {
      btnHeroM.classList.toggle('active', isMorning);
      btnHeroM.onclick = () => switchShift('morning');
    }
    if (btnHeroA) {
      btnHeroA.classList.toggle('active', !isMorning);
      btnHeroA.onclick = () => switchShift('afternoon');
    }

    // Direct dashboard link buttons
    const btnDashSettings = document.getElementById('dash-btn-master-settings');
    if (btnDashSettings) {
      btnDashSettings.onclick = () => {
        switchView('settings-view');
        switchSettingsTab('tab-standards');
      };
    }

    // KPI 1: Active Shift Card
    const kpiShiftTag = document.getElementById('dash-kpi-shift-tag');
    const kpiShiftName = document.getElementById('dash-kpi-shift-name');
    const kpiShiftTime = document.getElementById('dash-kpi-shift-time');
    const kpiShiftStatus = document.getElementById('dash-kpi-shift-status');
    if (kpiShiftTag) kpiShiftTag.textContent = isMorning ? '☀️ ACTIVE SHIFT' : '🌙 ACTIVE SHIFT';
    if (kpiShiftName) kpiShiftName.textContent = isMorning ? 'Morning Shift' : 'Afternoon Shift';
    if (kpiShiftTime) kpiShiftTime.textContent = isMorning ? '7:30 AM – 12:15 PM • 6 Periods' : '1:00 PM – 5:50 PM • 6 Lectures';
    if (kpiShiftStatus) kpiShiftStatus.textContent = '● Operating on Schedule';

    // KPI 2: Active Standards Card
    const activeStds = getActiveStandards();
    const kpiClassesCount = document.getElementById('dash-kpi-classes-count');
    const kpiClassesSub = document.getElementById('dash-kpi-classes-sub');
    const kpiClassesStatus = document.getElementById('dash-kpi-classes-status');
    if (kpiClassesCount) kpiClassesCount.textContent = `${activeStds.length} Standards`;
    if (kpiClassesSub) {
      if (activeStds.length > 1) {
        const firstName = activeStds[0].name.replace('Standard: ', 'Std ');
        const lastName = activeStds[activeStds.length - 1].name.replace('Standard: ', 'Std ');
        kpiClassesSub.textContent = `${firstName} to ${lastName} • ${activeStds.length} Classrooms`;
      } else if (activeStds.length === 1) {
        kpiClassesSub.textContent = `${activeStds[0].name} (${activeStds[0].room || 'Classroom'})`;
      } else {
        kpiClassesSub.textContent = 'No classes configured for shift';
      }
    }
    if (kpiClassesStatus) kpiClassesStatus.textContent = `● 100% Classrooms Assigned`;

    // KPI 3: Faculty Card
    const teachersList = state.teachers || [];
    const dayLeaves = (state.leaves && state.leaves[state.currentDay]) || [];
    const activeTeachersCount = teachersList.length - dayLeaves.length;
    const kpiFacCount = document.getElementById('dash-kpi-faculty-count');
    const kpiFacSub = document.getElementById('dash-kpi-faculty-sub');
    const kpiFacStatus = document.getElementById('dash-kpi-faculty-status');
    if (kpiFacCount) kpiFacCount.textContent = `${teachersList.length} Teachers`;
    if (kpiFacSub) kpiFacSub.textContent = `${activeTeachersCount} Active on Duty • ${dayLeaves.length} on Leave`;
    if (kpiFacStatus) {
      if (dayLeaves.length === 0) {
        kpiFacStatus.textContent = '● Full Faculty Attendance';
        kpiFacStatus.className = 'dash-kpi-status status-good';
      } else {
        kpiFacStatus.textContent = `⚠️ ${dayLeaves.length} Substitute(s) Needed`;
        kpiFacStatus.className = 'dash-kpi-status status-warn';
      }
    }

    // KPI 4: Syllabus Progress Card
    const avgSyllabusProgress = computeAverageSyllabusProgress();
    const kpiSylVal = document.getElementById('dash-kpi-syllabus-val');
    const kpiSylFill = document.getElementById('dash-kpi-syl-fill');
    const kpiSylSub = document.getElementById('dash-kpi-syl-sub');
    if (kpiSylVal) kpiSylVal.textContent = `${avgSyllabusProgress}% Complete`;
    if (kpiSylFill) kpiSylFill.style.width = `${avgSyllabusProgress}%`;
    if (kpiSylSub) kpiSylSub.textContent = `Term 1 Curriculum on Track`;

    // Centerpiece: Render Today's Live Class Timetable Matrix
    renderDashboardLiveTimetable(activeStds);

    // Dual Operational Columns:
    // Left: Campus Supervision Roster
    renderDashboardDutyRoster();

    // Right: Free Faculty & Substitutions per Period
    renderDashboardFreeFacultyRoster();
  }

  function renderDashboardLiveTimetable(activeStds) {
    const dayNameEl = document.getElementById('dash-schedule-day-name');
    if (dayNameEl) dayNameEl.textContent = state.currentDay;

    const thead = document.getElementById('dash-today-matrix-thead');
    const tbody = document.getElementById('dash-today-matrix-tbody');
    if (!thead || !tbody) return;

    // Table Header
    let theadHtml = `<tr><th style="width: 140px; text-align: left;">PERIOD / TIME</th>`;
    activeStds.forEach(std => {
      const shortName = std.name.replace('Standard: ', 'Std ');
      const roomStr = std.room ? `<span class="dash-th-room">${escapeHtml(std.room)}</span>` : '';
      theadHtml += `<th style="text-align: center;">${escapeHtml(shortName)}${roomStr}</th>`;
    });
    theadHtml += `</tr>`;
    thead.innerHTML = theadHtml;

    // Table Body
    const dayData = (state.schedules && state.schedules[state.currentDay]) || {};
    let tbodyHtml = '';

    (state.periods || []).forEach((p, pIdx) => {
      if (pIdx === 3) {
        tbodyHtml += `
          <tr class="dash-recess-row">
            <td colspan="${activeStds.length + 1}">
              ☕ RECESS BREAK • ${state.currentShift === 'morning' ? '9:45 AM TO 10:05 AM (20 MINUTES)' : '3:15 PM TO 3:45 PM (30 MINUTES)'}
            </td>
          </tr>`;
      }

      const pSlots = dayData[p.id] || {};
      tbodyHtml += `<tr>
        <td class="dash-td-period">
          <div class="dash-period-num">${escapeHtml(p.label || ('Lecture ' + (pIdx + 1)))}</div>
          <div class="dash-period-time">${escapeHtml(p.time || '')}</div>
        </td>`;

      activeStds.forEach(std => {
        const slot = pSlots[std.id];
        if (slot && (slot.subject || slot.teacher)) {
          const sub = slot.subject || 'Class';
          const tea = slot.teacher || 'Unassigned';
          tbodyHtml += `
            <td class="dash-td-cell">
              <div class="dash-cell-subject">${escapeHtml(sub)}</div>
              <div class="dash-cell-teacher">${escapeHtml(tea)}</div>
            </td>`;
        } else {
          tbodyHtml += `
            <td class="dash-td-cell dash-td-empty">
              <span class="dash-empty-dot">-</span>
            </td>`;
        }
      });

      tbodyHtml += `</tr>`;
    });

    tbody.innerHTML = tbodyHtml;
  }

  function renderDashboardDutyRoster() {
    const container = document.getElementById('dash-today-duty-roster');
    if (!container) return;

    let duties = (state.attendanceDuties || []).filter(d => d.day === state.currentDay);
    if (duties.length < 4) {
      const defaults = [
        { title: 'Main Gate & Arrival Supervision', teacher: "Sakina Ma'am", location: 'Main Entrance Gate', time: '12:30 PM – 1:00 PM', status: 'Completed' },
        { title: 'Assembly Rows & Prayer Check', teacher: "Alpa Ma'am", location: 'Assembly Ground', time: '12:45 PM – 1:00 PM', status: 'In Progress' },
        { title: 'Recess & Corridor Monitoring', teacher: "Manali Ma'am", location: 'Corridors & Canteen', time: '3:15 PM – 3:45 PM', status: 'Assigned' },
        { title: 'Dispersal & Bus Order Duty', teacher: "Payal Ma'am", location: 'School Main Gate', time: '5:50 PM – 6:15 PM', status: 'Assigned' }
      ];
      duties = [...duties, ...defaults.slice(duties.length)];
    }

    let html = '';
    duties.slice(0, 4).forEach(d => {
      const statusClass = (d.status || 'Assigned').toLowerCase().replace(/\s+/g, '-');
      html += `
        <div class="dash-duty-card">
          <div class="dash-duty-left">
            <div class="dash-duty-title">${escapeHtml(d.title)}</div>
            <div class="dash-duty-teacher">👤 <strong>${escapeHtml(d.teacher)}</strong></div>
            <div class="dash-duty-meta">📍 ${escapeHtml(d.location || 'School Campus')} • ⏰ ${escapeHtml(d.time || 'Shift Hours')}</div>
          </div>
          <span class="dash-duty-badge status-${statusClass}">${escapeHtml(d.status || 'Assigned')}</span>
        </div>`;
    });

    container.innerHTML = html;
  }

  function renderDashboardFreeFacultyRoster() {
    const container = document.getElementById('dash-period-free-roster');
    if (!container) return;

    const dayData = (state.schedules && state.schedules[state.currentDay]) || {};
    const dayLeaves = (state.leaves && state.leaves[state.currentDay]) || [];
    const activeTeachers = (state.teachers || []).filter(t => !dayLeaves.includes(t));

    let html = '';
    (state.periods || []).forEach((p, pIdx) => {
      const pSlots = dayData[p.id] || {};
      const busyTeachers = new Set();
      Object.values(pSlots).forEach(slot => {
        if (slot && slot.teacher && slot.teacher.trim()) {
          busyTeachers.add(slot.teacher.trim());
        }
      });

      const freeTeachers = activeTeachers.filter(t => !busyTeachers.has(t));
      const pLabel = p.label || `Lecture ${pIdx + 1}`;
      const pTime = p.time || '';

      html += `
        <div class="dash-free-period-row">
          <div class="dash-free-period-info">
            <span class="dash-free-period-num">${escapeHtml(pLabel)}</span>
            <span class="dash-free-period-time">${escapeHtml(pTime)}</span>
          </div>
          <div class="dash-free-teachers-wrap">`;

      if (freeTeachers.length > 0) {
        freeTeachers.forEach(t => {
          html += `<span class="dash-teacher-pill">${escapeHtml(t)}</span>`;
        });
      } else {
        html += `<span class="dash-no-free-text">All Faculty Engaged in Teaching</span>`;
      }

      html += `
          </div>
          <span class="dash-free-count-badge">${freeTeachers.length} Available</span>
        </div>`;
    });

    container.innerHTML = html;
  }

  function computeTotalScheduledPeriods() {
    let count = 0;
    Object.keys(state.schedules || {}).forEach(day => {
      const dSlots = state.schedules[day] || {};
      Object.keys(dSlots).forEach(pId => {
        const pMap = dSlots[pId] || {};
        Object.keys(pMap).forEach(sId => {
          if (pMap[sId] && pMap[sId].subject && pMap[sId].teacher) count++;
        });
      });
    });
    return count;
  }

  function computeAverageSyllabusProgress() {
    const list = state.syllabusRecords || [];
    if (list.length === 0) return 75;
    const sum = list.reduce((acc, r) => acc + (parseInt(r.progressPercent, 10) || 0), 0);
    return Math.round(sum / list.length);
  }

  // ==========================================================================
  // MODULE 4: DEDICATED CLASS-WISE TIMETABLE
  // ==========================================================================
  function renderClassTimetable() {
    renderClassStdPills();
    renderClassMetaBanner();
    renderClassMatrixTable();
  }

  function renderClassStdPills() {
    if (!DOM.classTtStdPills) return;
    DOM.classTtStdPills.innerHTML = '';
    const activeStds = getActiveStandards();

    if (!activeStds.some(s => s.id === state.selectedClassStd)) {
      state.selectedClassStd = activeStds[0] ? activeStds[0].id : 'std_3';
    }

    activeStds.forEach(std => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `class-std-btn ${std.id === state.selectedClassStd ? 'active' : ''}`;
      btn.textContent = std.name.replace('Standard: ', 'Std ');
      btn.addEventListener('click', () => {
        state.selectedClassStd = std.id;
        renderClassTimetable();
      });
      DOM.classTtStdPills.appendChild(btn);
    });
  }

  function renderClassMetaBanner() {
    const curStd = (state.standards || []).find(s => s.id === state.selectedClassStd) || { id: 'std_3', name: 'Standard: 3rd' };
    const ctDuty = (state.classTeacherDuties || []).find(c => c.standardId === curStd.id) || {};

    if (DOM.classMetaTitle) DOM.classMetaTitle.textContent = curStd.name;
    if (DOM.classMetaTeacher) DOM.classMetaTeacher.textContent = ctDuty.teacher ? `${ctDuty.teacher} (${ctDuty.subject || 'Faculty'})` : 'Not Designated';
    if (DOM.classMetaRoom) DOM.classMetaRoom.textContent = ctDuty.room || 'Room 101 • Primary Wing';
    if (DOM.classMetaShift) {
      DOM.classMetaShift.textContent = state.currentShift === 'morning' ? 'Morning Shift (7:30 AM – 12:15 PM)' : 'Afternoon Shift (1:00 PM – 5:50 PM)';
    }
  }

  function renderClassMatrixTable() {
    if (!DOM.classTtThead || !DOM.classTtTbody) return;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let theadHtml = `<tr><th style="width: 140px;">PERIOD / TIME</th>`;
    days.forEach(d => {
      theadHtml += `<th style="width: 190px; text-align: center;">${escapeHtml(d)}</th>`;
    });
    theadHtml += `</tr>`;
    DOM.classTtThead.innerHTML = theadHtml;

    let tbodyHtml = '';
    (state.periods || []).forEach((period, pIdx) => {
      if ((state.currentShift === 'afternoon' && pIdx === 3) || (state.currentShift === 'morning' && pIdx === 3)) {
        tbodyHtml += `
          <tr class="recess-break-row" style="background: #f8fafc;">
            <td colspan="6" style="text-align: center; font-weight: 700; color: var(--text-muted); font-size: 11.5px; padding: 6px;">
              RECESS BREAK (30 MINUTES)
            </td>
          </tr>`;
      }

      tbodyHtml += `<tr>`;
      tbodyHtml += `
        <td style="font-weight: 700; background: #f8fafc;">
          <div>${escapeHtml(period.label)}</div>
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">${escapeHtml(period.time)}</div>
        </td>`;

      days.forEach(day => {
        const dSched = (state.schedules || {})[day] || {};
        const pSlots = dSched[period.id] || {};
        const slot = pSlots[state.selectedClassStd] || {};

        tbodyHtml += `<td style="padding: 4px;">`;
        if (slot.subject && slot.teacher) {
          const colorClass = getSubjectColorClass(slot.subject);
          tbodyHtml += `
            <div class="class-tt-cell-box" onclick="openClassCellModal('${day}', '${period.id}', '${state.selectedClassStd}')">
              <span class="class-tt-subject-badge ${colorClass}">${escapeHtml(slot.subject)}</span>
              <span class="class-tt-teacher-label">${escapeHtml(slot.teacher)}</span>
            </div>`;
        } else {
          tbodyHtml += `
            <div class="class-tt-cell-box" onclick="openClassCellModal('${day}', '${period.id}', '${state.selectedClassStd}')">
              <span class="class-tt-empty-slot">+ Assign Period</span>
            </div>`;
        }
        tbodyHtml += `</td>`;
      });

      tbodyHtml += `</tr>`;
    });

    DOM.classTtTbody.innerHTML = tbodyHtml;
  }

  function getSubjectColorClass(subject) {
    const s = (subject || '').toLowerCase();
    if (s.includes('math')) return 'bg-blue';
    if (s.includes('eng')) return 'bg-purple';
    if (s.includes('sci') || s.includes('evs')) return 'bg-emerald';
    if (s.includes('hin') || s.includes('guj')) return 'bg-amber';
    if (s.includes('comp')) return 'bg-indigo';
    return 'bg-blue';
  }

  window.openClassCellModal = function(day, periodId, stdId) {
    if (!DOM.classCellModal) return;

    DOM.classCellDay.value = day;
    DOM.classCellPeriodId.value = periodId;
    DOM.classCellStdId.value = stdId;

    const std = (state.standards || []).find(s => s.id === stdId) || { name: stdId };
    const period = (state.periods || []).find(p => p.id === periodId) || { label: periodId, time: '' };
    DOM.classCellModalTitle.innerHTML = `Edit Period: <strong>${escapeHtml(period.label)} (${escapeHtml(period.time)})</strong> • <span>${escapeHtml(std.name)}</span> (${day})`;

    // Populate Subjects
    DOM.classCellSubject.innerHTML = `<option value="">-- Select Subject --</option>`;
    (state.subjects || []).forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      DOM.classCellSubject.appendChild(opt);
    });
    const addSubOpt = document.createElement('option');
    addSubOpt.value = '__NEW_SUBJECT__';
    addSubOpt.textContent = '➕ + Add New Subject...';
    addSubOpt.style.fontWeight = '700';
    addSubOpt.style.color = '#2563eb';
    DOM.classCellSubject.appendChild(addSubOpt);

    DOM.classCellSubject.onchange = function() {
      if (this.value === '__NEW_SUBJECT__') {
        openQuickAddModal('subject', this);
      }
    };

    // Populate Teachers with Shift and Half-Day indicators
    DOM.classCellTeacher.innerHTML = `<option value="">-- Select Faculty --</option>`;
    (state.teachers || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      const prof = (state.teacherProfiles || {})[t] || {};
      let badge = '';
      if (prof.workSchedule === 'half_day') {
        const halfLabel = prof.halfDayAvailability === 'second_half' ? 'P4–6' : 'P1–3';
        badge = ` (Half Day: ${halfLabel})`;
      } else if (prof.assignedShift && prof.assignedShift !== state.currentShift && prof.assignedShift !== 'both') {
        badge = ` (${prof.assignedShift} shift)`;
      }
      opt.textContent = t + badge;
      DOM.classCellTeacher.appendChild(opt);
    });
    const addTeacherOpt = document.createElement('option');
    addTeacherOpt.value = '__NEW_TEACHER__';
    addTeacherOpt.textContent = '➕ + Add New Teacher...';
    addTeacherOpt.style.fontWeight = '700';
    addTeacherOpt.style.color = '#2563eb';
    DOM.classCellTeacher.appendChild(addTeacherOpt);

    const dSched = (state.schedules || {})[day] || {};
    const pSlots = dSched[periodId] || {};
    const slot = pSlots[stdId] || {};

    DOM.classCellSubject.value = slot.subject || '';
    DOM.classCellTeacher.value = slot.teacher || '';

    // Check conflict initially
    checkClassCellConflict();
    DOM.classCellTeacher.onchange = function() {
      if (this.value === '__NEW_TEACHER__') {
        openQuickAddModal('teacher', this);
      } else {
        checkClassCellConflict();
      }
    };

    DOM.classCellModal.classList.add('active');
  };

  function checkClassCellConflict() {
    const day = DOM.classCellDay.value;
    const periodId = DOM.classCellPeriodId.value;
    const stdId = DOM.classCellStdId.value;
    const teacher = DOM.classCellTeacher.value;

    if (!teacher) {
      if (DOM.classCellConflictAlert) DOM.classCellConflictAlert.style.display = 'none';
      return;
    }

    const prof = (state.teacherProfiles || {})[teacher] || {};
    let conflictWarning = null;

    // 1. Shift Policy Conflict
    const teacherShift = prof.assignedShift || 'afternoon';
    if (teacherShift !== 'both' && teacherShift !== state.currentShift) {
      conflictWarning = `<strong>⚠️ Shift Policy Notice:</strong> ${escapeHtml(teacher)} is assigned to <em>${teacherShift.toUpperCase()} Shift</em> in Settings. Current active timetable is <em>${state.currentShift.toUpperCase()} Shift</em>.`;
    }

    // 2. Half-Day Schedule Conflict
    if (!conflictWarning && prof.workSchedule === 'half_day') {
      const pObj = (state.periods || []).find(p => p.id === periodId);
      const pNum = pObj ? (pObj.number || parseInt(periodId.replace(/\D/g, ''), 10)) : 1;
      const availability = prof.halfDayAvailability || 'first_half';
      if (availability === 'first_half' && pNum > 3) {
        conflictWarning = `<strong>⚠️ Half-Day Schedule Conflict:</strong> ${escapeHtml(teacher)} is scheduled for <em>Half-Day (First Half: Periods 1–3 only)</em>. Cannot teach in Period ${pNum}.`;
      } else if (availability === 'second_half' && pNum <= 3) {
        conflictWarning = `<strong>⚠️ Half-Day Schedule Conflict:</strong> ${escapeHtml(teacher)} is scheduled for <em>Half-Day (Second Half: Periods 4–6 only)</em>. Cannot teach in Period ${pNum}.`;
      }
    }

    // 3. Double Booking Conflict
    if (!conflictWarning) {
      const dSched = (state.schedules || {})[day] || {};
      const pSlots = dSched[periodId] || {};
      let conflictStd = null;

      Object.keys(pSlots).forEach(sId => {
        if (sId !== stdId && pSlots[sId] && pSlots[sId].teacher === teacher) {
          const foundStd = (state.standards || []).find(s => s.id === sId);
          conflictStd = foundStd ? foundStd.name : sId;
        }
      });

      if (conflictStd) {
        conflictWarning = `<strong>⚠️ Conflict Detected:</strong> ${escapeHtml(teacher)} is already booked in <strong>${escapeHtml(conflictStd)}</strong> during this period.`;
      }
    }

    if (conflictWarning) {
      if (DOM.classCellConflictAlert) {
        DOM.classCellConflictAlert.style.display = 'flex';
        DOM.classCellConflictMsg.innerHTML = conflictWarning;
      }
    } else {
      if (DOM.classCellConflictAlert) DOM.classCellConflictAlert.style.display = 'none';
    }
  }

  function saveClassCell() {
    const day = DOM.classCellDay.value;
    const periodId = DOM.classCellPeriodId.value;
    const stdId = DOM.classCellStdId.value;
    const subject = DOM.classCellSubject.value.trim();
    const teacher = DOM.classCellTeacher.value.trim();

    if (!state.schedules[day]) state.schedules[day] = {};
    if (!state.schedules[day][periodId]) state.schedules[day][periodId] = {};

    state.schedules[day][periodId][stdId] = { subject, teacher };
    saveState();
    renderClassTimetable();
    renderClassTable();
    DOM.classCellModal.classList.remove('active');
    showToast('Class period updated successfully', 'success');
  }

  function clearClassCell() {
    const day = DOM.classCellDay.value;
    const periodId = DOM.classCellPeriodId.value;
    const stdId = DOM.classCellStdId.value;

    if (state.schedules[day] && state.schedules[day][periodId] && state.schedules[day][periodId][stdId]) {
      delete state.schedules[day][periodId][stdId];
      saveState();
      renderClassTimetable();
      renderClassTable();
    }
    DOM.classCellModal.classList.remove('active');
    showToast('Period slot cleared', 'info');
  }

  async function downloadSelectedClassDocx() {
    if (typeof DocxGenerator === 'undefined') {
      showToast('Document generator not loaded', 'error');
      return;
    }
    try {
      showToast('Generating Word timetable document...', 'info');
      const blob = await DocxGenerator.generateClassTimetableDocxBlob(state, state.selectedClassStd);
      const std = (state.standards || []).find(s => s.id === state.selectedClassStd);
      const filename = `${(std ? std.name : state.selectedClassStd).replace(/[^a-zA-Z0-9]/g, '_')}_Timetable.docx`;
      DocxGenerator.triggerDownload(blob, filename);
      showToast('Document downloaded successfully', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to generate Word document: ' + e.message, 'error');
    }
  }

  // ==========================================================================
  // MODULE 5: ATTENDANCE DUTY MANAGEMENT
  // ==========================================================================
  function renderAttendanceDutyView() {
    if (DOM.attDutyDayTabs) {
      DOM.attDutyDayTabs.querySelectorAll('.day-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-day') === state.activeAttDutyDay);
        btn.onclick = () => {
          state.activeAttDutyDay = btn.getAttribute('data-day');
          renderAttendanceDutyView();
        };
      });
    }

    if (DOM.attDutyFilterShift) {
      DOM.attDutyFilterShift.value = state.activeAttDutyShift;
      DOM.attDutyFilterShift.onchange = () => {
        state.activeAttDutyShift = DOM.attDutyFilterShift.value;
        renderAttendanceDutyView();
      };
    }

    if (!DOM.attendanceDutyTbody) return;

    let duties = state.attendanceDuties || [];
    if (state.activeAttDutyDay !== 'all') {
      duties = duties.filter(d => d.day === state.activeAttDutyDay);
    }
    if (state.activeAttDutyShift !== 'all') {
      duties = duties.filter(d => d.shift.toLowerCase() === state.activeAttDutyShift.toLowerCase());
    }

    if (duties.length === 0) {
      DOM.attendanceDutyTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No attendance duties match the selected filter. Click "+ Assign Attendance Duty" to create one.
          </td>
        </tr>`;
      return;
    }

    let tbodyHtml = '';
    duties.forEach(d => {
      tbodyHtml += `
        <tr>
          <td style="font-weight: 700; color: var(--primary-navy);">${escapeHtml(d.day)}</td>
          <td><span class="panel-badge">${escapeHtml(d.shift)}</span></td>
          <td style="font-weight: 600;">${escapeHtml(d.title)}</td>
          <td style="font-weight: 600; color: var(--text-primary);">${escapeHtml(d.teacher)}</td>
          <td>${escapeHtml(d.location)}</td>
          <td style="color: var(--text-muted);">${escapeHtml(d.time)}</td>
          <td><span class="duty-status-badge status-${(d.status || 'assigned').toLowerCase()}">${escapeHtml(d.status || 'Assigned')}</span></td>
          <td style="text-align: center;">
            <button class="btn-duty-action" onclick="openEditAttendanceDutyModal('${d.id}')" title="Edit Assignment">
              ✏️
            </button>
            <button class="btn-duty-action delete" onclick="deleteAttendanceDuty('${d.id}')" title="Delete Assignment">
              🗑️
            </button>
          </td>
        </tr>`;
    });

    DOM.attendanceDutyTbody.innerHTML = tbodyHtml;
  }

  window.openEditAttendanceDutyModal = function(id) {
    const item = (state.attendanceDuties || []).find(d => d.id === id);
    if (!item) return;

    DOM.attInputEditId.value = item.id;
    DOM.attInputDay.value = item.day || 'Monday';
    DOM.attInputShift.value = item.shift || 'Afternoon';
    DOM.attInputDuty.value = item.title || '';
    DOM.attInputLocation.value = item.location || '';
    DOM.attInputTiming.value = item.time || '';
    DOM.attInputStatus.value = item.status || 'Assigned';

    // Populate teachers
    DOM.attInputTeacher.innerHTML = '';
    (state.teachers || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      DOM.attInputTeacher.appendChild(opt);
    });
    DOM.attInputTeacher.value = item.teacher || '';

    DOM.attModalTitle.textContent = 'Edit Attendance Duty Assignment';
    DOM.btnDeleteAttDuty.style.display = 'inline-flex';
    DOM.attendanceDutyModal.classList.add('active');
  };

  function openAddAttendanceDutyModal() {
    DOM.attInputEditId.value = '';
    DOM.attInputDuty.value = '';
    DOM.attInputLocation.value = 'Main Entrance Gate';
    DOM.attInputTiming.value = '12:30 PM - 1:00 PM';
    DOM.attInputStatus.value = 'Assigned';

    DOM.attInputTeacher.innerHTML = '';
    (state.teachers || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      DOM.attInputTeacher.appendChild(opt);
    });

    DOM.attModalTitle.textContent = 'Assign Attendance Duty';
    DOM.btnDeleteAttDuty.style.display = 'none';
    DOM.attendanceDutyModal.classList.add('active');
  }

  function saveAttendanceDuty() {
    const editId = DOM.attInputEditId.value;
    const day = DOM.attInputDay.value;
    const shift = DOM.attInputShift.value;
    const title = DOM.attInputDuty.value.trim();
    const teacher = DOM.attInputTeacher.value;
    const location = DOM.attInputLocation.value.trim();
    const time = DOM.attInputTiming.value.trim();
    const status = DOM.attInputStatus.value;

    if (!title || !teacher) {
      showToast('Please enter a duty title and select a teacher', 'error');
      return;
    }

    if (!state.attendanceDuties) state.attendanceDuties = [];

    if (editId) {
      const idx = state.attendanceDuties.findIndex(d => d.id === editId);
      if (idx > -1) {
        state.attendanceDuties[idx] = { id: editId, day, shift, title, teacher, location, time, status };
      }
    } else {
      const newId = 'att_' + Date.now();
      state.attendanceDuties.push({ id: newId, day, shift, title, teacher, location, time, status });
    }

    saveState();
    renderAttendanceDutyView();
    renderDashboard();
    DOM.attendanceDutyModal.classList.remove('active');
    showToast('Attendance duty saved successfully', 'success');
  }

  window.deleteAttendanceDuty = function(id) {
    if (!confirm('Are you sure you want to remove this attendance duty?')) return;
    state.attendanceDuties = (state.attendanceDuties || []).filter(d => d.id !== id);
    saveState();
    renderAttendanceDutyView();
    renderDashboard();
    showToast('Attendance duty removed', 'info');
  };

  // ==========================================================================
  // MODULE 6: CLASS TEACHER DUTY ALLOCATION & CONFLICT GUARDS
  // ==========================================================================
  function renderClassTeacherDutyView() {
    renderClassTeacherCards();
    renderClassTeacherTable();
  }

  function renderClassTeacherCards() {
    if (!DOM.classTeacherCardsContainer) return;

    // Detect duplicate teacher assignments
    const teacherCounts = {};
    (state.classTeacherDuties || []).forEach(d => {
      if (d.teacher) {
        teacherCounts[d.teacher] = (teacherCounts[d.teacher] || 0) + 1;
      }
    });

    let html = '';
    (state.standards || []).forEach(std => {
      const ctDuty = (state.classTeacherDuties || []).find(c => c.standardId === std.id) || {};
      const hasDuplicate = ctDuty.teacher && teacherCounts[ctDuty.teacher] > 1;

      html += `
        <div class="ct-card" style="${hasDuplicate ? 'border-color: #f87171; background: #fffbfb;' : ''}">
          <div class="ct-card-header">
            <span class="ct-std-badge">${escapeHtml(std.name)}</span>
            <span class="panel-badge">${ctDuty.shift === 'morning' ? '☀️ Morning' : '🌙 Afternoon'}</span>
          </div>

          ${hasDuplicate ? `
            <div class="ct-conflict-banner" style="margin-bottom: 10px;">
              <span>⚠️ Duplicate Duty: ${escapeHtml(ctDuty.teacher)} is assigned to multiple classes!</span>
            </div>` : ''}

          <div class="ct-card-body">
            <div class="ct-avatar">👩‍🏫</div>
            <div class="ct-info-col">
              <h4>${escapeHtml(ctDuty.teacher || 'Not Assigned')}</h4>
              <p>${escapeHtml(ctDuty.subject ? ctDuty.subject + ' Faculty' : 'Class Teacher')}</p>
              <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px;">
                📍 ${escapeHtml(ctDuty.room || 'Room Assigned')} | 📞 ${escapeHtml(ctDuty.contact || '+91 98250 11223')}
              </div>
            </div>
          </div>

          <div class="ct-card-footer">
            <span style="font-size: 11.5px; font-weight: 600; color: var(--text-muted);">Session 2026–2027</span>
            <button class="btn btn-secondary btn-sm" onclick="openClassTeacherModal('${std.id}')">
              ${ctDuty.teacher ? 'Reassign' : '+ Assign'}
            </button>
          </div>
        </div>`;
    });

    DOM.classTeacherCardsContainer.innerHTML = html;
  }

  function renderClassTeacherTable() {
    if (!DOM.classTeacherTableTbody) return;

    let assignedCount = 0;
    let tbodyHtml = '';

    (state.standards || []).forEach(std => {
      const ctDuty = (state.classTeacherDuties || []).find(c => c.standardId === std.id) || {};
      if (ctDuty.teacher) assignedCount++;

      tbodyHtml += `
        <tr>
          <td style="font-weight: 700; color: var(--primary-navy);">${escapeHtml(std.name)}</td>
          <td style="font-weight: 700;">${escapeHtml(ctDuty.teacher || '—')}</td>
          <td>${escapeHtml(ctDuty.subject || 'Core Subjects')}</td>
          <td>${escapeHtml(ctDuty.room || '—')}</td>
          <td><span class="panel-badge">${ctDuty.shift === 'morning' ? 'Morning' : 'Afternoon'}</span></td>
          <td style="color: var(--text-muted);">${escapeHtml(ctDuty.contact || '—')}</td>
          <td>2026–2027</td>
          <td style="text-align: center;">
            <button class="btn btn-secondary btn-sm" onclick="openClassTeacherModal('${std.id}')">
              Edit
            </button>
          </td>
        </tr>`;
    });

    DOM.classTeacherTableTbody.innerHTML = tbodyHtml;
    if (DOM.classTeacherCoverageBadge) {
      DOM.classTeacherCoverageBadge.textContent = `${assignedCount} of ${(state.standards || []).length} Standards Assigned`;
    }
  }

  window.openClassTeacherModal = function(stdId) {
    if (!DOM.classTeacherModal) return;

    // Populate standards
    DOM.ctInputStandard.innerHTML = '';
    (state.standards || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      DOM.ctInputStandard.appendChild(opt);
    });
    DOM.ctInputStandard.value = stdId || 'std_3';

    // Populate teachers
    DOM.ctInputTeacher.innerHTML = '<option value="">-- Select Teacher --</option>';
    (state.teachers || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      DOM.ctInputTeacher.appendChild(opt);
    });

    const ctDuty = (state.classTeacherDuties || []).find(c => c.standardId === stdId) || {};
    DOM.ctInputTeacher.value = ctDuty.teacher || '';
    DOM.ctInputRoom.value = ctDuty.room || '';
    DOM.ctInputShift.value = ctDuty.shift || state.currentShift;
    DOM.ctInputContact.value = ctDuty.contact || '+91 98250 11223';

    checkCtConflictWarning();
    DOM.ctInputTeacher.onchange = checkCtConflictWarning;
    DOM.ctInputStandard.onchange = checkCtConflictWarning;

    DOM.classTeacherModal.classList.add('active');
  };

  function checkCtConflictWarning() {
    const selectedTeacher = DOM.ctInputTeacher.value;
    const targetStdId = DOM.ctInputStandard.value;

    if (!selectedTeacher) {
      if (DOM.ctConflictWarningBanner) DOM.ctConflictWarningBanner.style.display = 'none';
      return;
    }

    const existingDuty = (state.classTeacherDuties || []).find(c => c.teacher === selectedTeacher && c.standardId !== targetStdId);
    if (existingDuty) {
      const existStd = (state.standards || []).find(s => s.id === existingDuty.standardId);
      const existStdName = existStd ? existStd.name : existingDuty.standardId;

      if (DOM.ctConflictWarningBanner) {
        DOM.ctConflictWarningBanner.style.display = 'flex';
        DOM.ctConflictTeacherName.textContent = selectedTeacher;
        DOM.ctConflictStdName.textContent = existStdName;
      }
    } else {
      if (DOM.ctConflictWarningBanner) DOM.ctConflictWarningBanner.style.display = 'none';
    }
  }

  function saveClassTeacherDuty() {
    const standardId = DOM.ctInputStandard.value;
    const teacher = DOM.ctInputTeacher.value.trim();
    const room = DOM.ctInputRoom.value.trim() || 'Room 101';
    const shift = DOM.ctInputShift.value;
    const contact = DOM.ctInputContact.value.trim() || '+91 98250 11223';

    const std = (state.standards || []).find(s => s.id === standardId);
    const standardName = std ? std.name : standardId;

    const prof = (state.teacherProfiles || {})[teacher] || {};
    const subject = prof.primarySubject || 'General Faculty';

    if (!state.classTeacherDuties) state.classTeacherDuties = [];
    const idx = state.classTeacherDuties.findIndex(c => c.standardId === standardId);

    if (idx > -1) {
      state.classTeacherDuties[idx] = { standardId, standardName, teacher, subject, room, shift, contact };
    } else {
      state.classTeacherDuties.push({ standardId, standardName, teacher, subject, room, shift, contact });
    }

    saveState();
    renderClassTeacherDutyView();
    renderClassMetaBanner();
    DOM.classTeacherModal.classList.remove('active');
    showToast(`Class Teacher assigned for ${standardName}`, 'success');
  }

  // ==========================================================================
  // MODULE 7: STANDARD-WISE SYLLABUS MANAGEMENT
  // ==========================================================================
  function renderSyllabusView() {
    if (DOM.syllabusStdTabs) {
      DOM.syllabusStdTabs.querySelectorAll('.day-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-std') === state.activeSyllabusStd);
        btn.onclick = () => {
          state.activeSyllabusStd = btn.getAttribute('data-std');
          renderSyllabusView();
        };
      });
    }

    if (!DOM.syllabusTableTbody) return;

    let records = state.syllabusRecords || [];
    if (state.activeSyllabusStd !== 'all') {
      records = records.filter(r => r.standardId === state.activeSyllabusStd);
    }

    if (records.length === 0) {
      DOM.syllabusTableTbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 24px;">
            No syllabus records found for this standard. Click "+ Add / Update Subject Syllabus" to create an entry.
          </td>
        </tr>`;
      return;
    }

    let tbodyHtml = '';
    records.forEach(r => {
      tbodyHtml += `
        <tr>
          <td style="font-weight: 700; color: var(--primary-navy);">${escapeHtml(r.standardName)}</td>
          <td style="font-weight: 700;">${escapeHtml(r.subject)}</td>
          <td>${escapeHtml(r.teacher)}</td>
          <td style="text-align: center;">
            <div class="scope-tag-group">
              <span class="scope-pill scope-ch">${r.chapters || 0} Ch</span>
              <span class="scope-pill scope-poem">${r.poems || 0} Poems</span>
              <span class="scope-pill scope-gram">${r.grammar || 0} Gram</span>
            </div>
          </td>
          <td style="font-size: 11.5px; color: var(--text-primary);">${escapeHtml(r.completedCourse || '—')}</td>
          <td style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(r.pendingCourse || '—')}</td>
          <td style="text-align: center; background: rgba(16, 185, 129, 0.04);">
            <div class="syl-check-pill syl-check-done">📖 ${escapeHtml(r.checkedTextbooks || 'Checked')}</div>
            <div class="syl-check-pill syl-check-done" style="margin-top: 2px;">✍️ ${escapeHtml(r.checkedClasswork || 'Checked')}</div>
          </td>
          <td style="text-align: center; background: rgba(245, 158, 11, 0.04);">
            <div class="syl-check-pill syl-check-pending">📖 ${escapeHtml(r.pendingTextbooks || '0 Pending')}</div>
            <div class="syl-check-pill syl-check-pending" style="margin-top: 2px;">✍️ ${escapeHtml(r.pendingClasswork || '0 Pending')}</div>
          </td>
          <td style="text-align: center;">
            <div class="syl-progress-container">
              <div class="syl-progress-bar">
                <div class="syl-progress-fill" style="width: ${r.progressPercent || 75}%;"></div>
              </div>
              <span style="font-size: 11px; font-weight: 700; color: var(--primary-navy);">${r.progressPercent || 75}%</span>
            </div>
          </td>
          <td style="text-align: center;">
            <button class="btn-duty-action" onclick="openEditSyllabusModal('${r.id}')" title="Edit Syllabus Record">
              ✏️
            </button>
            <button class="btn-duty-action delete" onclick="deleteSyllabusRecord('${r.id}')" title="Delete Record">
              🗑️
            </button>
          </td>
        </tr>`;
    });

    DOM.syllabusTableTbody.innerHTML = tbodyHtml;
  }

  function openAddSyllabusModal() {
    DOM.sylInputId.value = '';
    populateSyllabusModalSelects();

    DOM.sylInputChapters.value = '8';
    DOM.sylInputPoems.value = '4';
    DOM.sylInputGrammar.value = '6';
    DOM.sylInputCompletedCourse.value = 'Ch 1 to 6, Poems 1 to 3, Grammar topics 1 to 4';
    DOM.sylInputPendingCourse.value = 'Ch 7 to 8, Poem 4, Grammar topics 5 to 6';
    DOM.sylInputCheckedTextbooks.value = '28 Books Checked';
    DOM.sylInputCheckedClasswork.value = '27 Notebooks Checked';
    DOM.sylInputPendingTextbooks.value = '2 Books Pending';
    DOM.sylInputPendingClasswork.value = '3 Books Pending';
    DOM.sylInputProgress.value = '75';
    DOM.sylProgressPercentVal.textContent = '75%';

    DOM.btnDeleteSyllabusRecord.style.display = 'none';
    DOM.sylModalTitle.textContent = 'Add Subject Syllabus & Checking Record';
    DOM.syllabusModal.classList.add('active');
  }

  window.openEditSyllabusModal = function(id) {
    const record = (state.syllabusRecords || []).find(r => r.id === id);
    if (!record) return;

    DOM.sylInputId.value = record.id;
    populateSyllabusModalSelects();

    DOM.sylInputStandard.value = record.standardId;
    DOM.sylInputSubject.value = record.subject;
    DOM.sylInputTeacher.value = record.teacher;
    DOM.sylInputChapters.value = record.chapters || 0;
    DOM.sylInputPoems.value = record.poems || 0;
    DOM.sylInputGrammar.value = record.grammar || 0;
    DOM.sylInputCompletedCourse.value = record.completedCourse || '';
    DOM.sylInputPendingCourse.value = record.pendingCourse || '';
    DOM.sylInputCheckedTextbooks.value = record.checkedTextbooks || '';
    DOM.sylInputCheckedClasswork.value = record.checkedClasswork || '';
    DOM.sylInputPendingTextbooks.value = record.pendingTextbooks || '';
    DOM.sylInputPendingClasswork.value = record.pendingClasswork || '';
    DOM.sylInputProgress.value = record.progressPercent || 75;
    DOM.sylProgressPercentVal.textContent = `${record.progressPercent || 75}%`;

    DOM.btnDeleteSyllabusRecord.style.display = 'inline-flex';
    DOM.sylModalTitle.textContent = 'Edit Subject Syllabus & Checking Record';
    DOM.syllabusModal.classList.add('active');
  };

  function populateSyllabusModalSelects() {
    DOM.sylInputStandard.innerHTML = '';
    (state.standards || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      DOM.sylInputStandard.appendChild(opt);
    });

    DOM.sylInputSubject.innerHTML = '';
    (state.subjects || []).forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      DOM.sylInputSubject.appendChild(opt);
    });

    DOM.sylInputTeacher.innerHTML = '';
    (state.teachers || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      DOM.sylInputTeacher.appendChild(opt);
    });
  }

  function saveSyllabusRecord() {
    const editId = DOM.sylInputId.value;
    const standardId = DOM.sylInputStandard.value;
    const std = (state.standards || []).find(s => s.id === standardId);
    const standardName = std ? std.name : standardId;
    const subject = DOM.sylInputSubject.value;
    const teacher = DOM.sylInputTeacher.value;
    const chapters = parseInt(DOM.sylInputChapters.value, 10) || 0;
    const poems = parseInt(DOM.sylInputPoems.value, 10) || 0;
    const grammar = parseInt(DOM.sylInputGrammar.value, 10) || 0;
    const completedCourse = DOM.sylInputCompletedCourse.value.trim();
    const pendingCourse = DOM.sylInputPendingCourse.value.trim();
    const checkedTextbooks = DOM.sylInputCheckedTextbooks.value.trim();
    const checkedClasswork = DOM.sylInputCheckedClasswork.value.trim();
    const pendingTextbooks = DOM.sylInputPendingTextbooks.value.trim();
    const pendingClasswork = DOM.sylInputPendingClasswork.value.trim();
    const progressPercent = parseInt(DOM.sylInputProgress.value, 10) || 75;

    if (!subject || !teacher) {
      showToast('Please select both Subject and Teacher', 'error');
      return;
    }

    if (!state.syllabusRecords) state.syllabusRecords = [];

    const newRecord = {
      id: editId || ('syl_' + Date.now()),
      standardId,
      standardName,
      subject,
      teacher,
      chapters,
      poems,
      grammar,
      completedCourse,
      pendingCourse,
      checkedTextbooks,
      checkedClasswork,
      pendingTextbooks,
      pendingClasswork,
      progressPercent
    };

    if (editId) {
      const idx = state.syllabusRecords.findIndex(r => r.id === editId);
      if (idx > -1) state.syllabusRecords[idx] = newRecord;
    } else {
      state.syllabusRecords.push(newRecord);
    }

    saveState();
    renderSyllabusView();
    renderDashboard();
    DOM.syllabusModal.classList.remove('active');
    showToast('Syllabus record saved successfully', 'success');
  }

  window.deleteSyllabusRecord = function(id) {
    if (!confirm('Are you sure you want to delete this syllabus tracking record?')) return;
    state.syllabusRecords = (state.syllabusRecords || []).filter(r => r.id !== id);
    saveState();
    renderSyllabusView();
    renderDashboard();
    showToast('Syllabus record deleted', 'info');
  };

  // --- View Switcher ---
  function switchView(viewName) {
    state.activeView = viewName;
    DOM.viewTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });
    DOM.viewSections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `section-${viewName}`);
    });

    const titles = {
      'dashboard-view': 'Executive Dashboard',
      'settings-view': 'Master System Settings',
      'class-timetable-view': 'Class-Wise Timetables',
      'class-view': 'Daily Schedule Grid',
      'teacher-view': 'Teacher Schedules',
      'attendance-duty-view': 'Daily Attendance Duties',
      'class-teacher-duty-view': 'Class Teacher Allocations',
      'syllabus-view': 'Syllabus Scope & Progress',
      'duty-view': 'Faculty Special Duties',
      'general-duty-view': 'Morning Assembly Duties',
      'substitution-view': 'Daily Substitutions & Proxy Slips',
      'workload-view': 'Workload Distribution Analytics'
    };
    if (DOM.topbarViewTitle) {
      DOM.topbarViewTitle.textContent = titles[viewName] || 'Dashboard';
    }

    if (viewName === 'dashboard-view') renderDashboard();
    if (viewName === 'settings-view') renderSettingsView();
    if (viewName === 'class-timetable-view') renderClassTimetable();
    if (viewName === 'attendance-duty-view') renderAttendanceDutyView();
    if (viewName === 'class-teacher-duty-view') renderClassTeacherDutyView();
    if (viewName === 'syllabus-view') renderSyllabusView();
    if (viewName === 'teacher-view') renderTeacherView();
    if (viewName === 'duty-view') renderWeeklyDutyView();
    if (viewName === 'general-duty-view') renderGeneralDutyView();
    if (viewName === 'substitution-view') renderSubstitutionView();
    if (viewName === 'workload-view') renderWorkloadView();
    if (viewName === 'class-view') renderClassView();

    updateExportBar();
  }

  function renderAll() {
    renderDashboard();
    renderClassTimetable();
    renderAttendanceDutyView();
    renderClassTeacherDutyView();
    renderSyllabusView();
    renderClassView();
    renderTeacherView();
    renderWeeklyDutyView();
    renderGeneralDutyView();
    renderSubstitutionView();
    renderWorkloadView();
    renderSettingsView();
    updateExportBar();
  }

  // --- 1. Class Timetable View Rendering ---
  function renderClassView() {
    renderDayTabs();
    renderAttendance();
    renderClassTable();
  }

  function renderDayTabs() {
    DOM.dayTabsContainer.innerHTML = '';
    state.days.forEach(day => {
      const tab = document.createElement('button');
      tab.className = `day-tab-btn ${day === state.currentDay ? 'active' : ''}`;
      
      const dayData = state.schedules[day] || {};
      let filled = 0;
      const total = state.periods.length * state.standards.length;
      state.periods.forEach(p => {
        const pSlots = dayData[p.id] || {};
        state.standards.forEach(s => {
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
    const dayData = state.schedules[state.currentDay] || {};
    const dayLeaves = state.leaves[state.currentDay] || [];
    const activeTeachers = state.teachers.filter(t => !dayLeaves.includes(t));
    const activeStds = getActiveStandards();

    // Header
    let theadHtml = `<tr><th class="col-lecture-w">Period / Timing</th>`;
    activeStds.forEach(std => {
      const base = std.baseName || std.name.replace(/rd|th|st|nd/i, '');
      const sup = std.sup || (std.name.match(/rd|th|st|nd/i) ? std.name.match(/rd|th|st|nd/i)[0] : '');
      theadHtml += `<th class="col-std-w">${escapeHtml(base)}<sup>${escapeHtml(sup)}</sup></th>`;
    });
    theadHtml += `<th class="col-free-w">Free Teachers</th></tr>`;
    DOM.timetableThead.innerHTML = theadHtml;

    const allConflicts = [];
    let tbodyHtml = '';

    state.periods.forEach((period, pIdx) => {
      if (pIdx === 3) {
        tbodyHtml += `
          <tr class="recess-break-row">
            <td colspan="${activeStds.length + 2}">RECESS BREAK • ${state.currentShift === 'morning' ? '9:45 AM TO 10:05 AM (20 MINUTES)' : '3:15 PM TO 3:45 PM (30 MINUTES)'}</td>
          </tr>`;
      }

      const pSlots = dayData[period.id] || {};
      const teacherAllocation = {};
      activeStds.forEach(std => {
        const slot = pSlots[std.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          const t = slot.teacher.trim();
          if (!teacherAllocation[t]) teacherAllocation[t] = [];
          teacherAllocation[t].push(std.name);
        }
      });

      const busyTeachers = Object.keys(teacherAllocation);
      busyTeachers.forEach(t => {
        if (teacherAllocation[t].length > 1) {
          allConflicts.push({ period: period.label, teacher: t, standards: teacherAllocation[t] });
        }
      });

      const excludedKey = `${state.currentDay}_${period.id}`;
      const excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[excludedKey]) || [];
      const freeTeachers = activeTeachers.filter(t => !busyTeachers.includes(t) && !excludedForPeriod.includes(t));
      const removedTeachers = activeTeachers.filter(t => !busyTeachers.includes(t) && excludedForPeriod.includes(t));

      tbodyHtml += `
        <tr>
          <td class="period-header-cell">
            <div class="period-header-num">${escapeHtml(period.label)}</div>
            <div class="period-header-time">${escapeHtml(period.time)}</div>
          </td>`;

      activeStds.forEach(std => {
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
          tbodyHtml += `<div class="empty-prompt">+ Assign Period</div>`;
        }

        tbodyHtml += `</div></td>`;
      });

      tbodyHtml += `
          <td class="free-staff-cell">
            <div class="free-staff-flow">`;
      if (freeTeachers.length === 0 && removedTeachers.length === 0) {
        tbodyHtml += `<span class="free-staff-none">None Free</span>`;
      } else {
        freeTeachers.forEach(t => {
          tbodyHtml += `
            <div class="free-staff-item">
              <span class="free-staff-name" title="${escapeHtml(t)}">${escapeHtml(t)}</span>
              <button type="button" class="btn-remove-free-teacher" data-day="${escapeHtml(state.currentDay)}" data-period="${escapeHtml(period.id)}" data-teacher="${escapeHtml(t)}" title="Remove ${escapeHtml(t)} from free list (e.g. half-day duty)">&times;</button>
            </div>`;
        });
        if (removedTeachers.length > 0) {
          const restoreLabel = removedTeachers.length === 1 
            ? `+ Restore (${escapeHtml(removedTeachers[0])})` 
            : `+ Restore (${removedTeachers.length} hidden)`;
          tbodyHtml += `
            <button type="button" class="btn-restore-free-teacher" data-day="${escapeHtml(state.currentDay)}" data-period="${escapeHtml(period.id)}" title="Click to restore: ${escapeHtml(removedTeachers.join(', '))}">${restoreLabel}</button>`;
        }
      }
      tbodyHtml += `</div></td></tr>`;
    });

    DOM.timetableTbody.innerHTML = tbodyHtml;

    document.querySelectorAll('.grid-period-cell').forEach(cell => {
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

    DOM.timetableTbody.querySelectorAll('.btn-restore-free-teacher').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = btn.getAttribute('data-day');
        const periodId = btn.getAttribute('data-period');
        restoreFreeTeachers(day, periodId);
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

    DOM.displayDayStats.textContent = `Standards: 3rd to 8th • Lectures: 1 to 6`;
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

  function restoreFreeTeachers(day, periodId) {
    if (!state.excludedFreeTeachers) return;
    const key = `${day}_${periodId}`;
    if (state.excludedFreeTeachers[key]) {
      delete state.excludedFreeTeachers[key];
      saveState();
      renderClassTable();
      renderSubstitutionView();
      showToast(`Restored Free Teachers for ${day} ${periodId.toUpperCase()}`, 'success');
    }
  }

  // --- 2. Teacher-Wise Individual Timetable Rendering ---
  function renderTeacherView() {
    DOM.selectTeacherFilter.innerHTML = '';
    state.teachers.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      if (t === state.selectedTeacher) opt.selected = true;
      DOM.selectTeacherFilter.appendChild(opt);
    });
    const addTeacherOpt = document.createElement('option');
    addTeacherOpt.value = '__NEW_TEACHER__';
    addTeacherOpt.textContent = '➕ + Add New Teacher...';
    addTeacherOpt.style.fontWeight = '700';
    addTeacherOpt.style.color = '#2563eb';
    DOM.selectTeacherFilter.appendChild(addTeacherOpt);

    DOM.selectTeacherFilter.onchange = function() {
      if (this.value === '__NEW_TEACHER__') {
        openQuickAddModal('teacher', this);
        this.value = state.selectedTeacher || state.teachers[0];
      } else {
        state.selectedTeacher = this.value;
        renderTeacherGrid();
      }
    };

    renderTeacherGrid();
  }

  function renderTeacherGrid() {
    const teacher = state.selectedTeacher || state.teachers[0];
    DOM.displayTeacherName.textContent = `${teacher} • Weekly Timetable`;

    // Filter to Monday through Friday (exclude Saturday)
    const teacherDays = state.days.filter(d => d !== 'Saturday');

    // Compute load stats
    let totalAssigned = 0;
    teacherDays.forEach(d => {
      const dSched = state.schedules[d] || {};
      state.periods.forEach(p => {
        const pSlots = dSched[p.id] || {};
        state.standards.forEach(s => {
          if (pSlots[s.id] && pSlots[s.id].teacher && pSlots[s.id].teacher.trim() === teacher) totalAssigned++;
        });
      });
    });

    const totalSlots = teacherDays.length * state.periods.length;
    DOM.teacherLoadStat.textContent = totalAssigned;
    DOM.teacherFreeStat.textContent = totalSlots - totalAssigned;

    // Thead
    let theadHtml = `<tr><th style="width: 14%;">Period / Time</th>`;
    teacherDays.forEach(d => {
      theadHtml += `<th style="width: 17.2%;">${escapeHtml(d)}</th>`;
    });
    theadHtml += `</tr>`;
    DOM.teacherGridThead.innerHTML = theadHtml;

    // Tbody
    let tbodyHtml = '';
    state.periods.forEach(p => {
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
    state.days.forEach(d => {
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
    state.teachers.forEach(t => {
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

    // Calculate Vacant periods
    const daySched = state.schedules[targetDay] || {};
    const vacantList = [];

    state.periods.forEach(p => {
      const pSlots = daySched[p.id] || {};
      state.standards.forEach(s => {
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

      const excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[`${targetDay}_${vacant.periodId}`]) || [];
      const freeCandidates = state.teachers.filter(t => !dayLeaves.includes(t) && !busyInThisPeriod.includes(t) && !excludedForPeriod.includes(t));

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
        const excludedForPeriod = (state.excludedFreeTeachers && state.excludedFreeTeachers[`${targetDay}_${vacant.periodId}`]) || [];
        const free = state.teachers.filter(t => !dayLeaves.includes(t) && !busy.includes(t) && !excludedForPeriod.includes(t));
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
    const totalWorkingPeriods = workingDays.length * state.periods.length; // 5 * 6 = 30 max periods

    // 1. Calculate weekly periods and subject breakdown per teacher
    const teacherWeeklyLoad = {};
    const teacherSubjects = {};
    state.teachers.forEach(t => {
      teacherWeeklyLoad[t] = 0;
      teacherSubjects[t] = {};
    });

    let totalScheduledPeriods = 0;
    // Track daily consecutive periods for fatigue check
    let fatigueInstances = 0;

    workingDays.forEach(d => {
      const dSched = state.schedules[d] || {};

      // Daily consecutive check per teacher
      state.teachers.forEach(t => {
        let consecutive = 0;
        let maxConsecutiveInDay = 0;
        state.periods.forEach(p => {
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
      state.periods.forEach(p => {
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

    const teacherCount = state.teachers.length || 1;
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
      DOM.workloadStaffCount.textContent = `${state.teachers.length} Staff Members`;
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
    const totalPotentialCapacity = state.teachers.length * totalWorkingPeriods;
    const totalFreePrepPeriods = Math.max(0, totalPotentialCapacity - totalScheduledPeriods);

    let diagHtml = '';
    // Diagnostic 1: Labor Ceiling
    if (isCompliant) {
      diagHtml += `
        <div class="diagnostic-card success">
          <div class="diagnostic-icon" style="color: #059669;">✓</div>
          <div class="diagnostic-content">
            <div class="diagnostic-title">Weekly Labor Ceiling (≤ 26 Periods)</div>
            <div class="diagnostic-desc">All ${state.teachers.length} faculty members operate strictly within institutional guidelines. No burnout risks detected.</div>
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
    const nonExportViews = ['dashboard-view', 'settings-view', 'profile-view', 'cloud-db-view', 'subject-view'];
    if (DOM.stickyExportBar) {
      DOM.stickyExportBar.style.display = nonExportViews.includes(state.activeView) ? 'none' : 'flex';
    }

    if (state.activeView === 'dashboard-view') {
      DOM.exportBarTitle.textContent = "School ERP Management Control Center";
      DOM.exportBarDesc.textContent = "Institutional dashboard with live timetable KPIs, attendance tracking, and syllabus auditing.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Print ERP Overview";
      DOM.btnDownloadAllDays.onclick = () => window.print();
    } else if (state.activeView === 'class-timetable-view') {
      const std = (state.standards || []).find(s => s.id === state.selectedClassStd);
      const stdName = std ? std.name : 'Selected Standard';
      DOM.exportBarTitle.textContent = `Export ${stdName} Timetable`;
      DOM.exportBarDesc.textContent = "Generates official Word (.docx) timetable document with school letterhead and class teacher sign-off.";
      DOM.btnDownloadSingleDay.style.display = 'inline-flex';
      DOM.btnDownloadDayName.textContent = stdName;
      DOM.btnDownloadSingleDay.onclick = downloadSelectedClassDocx;
      DOM.btnDownloadAllDays.textContent = "Export All Standards (.docx)";
      DOM.btnDownloadAllDays.onclick = downloadAllDaysDocx;
    } else if (state.activeView === 'attendance-duty-view') {
      DOM.exportBarTitle.textContent = "Attendance Duty Management";
      DOM.exportBarDesc.textContent = "Daily student attendance, gate duty supervision, and morning assembly verification roster.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Print Attendance Roster";
      DOM.btnDownloadAllDays.onclick = () => window.print();
    } else if (state.activeView === 'class-teacher-duty-view') {
      DOM.exportBarTitle.textContent = "Class Teacher Duty Allocation";
      DOM.exportBarDesc.textContent = "Designated classroom teachers, room allocations, and primary contact registry.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Print Allocation Roster";
      DOM.btnDownloadAllDays.onclick = () => window.print();
    } else if (state.activeView === 'syllabus-view') {
      DOM.exportBarTitle.textContent = "Syllabus & Verification Progress";
      DOM.exportBarDesc.textContent = "Semester 1 exam scope, completed chapters/poems/grammar, and notebook checking status.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Print Syllabus Audit";
      DOM.btnDownloadAllDays.onclick = () => window.print();
    } else if (state.activeView === 'class-view') {
      DOM.exportBarTitle.textContent = "Export Official Class Timetables";
      DOM.exportBarDesc.textContent = `Generates formatted Word (.docx) for ${state.currentDay} or full week with school letterhead.`;
      DOM.btnDownloadSingleDay.style.display = 'inline-flex';
      DOM.btnDownloadDayName.textContent = state.currentDay;
      DOM.btnDownloadSingleDay.onclick = downloadSingleDayDocx;
      DOM.btnDownloadAllDays.textContent = "Download Full Week (.docx)";
      DOM.btnDownloadAllDays.onclick = downloadAllDaysDocx;
    } else if (state.activeView === 'teacher-view') {
      DOM.exportBarTitle.textContent = "Export Individual Faculty Timetables";
      DOM.exportBarDesc.textContent = "Outputs individual 1-page weekly schedules for each staff member.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download All Staff Schedules (.docx)";
      DOM.btnDownloadAllDays.onclick = () => {
        state.activeView = 'teacher-view';
        downloadAllDaysDocx();
      };
    } else if (state.activeView === 'duty-view') {
      DOM.exportBarTitle.textContent = "Export Faculty Extra Duties Matrix";
      DOM.exportBarDesc.textContent = "Outputs standalone official faculty extra duty matrix with subject & grade tally breakdown (.docx).";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Extra Duties (.docx)";
      DOM.btnDownloadAllDays.onclick = downloadWeeklyDutyDocx;
    } else if (state.activeView === 'general-duty-view') {
      DOM.exportBarTitle.textContent = "Export School & Assembly Duties Roster";
      DOM.exportBarDesc.textContent = "Outputs official faculty special & assembly duties roster with administrative guidelines (.docx).";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Duty Roster (.docx)";
      DOM.btnDownloadAllDays.onclick = exportGeneralDutiesDocx;
    } else if (state.activeView === 'substitution-view') {
      DOM.exportBarTitle.textContent = "Export Daily Substitution Notice";
      DOM.exportBarDesc.textContent = "Outputs formal administrative duty notice for staff room notice boards.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Substitution Notice (.docx)";
      DOM.btnDownloadAllDays.onclick = downloadSubstitutionDocx;
    } else {
      DOM.exportBarTitle.textContent = "Export Timetable Data";
      DOM.exportBarDesc.textContent = "Outputs Word documents or CSV records.";
      DOM.btnDownloadSingleDay.style.display = 'none';
      DOM.btnDownloadAllDays.textContent = "Download Full Week (.docx)";
      DOM.btnDownloadAllDays.onclick = downloadAllDaysDocx;
    }
  }

  // --- In-Place Popover Actions ---
  function openPeriodModal(periodId, stdId) {
    editingCell.day = state.currentDay;
    editingCell.periodId = periodId;
    editingCell.stdId = stdId;

    const period = state.periods.find(p => p.id === periodId);
    const std = state.standards.find(s => s.id === stdId);
    const dayData = state.schedules[state.currentDay] || {};
    const pSlots = dayData[periodId] || {};
    const currentSlot = pSlots[stdId] || { subject: '', teacher: '' };
    const dayLeaves = state.leaves[state.currentDay] || [];

    editingCell.subject = currentSlot.subject || '';
    editingCell.teacher = currentSlot.teacher || '';

    DOM.periodModalTitle.innerHTML = `Assign Period: <strong>${escapeHtml(period.label)} (${escapeHtml(period.time)})</strong> • <span>${escapeHtml(std.name)}</span>`;
    if (DOM.modalSubjectHint) DOM.modalSubjectHint.textContent = '';
    if (DOM.modalTeacherHint) DOM.modalTeacherHint.textContent = '';

    const busyIn = {};
    state.standards.forEach(s => {
      if (s.id !== stdId) {
        const slot = pSlots[s.id];
        if (slot && slot.teacher && slot.teacher.trim()) {
          busyIn[slot.teacher.trim()] = s.name.replace('Standard: ', '');
        }
      }
    });

    // 1. Quick Pairs (1-Click Fast Assign)
    if (DOM.modalQuickPairs) {
      DOM.modalQuickPairs.innerHTML = '';
      state.teachers.forEach(teacher => {
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
    renderModalSubjectChips(periodId, stdId, busyIn, dayLeaves);
    DOM.modalCustomSubject.value = state.subjects.includes(editingCell.subject) ? '' : editingCell.subject;

    // 3. Teachers
    renderTeacherChipsInModal(periodId, stdId, busyIn, dayLeaves);
    DOM.periodModal.classList.add('active');
  }

  function renderModalSubjectChips(periodId, stdId, busyIn, dayLeaves) {
    DOM.modalSubjectChips.innerHTML = '';
    state.subjects.forEach(subj => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `pill-choice ${editingCell.subject === subj ? 'selected' : ''}`;
      pill.textContent = subj;
      pill.onclick = () => {
        editingCell.subject = subj;
        DOM.modalCustomSubject.value = '';

        // Auto-assign or suggest matching teacher for this subject
        const candidates = state.teachers.filter(t => {
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

    state.teachers.forEach(teacher => {
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

    state.schedules[editingCell.day][editingCell.periodId][editingCell.stdId] = {
      subject: editingCell.subject,
      teacher: editingCell.teacher
    };

    saveState();
    DOM.periodModal.classList.remove('active');
    renderAll();
    showToast('Assignment updated', 'success');
  }

  function clearModalCell() {
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
        if (d !== src) state.schedules[d] = JSON.parse(JSON.stringify(sourceData));
      });
      if (state.excludedFreeTeachers) {
        state.days.forEach(d => {
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
      showToast(`Schedule duplicated from ${src} to all weekdays`, 'success');
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

  function clearCurrentDay() {
    if (confirm(`Clear all allocated periods for ${state.currentDay}?`)) {
      state.schedules[state.currentDay] = {};
      if (state.excludedFreeTeachers) {
        Object.keys(state.excludedFreeTeachers).forEach(k => {
          if (k.startsWith(`${state.currentDay}_`)) {
            delete state.excludedFreeTeachers[k];
          }
        });
      }
      saveState();
      renderAll();
      showToast(`${state.currentDay} timetable cleared`, 'info');
    }
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
      const tag = document.createElement('span');
      tag.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 4px; font-size: 12.5px;';
      tag.innerHTML = `<span>${escapeHtml(t)}</span><button style="background: none; border: none; color: var(--status-danger); cursor: pointer; font-size: 14px; line-height: 1;">&times;</button>`;
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

        let opts = `<option value="">-- Unassigned --</option>`;
        state.subjects.forEach(s => {
          opts += `<option value="${escapeHtml(s)}" ${s === currentSubj ? 'selected' : ''}>${escapeHtml(s)}</option>`;
        });

        row.innerHTML = `
          <div class="teacher-name-label">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: var(--primary-navy); display: inline-block;"></span>
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
  }

  function addTeacher() {
    const name = DOM.settingsNewTeacher.value.trim();
    if (!name || state.teachers.includes(name)) return;
    state.teachers.push(name);
    DOM.settingsNewTeacher.value = '';
    saveState();
    renderSettingsLists();
    renderAll();
    showToast(`Added ${name} to roster`, 'success');
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
      if (state.activeView === 'teacher-view') {
        showToast('Generating All Staff Individual Timetables (.docx)...', 'info');
        const blob = await DocxGenerator.generateTeacherTimetablesDocxBlob(state.teachers, state);
        DocxGenerator.triggerDownload(blob, 'All_Faculty_Individual_Timetables.docx');
        showToast('All Staff Schedules exported successfully', 'success');
      } else if (state.activeView === 'duty-view') {
        downloadWeeklyDutyDocx();
      } else if (state.activeView === 'general-duty-view') {
        exportGeneralDutiesDocx();
      } else if (state.activeView === 'substitution-view') {
        downloadSubstitutionDocx();
      } else {
        showToast('Generating Full Week Timetable (.docx)...', 'info');
        const blob = await DocxGenerator.generateDocxBlob(state.days, state);
        DocxGenerator.triggerDownload(blob, 'Weekly_School_TimeTable.docx');
        showToast('Full Week Timetable exported successfully', 'success');
      }
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

  // ====================================================================
  // MODULE: MASTER SYSTEM SETTINGS VIEW (ALL-IN-ONE CONFIGURATION)
  // ====================================================================
  let activeSettingsTab = 'tab-shifts';
  let activeCfgShift = 'afternoon';

  function initSettingsView() {
    // 1. Settings tab buttons
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.getAttribute('data-settings-tab');
        if (tab) switchSettingsTab(tab);
      };
    });

    // 2. Tab 1: Shift Timings & Periods
    const btnMorningSlots = document.getElementById('cfg-periods-btn-morning');
    const btnAfternoonSlots = document.getElementById('cfg-periods-btn-afternoon');
    if (btnMorningSlots) {
      btnMorningSlots.onclick = () => {
        activeCfgShift = 'morning';
        btnMorningSlots.classList.add('active');
        if (btnAfternoonSlots) btnAfternoonSlots.classList.remove('active');
        renderPeriodSlotsTable();
      };
    }
    if (btnAfternoonSlots) {
      btnAfternoonSlots.onclick = () => {
        activeCfgShift = 'afternoon';
        btnAfternoonSlots.classList.add('active');
        if (btnMorningSlots) btnMorningSlots.classList.remove('active');
        renderPeriodSlotsTable();
      };
    }

    const btnSaveShiftTimings = document.getElementById('btn-save-shift-timings');
    if (btnSaveShiftTimings) {
      btnSaveShiftTimings.onclick = saveShiftTimingsConfig;
    }

    const btnAddSlot = document.getElementById('btn-add-period-slot');
    if (btnAddSlot) {
      btnAddSlot.onclick = addNewPeriodSlot;
    }

    // 3. Tab 2: Faculty Roster & Work Hours
    const btnCreateFaculty = document.getElementById('btn-create-faculty');
    if (btnCreateFaculty) {
      btnCreateFaculty.onclick = addNewFacultyMember;
    }

    const btnSaveFaculty = document.getElementById('btn-save-faculty-allocations');
    if (btnSaveFaculty) {
      btnSaveFaculty.onclick = saveFacultyAllocations;
    }

    // 4. Tab 3: Institutional Profile
    const btnSaveProfile = document.getElementById('btn-save-profile-settings');
    if (btnSaveProfile) {
      btnSaveProfile.onclick = saveInstitutionalProfileSettings;
    }

    const cfgInputLogo = document.getElementById('cfg-input-logo');
    if (cfgInputLogo) {
      cfgInputLogo.onchange = handleSettingsLogoUpload;
    }

    const btnRemoveLogo = document.getElementById('btn-cfg-remove-logo');
    if (btnRemoveLogo) {
      btnRemoveLogo.onclick = removeSettingsLogo;
    }

    // 5. Tab 4: Classes & Standards
    const btnAddStandard = document.getElementById('btn-add-standard');
    if (btnAddStandard) {
      btnAddStandard.onclick = addNewStandardConfig;
    }

    const btnSaveStandards = document.getElementById('btn-save-standards-settings');
    if (btnSaveStandards) {
      btnSaveStandards.onclick = saveStandardsConfig;
    }

    // 6. Tab 5: Academic Subjects
    const btnAddSubj = document.getElementById('btn-add-new-subject');
    if (btnAddSubj) {
      btnAddSubj.onclick = addNewSubjectConfig;
    }

    const btnSaveSubj = document.getElementById('btn-save-subjects-settings');
    if (btnSaveSubj) {
      btnSaveSubj.onclick = saveSubjectsConfig;
    }

    // 7. Tab 6: Cloud DB & Backup
    const btnCloudSync = document.getElementById('btn-cfg-sync-cloud');
    if (btnCloudSync) {
      btnCloudSync.onclick = async () => {
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isConfigured()) {
          showToast('Syncing with Firestore Cloud DB...', 'info');
          await FirebaseSync.saveTimetableData(state);
          showToast('Cloud database synchronized successfully!', 'success');
        } else {
          showToast('Firebase connection not configured', 'error');
        }
      };
    }

    const btnCloudFetch = document.getElementById('btn-cfg-fetch-cloud');
    if (btnCloudFetch) {
      btnCloudFetch.onclick = async () => {
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isConfigured()) {
          showToast('Fetching latest timetable from cloud...', 'info');
          const data = await FirebaseSync.loadTimetableData();
          if (data) {
            state = Object.assign({}, state, data);
            saveState();
            renderAll();
            showToast('Loaded latest cloud timetable state!', 'success');
          } else {
            showToast('No cloud data found to restore', 'info');
          }
        } else {
          showToast('Firebase connection not configured', 'error');
        }
      };
    }

    const btnSaveCloudCreds = document.getElementById('btn-save-cloud-credentials');
    if (btnSaveCloudCreds) {
      btnSaveCloudCreds.onclick = () => {
        const apiKey = (document.getElementById('cfg-fb-apiKey') || {}).value?.trim();
        const projectId = (document.getElementById('cfg-fb-projectId') || {}).value?.trim();
        const authDomain = (document.getElementById('cfg-fb-authDomain') || {}).value?.trim();
        const appId = (document.getElementById('cfg-fb-appId') || {}).value?.trim();

        if (apiKey && projectId) {
          const cfg = { apiKey, projectId, authDomain, appId };
          if (typeof FirebaseSync !== 'undefined') {
            FirebaseSync.saveConfig(cfg);
            FirebaseSync.init();
          }
          showToast('Firebase credentials saved and connected!', 'success');
          renderCloudDbSettingsPanel();
        } else {
          showToast('Please provide at least Firebase API Key and Project ID', 'error');
        }
      };
    }

    const btnSettingsExport = document.getElementById('btn-cfg-export-json');
    if (btnSettingsExport) {
      btnSettingsExport.onclick = exportJsonBackup;
    }

    const btnSettingsImport = document.getElementById('btn-cfg-import-json');
    const settingsFileInput = document.getElementById('settings-import-file-input');
    if (btnSettingsImport && settingsFileInput) {
      btnSettingsImport.onclick = () => settingsFileInput.click();
      settingsFileInput.onchange = importJsonRestore;
    }

    const btnFactoryReset = document.getElementById('btn-cfg-factory-reset');
    if (btnFactoryReset) {
      btnFactoryReset.onclick = () => {
        if (confirm('Are you sure you want to reset all schedules and rosters to institutional defaults? This cannot be undone.')) {
          resetToDefaults();
          saveState();
          renderAll();
          showToast('System reset to institutional default data', 'info');
        }
      };
    }

    // Direct dashboard link buttons
    const btnDashSettings = document.getElementById('dash-btn-master-settings');
    if (btnDashSettings) {
      btnDashSettings.onclick = () => {
        switchView('settings-view');
        switchSettingsTab('tab-standards');
      };
    }
  }

  window.switchSettingsTab = function(tabId) {
    activeSettingsTab = tabId;
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-settings-tab') === tabId);
    });
    document.querySelectorAll('.settings-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `settings-panel-${tabId.replace('tab-', '')}`);
    });
    renderSettingsView();
  };

  function renderSettingsView() {
    renderShiftTimingsPanel();
    renderFacultySettingsPanel();
    renderProfileSettingsPanel();
    renderStandardsSettingsPanel();
    renderSubjectsSettingsPanel();
    renderCloudDbSettingsPanel();
  }

  function renderShiftTimingsPanel() {
    const sSettings = state.shiftSettings || {
      morning: { label: 'Morning Shift', start: '07:30 AM', end: '12:15 PM', recess: '9:45 AM – 10:05 AM' },
      afternoon: { label: 'Afternoon Shift', start: '01:00 PM', end: '05:50 PM', recess: '3:15 PM – 3:45 PM' }
    };

    const mLabel = document.getElementById('cfg-shift-morning-label');
    const mRecess = document.getElementById('cfg-shift-morning-recess');
    const mStart = document.getElementById('cfg-shift-morning-start');
    const mEnd = document.getElementById('cfg-shift-morning-end');
    if (mLabel && sSettings.morning) mLabel.value = sSettings.morning.label || 'Morning Shift';
    if (mRecess && sSettings.morning) mRecess.value = sSettings.morning.recess || '9:45 AM – 10:05 AM';
    if (mStart && sSettings.morning) mStart.value = sSettings.morning.start || '07:30 AM';
    if (mEnd && sSettings.morning) mEnd.value = sSettings.morning.end || '12:15 PM';

    const aLabel = document.getElementById('cfg-shift-afternoon-label');
    const aRecess = document.getElementById('cfg-shift-afternoon-recess');
    const aStart = document.getElementById('cfg-shift-afternoon-start');
    const aEnd = document.getElementById('cfg-shift-afternoon-end');
    if (aLabel && sSettings.afternoon) aLabel.value = sSettings.afternoon.label || 'Afternoon Shift';
    if (aRecess && sSettings.afternoon) aRecess.value = sSettings.afternoon.recess || '3:15 PM – 3:45 PM';
    if (aStart && sSettings.afternoon) aStart.value = sSettings.afternoon.start || '01:00 PM';
    if (aEnd && sSettings.afternoon) aEnd.value = sSettings.afternoon.end || '05:50 PM';

    renderPeriodSlotsTable();
  }

  function renderPeriodSlotsTable() {
    const tbody = document.getElementById('cfg-periods-tbody');
    if (!tbody) return;

    const periodsList = (state.shifts && state.shifts[activeCfgShift] && state.shifts[activeCfgShift].periods)
      ? state.shifts[activeCfgShift].periods
      : (activeCfgShift === 'morning' ? (DEFAULT_DATA.morningPeriods || []) : state.periods);

    if (!periodsList || periodsList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No period slots configured for ${activeCfgShift} shift. Add one below.</td></tr>`;
      return;
    }

    let html = '';
    periodsList.forEach((p, idx) => {
      const isBreak = !!p.isBreak;
      html += `
        <tr>
          <td style="font-weight: 700; color: #64748b;">#${p.number || (idx + 1)}</td>
          <td>
            <input type="text" class="settings-input cfg-slot-label" data-id="${p.id}" value="${escapeHtml(p.label)}" style="width: 130px; font-weight: 600;">
          </td>
          <td>
            <input type="text" class="settings-input cfg-slot-time" data-id="${p.id}" value="${escapeHtml(p.time)}" style="width: 170px;">
          </td>
          <td style="text-align: center;">
            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
              <input type="checkbox" class="cfg-slot-break" data-id="${p.id}" ${isBreak ? 'checked' : ''}>
              <span class="slot-type-badge ${isBreak ? 'badge-recess' : 'badge-lecture'}">${isBreak ? 'Recess / Break' : 'Regular Lecture'}</span>
            </label>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-danger-outline btn-sm action-icon-btn" onclick="window.deletePeriodSlot('${activeCfgShift}', '${p.id}')" title="Delete Slot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
            </button>
          </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    // Attach change listeners to update state in memory immediately
    tbody.querySelectorAll('.cfg-slot-label').forEach(inp => {
      inp.onchange = () => {
        const pId = inp.getAttribute('data-id');
        const found = periodsList.find(x => x.id === pId);
        if (found) found.label = inp.value.trim();
      };
    });
    tbody.querySelectorAll('.cfg-slot-time').forEach(inp => {
      inp.onchange = () => {
        const pId = inp.getAttribute('data-id');
        const found = periodsList.find(x => x.id === pId);
        if (found) found.time = inp.value.trim();
      };
    });
    tbody.querySelectorAll('.cfg-slot-break').forEach(chk => {
      chk.onchange = () => {
        const pId = chk.getAttribute('data-id');
        const found = periodsList.find(x => x.id === pId);
        if (found) found.isBreak = chk.checked;
        renderPeriodSlotsTable();
      };
    });
  }

  function saveShiftTimingsConfig() {
    if (!state.shiftSettings) state.shiftSettings = {};

    state.shiftSettings.morning = {
      label: (document.getElementById('cfg-shift-morning-label') || {}).value || 'Morning Shift',
      recess: (document.getElementById('cfg-shift-morning-recess') || {}).value || '9:45 AM – 10:05 AM',
      start: (document.getElementById('cfg-shift-morning-start') || {}).value || '07:30 AM',
      end: (document.getElementById('cfg-shift-morning-end') || {}).value || '12:15 PM'
    };

    state.shiftSettings.afternoon = {
      label: (document.getElementById('cfg-shift-afternoon-label') || {}).value || 'Afternoon Shift',
      recess: (document.getElementById('cfg-shift-afternoon-recess') || {}).value || '3:15 PM – 3:45 PM',
      start: (document.getElementById('cfg-shift-afternoon-start') || {}).value || '01:00 PM',
      end: (document.getElementById('cfg-shift-afternoon-end') || {}).value || '05:50 PM'
    };

    // If active shift periods were edited, mirror to state.periods
    if (state.shifts && state.shifts[state.currentShift] && state.shifts[state.currentShift].periods) {
      state.periods = JSON.parse(JSON.stringify(state.shifts[state.currentShift].periods));
    }

    saveState();
    renderAll();
    showToast('Shift timing parameters and period slots saved successfully', 'success');
  }

  function addNewPeriodSlot() {
    const numInput = document.getElementById('new-slot-num');
    const labelInput = document.getElementById('new-slot-label');
    const timeInput = document.getElementById('new-slot-time');
    const breakInput = document.getElementById('new-slot-isbreak');

    const label = labelInput ? labelInput.value.trim() : '';
    const time = timeInput ? timeInput.value.trim() : '';
    const num = numInput && numInput.value ? parseInt(numInput.value, 10) : 1;
    const isBreak = breakInput ? breakInput.checked : false;

    if (!label) {
      showToast('Please enter a period slot label (e.g. Lecture 7)', 'error');
      return;
    }

    if (!state.shifts) state.shifts = {};
    if (!state.shifts[activeCfgShift]) state.shifts[activeCfgShift] = { periods: [] };
    if (!state.shifts[activeCfgShift].periods) state.shifts[activeCfgShift].periods = [];

    const newSlot = {
      id: `${activeCfgShift === 'morning' ? 'm' : 'p'}_slot_${Date.now()}`,
      number: num,
      label: label,
      time: time || 'Flexible Time',
      isBreak: isBreak
    };

    state.shifts[activeCfgShift].periods.push(newSlot);
    if (state.currentShift === activeCfgShift) {
      state.periods = JSON.parse(JSON.stringify(state.shifts[activeCfgShift].periods));
    }

    if (labelInput) labelInput.value = '';
    if (timeInput) timeInput.value = '';
    if (breakInput) breakInput.checked = false;

    saveState();
    renderPeriodSlotsTable();
    renderClassTimetable();
    renderClassTable();
    showToast(`Added slot "${label}" to ${activeCfgShift} shift`, 'success');
  }

  window.deletePeriodSlot = function(shift, periodId) {
    if (!confirm('Are you sure you want to remove this period slot?')) return;
    if (state.shifts && state.shifts[shift] && state.shifts[shift].periods) {
      state.shifts[shift].periods = state.shifts[shift].periods.filter(p => p.id !== periodId);
    }
    if (state.currentShift === shift && state.periods) {
      state.periods = state.periods.filter(p => p.id !== periodId);
    }
    saveState();
    renderPeriodSlotsTable();
    renderClassTimetable();
    renderClassTable();
    showToast('Period slot deleted', 'info');
  };

  function renderFacultySettingsPanel() {
    const teachersList = state.teachers || [];
    let mCount = 0, aCount = 0, bCount = 0, hCount = 0;

    teachersList.forEach(t => {
      const prof = (state.teacherProfiles && state.teacherProfiles[t]) || {};
      const s = prof.assignedShift || 'afternoon';
      if (s === 'morning') mCount++;
      else if (s === 'afternoon') aCount++;
      else if (s === 'both') bCount++;

      if (prof.workSchedule === 'half_day') hCount++;
    });

    const elTotal = document.getElementById('cfg-stat-total-teachers');
    const elM = document.getElementById('cfg-stat-morning-teachers');
    const elA = document.getElementById('cfg-stat-afternoon-teachers');
    const elB = document.getElementById('cfg-stat-both-teachers');
    const elH = document.getElementById('cfg-stat-halfday-teachers');
    if (elTotal) elTotal.textContent = teachersList.length;
    if (elM) elM.textContent = mCount;
    if (elA) elA.textContent = aCount;
    if (elB) elB.textContent = bCount;
    if (elH) elH.textContent = hCount;

    // Populate primary subject dropdown in add teacher form
    const newSubjSelect = document.getElementById('new-faculty-subject');
    if (newSubjSelect) {
      newSubjSelect.innerHTML = (state.subjects || []).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('') +
        `<option value="__NEW_SUBJECT__" style="font-weight: 700; color: #2563eb;">➕ + Add New Subject...</option>`;
      newSubjSelect.onchange = function() {
        if (this.value === '__NEW_SUBJECT__') {
          openQuickAddModal('subject', this);
        }
      };
    }

    // Populate faculty table
    const tbody = document.getElementById('cfg-faculty-tbody');
    if (!tbody) return;

    let html = '';
    teachersList.forEach(t => {
      const prof = (state.teacherProfiles && state.teacherProfiles[t]) || {};
      const shift = prof.assignedShift || 'afternoon';
      const work = prof.workSchedule || 'full_day';
      const halfday = prof.halfDayAvailability || 'all';
      const subj = prof.primarySubject || (state.subjects && state.subjects[0]) || 'English';
      const maxLec = prof.maxPeriods || 5;

      html += `
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #1e40af;"></span>
              ${escapeHtml(t)}
            </div>
          </td>
          <td>
            <select class="settings-select cfg-teacher-shift" data-teacher="${escapeHtml(t)}">
              <option value="afternoon" ${shift === 'afternoon' ? 'selected' : ''}>🌙 Afternoon Shift</option>
              <option value="morning" ${shift === 'morning' ? 'selected' : ''}>☀️ Morning Shift</option>
              <option value="both" ${shift === 'both' ? 'selected' : ''}>🔄 Both Shifts</option>
            </select>
          </td>
          <td>
            <select class="settings-select cfg-teacher-work" data-teacher="${escapeHtml(t)}">
              <option value="full_day" ${work === 'full_day' ? 'selected' : ''}>Full Day</option>
              <option value="half_day" ${work === 'half_day' ? 'selected' : ''}>⏳ Half Day</option>
            </select>
          </td>
          <td>
            <select class="settings-select cfg-teacher-halfday" data-teacher="${escapeHtml(t)}">
              <option value="all" ${halfday === 'all' ? 'selected' : ''}>All Periods (Full Shift)</option>
              <option value="first_half" ${halfday === 'first_half' ? 'selected' : ''}>First Half (Periods 1–3)</option>
              <option value="second_half" ${halfday === 'second_half' ? 'selected' : ''}>Second Half (Periods 4–6)</option>
            </select>
          </td>
          <td>
            <select class="settings-select cfg-teacher-subj" data-teacher="${escapeHtml(t)}">
              ${(state.subjects || []).map(s => `<option value="${escapeHtml(s)}" ${s === subj ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
              <option value="__NEW_SUBJECT__" style="font-weight: 700; color: #2563eb;">➕ + Add New Subject...</option>
            </select>
          </td>
          <td style="text-align: center;">
            <input type="number" class="settings-input cfg-teacher-max" data-teacher="${escapeHtml(t)}" value="${maxLec}" min="1" max="10" style="width: 70px; text-align: center;">
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-danger-outline btn-sm action-icon-btn" onclick="window.removeFacultyMember('${escapeHtml(t)}')" title="Remove Faculty">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    // Attach quick add listener to each row's subject select
    tbody.querySelectorAll('.cfg-teacher-subj').forEach(sel => {
      sel.onchange = function() {
        if (this.value === '__NEW_SUBJECT__') {
          openQuickAddModal('subject', this);
        }
      };
    });
  }

  function saveFacultyAllocations() {
    if (!state.teacherProfiles) state.teacherProfiles = {};

    const tbody = document.getElementById('cfg-faculty-tbody');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(row => {
      const shiftSelect = row.querySelector('.cfg-teacher-shift');
      const workSelect = row.querySelector('.cfg-teacher-work');
      const halfdaySelect = row.querySelector('.cfg-teacher-halfday');
      const subjSelect = row.querySelector('.cfg-teacher-subj');
      const maxInput = row.querySelector('.cfg-teacher-max');

      if (!shiftSelect) return;
      const teacher = shiftSelect.getAttribute('data-teacher');
      if (!teacher) return;

      if (!state.teacherProfiles[teacher]) state.teacherProfiles[teacher] = {};
      state.teacherProfiles[teacher].assignedShift = shiftSelect.value;
      state.teacherProfiles[teacher].workSchedule = workSelect.value;
      state.teacherProfiles[teacher].halfDayAvailability = halfdaySelect.value;
      state.teacherProfiles[teacher].primarySubject = subjSelect.value;
      state.teacherProfiles[teacher].maxPeriods = maxInput ? parseInt(maxInput.value, 10) || 5 : 5;
    });

    saveState();
    renderAll();
    showToast('Faculty shift allocations, work hours & schedules saved successfully', 'success');
  }

  function addNewFacultyMember() {
    const nameInput = document.getElementById('new-faculty-name');
    const shiftInput = document.getElementById('new-faculty-shift');
    const workInput = document.getElementById('new-faculty-worktype');
    const halfdayInput = document.getElementById('new-faculty-halfday-slot');
    const subjInput = document.getElementById('new-faculty-subject');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Please enter a faculty name (e.g. Meera Ma\'am)', 'error');
      return;
    }
    if ((state.teachers || []).includes(name)) {
      showToast('A faculty member with this name already exists', 'error');
      return;
    }

    if (!state.teachers) state.teachers = [];
    state.teachers.push(name);

    if (!state.teacherProfiles) state.teacherProfiles = {};
    state.teacherProfiles[name] = {
      assignedShift: shiftInput ? shiftInput.value : 'afternoon',
      workSchedule: workInput ? workInput.value : 'full_day',
      halfDayAvailability: halfdayInput ? halfdayInput.value : 'all',
      primarySubject: subjInput ? subjInput.value : 'English',
      maxPeriods: 5
    };

    if (nameInput) nameInput.value = '';
    saveState();
    renderFacultySettingsPanel();
    renderAll();
    showToast(`Added ${name} to Faculty Roster`, 'success');
  }

  window.removeFacultyMember = function(teacherName) {
    if (!confirm(`Are you sure you want to remove ${teacherName} from the school faculty roster?`)) return;
    state.teachers = (state.teachers || []).filter(t => t !== teacherName);
    if (state.teacherProfiles && state.teacherProfiles[teacherName]) {
      delete state.teacherProfiles[teacherName];
    }
    saveState();
    renderFacultySettingsPanel();
    renderAll();
    showToast(`Removed ${teacherName} from roster`, 'info');
  };

  function renderProfileSettingsPanel() {
    const p = state.schoolProfile || state.schoolInfo || {};
    const nameEl = document.getElementById('cfg-school-name');
    const affEl = document.getElementById('cfg-school-affiliation');
    const sessEl = document.getElementById('cfg-school-session');
    const termEl = document.getElementById('cfg-school-term');
    const prepEl = document.getElementById('cfg-sign-prep');
    const verEl = document.getElementById('cfg-sign-ver');
    const appEl = document.getElementById('cfg-sign-app');
    const logoImg = document.getElementById('cfg-logo-preview-img');
    const logoPh = document.getElementById('cfg-logo-placeholder');

    if (nameEl) nameEl.value = p.name || 'FUNLAND ENGLISH MEDIUM SCHOOL';
    if (affEl) affEl.value = p.affiliation || 'School Timetable Management Portal';
    if (sessEl) sessEl.value = p.session || 'Academic Session: 2026–2027';
    if (termEl) termEl.value = p.term || 'Term 1 (April – September)';
    if (prepEl) prepEl.value = p.preparedBy || 'TimeTable In-Charge';
    if (verEl) verEl.value = p.verifiedBy || 'Academic Coordinator';
    if (appEl) appEl.value = p.approvedBy || 'Principal';

    if (p.logo) {
      if (logoImg) { logoImg.src = p.logo; logoImg.style.display = 'block'; }
      if (logoPh) logoPh.style.display = 'none';
    } else {
      if (logoImg) logoImg.style.display = 'none';
      if (logoPh) logoPh.style.display = 'block';
    }
  }

  function saveInstitutionalProfileSettings() {
    if (!state.schoolProfile) state.schoolProfile = {};
    const name = (document.getElementById('cfg-school-name') || {}).value || 'FUNLAND ENGLISH MEDIUM SCHOOL';
    const aff = (document.getElementById('cfg-school-affiliation') || {}).value || '';
    const sess = (document.getElementById('cfg-school-session') || {}).value || 'Academic Session: 2026–2027';
    const term = (document.getElementById('cfg-school-term') || {}).value || 'Term 1';
    const prep = (document.getElementById('cfg-sign-prep') || {}).value || 'TimeTable In-Charge';
    const ver = (document.getElementById('cfg-sign-ver') || {}).value || 'Academic Coordinator';
    const app = (document.getElementById('cfg-sign-app') || {}).value || 'Principal';

    state.schoolProfile.name = name.trim();
    state.schoolProfile.affiliation = aff.trim();
    state.schoolProfile.session = sess.trim();
    state.schoolProfile.term = term.trim();
    state.schoolProfile.preparedBy = prep.trim();
    state.schoolProfile.verifiedBy = ver.trim();
    state.schoolProfile.approvedBy = app.trim();

    state.schoolInfo = Object.assign({}, state.schoolProfile);

    saveState();
    renderSchoolProfile();
    showToast('Institutional school profile & signatories saved successfully', 'success');
  }

  function handleSettingsLogoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (!state.schoolProfile) state.schoolProfile = {};
      state.schoolProfile.logo = evt.target.result;
      if (!state.schoolInfo) state.schoolInfo = {};
      state.schoolInfo.logo = evt.target.result;
      renderProfileSettingsPanel();
      renderSchoolProfile();
      saveState();
      showToast('School logo updated successfully', 'success');
    };
    reader.readAsDataURL(file);
  }

  function removeSettingsLogo() {
    if (state.schoolProfile) delete state.schoolProfile.logo;
    if (state.schoolInfo) delete state.schoolInfo.logo;
    renderProfileSettingsPanel();
    renderSchoolProfile();
    saveState();
    showToast('School logo removed', 'info');
  }

  let activeCfgStandardsShift = 'afternoon';

  function initStandardsSettingsEvents() {
    const btnM = document.getElementById('cfg-btn-shift-morning');
    const btnA = document.getElementById('cfg-btn-shift-afternoon');
    const desc = document.getElementById('cfg-std-shift-desc');
    const newShiftSelect = document.getElementById('new-std-shift');

    if (btnM) {
      btnM.onclick = () => {
        activeCfgStandardsShift = 'morning';
        btnM.classList.add('active');
        if (btnA) btnA.classList.remove('active');
        if (desc) desc.innerHTML = 'Currently configuring classes for <strong>Morning Shift</strong> (e.g. Nursery to 2nd).';
        if (newShiftSelect) newShiftSelect.value = 'morning';
        renderStandardsSettingsPanel();
      };
    }

    if (btnA) {
      btnA.onclick = () => {
        activeCfgStandardsShift = 'afternoon';
        btnA.classList.add('active');
        if (btnM) btnM.classList.remove('active');
        if (desc) desc.innerHTML = 'Currently configuring classes for <strong>Afternoon Shift</strong> (Std 3rd to 8th).';
        if (newShiftSelect) newShiftSelect.value = 'afternoon';
        renderStandardsSettingsPanel();
      };
    }
  }

  function renderStandardsSettingsPanel() {
    const tbody = document.getElementById('cfg-standards-tbody');
    if (!tbody) return;

    initStandardsSettingsEvents();

    const countBadge = document.getElementById('cfg-std-count-badge');
    const filteredStds = (state.standards || []).filter(s => (s.shift || 'afternoon') === activeCfgStandardsShift);
    
    if (countBadge) {
      const shiftName = activeCfgStandardsShift === 'morning' ? 'Morning' : 'Afternoon';
      countBadge.textContent = `${filteredStds.length} ${shiftName} Classes`;
    }

    let html = '';
    filteredStds.forEach(std => {
      html += `
        <tr>
          <td style="font-weight: 700; color: #64748b;">${escapeHtml(std.id)}</td>
          <td>
            <input type="text" class="settings-input cfg-std-name" data-id="${std.id}" value="${escapeHtml(std.name)}" style="width: 180px; font-weight: 600;">
          </td>
          <td>
            <select class="settings-input cfg-std-shift" data-id="${std.id}" style="width: 140px; font-weight: 600; padding: 4px 8px; font-size: 12px;">
              <option value="morning" ${std.shift === 'morning' ? 'selected' : ''}>☀️ Morning Shift</option>
              <option value="afternoon" ${(std.shift || 'afternoon') === 'afternoon' ? 'selected' : ''}>🌙 Afternoon Shift</option>
            </select>
          </td>
          <td>
            <input type="text" class="settings-input cfg-std-room" data-id="${std.id}" value="${escapeHtml(std.room || '')}" placeholder="Room #" style="width: 140px;">
          </td>
          <td style="text-align: center;">
            <input type="number" class="settings-input cfg-std-cap" data-id="${std.id}" value="${std.capacity || 35}" min="10" max="100" style="width: 70px; text-align: center;">
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn btn-danger-outline btn-sm action-icon-btn" onclick="window.deleteStandardConfig('${std.id}')" title="Delete Class">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </td>
        </tr>`;
    });

    if (filteredStds.length === 0) {
      html = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No classes configured for this shift yet. Use the form below to add classes.</td></tr>`;
    }

    tbody.innerHTML = html;
  }

  function saveStandardsConfig() {
    const tbody = document.getElementById('cfg-standards-tbody');
    if (!tbody) return;

    tbody.querySelectorAll('tr').forEach(row => {
      const nameInput = row.querySelector('.cfg-std-name');
      const shiftSelect = row.querySelector('.cfg-std-shift');
      const roomInput = row.querySelector('.cfg-std-room');
      const capInput = row.querySelector('.cfg-std-cap');
      if (!nameInput) return;

      const stdId = nameInput.getAttribute('data-id');
      const found = (state.standards || []).find(s => s.id === stdId);
      if (found) {
        found.name = nameInput.value.trim();
        found.shift = shiftSelect ? shiftSelect.value : (found.shift || 'afternoon');
        found.room = roomInput ? roomInput.value.trim() : '';
        found.capacity = capInput ? parseInt(capInput.value, 10) || 35 : 35;
      }
    });

    saveState();
    renderStandardsSettingsPanel();
    renderAll();
    showToast('Standards directory updated successfully', 'success');
  }

  function addNewStandardConfig() {
    const nameInput = document.getElementById('new-std-name');
    const shiftSelect = document.getElementById('new-std-shift');
    const roomInput = document.getElementById('new-std-room');
    const capInput = document.getElementById('new-std-students');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast('Please enter a class name (e.g. Standard: 9th or Nursery)', 'error');
      return;
    }

    const shift = shiftSelect ? shiftSelect.value : activeCfgStandardsShift;
    const newId = `std_${Date.now()}`;
    const newStd = {
      id: newId,
      name: name,
      shift: shift,
      room: roomInput ? roomInput.value.trim() : '',
      capacity: capInput ? parseInt(capInput.value, 10) || 35 : 35
    };

    if (!state.standards) state.standards = [];
    state.standards.push(newStd);

    if (nameInput) nameInput.value = '';
    if (roomInput) roomInput.value = '';

    saveState();
    renderStandardsSettingsPanel();
    renderAll();
    showToast(`Added ${name} to ${shift === 'morning' ? 'Morning' : 'Afternoon'} Shift`, 'success');
  }

  window.deleteStandardConfig = function(stdId) {
    if (!confirm('Are you sure you want to remove this standard?')) return;
    state.standards = (state.standards || []).filter(s => s.id !== stdId);
    saveState();
    renderStandardsSettingsPanel();
    renderAll();
    showToast('Standard removed', 'info');
  };

  // --- Academic Subjects Master Table & Management ---
  function renderSubjectsSettingsPanel() {
    if (!state.subjectDetails) {
      state.subjectDetails = JSON.parse(JSON.stringify((typeof DEFAULT_DATA !== 'undefined' && DEFAULT_DATA.subjectDetails) || {}));
    }
    const subjects = state.subjects || [];

    // Ensure every subject has a details object
    subjects.forEach(sub => {
      if (!state.subjectDetails[sub]) {
        state.subjectDetails[sub] = {
          code: sub.substring(0, 4).toUpperCase(),
          category: 'Core Academic',
          color: '#2563eb',
          weeklyPeriods: 5
        };
      }
    });

    // 1. Calculate Stats
    let coreCount = 0;
    let langCount = 0;
    let actCount = 0;
    subjects.forEach(s => {
      const cat = (state.subjectDetails[s] && state.subjectDetails[s].category) || 'Core Academic';
      if (cat === 'Core Academic') coreCount++;
      else if (cat === 'Language') langCount++;
      else actCount++;
    });

    if (DOM.cfgStatTotalSubjects) DOM.cfgStatTotalSubjects.textContent = subjects.length;
    if (DOM.cfgStatCoreSubjects) DOM.cfgStatCoreSubjects.textContent = coreCount;
    if (DOM.cfgStatLangSubjects) DOM.cfgStatLangSubjects.textContent = langCount;
    if (DOM.cfgStatActivitySubjects) DOM.cfgStatActivitySubjects.textContent = actCount;
    if (DOM.cfgSubjectCount) DOM.cfgSubjectCount.textContent = `${subjects.length} Subjects`;

    // 2. Calculate Active Timetable Slots count per subject
    const occMap = {};
    subjects.forEach(s => occMap[s] = 0);
    ['morning', 'afternoon'].forEach(sh => {
      const shData = state.shifts && state.shifts[sh];
      if (shData && shData.schedules) {
        Object.values(shData.schedules).forEach(daySched => {
          Object.values(daySched).forEach(slotObj => {
            Object.values(slotObj).forEach(slot => {
              if (slot && slot.subject && occMap[slot.subject] !== undefined) {
                occMap[slot.subject]++;
              }
            });
          });
        });
      }
    });

    // 3. Calculate Faculty Specialists per subject
    const teachersMap = {};
    subjects.forEach(s => teachersMap[s] = []);
    Object.entries(state.teacherProfiles || {}).forEach(([t, prof]) => {
      if (prof && prof.primarySubject && teachersMap[prof.primarySubject]) {
        teachersMap[prof.primarySubject].push(t);
      }
    });

    // 4. Render Master Table rows
    if (DOM.cfgSubjectsTbody) {
      let tbodyHtml = '';
      subjects.forEach(sub => {
        const details = state.subjectDetails[sub] || {
          code: sub.substring(0, 4).toUpperCase(),
          category: 'Core Academic',
          color: '#2563eb',
          weeklyPeriods: 5
        };
        const teachersList = teachersMap[sub] || [];
        const slotsCount = occMap[sub] || 0;

        let teacherPills = '<span style="color: #94a3b8; font-size: 11.5px; font-style: italic;">None assigned</span>';
        if (teachersList.length > 0) {
          teacherPills = teachersList.map(t => `<span style="display: inline-block; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 4px; margin-bottom: 2px;">${escapeHtml(t)}</span>`).join('');
        }

        tbodyHtml += `
          <tr>
            <td>
              <span class="subject-code-badge" style="background: ${details.color || '#2563eb'};">
                ${escapeHtml(details.code || sub.substring(0, 3).toUpperCase())}
              </span>
            </td>
            <td>
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">
                ${escapeHtml(sub)}
              </div>
            </td>
            <td>
              <span class="subject-cat-pill">
                ${escapeHtml(details.category || 'Core Academic')}
              </span>
            </td>
            <td style="text-align: center; font-weight: 700; color: #475569;">
              ${details.weeklyPeriods || 5} / week
            </td>
            <td>
              <div style="display: flex; flex-wrap: wrap; gap: 2px; align-items: center;">
                ${teacherPills}
              </div>
            </td>
            <td style="text-align: center;">
              <span style="display: inline-block; background: ${slotsCount > 0 ? '#ecfdf5' : '#f1f5f9'}; color: ${slotsCount > 0 ? '#047857' : '#64748b'}; border: 1px solid ${slotsCount > 0 ? '#a7f3d0' : '#cbd5e1'}; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 10px;">
                ${slotsCount} ${slotsCount === 1 ? 'slot' : 'slots'}
              </span>
            </td>
            <td style="text-align: center;">
              <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                <button type="button" class="btn btn-secondary btn-sm action-icon-btn" onclick="window.editSubjectConfig('${escapeHtml(sub)}')" title="Edit Subject Details">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button type="button" class="btn btn-danger-outline btn-sm action-icon-btn" onclick="window.removeSubjectConfig('${escapeHtml(sub)}')" title="Delete Subject">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>`;
      });
      DOM.cfgSubjectsTbody.innerHTML = tbodyHtml;
    }

    // 5. Render Chips view for backward compatibility
    if (DOM.cfgSubjectsChipsContainer) {
      let chipsHtml = '';
      subjects.forEach(sub => {
        const details = (state.subjectDetails && state.subjectDetails[sub]) || {};
        chipsHtml += `
          <span class="subject-chip" style="display: inline-flex; align-items: center; gap: 6px; background: #ffffff; border: 1px solid var(--border-color); padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #0f172a;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${details.color || '#2563eb'};"></span>
            ${escapeHtml(sub)}
            <button type="button" class="chip-remove-btn" onclick="window.removeSubjectConfig('${escapeHtml(sub)}')" title="Remove Subject">&times;</button>
          </span>`;
      });
      DOM.cfgSubjectsChipsContainer.innerHTML = chipsHtml;
    }
  }

  function addNewSubjectConfig() {
    const nameInp = DOM.newSubjectName || document.getElementById('new-subject-name');
    const sub = nameInp ? nameInp.value.trim() : '';
    if (!sub) {
      showToast('Please enter a subject name', 'error');
      return;
    }
    if ((state.subjects || []).includes(sub)) {
      showToast('Subject already exists in catalog', 'error');
      return;
    }

    const codeInp = DOM.newSubjectCode || document.getElementById('new-subject-code');
    const catInp = DOM.newSubjectCategory || document.getElementById('new-subject-category');
    const colorInp = DOM.newSubjectColor || document.getElementById('new-subject-color');
    const periodsInp = DOM.newSubjectPeriods || document.getElementById('new-subject-periods');

    const code = (codeInp && codeInp.value.trim()) ? codeInp.value.trim().toUpperCase() : sub.substring(0, 4).toUpperCase();
    const category = (catInp && catInp.value) ? catInp.value : 'Core Academic';
    const color = (colorInp && colorInp.value) ? colorInp.value : '#2563eb';
    const weeklyPeriods = (periodsInp && parseInt(periodsInp.value, 10)) || 5;

    if (!state.subjects) state.subjects = [];
    state.subjects.push(sub);

    if (!state.subjectDetails) state.subjectDetails = {};
    state.subjectDetails[sub] = { code, category, color, weeklyPeriods };

    if (nameInp) nameInp.value = '';
    if (codeInp) codeInp.value = '';

    saveState();
    renderSubjectsSettingsPanel();
    renderAll();
    showToast(`Added "${sub}" (${code}) to Subjects Master Directory`, 'success');
  }

  function saveSubjectsConfig() {
    saveState();
    renderAll();
    showToast('Academic subjects catalog saved', 'success');
  }

  window.editSubjectConfig = function(oldSub) {
    const current = (state.subjectDetails && state.subjectDetails[oldSub]) || {
      code: oldSub.substring(0, 4).toUpperCase(),
      category: 'Core Academic',
      color: '#2563eb',
      weeklyPeriods: 5
    };

    const newName = prompt('Enter Subject Name:', oldSub);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('Subject name cannot be empty', 'error');
      return;
    }

    const newCode = prompt('Enter Short Code (e.g. ENG, MATH):', current.code || trimmed.substring(0, 4).toUpperCase());
    if (newCode === null) return;

    if (trimmed !== oldSub && (state.subjects || []).includes(trimmed)) {
      showToast(`Subject "${trimmed}" already exists`, 'error');
      return;
    }

    // Cascade rename if changed
    if (trimmed !== oldSub) {
      // 1. Update state.subjects
      const idx = state.subjects.indexOf(oldSub);
      if (idx !== -1) state.subjects[idx] = trimmed;

      // 2. Update state.subjectDetails
      delete state.subjectDetails[oldSub];
      state.subjectDetails[trimmed] = {
        code: (newCode || trimmed.substring(0, 4)).toUpperCase().trim(),
        category: current.category || 'Core Academic',
        color: current.color || '#2563eb',
        weeklyPeriods: current.weeklyPeriods || 5
      };

      // 3. Cascade to teacher profiles
      Object.keys(state.teacherProfiles || {}).forEach(t => {
        if (state.teacherProfiles[t].primarySubject === oldSub) {
          state.teacherProfiles[t].primarySubject = trimmed;
        }
      });

      // 4. Cascade to shifts schedules
      ['morning', 'afternoon'].forEach(sh => {
        const shData = state.shifts && state.shifts[sh];
        if (shData && shData.schedules) {
          Object.values(shData.schedules).forEach(daySched => {
            Object.values(daySched).forEach(slotObj => {
              Object.values(slotObj).forEach(slot => {
                if (slot && slot.subject === oldSub) {
                  slot.subject = trimmed;
                }
              });
            });
          });
        }
      });

      // 5. Cascade to active schedule
      if (state.schedules) {
        Object.values(state.schedules).forEach(daySched => {
          Object.values(daySched).forEach(slotObj => {
            Object.values(slotObj).forEach(slot => {
              if (slot && slot.subject === oldSub) {
                slot.subject = trimmed;
              }
            });
          });
        });
      }
    } else {
      state.subjectDetails[trimmed].code = (newCode || trimmed.substring(0, 4)).toUpperCase().trim();
    }

    saveState();
    renderSubjectsSettingsPanel();
    renderAll();
    showToast(`Updated "${trimmed}" successfully`, 'success');
  };

  window.removeSubjectConfig = function(sub) {
    if (!confirm(`Are you sure you want to remove "${sub}" from the subjects catalog?\nThis will remove it from future selections.`)) return;
    state.subjects = (state.subjects || []).filter(s => s !== sub);
    if (state.subjectDetails && state.subjectDetails[sub]) {
      delete state.subjectDetails[sub];
    }
    saveState();
    renderSubjectsSettingsPanel();
    renderAll();
    showToast(`Removed "${sub}" from Catalog`, 'info');
  };

  // ==========================================================================
  // UNIVERSAL QUICK-ADD CONTROLLER (1-Click Creation from Anywhere)
  // ==========================================================================
  window.openQuickAddModal = function(type = 'subject', callerSelect = null) {
    if (!DOM.universalQuickAddModal) return;

    if (callerSelect) {
      if (typeof callerSelect === 'string') {
        DOM.quickAddTargetSelectId.value = callerSelect;
      } else if (callerSelect.id) {
        DOM.quickAddTargetSelectId.value = callerSelect.id;
      } else {
        DOM.quickAddTargetSelectId.value = '';
        DOM.quickAddTargetSelectId._callerEl = callerSelect;
      }
    } else {
      DOM.quickAddTargetSelectId.value = '';
      DOM.quickAddTargetSelectId._callerEl = null;
    }

    switchQuickAddTab(type);

    // Refresh teacher primary subject dropdown
    if (DOM.quickTeacherSubject) {
      DOM.quickTeacherSubject.innerHTML = (state.subjects || []).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }

    DOM.universalQuickAddModal.classList.add('active');
  };

  function closeQuickAddModal() {
    if (DOM.universalQuickAddModal) {
      DOM.universalQuickAddModal.classList.remove('active');
    }
    if (DOM.quickAddTargetSelectId) {
      DOM.quickAddTargetSelectId.value = '';
      DOM.quickAddTargetSelectId._callerEl = null;
    }
  }

  function switchQuickAddTab(type) {
    const tabBtns = document.querySelectorAll('.quick-add-tab-btn');
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });

    const panes = document.querySelectorAll('.quick-add-pane');
    panes.forEach(pane => {
      if (pane.id === `quick-pane-${type}`) {
        pane.style.display = 'block';
        pane.classList.add('active');
      } else {
        pane.style.display = 'none';
        pane.classList.remove('active');
      }
    });

    if (DOM.quickAddModalTitle) {
      if (type === 'subject') DOM.quickAddModalTitle.textContent = 'Quick Create: New Subject';
      else if (type === 'teacher') DOM.quickAddModalTitle.textContent = 'Quick Create: New Faculty';
      else if (type === 'class') DOM.quickAddModalTitle.textContent = 'Quick Create: New Class / Standard';
    }
  }

  function saveQuickAddEntity() {
    const activeBtn = document.querySelector('.quick-add-tab-btn.active');
    const type = activeBtn ? activeBtn.getAttribute('data-type') : 'subject';

    let createdValue = '';

    if (type === 'subject') {
      const nameInp = DOM.quickSubjectName || document.getElementById('quick-subject-name');
      const name = nameInp ? nameInp.value.trim() : '';
      if (!name) {
        showToast('Please enter a subject name', 'error');
        return;
      }
      if ((state.subjects || []).includes(name)) {
        showToast('Subject already exists', 'error');
        return;
      }

      const codeInp = DOM.quickSubjectCode || document.getElementById('quick-subject-code');
      const catInp = DOM.quickSubjectCategory || document.getElementById('quick-subject-category');
      const colorInp = DOM.quickSubjectColor || document.getElementById('quick-subject-color');
      const periodsInp = DOM.quickSubjectPeriods || document.getElementById('quick-subject-periods');

      const code = (codeInp && codeInp.value.trim()) ? codeInp.value.trim().toUpperCase() : name.substring(0, 4).toUpperCase();
      const category = (catInp && catInp.value) ? catInp.value : 'Core Academic';
      const color = (colorInp && colorInp.value) ? colorInp.value : '#2563eb';
      const weeklyPeriods = (periodsInp && parseInt(periodsInp.value, 10)) || 5;

      if (!state.subjects) state.subjects = [];
      state.subjects.push(name);

      if (!state.subjectDetails) state.subjectDetails = {};
      state.subjectDetails[name] = { code, category, color, weeklyPeriods };

      if (nameInp) nameInp.value = '';
      if (codeInp) codeInp.value = '';

      createdValue = name;
      showToast(`Created subject "${name}" (${code})`, 'success');

    } else if (type === 'teacher') {
      const nameInp = DOM.quickTeacherName || document.getElementById('quick-teacher-name');
      const name = nameInp ? nameInp.value.trim() : '';
      if (!name) {
        showToast('Please enter teacher name', 'error');
        return;
      }
      if ((state.teachers || []).includes(name)) {
        showToast('Teacher already exists in roster', 'error');
        return;
      }

      const shiftInp = DOM.quickTeacherShift || document.getElementById('quick-teacher-shift');
      const subjInp = DOM.quickTeacherSubject || document.getElementById('quick-teacher-subject');
      const workInp = DOM.quickTeacherWork || document.getElementById('quick-teacher-work');
      const halfInp = DOM.quickTeacherHalfday || document.getElementById('quick-teacher-halfday');

      const shift = (shiftInp && shiftInp.value) || 'afternoon';
      const primarySubject = (subjInp && subjInp.value) || (state.subjects && state.subjects[0]) || 'English';
      const workSchedule = (workInp && workInp.value) || 'full_day';
      const halfDayAvailability = (halfInp && halfInp.value) || 'all';

      if (!state.teachers) state.teachers = [];
      state.teachers.push(name);

      if (!state.teacherProfiles) state.teacherProfiles = {};
      state.teacherProfiles[name] = {
        primarySubject,
        maxPeriods: 5,
        assignedShift: shift,
        workSchedule,
        halfDayAvailability
      };

      if (nameInp) nameInp.value = '';
      createdValue = name;
      showToast(`Added teacher "${name}" to roster`, 'success');

    } else if (type === 'class') {
      const nameInp = DOM.quickClassName || document.getElementById('quick-class-name');
      const name = nameInp ? nameInp.value.trim() : '';
      if (!name) {
        showToast('Please enter class name', 'error');
        return;
      }

      const shiftInp = DOM.quickClassShift || document.getElementById('quick-class-shift');
      const roomInp = DOM.quickClassRoom || document.getElementById('quick-class-room');
      const capInp = DOM.quickClassCapacity || document.getElementById('quick-class-capacity');

      const shift = (shiftInp && shiftInp.value) || 'afternoon';
      const room = (roomInp && roomInp.value.trim()) || 'Room 101';
      const capacity = (capInp && parseInt(capInp.value, 10)) || 35;

      const newId = 'std_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if ((state.standards || []).some(s => s.id === newId || s.name.toLowerCase() === name.toLowerCase())) {
        showToast('Class already exists', 'error');
        return;
      }

      if (!state.standards) state.standards = [];
      state.standards.push({
        id: newId,
        name,
        shift,
        room,
        capacity
      });

      if (nameInp) nameInp.value = '';
      createdValue = newId;
      showToast(`Added class "${name}" (${shift})`, 'success');
    }

    saveState();
    renderAll();
    renderSubjectsSettingsPanel();
    renderFacultySettingsPanel();
    renderStandardsSettingsPanel();

    // If there was a caller select, auto-select the newly created item!
    const targetSelectId = DOM.quickAddTargetSelectId ? DOM.quickAddTargetSelectId.value : '';
    let targetEl = targetSelectId ? document.getElementById(targetSelectId) : null;
    if (!targetEl && DOM.quickAddTargetSelectId && DOM.quickAddTargetSelectId._callerEl) {
      targetEl = DOM.quickAddTargetSelectId._callerEl;
    }

    if (targetEl && createdValue) {
      if (type === 'subject') {
        let hasOpt = Array.from(targetEl.options).some(o => o.value === createdValue);
        if (!hasOpt) {
          const opt = document.createElement('option');
          opt.value = createdValue;
          opt.textContent = createdValue;
          targetEl.appendChild(opt);
        }
        targetEl.value = createdValue;
        if (targetEl.onchange) targetEl.onchange();
      } else if (type === 'teacher') {
        let hasOpt = Array.from(targetEl.options).some(o => o.value === createdValue);
        if (!hasOpt) {
          const opt = document.createElement('option');
          opt.value = createdValue;
          opt.textContent = createdValue;
          targetEl.appendChild(opt);
        }
        targetEl.value = createdValue;
        if (targetEl.onchange) targetEl.onchange();
      }
    }

    closeQuickAddModal();
  }

  function renderCloudDbSettingsPanel() {
    const autoStatus = document.getElementById('settings-auto-status');
    const hasFirebase = typeof FirebaseSync !== 'undefined' && FirebaseSync.isConfigured();
    if (autoStatus) {
      autoStatus.innerHTML = `
        <span class="dot" style="width: 7px; height: 7px; border-radius: 50%; background: ${hasFirebase ? '#059669' : '#d97706'}; display: inline-block;"></span>
        ${hasFirebase ? 'Cloud Database Connected (timetabalemanager)' : 'Local Storage Active'}
      `;
    }

    const cfg = (typeof FirebaseSync !== 'undefined' && FirebaseSync.getConfig()) || {
      apiKey: "AIzaSyBpI3-EsHeAq--nYAPrr00rz9vyER4gypo",
      projectId: "timetabalemanager",
      authDomain: "timetabalemanager.firebaseapp.com",
      appId: "1:303254714470:web:9c6cba93d7c577a4a90890"
    };

    const inKey = document.getElementById('cfg-fb-apiKey');
    const inProj = document.getElementById('cfg-fb-projectId');
    const inAuth = document.getElementById('cfg-fb-authDomain');
    const inApp = document.getElementById('cfg-fb-appId');

    if (inKey && !inKey.value) inKey.value = cfg.apiKey || '';
    if (inProj && !inProj.value) inProj.value = cfg.projectId || '';
    if (inAuth && !inAuth.value) inAuth.value = cfg.authDomain || '';
    if (inApp && !inApp.value) inApp.value = cfg.appId || '';
  }

  // --- Setup Event Listeners ---
  function setupEventListeners() {
    // Collapsible Sidebar Toggle & State Persistence
    if (localStorage.getItem('timetable_sidebar_collapsed') === 'true') {
      if (DOM.appSidebar) DOM.appSidebar.classList.add('collapsed');
    }

    if (DOM.btnSidebarCollapse) {
      DOM.btnSidebarCollapse.onclick = () => {
        if (DOM.appSidebar) {
          DOM.appSidebar.classList.toggle('collapsed');
          localStorage.setItem('timetable_sidebar_collapsed', DOM.appSidebar.classList.contains('collapsed'));
        }
      };
    }

    if (DOM.btnMobileSidebarToggle) {
      DOM.btnMobileSidebarToggle.onclick = () => {
        if (DOM.appSidebar) {
          DOM.appSidebar.classList.toggle('mobile-open');
        }
      };
    }

    // Dashboard Quick Export Button
    if (DOM.dashBtnQuickExport) {
      DOM.dashBtnQuickExport.onclick = downloadAllDaysDocx;
    }

    // View tabs
    DOM.viewTabBtns.forEach(btn => {
      btn.onclick = () => switchView(btn.getAttribute('data-view'));
    });

    if (DOM.btnCloseProfileModal) DOM.btnCloseProfileModal.onclick = () => DOM.schoolProfileModal.classList.remove('active');
    if (DOM.btnSaveSchoolProfile) DOM.btnSaveSchoolProfile.onclick = saveSchoolProfile;
    if (DOM.inputLogoFile) DOM.inputLogoFile.onchange = handleLogoUpload;
    if (DOM.btnRemoveLogo) DOM.btnRemoveLogo.onclick = removeLogo;

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
    DOM.btnCloseCopyModal.onclick = () => DOM.copyModal.classList.remove('active');
    DOM.btnCancelCopy.onclick = () => DOM.copyModal.classList.remove('active');
    DOM.btnConfirmCopy.onclick = executeCopySchedule;

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

    if (DOM.btnCloseSettingsModal) DOM.btnCloseSettingsModal.onclick = () => DOM.settingsModal?.classList.remove('active');
    if (DOM.btnCloseSettings) DOM.btnCloseSettings.onclick = () => DOM.settingsModal?.classList.remove('active');
    if (DOM.btnAddTeacher) DOM.btnAddTeacher.onclick = addTeacher;
    if (DOM.btnAddSubject) DOM.btnAddSubject.onclick = addSubject;
    if (DOM.settingsNewTeacher) DOM.settingsNewTeacher.onkeydown = (e) => { if (e.key === 'Enter') addTeacher(); };
    if (DOM.settingsNewSubject) DOM.settingsNewSubject.onkeydown = (e) => { if (e.key === 'Enter') addSubject(); };

    // Subjects Master Catalog Actions
    if (DOM.btnAddNewSubject) DOM.btnAddNewSubject.onclick = addNewSubjectConfig;
    if (DOM.btnSaveSubjectsSettings) DOM.btnSaveSubjectsSettings.onclick = saveSubjectsConfig;
    if (DOM.newSubjectName) DOM.newSubjectName.onkeydown = (e) => { if (e.key === 'Enter') addNewSubjectConfig(); };

    // Quick-Add Trigger Buttons
    if (DOM.btnTopbarQuickCreate) DOM.btnTopbarQuickCreate.onclick = () => openQuickAddModal('subject');
    if (DOM.btnQuickNewSubjectFaculty) DOM.btnQuickNewSubjectFaculty.onclick = () => openQuickAddModal('subject', DOM.newFacultySubject);
    if (DOM.btnQuickNewSubjectSlot) DOM.btnQuickNewSubjectSlot.onclick = () => openQuickAddModal('subject', DOM.classCellSubject);
    if (DOM.btnQuickNewTeacherSlot) DOM.btnQuickNewTeacherSlot.onclick = () => openQuickAddModal('teacher', DOM.classCellTeacher);
    if (DOM.btnQuickNewSubjectPeriodModal) DOM.btnQuickNewSubjectPeriodModal.onclick = () => openQuickAddModal('subject');
    if (DOM.btnQuickNewTeacherPeriodModal) DOM.btnQuickNewTeacherPeriodModal.onclick = () => openQuickAddModal('teacher');
    if (DOM.btnQuickNewClassView) DOM.btnQuickNewClassView.onclick = () => openQuickAddModal('class');
    if (DOM.btnQuickNewTeacherView) DOM.btnQuickNewTeacherView.onclick = () => openQuickAddModal('teacher', DOM.selectTeacherFilter);

    // Universal Quick-Add Modal Actions
    if (DOM.btnCloseQuickAddModal) DOM.btnCloseQuickAddModal.onclick = closeQuickAddModal;
    if (DOM.btnCancelQuickAdd) DOM.btnCancelQuickAdd.onclick = closeQuickAddModal;
    if (DOM.btnSaveQuickAdd) DOM.btnSaveQuickAdd.onclick = saveQuickAddEntity;
    if (DOM.quickAddTabBtns) {
      DOM.quickAddTabBtns.forEach(btn => {
        btn.onclick = () => switchQuickAddTab(btn.getAttribute('data-type'));
      });
    }

    // Cloud Database: clicking saveBadge navigates to Master Settings Cloud DB Tab
    if (DOM.saveBadge) {
      DOM.saveBadge.onclick = () => {
        switchView('settings-view');
        switchSettingsTab('tab-cloud-db');
      };
    }
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
    DOM.modalCustomSubject.oninput = () => {
      editingCell.subject = DOM.modalCustomSubject.value;
      renderModalChips();
    };
    DOM.modalCustomTeacher.oninput = () => {
      editingCell.teacher = DOM.modalCustomTeacher.value;
    };

    // Class-Wise Dedicated Timetable Actions
    if (DOM.btnDownloadSelectedClassDocx) DOM.btnDownloadSelectedClassDocx.onclick = downloadSelectedClassDocx;
    if (DOM.btnPrintClassTimetable) DOM.btnPrintClassTimetable.onclick = () => window.print();
    if (DOM.btnCloseClassCellModal) DOM.btnCloseClassCellModal.onclick = () => DOM.classCellModal.classList.remove('active');
    if (DOM.btnCancelClassCell) DOM.btnCancelClassCell.onclick = () => DOM.classCellModal.classList.remove('active');
    if (DOM.btnSaveClassCell) DOM.btnSaveClassCell.onclick = saveClassCell;
    if (DOM.btnClearClassCell) DOM.btnClearClassCell.onclick = clearClassCell;

    // Attendance Duty Module Actions
    if (DOM.btnAddAttendanceDuty) DOM.btnAddAttendanceDuty.onclick = openAddAttendanceDutyModal;
    if (DOM.btnPrintAttendanceDuties) DOM.btnPrintAttendanceDuties.onclick = () => window.print();
    if (DOM.btnCloseAttModal) DOM.btnCloseAttModal.onclick = () => DOM.attendanceDutyModal.classList.remove('active');
    if (DOM.btnCancelAttModal) DOM.btnCancelAttModal.onclick = () => DOM.attendanceDutyModal.classList.remove('active');
    if (DOM.btnSaveAttDuty) DOM.btnSaveAttDuty.onclick = saveAttendanceDuty;
    if (DOM.btnDeleteAttDuty) DOM.btnDeleteAttDuty.onclick = () => {
      const id = DOM.attInputEditId ? DOM.attInputEditId.value : null;
      if (id) deleteAttendanceDuty(id);
    };

    // Class Teacher Duty Module Actions
    if (DOM.btnOpenAddClassTeacher) DOM.btnOpenAddClassTeacher.onclick = () => openClassTeacherModal(state.selectedClassStd || 'std_3');
    if (DOM.btnCloseCtModal) DOM.btnCloseCtModal.onclick = () => DOM.classTeacherModal.classList.remove('active');
    if (DOM.btnCancelCtModal) DOM.btnCancelCtModal.onclick = () => DOM.classTeacherModal.classList.remove('active');
    if (DOM.btnSaveClassTeacher) DOM.btnSaveClassTeacher.onclick = saveClassTeacherDuty;
    if (DOM.btnRemoveClassTeacher) {
      DOM.btnRemoveClassTeacher.onclick = () => {
        const stdId = DOM.ctInputStandard.value;
        const idx = (state.classTeacherDuties || []).findIndex(c => c.standardId === stdId);
        if (idx > -1) {
          state.classTeacherDuties.splice(idx, 1);
          saveState();
          renderClassTeacherDutyView();
          renderClassMetaBanner();
          DOM.classTeacherModal.classList.remove('active');
          showToast('Class Teacher assignment removed', 'info');
        }
      };
    }

    // Syllabus Management Module Actions
    if (DOM.btnAddSyllabusRecord) DOM.btnAddSyllabusRecord.onclick = openAddSyllabusModal;
    if (DOM.btnPrintSyllabusReport) DOM.btnPrintSyllabusReport.onclick = () => window.print();
    if (DOM.btnCloseSylModal) DOM.btnCloseSylModal.onclick = () => DOM.syllabusModal.classList.remove('active');
    if (DOM.btnCancelSylModal) DOM.btnCancelSylModal.onclick = () => DOM.syllabusModal.classList.remove('active');
    if (DOM.btnSaveSyllabusRecord) DOM.btnSaveSyllabusRecord.onclick = saveSyllabusRecord;
    if (DOM.btnDeleteSyllabusRecord) DOM.btnDeleteSyllabusRecord.onclick = () => {
      const id = DOM.sylInputId ? DOM.sylInputId.value : null;
      if (id) deleteSyllabusRecord(id);
    };
    if (DOM.sylInputProgress && DOM.sylProgressPercentVal) {
      DOM.sylInputProgress.oninput = () => {
        DOM.sylProgressPercentVal.textContent = `${DOM.sylInputProgress.value}%`;
      };
    }

    // Close Modals on background click
    [DOM.periodModal, DOM.dutyCellModal, DOM.generalDutyModal, DOM.copyModal, DOM.settingsModal, DOM.schoolProfileModal, DOM.cloudDbModal, DOM.classCellModal, DOM.attendanceDutyModal, DOM.classTeacherModal, DOM.syllabusModal, DOM.authLoginOverlay].forEach(m => {
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
        if (DOM.classCellModal) DOM.classCellModal.classList.remove('active');
        if (DOM.attendanceDutyModal) DOM.attendanceDutyModal.classList.remove('active');
        if (DOM.classTeacherModal) DOM.classTeacherModal.classList.remove('active');
        if (DOM.syllabusModal) DOM.syllabusModal.classList.remove('active');
        if (DOM.authLoginOverlay) DOM.authLoginOverlay.classList.remove('active');
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
