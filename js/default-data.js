// Default presets for TimeTable Builder
// Extracted and aligned with Monday.docx specifications

const DEFAULT_DATA = {
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

  days: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ],

  // Pre-filled Monday schedule exactly from Monday.docx
  initialSchedules: {
    "Monday": {
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_DATA;
}

