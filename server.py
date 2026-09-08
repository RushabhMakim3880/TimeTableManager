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
