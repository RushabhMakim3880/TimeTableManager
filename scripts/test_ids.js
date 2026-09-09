const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const ids = [
  'header-bell-selector', 'btn-active-bell-preset', 'bell-schedule-label', 'bell-dropdown-menu',
  'class-section-filter-bar', 'class-section-pills', 'btn-open-add-section-modal',
  'add-section-modal', 'add-section-modal-title', 'btn-close-add-section-modal',
  'add-section-base-std', 'add-section-code', 'add-section-room', 'add-section-teacher',
  'btn-cancel-add-section', 'btn-save-add-section',
  'btn-open-auto-scheduler', 'auto-scheduler-modal', 'btn-close-auto-scheduler',
  'solver-shift-select', 'solver-grade-select', 'solver-max-consecutive',
  'solver-preserve-pinned', 'solver-spread-subjects', 'solver-progress-box',
  'solver-status-text', 'solver-percent-text', 'solver-progress-bar-fill',
  'solver-results-box', 'solver-stat-slots', 'solver-stat-conflicts', 'solver-stat-time',
  'btn-cancel-auto-scheduler', 'btn-run-auto-scheduler', 'btn-apply-auto-scheduler',
  'select-exam-term', 'exam-date-range-badge', 'btn-open-add-exam-slot-modal',
  'btn-auto-assign-invigilators', 'btn-download-exam-schedule-docx', 'btn-print-exam-schedule',
  'exam-conflict-banner', 'exam-conflict-message', 'display-exam-title',
  'exam-matrix-table', 'exam-matrix-thead', 'exam-matrix-tbody',
  'invigilator-roster-table', 'invigilator-roster-thead', 'invigilator-roster-tbody',
  'add-exam-slot-modal', 'add-exam-slot-modal-title', 'btn-close-add-exam-slot-modal',
  'exam-slot-date', 'exam-slot-session', 'exam-slot-class', 'exam-slot-subject',
  'exam-slot-room', 'exam-slot-invigilator', 'exam-slot-invigilator-2',
  'btn-cancel-add-exam-slot', 'btn-save-add-exam-slot',
  'select-ess-teacher', 'btn-ess-submit-leave', 'btn-print-ess-portal',
  'ess-teacher-avatar', 'ess-teacher-name', 'ess-teacher-role-badge', 'ess-teacher-meta',
  'ess-teacher-email', 'ess-teacher-shift', 'ess-teacher-subject-tag',
  'ess-kpi-weekly-load', 'ess-kpi-today-count', 'ess-kpi-duties-count', 'ess-kpi-syllabus-count',
  'ess-radar-card', 'ess-active-period-badge', 'ess-active-room-display', 'ess-active-timer-display',
  'ess-today-day-label', 'ess-today-schedule-list', 'ess-duty-card-content',
  'ess-proxy-card-content', 'ess-syllabus-pct-badge', 'ess-syllabus-bar-fill', 'ess-syllabus-checklist'
];

const missing = ids.filter(id => !html.includes(`id="${id}"`) && !html.includes(`id='${id}'`));
if (missing.length === 0) {
  console.log(`✓ All ${ids.length} planned IDs exist in index.html!`);
} else {
  console.error(`Missing ${missing.length} IDs:`, missing);
  process.exit(1);
}
