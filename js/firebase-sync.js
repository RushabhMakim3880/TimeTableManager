/**
 * Firebase Firestore Cloud Sync Engine for TimeTable Studio
 * Handles real-time multi-device cloud persistence, offline caching, and conflict-safe updates.
 */

(function(window) {
  'use strict';

  const STORAGE_KEY_CONFIG = 'timetable_firebase_config_v1';
  const COLLECTION_NAME = 'timetables';
  const DOCUMENT_ID = 'current_academic_session';

  let db = null;
  let firebaseApp = null;
  let isInitialized = false;
  let activeConfig = null;
  let statusListeners = [];
  let currentStatus = 'unconfigured'; // 'unconfigured' | 'connecting' | 'connected' | 'syncing' | 'synced' | 'error' | 'offline'
  let lastSavedAt = null;
  let snapshotUnsubscribe = null;
  let isSavingLocally = false;

  function notifyStatus(status, details = {}) {
    currentStatus = status;
    statusListeners.forEach(fn => {
      try {
        fn(status, { lastSavedAt, ...details });
      } catch (e) {
        console.error('Status listener error:', e);
      }
    });
  }

  function withTimeout(promise, ms = 7000, errorMsg = 'Operation timed out') {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function getStoredConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidConfig(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Could not read stored Firebase config:', e);
    }
    if (typeof window !== 'undefined' && typeof window.FIREBASE_CONFIG === 'object' && window.FIREBASE_CONFIG !== null) {
      return window.FIREBASE_CONFIG;
    }
    if (typeof FIREBASE_CONFIG === 'object' && FIREBASE_CONFIG !== null) {
      return FIREBASE_CONFIG;
    }
    return null;
  }

  function isValidConfig(cfg) {
    return !!(
      cfg &&
      typeof cfg === 'object' &&
      cfg.apiKey &&
      cfg.projectId &&
      cfg.apiKey.trim().length > 10 &&
      !cfg.apiKey.includes('YOUR_API_KEY') &&
      cfg.projectId.trim().length > 0 &&
      !cfg.projectId.includes('YOUR_PROJECT_ID')
    );
  }

  async function initFirebase(customConfig = null) {
    const configToUse = customConfig || getStoredConfig();

    if (!isValidConfig(configToUse)) {
      notifyStatus('unconfigured', { message: 'Firebase not configured yet' });
      return { success: false, reason: 'unconfigured' };
    }

    if (typeof window.firebase === 'undefined') {
      notifyStatus('error', { message: 'Firebase SDK not loaded' });
      return { success: false, reason: 'sdk_missing' };
    }

    try {
      notifyStatus('connecting', { message: 'Connecting to Firebase Firestore...' });
      activeConfig = configToUse;

      // Initialize or reuse existing app
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        firebaseApp = window.firebase.initializeApp(activeConfig);
      } else {
        firebaseApp = window.firebase.app();
      }

      db = window.firebase.firestore();

      // Enable offline persistence with multi-tab support
      try {
        await db.enablePersistence({ synchronizeTabs: true });
        console.log('[Firebase Sync] Offline persistence enabled with multi-tab sync');
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('[Firebase Sync] Persistence failed: Multiple tabs open simultaneously');
        } else if (err.code === 'unimplemented') {
          console.warn('[Firebase Sync] Browser does not support IndexedDB persistence');
        } else {
          console.warn('[Firebase Sync] Persistence warning:', err);
        }
      }

      isInitialized = true;
      notifyStatus('connected', { message: 'Connected to Firestore' });
      return { success: true, db };
    } catch (err) {
      console.error('[Firebase Sync] Initialization error:', err);
      notifyStatus('error', { message: err.message });
      return { success: false, error: err };
    }
  }

  /**
   * Saves the timetable state to Firestore
   */
  let saveDebounceTimer = null;
  async function saveStateToCloud(state, options = {}) {
    if (!isInitialized || !db) {
      return { success: false, reason: 'not_initialized' };
    }

    const immediate = options.immediate === true;

    return new Promise((resolve) => {
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);

      const doSave = async () => {
        try {
          notifyStatus('syncing', { message: 'Saving to Cloud Firestore...' });
          isSavingLocally = true;

          const payload = {
            schoolProfile: state.schoolProfile || {},
            standards: state.standards || [],
            periods: state.periods || [],
            teachers: state.teachers || [],
            teacherProfiles: state.teacherProfiles || {},
            subjects: state.subjects || [],
            days: state.days || [],
            schedules: state.schedules || {},
            leaves: state.leaves || {},
            substitutions: state.substitutions || {},
            dutyPresets: state.dutyPresets || [],
            duties: state.duties || {},
            weeklyDuties: state.weeklyDuties || {},
            generalDuties: state.generalDuties || [],
            excludedFreeTeachers: state.excludedFreeTeachers || {},
            updatedAt: new Date().toISOString(),
            clientVersion: 'v4.1'
          };

          const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
          await withTimeout(docRef.set(payload, { merge: true }), 8000, 'Cloud save timed out');

          lastSavedAt = new Date();
          notifyStatus('synced', { lastSavedAt });
          resolve({ success: true, savedAt: lastSavedAt });
        } catch (err) {
          console.warn('[Firebase Sync] Cloud save notice:', err.message || err);
          notifyStatus(navigator.onLine ? 'error' : 'offline', { message: err.message });
          resolve({ success: false, error: err });
        } finally {
          setTimeout(() => { isSavingLocally = false; }, 500);
        }
      };

      if (immediate) {
        doSave();
      } else {
        saveDebounceTimer = setTimeout(doSave, options.debounceMs || 800);
      }
    });
  }

  /**
   * Fetches latest timetable state from Firestore
   */
  async function fetchStateFromCloud() {
    if (!isInitialized || !db) {
      return null;
    }

    try {
      notifyStatus('syncing', { message: 'Fetching timetable from Cloud...' });
      const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
      const snap = await withTimeout(docRef.get(), 6000, 'Cloud fetch timed out');

      if (snap && snap.exists) {
        lastSavedAt = snap.data().updatedAt ? new Date(snap.data().updatedAt) : new Date();
        notifyStatus('synced', { lastSavedAt });
        return snap.data();
      } else {
        notifyStatus('connected', { message: 'Database empty. Ready to upload initial data.' });
        return null;
      }
    } catch (err) {
      console.warn('[Firebase Sync] Cloud fetch notice:', err.message || err);
      notifyStatus(navigator.onLine ? 'error' : 'offline', { message: err.message });
      return null;
    }
  }

  /**
   * Starts listening to real-time changes from other devices
   */
  function listenToCloudUpdates(onRemoteUpdate) {
    if (!isInitialized || !db) return;

    if (snapshotUnsubscribe) {
      snapshotUnsubscribe();
    }

    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
    snapshotUnsubscribe = docRef.onSnapshot((doc) => {
      // Ignore updates that originated from this browser's own active write
      if (doc.metadata.hasPendingWrites || isSavingLocally) {
        return;
      }

      if (doc.exists) {
        const cloudData = doc.data();
        if (typeof onRemoteUpdate === 'function') {
          onRemoteUpdate(cloudData);
        }
        lastSavedAt = cloudData.updatedAt ? new Date(cloudData.updatedAt) : new Date();
        notifyStatus('synced', { lastSavedAt });
      }
    }, (err) => {
      console.warn('[Firebase Sync] Realtime listener warning:', err);
      notifyStatus(navigator.onLine ? 'error' : 'offline', { message: err.message });
    });
  }

  function saveConfig(configObj) {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(configObj));
    return initFirebase(configObj);
  }

  function clearConfig() {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    if (snapshotUnsubscribe) snapshotUnsubscribe();
    db = null;
    isInitialized = false;
    activeConfig = null;
    notifyStatus('unconfigured');
  }

  function onStatusChange(callback) {
    if (typeof callback === 'function') {
      statusListeners.push(callback);
      // Immediate callback with current status
      callback(currentStatus, { lastSavedAt });
    }
  }

  // Handle browser online/offline events
  window.addEventListener('online', () => {
    if (isInitialized) notifyStatus('connected', { message: 'Back online' });
  });
  window.addEventListener('offline', () => {
    if (isInitialized) notifyStatus('offline', { message: 'You are offline (changes saved locally)' });
  });

  // Public API
  window.FirebaseSync = {
    init: initFirebase,
    save: saveStateToCloud,
    fetch: fetchStateFromCloud,
    listen: listenToCloudUpdates,
    getConfig: getStoredConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    onStatusChange: onStatusChange,
    getStatus: () => currentStatus,
    getLastSavedAt: () => lastSavedAt,
    isConfigured: () => isValidConfig(getStoredConfig())
  };

})(window);
