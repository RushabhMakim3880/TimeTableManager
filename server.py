"""
TimeTable Studio - Local Server & Launcher
Starts a local web server and automatically opens the browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Concise logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {format%args}\n")

    def do_POST(self):
        if self.path == '/api/save-state':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                import json
                state = json.loads(body)
                default_data_path = os.path.join(DIRECTORY, 'js', 'default-data.js')
                current_data = {}
                if os.path.exists(default_data_path):
                    try:
                        with open(default_data_path, 'r', encoding='utf-8') as f:
                            c_text = f.read()
                        j_str = c_text.split('const DEFAULT_DATA = ')[1].rsplit(';', 1)[0].strip()
                        current_data = json.loads(j_str)
                    except Exception:
                        pass
                
                # Deep merge schedules
                merged_schedules = current_data.get("initialSchedules", {})
                if state.get("schedules"):
                    for day, p_dict in state["schedules"].items():
                        if day not in merged_schedules:
                            merged_schedules[day] = {}
                        for p_id, std_dict in p_dict.items():
                            if p_id not in merged_schedules[day]:
                                merged_schedules[day][p_id] = {}
                            merged_schedules[day][p_id].update(std_dict)

                # Deep merge shifts
                merged_shifts = current_data.get("shifts", {})
                if state.get("shifts"):
                    if "morning" in state["shifts"]:
                        if "morning" not in merged_shifts:
                            merged_shifts["morning"] = {}
                        merged_shifts["morning"].update(state["shifts"]["morning"])
                        if not merged_shifts["morning"].get("periods"):
                            merged_shifts["morning"]["periods"] = current_data.get("shifts", {}).get("morning", {}).get("periods", [])
                        if not merged_shifts["morning"].get("schedules"):
                            merged_shifts["morning"]["schedules"] = current_data.get("shifts", {}).get("morning", {}).get("schedules", {})
                    if "afternoon" in state["shifts"]:
                        if "afternoon" not in merged_shifts:
                            merged_shifts["afternoon"] = {}
                        merged_shifts["afternoon"].update(state["shifts"]["afternoon"])

                # Deep merge standards
                merged_standards = current_data.get("standards", [])
                if state.get("standards"):
                    std_map = {s["id"]: s for s in merged_standards}
                    for s in state["standards"]:
                        std_map[s["id"]] = s
                # Deep merge teachers
                merged_teachers = list(state.get("teachers") or current_data.get("teachers", []))
                for t in ["Rakshita Ma'am", "Neelam Ma'am", "Geetanjali Ma'am", "Yamin Ma'am"]:
                    if t not in merged_teachers:
                        merged_teachers.append(t)

                merged_profiles = dict(current_data.get("teacherProfiles", {}))
                if state.get("teacherProfiles"):
                    merged_profiles.update(state["teacherProfiles"])

                # Format DEFAULT_DATA object
                updated_data = {
                    "schoolProfile": state.get("schoolProfile") or current_data.get("schoolProfile", {}),
                    "standards": merged_standards,
                    "periods": state.get("periods") or current_data.get("periods", []),
                    "shifts": merged_shifts,
                    "classTeachers": state.get("classTeachers") or current_data.get("classTeachers", {}),
                    "attendanceDuties": state.get("attendanceDuties") or current_data.get("attendanceDuties", []),
                    "teachers": merged_teachers,
                    "teacherProfiles": merged_profiles,
                    "subjects": state.get("subjects") or current_data.get("subjects", []),
                    "days": state.get("days") or current_data.get("days", []),
                    "includeSaturday": state.get("includeSaturday", current_data.get("includeSaturday", False)),
                    "initialSchedules": merged_schedules,
                    "weeklyDutyPresets": current_data.get("weeklyDutyPresets", []),
                    "initialWeeklyDuties": state.get("weeklyDuties") or current_data.get("initialWeeklyDuties", {}),
                    "generalDutyPresets": current_data.get("generalDutyPresets", []),
                    "initialGeneralDuties": state.get("generalDuties") or current_data.get("initialGeneralDuties", []),
                    "dutyPresets": state.get("dutyPresets") or current_data.get("dutyPresets", []),
                    "initialDuties": state.get("duties") or current_data.get("initialDuties", {}),
                    "excludedFreeTeachers": state.get("excludedFreeTeachers") or current_data.get("excludedFreeTeachers", {})
                }
                
                content = "// Default presets for School Timetable Management System\n"
                content += f"// Auto-synchronized from local edits on {self.log_date_time_string()}\n\n"
                content += f"const DEFAULT_DATA = {json.dumps(updated_data, indent=2)};\n\n"
                content += "if (typeof module !== 'undefined' && module.exports) {\n  module.exports = DEFAULT_DATA;\n}\n"
                
                with open(default_data_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"[{self.log_date_time_string()}] ✓ Auto-saved timetable data to js/default-data.js")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok","message":"Saved to js/default-data.js"}')
            except Exception as e:
                print(f"Error saving: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"status":"error","message":"{str(e)}"}}'.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def find_available_port(start_port=8080, max_attempts=20):
    import socket
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

def run():
    port = find_available_port(PORT)
    url = f"http://localhost:{port}/index.html"
    
    print("=" * 60)
    print("  TimeTable Studio - Automated School Timetable Builder")
    print("=" * 60)
    print(f"  Server running at: {url}")
    print(f"  Serving files from: {DIRECTORY}")
    print("  Press Ctrl+C to stop the server.")
    print("=" * 60)

    # Open the browser automatically
    webbrowser.open(url)

    with socketserver.TCPServer(("", port), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server. Goodbye!")

if __name__ == "__main__":
    run()
