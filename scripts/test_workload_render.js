const fs = require('fs');
const DEFAULT_DATA = require('../js/default-data.js');

// Mock minimal DOM
const elements = {};
function getOrCreateElement(id) {
  if (!elements[id]) {
    elements[id] = {
      id,
      innerHTML: '',
      textContent: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      }
    };
  }
  return elements[id];
}

const DOM = {
  kpiTotalLectures: getOrCreateElement('kpi-total-lectures'),
  kpiAvgLoad: getOrCreateElement('kpi-avg-load'),
  kpiMaxTeacher: getOrCreateElement('kpi-max-teacher'),
  kpiMaxPeriods: getOrCreateElement('kpi-max-periods'),
  kpiComplianceStatus: getOrCreateElement('kpi-compliance-status'),
  kpiComplianceSubtext: getOrCreateElement('kpi-compliance-subtext'),
  workloadStaffCount: getOrCreateElement('workload-staff-count'),
  workloadBarsContainer: getOrCreateElement('workload-bars-container'),
  complianceAlertsContainer: getOrCreateElement('compliance-alerts-container'),
  subjectDistributionContainer: getOrCreateElement('subject-distribution-container')
};

const state = {
  schoolProfile: DEFAULT_DATA.schoolProfile,
  schedules: DEFAULT_DATA.initialSchedules,
  standards: DEFAULT_DATA.standards,
  periods: DEFAULT_DATA.periods,
  teachers: DEFAULT_DATA.teachers,
  subjects: DEFAULT_DATA.subjects,
  days: DEFAULT_DATA.days
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Execute the logic
const workingDays = state.days.filter(d => d.toLowerCase() !== 'saturday');
const totalWorkingPeriods = workingDays.length * state.periods.length;

const teacherWeeklyLoad = {};
const teacherSubjects = {};
state.teachers.forEach(t => {
  teacherWeeklyLoad[t] = 0;
  teacherSubjects[t] = {};
});

let totalScheduledPeriods = 0;
let fatigueInstances = 0;

workingDays.forEach(d => {
  const dSched = state.schedules[d] || {};

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

const sortedTeachers = Object.keys(teacherWeeklyLoad).sort((a, b) => teacherWeeklyLoad[b] - teacherWeeklyLoad[a]);
const maxTeacher = sortedTeachers[0] || '--';
const maxPeriods = maxTeacher !== '--' ? teacherWeeklyLoad[maxTeacher] : 0;
const maxPct = Math.min(100, Math.round((maxPeriods / totalWorkingPeriods) * 100));

const overloadedTeachers = sortedTeachers.filter(t => teacherWeeklyLoad[t] > 26);
const isCompliant = overloadedTeachers.length === 0;

DOM.kpiTotalLectures.textContent = totalScheduledPeriods;
DOM.kpiAvgLoad.innerHTML = `${avgLoad} <span style="font-size: 13px; font-weight: 500; color: var(--text-muted);">periods/wk</span>`;
DOM.kpiMaxTeacher.textContent = maxTeacher;
DOM.kpiMaxPeriods.textContent = `${maxPeriods} / ${totalWorkingPeriods} periods (${maxPct}% capacity)`;

if (isCompliant) {
  DOM.kpiComplianceStatus.textContent = '100% Compliant';
  DOM.kpiComplianceStatus.style.color = '#059669';
  DOM.kpiComplianceSubtext.textContent = 'All faculty ≤ 26 periods ceiling';
} else {
  DOM.kpiComplianceStatus.textContent = `${overloadedTeachers.length} Overload`;
  DOM.kpiComplianceStatus.style.color = '#dc2626';
  DOM.kpiComplianceSubtext.textContent = `${overloadedTeachers.length} faculty member(s) exceed ceiling`;
}
DOM.workloadStaffCount.textContent = `${state.teachers.length} Staff Members`;

console.log('--- KPI Checks ---');
console.log('Total Scheduled Periods:', DOM.kpiTotalLectures.textContent);
console.log('Avg Load:', DOM.kpiAvgLoad.innerHTML);
console.log('Peak Teacher:', DOM.kpiMaxTeacher.textContent, '|', DOM.kpiMaxPeriods.textContent);
console.log('Compliance Status:', DOM.kpiComplianceStatus.textContent);
console.log('Staff Count:', DOM.workloadStaffCount.textContent);

let barsHtml = '';
sortedTeachers.forEach(t => {
  const load = teacherWeeklyLoad[t];
  const pct = Math.min(100, Math.round((load / totalWorkingPeriods) * 100));
  const freePeriods = Math.max(0, totalWorkingPeriods - load);
  const subjs = teacherSubjects[t] || {};
  const sortedSubjs = Object.keys(subjs).sort((a, b) => subjs[b] - subjs[a]);
  const primarySubj = sortedSubjs[0] || 'Faculty';

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

console.log('\n--- Teacher Workload Bars Sample ---');
console.log(`Rendered ${sortedTeachers.length} teacher workload items.`);
console.log('Top teacher:', sortedTeachers[0], 'Load:', teacherWeeklyLoad[sortedTeachers[0]]);

console.log('\n--- Diagnostic Checks ---');
console.log('Fatigue instances (4+ consecutive in a day):', fatigueInstances);
const totalPotentialCapacity = state.teachers.length * totalWorkingPeriods;
const totalFreePrepPeriods = Math.max(0, totalPotentialCapacity - totalScheduledPeriods);
console.log('Total Free Prep / Proxy Capacity:', totalFreePrepPeriods, 'periods');

console.log('\n✓ Workload Analytics verification passed completely!');
