// Default presets for School Timetable Management System
// Aligned with official school standards and Monday.docx specifications

const DEFAULT_DATA = {
  schoolProfile: {
    name: "St. Xavier's International Academy",
    tagline: "Centre of Academic Excellence & Holistic Development",
    affiliation: "Affiliation No: 1130452 • School Code: 40381",
    academicYear: "Academic Session: 2026–2027",
    term: "Term 1 (April – September)",
    preparedBy: "Timetable Coordinator",
    verifiedBy: "Vice Principal",
    approvedBy: "Principal",
    logoBase64: "" // User can upload PNG/JPG/SVG
  },

  standards: [
    { id: 'std_3', name: 'Standard: 3rd', baseName: 'Standard: 3', sup: 'rd' },
    { id: 'std_4', name: 'Standard: 4th', baseName: 'Standard: 4', sup: 'th' },
    { id: 'std_5', name: 'Standard: 5th', baseName: 'Standard: 5', sup: 'th' },
    { id: 'std_6', name: 'Standard: 6th', baseName: 'Standard: 6', sup: 'th' },
    { id: 'std_7', name: 'Standard: 7th', baseName: 'Standard: 7', sup: 'th' },
    { id: 'std_8', name: 'Standard: 8th', baseName: 'Standard: 8', sup: 'th' }
  ],

  periods: [
    { id: 'p1', number: 1, label: 'Lecture 1', time: '1:00 to 1:45' },
    { id: 'p2', number: 2, label: 'Lecture 2', time: '1:45 to 2:30' },
    { id: 'p3', number: 3, label: 'Lecture 3', time: '2:30 to 3:15' },
    { id: 'p4', number: 4, label: 'Lecture 4', time: '3:45 to 4:30' },
    { id: 'p5', number: 5, label: 'Lecture 5', time: '4:30 to 5:15' },
    { id: 'p6', number: 6, label: 'Lecture 6', time: '5:15 to 5:50' }
  ],

  teachers: [
    "Payal Ma'am",
    "Manali Ma'am",
    "Priya Ma'am",
    "Sakina Ma'am",
    "Alpa Ma'am",
    "Taniya Ma'am",
    "Dolly Ma'am",
    "Yamin Ma'am",
    "Astha Ma'am",
    "Khushi Ma'am"
  ],

  teacherProfiles: {
    "Payal Ma'am": { primarySubject: "English", maxPeriods: 5 },
    "Khushi Ma'am": { primarySubject: "English", maxPeriods: 5 },
    "Dolly Ma'am": { primarySubject: "Maths", maxPeriods: 5 },
    "Alpa Ma'am": { primarySubject: "Maths", maxPeriods: 5 },
    "Manali Ma'am": { primarySubject: "Computer", maxPeriods: 5 },
    "Astha Ma'am": { primarySubject: "Computer", maxPeriods: 5 },
    "Priya Ma'am": { primarySubject: "Gujarati", maxPeriods: 5 },
    "Sakina Ma'am": { primarySubject: "Social Science", maxPeriods: 5 },
    "Taniya Ma'am": { primarySubject: "Science", maxPeriods: 5 },
    "Yamin Ma'am": { primarySubject: "Environment", maxPeriods: 5 }
  },

  subjects: [
    "English",
    "Maths",
    "Science",
    "Social Science",
    "Gujarati",
    "Computer",
    "Environment",
    "Hindi",
    "Sanskrit",
    "Drawing",
    "P.T."
  ],

  // Extra duties presets for free teachers
  dutyPresets: [
    "Library Supervision",
    "Corridor & Hallway Monitoring",
    "Science Lab Assistance",
    "Computer Lab Duty",
    "Exam Paper Evaluation & Grading",
    "Remedial Coaching / Doubt Solving",
    "Reception & Administrative Duty",
    "Lesson Planning & Preparation",
    "Playground / Recess Duty",
    "Discipline & Gate Supervision"
  ],

  days: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],

  // Pre-filled initial schedule aligned with official school timetable
  initialSchedules: {
    "Monday": {
      "p1": {
        "std_3": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_4": { subject: "English", teacher: "Payal Ma'am" },
        "std_5": { subject: "Computer", teacher: "Manali Ma'am" },
        "std_6": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_7": { subject: "Social Science", teacher: "Sakina Ma'am" },
        "std_8": { subject: "Science", teacher: "Taniya Ma'am" }
      },
      "p2": {
        "std_3": { subject: "Computer", teacher: "Manali Ma'am" },
        "std_4": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_5": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_6": { subject: "Social Science", teacher: "Sakina Ma'am" },
        "std_7": { subject: "Science", teacher: "Taniya Ma'am" },
        "std_8": { subject: "Maths", teacher: "Alpa Ma'am" }
      },
      "p3": {
        "std_3": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_4": { subject: "Computer", teacher: "Manali Ma'am" },
        "std_5": { subject: "English", teacher: "Payal Ma'am" },
        "std_6": { subject: "Maths", teacher: "Alpa Ma'am" },
        "std_7": { subject: "English", teacher: "Khushi Ma'am" },
        "std_8": { subject: "Social Science", teacher: "Sakina Ma'am" }
      },
      "p4": {
        "std_3": { subject: "English", teacher: "Payal Ma'am" },
        "std_4": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_5": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_6": { subject: "English", teacher: "Khushi Ma'am" },
        "std_7": { subject: "Computer", teacher: "Astha Ma'am" },
        "std_8": { subject: "Gujarati", teacher: "Priya Ma'am" }
      },
      "p5": {
        "std_3": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_4": { subject: "English", teacher: "Payal Ma'am" },
        "std_5": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_6": { subject: "Computer", teacher: "Astha Ma'am" },
        "std_7": { subject: "Maths", teacher: "Alpa Ma'am" },
        "std_8": { subject: "English", teacher: "Khushi Ma'am" }
      },
      "p6": {
        "std_3": { subject: "English", teacher: "Payal Ma'am" },
        "std_4": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_5": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_6": { subject: "Science", teacher: "Taniya Ma'am" },
        "std_7": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_8": { subject: "Computer", teacher: "Astha Ma'am" }
      }
    },
    "Tuesday": {
      "p1": {
        "std_3": { subject: "English", teacher: "Payal Ma'am" },
        "std_4": { subject: "Computer", teacher: "Manali Ma'am" },
        "std_5": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_6": { subject: "Social Science", teacher: "Sakina Ma'am" },
        "std_7": { subject: "Maths", teacher: "Alpa Ma'am" },
        "std_8": { subject: "Science", teacher: "Taniya Ma'am" }
      },
      "p2": {
        "std_3": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_4": { subject: "English", teacher: "Payal Ma'am" },
        "std_5": { subject: "Computer", teacher: "Manali Ma'am" },
        "std_6": { subject: "Science", teacher: "Taniya Ma'am" },
        "std_7": { subject: "Social Science", teacher: "Sakina Ma'am" },
        "std_8": { subject: "Maths", teacher: "Alpa Ma'am" }
      },
      "p3": {
        "std_3": { subject: "Computer", teacher: "Manali Ma'am" },
        "std_4": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_5": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_6": { subject: "English", teacher: "Khushi Ma'am" },
        "std_7": { subject: "Science", teacher: "Taniya Ma'am" },
        "std_8": { subject: "Social Science", teacher: "Sakina Ma'am" }
      },
      "p4": {
        "std_3": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_4": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_5": { subject: "English", teacher: "Payal Ma'am" },
        "std_6": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_7": { subject: "Computer", teacher: "Astha Ma'am" },
        "std_8": { subject: "English", teacher: "Khushi Ma'am" }
      },
      "p5": {
        "std_3": { subject: "English", teacher: "Payal Ma'am" },
        "std_4": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_5": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_6": { subject: "Computer", teacher: "Astha Ma'am" },
        "std_7": { subject: "English", teacher: "Khushi Ma'am" },
        "std_8": { subject: "Maths", teacher: "Alpa Ma'am" }
      },
      "p6": {
        "std_3": { subject: "Maths", teacher: "Dolly Ma'am" },
        "std_4": { subject: "Environment", teacher: "Yamin Ma'am" },
        "std_5": { subject: "English", teacher: "Payal Ma'am" },
        "std_6": { subject: "Maths", teacher: "Alpa Ma'am" },
        "std_7": { subject: "Gujarati", teacher: "Priya Ma'am" },
        "std_8": { subject: "Computer", teacher: "Astha Ma'am" }
      }
    }
  },

  // Daily substitution proxy records
  substitutions: {},

  // Extra Duties presets and grade sections
  gradeGroups: [
    "3 to 5",
    "6 to 8",
    "3 to 8",
    "All Standards"
  ],

  weeklyDutyPresets: [
    "3 to 5 Maths",
    "3 to 5 English",
    "3 to 5 Environment",
    "3 to 5 Gujarati",
    "6 to 8 Science",
    "6 to 8 English",
    "6 to 8 Maths",
    "6 to 8 Gujarati",
    "6 to 8 Science/English",
    "6 to 8 Social Science",
    "3 to 5 Computer",
    "6 to 8 Computer"
  ],

  // Weekly Faculty Extra Duty Roster (Directly matching notebook records)
  initialWeeklyDuties: {
    "Payal Ma'am": {
      "Wednesday": "3 to 5 English",
      "Friday": "3 to 5 English"
    },
    "Manali Ma'am": {
      "Monday": "3 to 5 English",
      "Wednesday": "3 to 5 Gujarati",
      "Friday": "6 to 8 English"
    },
    "Priya Ma'am": {
      "Wednesday": "3 to 5 Gujarati",
      "Friday": "6 to 8 Gujarati"
    },
    "Alpa Ma'am": {
      "Tuesday": "3 to 5 Maths",
      "Thursday": "6 to 8 Maths"
    },
    "Taniya Ma'am": {
      "Tuesday": "6 to 8 Science",
      "Wednesday": "6 to 8 English",
      "Thursday": "6 to 8 Science/English"
    },
    "Dolly Ma'am": {
      "Monday": "3 to 5 Maths",
      "Friday": "3 to 5 Maths"
    },
    "Yamin Ma'am": {
      "Monday": "3 to 5 Environment",
      "Wednesday": "3 to 5 Environment"
    },
    "Sakina Ma'am": {},
    "Astha Ma'am": {},
    "Khushi Ma'am": {}
  },

  // Extra Duties assigned to free teachers (Legacy per-period fallback)
  initialDuties: {
    "Monday": {
      "p1": {
        "Alpa Ma'am": { duty: "Library Supervision", location: "Junior Library" },
        "Yamin Ma'am": { duty: "Corridor & Hallway Monitoring", location: "1st Floor" },
        "Astha Ma'am": { duty: "Computer Lab Duty", location: "Lab 1" },
        "Khushi Ma'am": { duty: "Lesson Planning & Preparation", location: "Staff Room" }
      }
    }
  },

  // General & Special School Duties (Assembly, Kids Attendance, Recess, Gate, etc.)
  generalDutyPresets: [
    { name: "Morning Assembly & Prayer Duty", time: "12:45 PM – 1:00 PM", location: "Assembly Stage / Ground", notes: "Manage student lines, microphone, prayer, and morning pledge" },
    { name: "Kids Present / Absent Roll Call", time: "1:30 PM – 1:45 PM", location: "Classrooms & Admin Office", notes: "Collect class attendance registers and submit absentee count to principal office" },
    { name: "Recess & Corridor Supervision", time: "3:15 PM – 3:45 PM", location: "Ground & 1st Floor Corridors", notes: "Ensure student discipline and prevent running during lunch recess" },
    { name: "Main Gate & Morning Entry Duty", time: "12:30 PM – 1:00 PM", location: "Main School Gate", notes: "Monitor uniform compliance, timely arrival, and student drop-off safety" },
    { name: "Dispersal & Gate Duty", time: "5:30 PM – 5:50 PM", location: "School Gate & Bus Bay", notes: "Supervise orderly departure and safe student handover to parents/vans" },
    { name: "Drinking Water & Washroom Discipline", time: "3:15 PM – 3:45 PM", location: "Water Station Area", notes: "Maintain hygiene and queue discipline during break time" }
  ],

  initialGeneralDuties: [
    {
      id: "gd_1",
      dutyName: "Morning Assembly & Prayer Duty",
      time: "12:45 PM – 1:00 PM",
      location: "Assembly Stage / Ground",
      notes: "Lead prayer, thought for the day, and supervise height-wise student rows",
      allocations: {
        "Monday": "Alpa Ma'am",
        "Tuesday": "Payal Ma'am",
        "Wednesday": "Manali Ma'am",
        "Thursday": "Priya Ma'am",
        "Friday": "Dolly Ma'am"
      }
    },
    {
      id: "gd_2",
      dutyName: "Kids Present / Absent Roll Call",
      time: "1:30 PM – 1:45 PM",
      location: "Classrooms & Admin Office",
      notes: "Collect daily student attendance totals and submit absentee slip to office",
      allocations: {
        "Monday": "Payal Ma'am",
        "Tuesday": "Manali Ma'am",
        "Wednesday": "Payal Ma'am",
        "Thursday": "Dolly Ma'am",
        "Friday": "Khushi Ma'am"
      }
    },
    {
      id: "gd_3",
      dutyName: "Recess & Corridor Supervision",
      time: "3:15 PM – 3:45 PM",
      location: "1st & 2nd Floor Corridors",
      notes: "Monitor corridors and ensure students remain in lunch areas safely",
      allocations: {
        "Monday": "Taniya Ma'am",
        "Tuesday": "Taniya Ma'am",
        "Wednesday": "Sakina Ma'am",
        "Thursday": "Sakina Ma'am",
        "Friday": "Priya Ma'am"
      }
    },
    {
      id: "gd_4",
      dutyName: "Dispersal & Main Gate Duty",
      time: "5:30 PM – 5:50 PM",
      location: "Main Gate & Bus Bay",
      notes: "Oversee safe bus boarding and orderly student exit",
      allocations: {
        "Monday": "Priya Ma'am",
        "Tuesday": "Dolly Ma'am",
        "Wednesday": "Dolly Ma'am",
        "Thursday": "Alpa Ma'am",
        "Friday": "Payal Ma'am"
      }
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_DATA;
}
