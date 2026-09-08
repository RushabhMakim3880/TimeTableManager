# 📅 School Timetable Management System

An automated, executive-grade web application designed for school administration, principals, and teachers to schedule academic periods, track staff availability, automatically calculate free teachers, and export formatted Microsoft Word (`.docx`) documents.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen.svg)
![Platform](https://img.shields.io/badge/deployment-Vercel%20%7C%20Netlify%20%7C%20Offline-orange.svg)

---

## ✨ Features

- **Automated "Free Teachers" Calculation**: Eliminates manual tracking. As periods are allocated across standards (3rd to 8th), the system calculates and updates free staff in real time.
- **1-Click Microsoft Word (`.docx`) Export**:
  - Export single day (e.g., `Monday.docx`) or full week (`Weekly_School_TimeTable.docx`) in landscape orientation with 0.5" margins, centered text, and clean grid borders matching official school formats.
  - Generates `.docx` entirely client-side in the browser via JSZip and Word OpenXML—**zero server dependencies required**.
- **Staff Attendance & Duty Status**: Toggle staff **On Leave** with a single click; absent staff are automatically excluded from the free teachers roster.
- **Double-Booking Prevention**: Detects scheduling conflicts immediately if a teacher is assigned to multiple classes in the same period.
- **Fast In-Place Period Assignment**: Fast popover with 1-click subject and teacher chips for rapid scheduling.
- **Duplicate & Copy Schedules**: Copy an entire day's schedule to another day or across all weekdays in seconds.
- **100% Offline & Auto-Saved**: Persists all progress locally in the browser's `localStorage` with JSON backup/restore support.

---

## 🚀 Getting Started

### Method 1: Double-Click Launcher (Windows)
Double-click `Start_App.bat` in the project root folder. It will start a local server and automatically open your default web browser.

### Method 2: Open Directly in Browser
Double-click `index.html` to open it directly in Google Chrome, Microsoft Edge, or Firefox.

### Method 3: Run with Python
```bash
python server.py
```
Visit `http://localhost:8080/index.html` in your browser.

---

## ☁️ Deployment (Vercel & Netlify)

This project is pre-configured for static hosting:
- **Netlify**: Drag and drop this repository into [Netlify Drop](https://app.netlify.com/drop) for instant deployment.
- **Vercel**: Import this GitHub repository into Vercel with framework preset set to **Other / Static** (no build command needed).

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Docx Engine**: OpenXML + JSZip (Client-side generation)
- **Local Server**: Lightweight Python HTTP server (`server.py`)

---

## 📄 License

This project is licensed under the MIT License.
