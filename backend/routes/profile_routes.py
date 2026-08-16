"""
NutriAI — Profile & Metabolic Benchmarks Routes
"""

from flask import Blueprint, request, jsonify
import json
from datetime import datetime
from backend.database import get_db, calculate_metabolic_targets

profile_bp = Blueprint("profile", __name__)

def resolve_user_id():
    auth_header = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if auth_header.startswith("token_"):
        return auth_header.replace("token_", "")
    user_id = request.args.get("userId") or request.headers.get("X-User-Id")
    if user_id:
        return user_id
    email = request.args.get("email")
    if email:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (email.strip().lower(),))
        row = cursor.fetchone()
        conn.close()
        if row:
            return row["id"]
    return None

@profile_bp.route("", methods=["GET"])
def get_profile():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    prof = cursor.fetchone()
    conn.close()

    if not prof:
        return jsonify({"success": False, "error": "Profile not found."}), 404

    try:
        restrictions = json.loads(prof["restrictions"])
    except Exception:
        restrictions = []

    profile_dict = {
        "userId": prof["user_id"],
        "name": prof["name"],
        "email": prof["email"],
        "gender": prof["gender"],
        "age": prof["age"],
        "height": prof["height"],
        "weight": prof["weight"],
        "targetWeight": prof["target_weight"],
        "activityLevel": prof["activity_level"],
        "goal": prof["goal"],
        "dietPreference": prof["diet_preference"],
        "cuisinePreference": prof["cuisine_preference"],
        "sleep": prof["sleep"],
        "exerciseFrequency": prof["exercise_frequency"],
        "mealFrequency": prof["meal_frequency"],
        "restrictions": restrictions
    }

    targets = calculate_metabolic_targets(profile_dict)
    profile_dict["bmi"] = targets["bmi"]
    profile_dict["bmiCategory"] = targets["bmiCategory"]

    return jsonify({"success": True, "profile": profile_dict, "targets": targets})

@profile_bp.route("", methods=["PUT"])
def update_profile():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    data = request.get_json() or {}
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return jsonify({"success": False, "error": "Profile not found."}), 404

    name = data.get("name") if data.get("name") is not None else existing["name"]
    gender = data.get("gender") or data.get("sex") or existing["gender"]
    age = int(data.get("age") if data.get("age") is not None else existing["age"])
    height = float(data.get("height") if data.get("height") is not None else existing["height"])
    weight = float(data.get("weight") if data.get("weight") is not None else existing["weight"])
    target_weight = float(data.get("targetWeight") if data.get("targetWeight") is not None else existing["target_weight"])
    activity_level = data.get("activityLevel") or data.get("activity") or existing["activity_level"]
    goal = data.get("goal") or data.get("wellnessGoal") or existing["goal"]
    diet_preference = data.get("dietPreference") or data.get("dietaryStyle") or existing["diet_preference"]
    cuisine_preference = data.get("cuisinePreference") or data.get("cuisine") or existing["cuisine_preference"]
    sleep = float(data.get("sleep") if data.get("sleep") is not None else existing["sleep"])
    exercise_frequency = str(data.get("exerciseFrequency") if data.get("exerciseFrequency") is not None else existing["exercise_frequency"])
    meal_frequency = int(data.get("mealFrequency") if data.get("mealFrequency") is not None else existing["meal_frequency"])

    raw_restrictions = data.get("restrictions")
    if raw_restrictions is not None:
        restrictions_json = json.dumps(raw_restrictions if isinstance(raw_restrictions, list) else [raw_restrictions])
    else:
        restrictions_json = existing["restrictions"]

    now_iso = datetime.utcnow().isoformat()

    cursor.execute("""
        UPDATE profiles SET
            name = ?, gender = ?, age = ?, height = ?, weight = ?, target_weight = ?,
            activity_level = ?, goal = ?, diet_preference = ?, cuisine_preference = ?,
            sleep = ?, exercise_frequency = ?, meal_frequency = ?, restrictions = ?,
            updated_at = ?
        WHERE user_id = ?
    """, (
        name, gender, age, height, weight, target_weight,
        activity_level, goal, diet_preference, cuisine_preference,
        sleep, exercise_frequency, meal_frequency, restrictions_json,
        now_iso, user_id
    ))

    conn.commit()
    conn.close()

    try:
        restrictions = json.loads(restrictions_json)
    except Exception:
        restrictions = []

    profile_dict = {
        "userId": user_id,
        "name": name,
        "email": existing["email"],
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
        "restrictions": restrictions
    }

    targets = calculate_metabolic_targets(profile_dict)
    profile_dict["bmi"] = targets["bmi"]
    profile_dict["bmiCategory"] = targets["bmiCategory"]

    return jsonify({
        "success": True,
        "message": "Health Profile & Macro Targets Recalculated! ✓",
        "profile": profile_dict,
        "targets": targets
    })
