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
                
                # Format DEFAULT_DATA object
                updated_data = {
                    "schoolProfile": state.get("schoolProfile", {}),
                    "standards": state.get("standards", []),
                    "periods": state.get("periods", []),
                    "teachers": state.get("teachers", []),
                    "teacherProfiles": state.get("teacherProfiles", {}),
                    "subjects": state.get("subjects", []),
                    "days": state.get("days", []),
                    "initialSchedules": state.get("schedules", {}),
                    "weeklyDutyPresets": state.get("dutyPresets", []),
                    "initialWeeklyDuties": state.get("weeklyDuties", {}),
                    "generalDutyPresets": [],
                    "initialGeneralDuties": state.get("generalDuties", []),
                    "dutyPresets": state.get("dutyPresets", []),
                    "initialDuties": state.get("duties", {})
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
