"""
NutriAI — Authentication & Registration Routes
"""

from flask import Blueprint, request, jsonify
import uuid
import json
from datetime import datetime
from backend.database import get_db, hash_password, calculate_metabolic_targets

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}

    # Extract all wizard field variants
    name = (data.get("name") or data.get("fullName") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name:
        return jsonify({"success": False, "error": "Full name is required."}), 400
    if not email or "@" not in email or "." not in email:
        return jsonify({"success": False, "error": "A valid email address is required."}), 400
    if not password or len(password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters."}), 400

    # Biometrics & Validation
    try:
        age = int(data.get("age") or 0)
        height = float(data.get("height") or 0)
        weight = float(data.get("weight") or data.get("currentWeight") or 0)
        target_weight = float(data.get("targetWeight") or weight)
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Age, height, and weight must be valid numbers."}), 400

    if age < 14 or age > 100:
        return jsonify({"success": False, "error": "Age must be between 14 and 100 years."}), 400
    if height < 100 or height > 250:
        return jsonify({"success": False, "error": "Height must be between 100 cm and 250 cm."}), 400
    if weight < 30 or weight > 300:
        return jsonify({"success": False, "error": "Weight must be between 30 kg and 300 kg."}), 400

    gender = data.get("gender") or data.get("sex") or "male"
    activity_level = data.get("activityLevel") or data.get("activity") or "moderate"
    goal = data.get("goal") or data.get("wellnessGoal") or "balanced_nutrition"
    diet_preference = data.get("dietPreference") or data.get("dietaryStyle") or "balanced"
    cuisine_preference = data.get("cuisinePreference") or data.get("cuisine") or "indian"
    sleep = float(data.get("sleep") or data.get("sleepDuration") or 7.5)
    exercise_frequency = str(data.get("exerciseFrequency") or "3_5")
    meal_frequency = int(data.get("mealFrequency") or data.get("mealsPerDay") or 4)

    raw_restrictions = data.get("restrictions") or data.get("allergies") or []
    if isinstance(raw_restrictions, str):
        restrictions_json = json.dumps([raw_restrictions])
    elif isinstance(raw_restrictions, list):
        restrictions_json = json.dumps(raw_restrictions)
    else:
        restrictions_json = "[]"

    conn = get_db()
    cursor = conn.cursor()

    # Check for duplicate email
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({"success": False, "error": "An account with this email address already exists. Please log in."}), 409

    user_id = "usr_" + uuid.uuid4().hex[:12]
    pwd_hash = hash_password(password)
    now_iso = datetime.utcnow().isoformat()

    # Insert User & Profile
    cursor.execute(
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        (user_id, email, pwd_hash, now_iso)
    )

    cursor.execute("""
        INSERT INTO profiles (
            user_id, name, email, gender, age, height, weight, target_weight,
            activity_level, goal, diet_preference, cuisine_preference,
            sleep, exercise_frequency, meal_frequency, restrictions,
            water_target, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, name, email, gender, age, height, weight, target_weight,
        activity_level, goal, diet_preference, cuisine_preference,
        sleep, exercise_frequency, meal_frequency, restrictions_json,
        3200, now_iso
    ))

    # Add initial weight entry
    cursor.execute(
        "INSERT INTO weight_history (user_id, date_str, weight, note, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, "Today", weight, "Initial registration check-in", now_iso)
    )

    conn.commit()
    conn.close()

    profile_dict = {
        "userId": user_id,
        "name": name,
        "email": email,
        "gender": gender,
        "age": age,
        "height": height,
        "weight": weight,
        "targetWeight": target_weight,
        "activityLevel": activity_level,
        "goal": goal,
        "dietPreference": diet_preference,
        "cuisinePreference": cuisine_preference,
        "sleep": sleep,
        "exerciseFrequency": exercise_frequency,
        "mealFrequency": meal_frequency,
        "restrictions": json.loads(restrictions_json)
    }

    targets = calculate_metabolic_targets(profile_dict)
    profile_dict["bmi"] = targets["bmi"]
    profile_dict["bmiCategory"] = targets["bmiCategory"]

    return jsonify({
        "success": True,
        "message": f"Welcome to NutriAI, {name}! Profile created successfully.",
        "token": "token_" + user_id,
        "user": profile_dict,
        "profile": profile_dict,
        "targets": targets
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password are required."}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id, password_hash FROM users WHERE email = ?", (email,))
    user_row = cursor.fetchone()

    if not user_row:
        conn.close()
        return jsonify({"success": False, "error": "No account found with this email. Please sign up."}), 404

    user_id = user_row["id"]
    if user_row["password_hash"] != hash_password(password):
        conn.close()
        return jsonify({"success": False, "error": "Incorrect password. Please try again."}), 401

    # Fetch Profile
    cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    prof_row = cursor.fetchone()
    conn.close()

    if not prof_row:
        return jsonify({"success": False, "error": "Profile data missing."}), 500

    restrictions = []
    try:
        restrictions = json.loads(prof_row["restrictions"])
    except Exception:
        restrictions = []

    profile_dict = {
        "userId": user_id,
        "name": prof_row["name"],
        "email": prof_row["email"],
        "gender": prof_row["gender"],
        "age": prof_row["age"],
        "height": prof_row["height"],
        "weight": prof_row["weight"],
        "targetWeight": prof_row["target_weight"],
        "activityLevel": prof_row["activity_level"],
        "goal": prof_row["goal"],
        "dietPreference": prof_row["diet_preference"],
        "cuisinePreference": prof_row["cuisine_preference"],
        "sleep": prof_row["sleep"],
        "exerciseFrequency": prof_row["exercise_frequency"],
        "mealFrequency": prof_row["meal_frequency"],
        "restrictions": restrictions
    }

    targets = calculate_metabolic_targets(profile_dict)
    profile_dict["bmi"] = targets["bmi"]
    profile_dict["bmiCategory"] = targets["bmiCategory"]

    return jsonify({
        "success": True,
        "message": f"Welcome back, {profile_dict['name']}!",
        "token": "token_" + user_id,
        "user": profile_dict,
        "profile": profile_dict,
        "targets": targets
    }), 200

@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    email_query = request.args.get("email", "").strip().lower()

    conn = get_db()
    cursor = conn.cursor()

    if token.startswith("token_"):
        user_id = token.replace("token_", "")
        cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    elif email_query:
        cursor.execute("SELECT * FROM profiles WHERE email = ?", (email_query,))
    else:
        conn.close()
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    prof_row = cursor.fetchone()
    conn.close()

    if not prof_row:
        return jsonify({"success": False, "error": "User not found"}), 404

    try:
        restrictions = json.loads(prof_row["restrictions"])
    except Exception:
        restrictions = []

    profile_dict = {
        "userId": prof_row["user_id"],
        "name": prof_row["name"],
        "email": prof_row["email"],
        "gender": prof_row["gender"],
        "age": prof_row["age"],
        "height": prof_row["height"],
        "weight": prof_row["weight"],
        "targetWeight": prof_row["target_weight"],
        "activityLevel": prof_row["activity_level"],
        "goal": prof_row["goal"],
        "dietPreference": prof_row["diet_preference"],
        "cuisinePreference": prof_row["cuisine_preference"],
        "sleep": prof_row["sleep"],
        "exerciseFrequency": prof_row["exercise_frequency"],
        "mealFrequency": prof_row["meal_frequency"],
        "restrictions": restrictions
    }

    targets = calculate_metabolic_targets(profile_dict)
    profile_dict["bmi"] = targets["bmi"]
    profile_dict["bmiCategory"] = targets["bmiCategory"]

    return jsonify({"success": True, "user": profile_dict, "profile": profile_dict, "targets": targets})

@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"success": True, "message": "Session terminated successfully."}), 200

