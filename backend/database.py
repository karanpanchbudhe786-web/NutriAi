"""
NutriAI — SQLite Database & Metabolic Calculation Engine
Manages users, biometric profiles, meal logs, water logs, and weight histories.
"""

import sqlite3
import hashlib
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nutriai.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Profiles Table (Single Source of Truth)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        gender TEXT NOT NULL,
        age INTEGER NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        target_weight REAL,
        activity_level TEXT NOT NULL,
        goal TEXT NOT NULL,
        diet_preference TEXT NOT NULL,
        cuisine_preference TEXT NOT NULL,
        sleep REAL DEFAULT 7.5,
        exercise_frequency TEXT DEFAULT '3_5',
        meal_frequency INTEGER DEFAULT 4,
        restrictions TEXT DEFAULT '[]',
        water_target INTEGER DEFAULT 3200,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Explicitly Checked Planned Meals
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS checked_meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        meal_id TEXT NOT NULL,
        meal_name TEXT,
        calories INTEGER DEFAULT 0,
        protein INTEGER DEFAULT 0,
        carbs INTEGER DEFAULT 0,
        fats INTEGER DEFAULT 0,
        fiber INTEGER DEFAULT 0,
        day_code TEXT NOT NULL,
        date_str TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, meal_id, date_str)
    );
    """)

    # 4. Custom Food Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS food_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        calories INTEGER NOT NULL,
        protein INTEGER NOT NULL,
        carbs INTEGER NOT NULL,
        fats INTEGER NOT NULL,
        fiber INTEGER DEFAULT 0,
        meal_type TEXT,
        date_str TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 5. Daily Water Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS water_logs (
        user_id TEXT NOT NULL,
        date_str TEXT NOT NULL,
        water_ml INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, date_str),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 6. Weight History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS weight_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date_str TEXT NOT NULL,
        weight REAL NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    """Salted SHA-256 password hashing matching frontend WebCrypto salt"""
    salted = (password + "_nutriai_salt_2026").encode("utf-8")
    return hashlib.sha256(salted).hexdigest()

def calculate_metabolic_targets(profile: dict) -> dict:
    """Mifflin-St Jeor metabolic calculations matching frontend precision"""
    weight = float(profile.get("weight") or 70.0)
    height = float(profile.get("height") or 175.0)
    age = int(profile.get("age") or 25)
    gender = profile.get("gender") or "male"
    activity = profile.get("activity_level") or profile.get("activityLevel") or "moderate"
    goal = profile.get("goal") or "balanced_nutrition"
    diet = profile.get("diet_preference") or profile.get("dietPreference") or "balanced"

    # 1. BMI Calculation
    height_m = height / 100.0
    bmi = round(weight / (height_m * height_m), 1)
    if bmi < 18.5:
        bmi_category = "Underweight"
    elif bmi < 25.0:
        bmi_category = "Normal"
    elif bmi < 30.0:
        bmi_category = "Overweight"
    else:
        bmi_category = "Obese"

    # 2. Mifflin-St Jeor BMR
    if gender.lower() == "female":
        bmr = round(10.0 * weight + 6.25 * height - 5.0 * age - 161.0)
    else:
        bmr = round(10.0 * weight + 6.25 * height - 5.0 * age + 5.0)

    # 3. TDEE Multipliers
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "high": 1.725,
        "athlete": 1.9
    }
    tdee = round(bmr * activity_multipliers.get(activity.lower(), 1.55))

    # 4. Calorie Target by Goal
    if goal in ["fat_loss", "lean_fat_loss"]:
        target_calories = max(1200, tdee - 450)
    elif goal in ["muscle_gain", "hypertrophy"]:
        target_calories = tdee + 350
    elif goal in ["recomposition", "body_recomp"]:
        target_calories = tdee - 150
    elif goal in ["weight_management"]:
        target_calories = tdee - 200
    else:
        target_calories = tdee

    # 5. Macronutrient Splits
    diet_lower = diet.lower()
    if diet_lower == "keto":
        target_protein = round(weight * 2.0)
        target_carbs = 30
        target_fats = max(30, round((target_calories - (target_protein * 4) - (target_carbs * 4)) / 9))
    elif diet_lower in ["vegan", "plant_based"]:
        target_protein = round(weight * 1.8)
        target_fats = round((target_calories * 0.25) / 9)
        target_carbs = max(50, round((target_calories - (target_protein * 4) - (target_fats * 9)) / 4))
    elif diet_lower == "vegetarian":
        target_protein = round(weight * 1.9)
        target_fats = round((target_calories * 0.28) / 9)
        target_carbs = max(50, round((target_calories - (target_protein * 4) - (target_fats * 9)) / 4))
    elif diet_lower == "eggetarian":
        target_protein = round(weight * 2.0)
        target_fats = round((target_calories * 0.27) / 9)
        target_carbs = max(50, round((target_calories - (target_protein * 4) - (target_fats * 9)) / 4))
    else:
        # Balanced Omnivore / Mediterranean
        target_protein = round(weight * 2.1)
        target_fats = round((target_calories * 0.25) / 9)
        target_carbs = max(50, round((target_calories - (target_protein * 4) - (target_fats * 9)) / 4))

    return {
        "bmr": bmr,
        "tdee": tdee,
        "bmi": bmi,
        "bmiCategory": bmi_category,
        "calories": target_calories,
        "protein": target_protein,
        "carbs": target_carbs,
        "fats": target_fats,
        "fiber": 32,
        "water": int(profile.get("water_target") or profile.get("waterTarget") or 3200)
    }

# Initialize tables upon module load
init_db()
