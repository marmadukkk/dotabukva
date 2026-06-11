import sys
from pathlib import Path
from http.server import BaseHTTPRequestHandler

# Make dota_data importable when this file is executed by Vercel (or locally as a script)
HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import dota_data

# Shared cached data + helpers (no more duplication of fetch logic)
HEROES = dota_data.get_heroes()


def get_random_spin():
    # Delegate to the shared implementation (same shape as before)
    return dota_data.get_random_spin()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            result = get_random_spin()
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
