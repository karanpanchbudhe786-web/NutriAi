"""
NutriAI — Core Flask API Application
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from backend.database import init_db, get_db

# Blueprints
from backend.routes.auth_routes import auth_bp
from backend.routes.profile_routes import profile_bp
from backend.routes.tracking_routes import tracking_bp
from backend.routes.ai_routes import ai_bp

def create_app():
    # Setup static folder pointing to frontend
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
    app = Flask(__name__, static_folder=frontend_dir, static_url_path="/frontend")

    # Enable CORS across development origins
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5000", "http://127.0.0.1:5000", "*"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Gemini-Key", "X-User-Id"]
        }
    })

    # Register API Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")
    app.register_blueprint(tracking_bp, url_prefix="/api/tracking")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")

    # Initialize SQLite Database tables
    init_db()

    @app.route("/api", methods=["GET"])
    @app.route("/api/", methods=["GET"])
    def api_root():
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as user_count FROM users")
            u_count = cursor.fetchone()["user_count"]
            conn.close()
        except Exception:
            u_count = 0

        return jsonify({
            "service": "NutriAI Dedicated Backend API",
            "version": "4.0.0",
            "status": "online",
            "database": "SQLite (Connected)",
            "totalRegisteredUsers": u_count,
            "frontendAppUrl": "http://localhost:8080/frontend/",
            "endpoints": {
                "health": "GET /api/health",
                "auth": {
                    "register": "POST /api/auth/register",
                    "login": "POST /api/auth/login",
                    "me": "GET /api/auth/me"
                },
                "profile": {
                    "getProfile": "GET /api/profile",
                    "updateProfile": "PUT /api/profile"
                },
                "tracking": {
                    "getState": "GET /api/tracking/state",
                    "toggleMeal": "POST /api/tracking/meal/toggle",
                    "logFood": "POST /api/tracking/food/log",
                    "deleteFood": "DELETE /api/tracking/food/log/<id>",
                    "water": "POST /api/tracking/water",
                    "weight": "POST /api/tracking/weight"
                },
                "ai": {
                    "chat": "POST /api/ai/chat",
                    "scanFood": "POST /api/ai/scan-food"
                }
            }
        })

    @app.route("/api/health", methods=["GET"])
    def health():
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as user_count FROM users")
            u_count = cursor.fetchone()["user_count"]
            conn.close()
            return jsonify({
                "status": "healthy",
                "service": "NutriAI Backend API",
                "version": "4.0.0",
                "database": "SQLite (Connected)",
                "totalRegisteredUsers": u_count
            })
        except Exception as e:
            return jsonify({"status": "unhealthy", "error": str(e)}), 500

    @app.route("/")
    def index():
        return send_from_directory(frontend_dir, "index.html")

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"NutriAI Backend API starting on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)

