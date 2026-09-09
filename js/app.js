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
      Object.keys(DEFAULT_DATA.teacherProfiles).forEach(t => {
        if (!state.teacherProfiles[t]) {
          state.teacherProfiles[t] = Object.assign({}, DEFAULT_DATA.teacherProfiles[t]);
        } else if (!state.teacherProfiles[t].primarySubject) {
          state.teacherProfiles[t].primarySubject = DEFAULT_DATA.teacherProfiles[t].primarySubject;
        }
      });
    }


    if (!state.selectedTeacher && state.teachers.length > 0) {
      state.selectedTeacher = state.teachers[0];
    }
  }

  function resetToDefaults() {
    state.activeView = 'class-view';
    state.currentDay = 'Monday';
    state.schoolProfile = JSON.parse(JSON.stringify(DEFAULT_DATA.schoolProfile));
    state.standards = JSON.parse(JSON.stringify(DEFAULT_DATA.standards));
    state.periods = JSON.parse(JSON.stringify(DEFAULT_DATA.periods));
    state.teachers = JSON.parse(JSON.stringify(DEFAULT_DATA.teachers));
    state.teacherProfiles = JSON.parse(JSON.stringify(DEFAULT_DATA.teacherProfiles || {}));
    state.subjects = JSON.parse(JSON.stringify(DEFAULT_DATA.subjects));
    state.days = JSON.parse(JSON.stringify(DEFAULT_DATA.days));
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
    renderClassView();
    renderTeacherView();
    renderWeeklyDutyView();
    renderGeneralDutyView();
    renderSubstitutionView();
    renderWorkloadView();
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

    // Header
    let theadHtml = `<tr><th class="col-lecture-w">Period / Timing</th>`;
    state.standards.forEach(std => {
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
            <td colspan="${state.standards.length + 2}">RECESS BREAK • 3:15 PM TO 3:45 PM (30 MINUTES)</td>
          </tr>`;
      }

      const pSlots = dayData[period.id] || {};
      const teacherAllocation = {};
      state.standards.forEach(std => {
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

    DOM.selectTeacherFilter.onchange = function() {
      state.selectedTeacher = this.value;
      renderTeacherGrid();
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
    if (state.activeView === 'class-view') {
      DOM.exportBarTitle.textContent = "Export Official Class Timetables";
      DOM.exportBarDesc.textContent = `Generates formatted Word (.docx) for ${state.currentDay} or full week with school letterhead.`;
      DOM.btnDownloadSingleDay.style.display = 'inline-flex';
      DOM.btnDownloadDayName.textContent = state.currentDay;
      DOM.btnDownloadAllDays.textContent = "Download Full Week (.docx)";
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

  // --- Setup Event Listeners ---
  function setupEventListeners() {
    // View tabs
    DOM.viewTabBtns.forEach(btn => {
      btn.onclick = () => switchView(btn.getAttribute('data-view'));
    });

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

    // Header Actions
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
    DOM.modalCustomSubject.oninput = () => {
      editingCell.subject = DOM.modalCustomSubject.value;
      renderModalChips();
    };
    DOM.modalCustomTeacher.oninput = () => {
      editingCell.teacher = DOM.modalCustomTeacher.value;
    };

    // Close Modals on background click
    [DOM.periodModal, DOM.dutyCellModal, DOM.generalDutyModal, DOM.copyModal, DOM.settingsModal, DOM.schoolProfileModal, DOM.cloudDbModal].forEach(m => {
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
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
