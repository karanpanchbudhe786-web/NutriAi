"""
NutriAI — Real-Time Nutrition & Zero-Based Tracking Routes
"""

from flask import Blueprint, request, jsonify
import uuid
import json
from datetime import datetime
from backend.database import get_db, calculate_metabolic_targets
from backend.routes.profile_routes import resolve_user_id

tracking_bp = Blueprint("tracking", __name__)

def get_today_date_str():
    return datetime.utcnow().strftime("%Y-%m-%d")

@tracking_bp.route("/state", methods=["GET"])
def get_tracking_state():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    date_str = request.args.get("date") or get_today_date_str()
    conn = get_db()
    cursor = conn.cursor()

    # 1. Fetch Profile
    cursor.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    prof_row = cursor.fetchone()
    if not prof_row:
        conn.close()
        return jsonify({"success": False, "error": "Profile not found."}), 404

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

    # 2. Fetch Checked Meals for Today
    cursor.execute(
        "SELECT meal_id, meal_name, calories, protein, carbs, fats, fiber FROM checked_meals WHERE user_id = ? AND date_str = ?",
        (user_id, date_str)
    )
    checked_meal_rows = cursor.fetchall()
    checked_meals_map = {}
    checked_cals = 0
    checked_p = 0
    checked_c = 0
    checked_f = 0
    checked_fiber = 0

    for cm in checked_meal_rows:
        checked_meals_map[cm["meal_id"]] = True
        checked_cals += cm["calories"]
        checked_p += cm["protein"]
        checked_c += cm["carbs"]
        checked_f += cm["fats"]
        checked_fiber += cm["fiber"]

    # 3. Fetch Custom Food Logs for Today
    cursor.execute(
        "SELECT id, name, calories as cals, protein as p, carbs as c, fats as f, fiber, meal_type as meal, created_at FROM food_logs WHERE user_id = ? AND date_str = ?",
        (user_id, date_str)
    )
    food_log_rows = cursor.fetchall()
    food_logs_list = []
    log_cals = 0
    log_p = 0
    log_c = 0
    log_f = 0
    log_fiber = 0

    for fl in food_log_rows:
        item = {
            "id": fl["id"],
            "name": fl["name"],
            "cals": fl["cals"],
            "p": fl["p"],
            "c": fl["c"],
            "f": fl["f"],
            "fiber": fl["fiber"],
            "meal": fl["meal"]
        }
        food_logs_list.append(item)
        log_cals += fl["cals"]
        log_p += fl["p"]
        log_c += fl["c"]
        log_f += fl["f"]
        log_fiber += fl["fiber"]

    # 4. Fetch Water Log for Today
    cursor.execute(
        "SELECT water_ml FROM water_logs WHERE user_id = ? AND date_str = ?",
        (user_id, date_str)
    )
    water_row = cursor.fetchone()
    water_ml = water_row["water_ml"] if water_row else 0

    # 5. Fetch Weight History
    cursor.execute(
        "SELECT date_str as date, weight, note FROM weight_history WHERE user_id = ? ORDER BY id ASC",
        (user_id,)
    )
    weight_history = [dict(w) for w in cursor.fetchall()]
    conn.close()

    # Calculate Totals & Remaining
    calories_consumed = checked_cals + log_cals
    protein_consumed = checked_p + log_p
    carbs_consumed = checked_c + log_c
    fat_consumed = checked_f + log_f
    fiber_consumed = checked_fiber + log_fiber

    daily_target = targets["calories"]
    protein_target = targets["protein"]
    carbs_target = targets["carbs"]
    fat_target = targets["fats"]
    water_target = targets["water"]

    calories_remaining = max(0, daily_target - calories_consumed)
    protein_remaining = max(0, protein_target - protein_consumed)
    carbs_remaining = max(0, carbs_target - carbs_consumed)
    fat_remaining = max(0, fat_target - fat_consumed)
    water_remaining = max(0, water_target - water_ml)

    streak = 1 if (calories_consumed > 0 or water_ml > 0) else 0

    nutrition_state = {
        "dailyTarget": daily_target,
        "caloriesConsumed": calories_consumed,
        "caloriesRemaining": calories_remaining,
        "proteinConsumed": protein_consumed,
        "proteinTarget": protein_target,
        "proteinRemaining": protein_remaining,
        "carbsConsumed": carbs_consumed,
        "carbsTarget": carbs_target,
        "carbsRemaining": carbs_remaining,
        "fatConsumed": fat_consumed,
        "fatTarget": fat_target,
        "fatRemaining": fat_remaining,
        "fiberConsumed": fiber_consumed,
        "fiberTarget": targets["fiber"],
        "water": water_ml,
        "waterIntake": water_ml,
        "waterTarget": water_target,
        "waterRemaining": water_remaining,
        "streak": streak,
        "bmi": targets["bmi"],
        "bmiCategory": targets["bmiCategory"],
        "bmr": targets["bmr"],
        "tdee": targets["tdee"],
        "checkedMeals": checked_meals_map,
        "todayFoodLogs": food_logs_list,
        "weightHistory": weight_history,
        "profile": profile_dict
    }

    return jsonify({
        "success": True,
        "nutritionState": nutrition_state,
        "profile": profile_dict,
        "targets": targets
    })

