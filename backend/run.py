"""
NutriAI — Backend Server Launcher
Run via: python backend/run.py
"""

import sys
import os

# Add parent directory to python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from backend.app import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("=================================================")
    print("NutriAI Dedicated Backend Server Running")
    print(f"API Base URL:  http://localhost:{port}/api")
    print(f"Health Check:  http://localhost:{port}/api/health")
    print("Frontend:      http://localhost:8080/frontend/")
    print("=================================================")
    app.run(host="127.0.0.1", port=port, debug=False)