@tracking_bp.route("/meal/toggle", methods=["POST"])
def toggle_meal():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    data = request.get_json() or {}
    meal_id = data.get("mealId")
    meal_name = data.get("mealName") or "Planned Meal"
    calories = int(data.get("calories") or 0)
    protein = int(data.get("protein") or 0)
    carbs = int(data.get("carbs") or 0)
    fats = int(data.get("fats") or 0)
    fiber = int(data.get("fiber") or 0)
    day_code = data.get("dayCode") or "Today"
    date_str = data.get("date") or get_today_date_str()

    if not meal_id:
        return jsonify({"success": False, "error": "mealId is required."}), 400

    conn = get_db()
    cursor = conn.cursor()

    # Check if already checked
    cursor.execute(
        "SELECT id FROM checked_meals WHERE user_id = ? AND meal_id = ? AND date_str = ?",
        (user_id, meal_id, date_str)
    )
    row = cursor.fetchone()

    if row:
        # Uncheck / Remove
        cursor.execute("DELETE FROM checked_meals WHERE id = ?", (row["id"],))
        checked = False
    else:
        # Check / Insert
        cursor.execute("""
            INSERT INTO checked_meals (user_id, meal_id, meal_name, calories, protein, carbs, fats, fiber, day_code, date_str)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, meal_id, meal_name, calories, protein, carbs, fats, fiber, day_code, date_str))
        checked = True

    conn.commit()
    conn.close()

    return jsonify({"success": True, "mealId": meal_id, "checked": checked})

@tracking_bp.route("/food/log", methods=["POST"])
def add_food_log():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    data = request.get_json() or {}
    name = (data.get("name") or "Food Item").strip()
    calories = int(data.get("cals") or data.get("calories") or 0)
    protein = int(data.get("p") or data.get("protein") or 0)
    carbs = int(data.get("c") or data.get("carbs") or 0)
    fats = int(data.get("f") or data.get("fats") or 0)
    fiber = int(data.get("fiber") or 0)
    meal_type = data.get("meal") or data.get("mealType") or "Snack"
    date_str = data.get("date") or get_today_date_str()

    log_id = "log_" + uuid.uuid4().hex[:10]
    now_iso = datetime.utcnow().isoformat()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO food_logs (id, user_id, name, calories, protein, carbs, fats, fiber, meal_type, date_str, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (log_id, user_id, name, calories, protein, carbs, fats, fiber, meal_type, date_str, now_iso))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "log": {
            "id": log_id,
            "name": name,
            "cals": calories,
            "p": protein,
            "c": carbs,
            "f": fats,
            "fiber": fiber,
            "meal": meal_type
        }
    }), 201

@tracking_bp.route("/food/log/<log_id>", methods=["DELETE"])
def delete_food_log(log_id):
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM food_logs WHERE id = ? AND user_id = ?", (log_id, user_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "deletedLogId": log_id})

@tracking_bp.route("/water", methods=["POST"])
def update_water():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    data = request.get_json() or {}
    amount = int(data.get("amount") or 0)
    reset = bool(data.get("reset"))
    date_str = data.get("date") or get_today_date_str()
    now_iso = datetime.utcnow().isoformat()

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT water_ml FROM water_logs WHERE user_id = ? AND date_str = ?", (user_id, date_str))
    row = cursor.fetchone()

    if reset:
        new_total = 0
    else:
        current = row["water_ml"] if row else 0
        new_total = max(0, current + amount)

    cursor.execute("""
        INSERT INTO water_logs (user_id, date_str, water_ml, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id, date_str) DO UPDATE SET
            water_ml = excluded.water_ml,
            updated_at = excluded.updated_at
    """, (user_id, date_str, new_total, now_iso))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "waterLogged": new_total, "date": date_str})

@tracking_bp.route("/weight", methods=["POST"])
def log_weight():
    user_id = resolve_user_id()
    if not user_id:
        return jsonify({"success": False, "error": "User authentication required."}), 401

    data = request.get_json() or {}
    try:
        weight = float(data.get("weight") or 0)
    except (ValueError, TypeError):
        return jsonify({"success": False, "error": "Valid weight is required."}), 400

    note = data.get("note") or ""
    date_str = data.get("date") or datetime.utcnow().strftime("%b %d")
    now_iso = datetime.utcnow().isoformat()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO weight_history (user_id, date_str, weight, note, created_at) VALUES (?, ?, ?, ?, ?)",
        (user_id, date_str, weight, note, now_iso)
    )

    # Also update current weight in profile
    cursor.execute("UPDATE profiles SET weight = ?, updated_at = ? WHERE user_id = ?", (weight, now_iso, user_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "weight": weight, "date": date_str, "note": note})
