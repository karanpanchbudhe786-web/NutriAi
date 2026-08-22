/**
 * NutriAI — State Management & Metabolic Calculator Engine v3.0
 * 
 * Strict separation of:
 * 1. TARGET NUTRITION: Mifflin-St Jeor Biometrics, BMR, TDEE, Calorie/Macro goals
 * 2. CONSUMED NUTRITION: Explicitly checked meals from Today's Schedule + Food Log entries
 * 
 * Guarantees:
 * - New users start at 0 kcal, 0g Protein, 0g Carbs, 0g Fats, 0g Fiber, 0L Water, 0-Day Streak.
 * - Planned meals in the 7-day schedule do NOT count as consumed until explicitly checked.
 * - Checking Breakfast adds only Breakfast calories/macros.
 * - Checking Lunch adds only Lunch calories/macros.
 * - Unchecking deducts immediately.
 */

class NutriAIState {
  constructor() {
    this.STORAGE_KEY = "nutriai_app_state_v3";
    this.listeners = [];
    this.loadState();
  }

  loadState() {
    try {
      const activeUser = localStorage.getItem("nutriai_active_user_v3");
      const token = localStorage.getItem("nutriai_jwt_token_v4");
      const hasAuth = Boolean(activeUser || token);

      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && hasAuth) {
        this.data = JSON.parse(saved);
        this.data.isLoggedIn = true;
        // Ensure data structures exist
        if (!this.data.checkedMeals) this.data.checkedMeals = {};
        if (!Array.isArray(this.data.todayFoodLogs)) this.data.todayFoodLogs = [];
        if (typeof this.data.waterLogged !== "number") this.data.waterLogged = 0;
        if (typeof this.data.sleepLogged !== "number") this.data.sleepLogged = 0;
        if (typeof this.data.stepsLogged !== "number") this.data.stepsLogged = 0;
        if (typeof this.data.streak !== "number") this.data.streak = 0;
        if (!this.data.completedHabits) this.data.completedHabits = {};
        if (!this.data.profile) this.data.profile = { ...NutriAIData.defaultProfile };
        if (!Array.isArray(this.data.weightHistory)) {
          this.data.weightHistory = [];
        }
      } else {
        this.resetToGuestDefaults();
      }
    } catch (e) {
      console.warn("Could not load localStorage, resetting to clean guest defaults:", e);
      this.resetToGuestDefaults();
    }
    this.recalculateTargets();
  }

  resetToGuestDefaults() {
    const today = this._getTodayDayCode();
    this.data = {
      isLoggedIn: false,
      profile: null,
      activeDay: today,
      checkedMeals: {}, // Zero checked meals initially
      waterLogged: 0, // Zero ml consumed initially
      waterDate: this._getTodayDateString(),
      sleepLogged: 0,
      stepsLogged: 0,
      streak: 0,
      todayFoodLogs: [],
      completedHabits: {},
      weightHistory: [],
      notifications: []
    };
    this.targets = null;
    this.saveState();
  }

  resetToDefaults() {
    this.resetToGuestDefaults();
  }

  /**
   * Resets only consumed tracking data (meals, water, habits, food logs)
   * while keeping the user's customized biometric profile intact.
   */
  clearTrackingData() {
    this.data.checkedMeals = {};
    this.data.todayFoodLogs = [];
    this.data.waterLogged = 0;
    this.data.sleepLogged = 0;
    this.data.stepsLogged = 0;
    this.data.streak = 0;
    this.data.completedHabits = {};
    this.saveState();
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  // --- Utility Helpers ---
  _getTodayDayCode() {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[new Date().getDay()];
  }

  _getTodayDateString() {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Metabolic Calculator Engine
   * Uses Mifflin-St Jeor Equation for BMR and scientific macro splits.
   * Target calories & macros come purely from user's biometrics & goals.
   */
  recalculateTargets() {
    if (!this.data.isLoggedIn || !this.data.profile) {
      this.targets = null;
      return null;
    }

    const p = this.data.profile;
    const weight = Number(p.weight) || 0;
    const height = Number(p.height) || 0;
    const age = Number(p.age) || 0;
    const gender = p.gender || "male";

    if (!weight || !height || !age) {
      this.targets = null;
      return null;
    }

    // 1. BMI Calculation & Ideal Body Weight (IBW)
    const heightM = height / 100;
    const bmi = Number((weight / (heightM * heightM)).toFixed(1));
    const idealBodyWeight = Number((22.5 * heightM * heightM).toFixed(1));
    let bmiCategory = "Normal";
    let bmiColor = "#10b981";
    let bmiPct = 0;
    
    if (bmi < 18.5) {
      bmiCategory = "Underweight";
      bmiColor = "#3b82f6";
      bmiPct = Math.max(0, ((bmi - 10) / (18.5 - 10)) * 23);
    } else if (bmi < 25) {
      bmiCategory = "Normal";
      bmiColor = "#10b981";
      bmiPct = 23 + ((bmi - 18.5) / (25 - 18.5)) * 25;
    } else if (bmi < 30) {
      bmiCategory = "Overweight";
      bmiColor = "#f59e0b";
      bmiPct = 48 + ((bmi - 25) / (30 - 25)) * 24;
    } else {
      bmiCategory = "Obese";
      bmiColor = "#ef4444";
      bmiPct = Math.min(100, 72 + ((bmi - 30) / 15) * 28);
    }

    // Adjusted Body Weight (ABW) for BMI >= 25.0 to prevent BMR overestimation from adipose tissue
    let effectiveWeight = weight;
    if (bmi > 25.0) {
      effectiveWeight = Number((idealBodyWeight + 0.25 * (weight - idealBodyWeight)).toFixed(1));
    }

    // 2. Mifflin-St Jeor BMR (using metabolically effective body mass)
    let bmr = (10 * effectiveWeight) + (6.25 * height) - (5 * age);
    if (gender === "female") {
      bmr -= 161;
    } else {
      bmr += 5;
    }
    bmr = Math.round(bmr);

    // 3. Calibrated Physical Activity Level (PAL) Multipliers (WHO / FAO / ISSN Standards)
    const activityMultipliers = {
      sedentary: 1.20,
      light: 1.35,
      moderate: 1.50,
      high: 1.65,
      very_active: 1.65,
      athlete: 1.80
    };
    const actKey = (p.activityLevel || "moderate").toLowerCase();
    const multiplier = activityMultipliers[actKey] || 1.50;
    const tdee = Math.round(bmr * multiplier);

    // 4. Clinically Grounded Goal Energy Strategy & Calorie Deficit / Surplus (ICMR-NIN / USDA DGA)
    let delta = 0;
    let deltaLabel = "Maintenance budget";
    const goal = (p.goal || "balanced_nutrition").toLowerCase();

    if (goal === "weight_management" || goal === "fat_loss" || goal === "lean_fat_loss") {
      delta = -500;
      deltaLabel = "-500 kcal deficit (Fat Loss)";
    } else if (goal === "general_fitness" || goal === "recomposition" || goal === "body_recomp") {
      if (bmi >= 25.0) {
        delta = -350;
        deltaLabel = "-350 kcal deficit (Recomposition)";
      } else if (bmi < 18.5) {
        delta = 200;
        deltaLabel = "+200 kcal surplus (Lean Gain)";
      } else {
        delta = -150;
        deltaLabel = "-150 kcal deficit (Active Tone)";
      }
    } else if (goal === "muscle_strength" || goal === "muscle_gain" || goal === "hypertrophy") {
      if (bmi < 25.0) {
        delta = 200;
        deltaLabel = "+200 kcal surplus (Hypertrophy)";
      } else {
        delta = -200;
        deltaLabel = "-200 kcal deficit (Lean Recomp)";
      }
    } else {
      // balanced_nutrition, healthy_lifestyle, maintenance
      if (bmi >= 25.0) {
        delta = -250;
        deltaLabel = "-250 kcal deficit (Health Support)";
      } else {
        delta = 0;
        deltaLabel = "Maintenance budget";
      }
    }

    let targetCalories = tdee + delta;

    // Standard clinical safety ceilings & floors
    if (gender === "female") {
      targetCalories = Math.max(1200, Math.min(actKey === "athlete" ? 2250 : 2050, targetCalories));
    } else {
      targetCalories = Math.max(1450, Math.min(actKey === "athlete" ? 2750 : 2450, targetCalories));
    }

    // 5. Dynamic Macronutrient Targets (Grounded in ICMR-NIN / ISSN Clinical Ratios)
    let targetProteinGrams, targetFatGrams, targetCarbsGrams;
    const diet = (p.dietPreference || "balanced").toLowerCase();

    if (diet === "keto") {
      targetCarbsGrams = 30;
      targetProteinGrams = Math.round(effectiveWeight * 1.8);
      targetFatGrams = Math.max(30, Math.round((targetCalories - (targetProteinGrams * 4) - (targetCarbsGrams * 4)) / 9));
    } else if (diet === "vegan" || diet === "plant_based") {
      targetProteinGrams = Math.round(effectiveWeight * 1.6);
      targetFatGrams = Math.round((targetCalories * 0.25) / 9);
      targetCarbsGrams = Math.max(50, Math.round((targetCalories - (targetProteinGrams * 4) - (targetFatGrams * 9)) / 4));
    } else if (diet === "vegetarian") {
      targetProteinGrams = Math.round(effectiveWeight * 1.7);
      targetFatGrams = Math.round((targetCalories * 0.27) / 9);
      targetCarbsGrams = Math.max(50, Math.round((targetCalories - (targetProteinGrams * 4) - (targetFatGrams * 9)) / 4));
    } else if (diet === "eggetarian") {
      targetProteinGrams = Math.round(effectiveWeight * 1.8);
      targetFatGrams = Math.round((targetCalories * 0.26) / 9);
      targetCarbsGrams = Math.max(50, Math.round((targetCalories - (targetProteinGrams * 4) - (targetFatGrams * 9)) / 4));
    } else if (diet === "pescatarian") {
      targetProteinGrams = Math.round(effectiveWeight * 1.8);
      targetFatGrams = Math.round((targetCalories * 0.26) / 9);
      targetCarbsGrams = Math.max(50, Math.round((targetCalories - (targetProteinGrams * 4) - (targetFatGrams * 9)) / 4));
    } else {
      // Balanced Omnivore / Mediterranean
      targetProteinGrams = Math.round(effectiveWeight * 1.8);
      targetFatGrams = Math.round((targetCalories * 0.26) / 9);
      targetCarbsGrams = Math.max(50, Math.round((targetCalories - (targetProteinGrams * 4) - (targetFatGrams * 9)) / 4));
    }

    const palNames = {
      sedentary: "Sedentary (1.20x)",
      light: "Light activity (1.35x)",
      moderate: "Moderate activity (1.50x)",
      high: "Very active (1.65x)",
      very_active: "Very active (1.65x)",
      athlete: "Athlete (1.80x)"
    };

    this.targets = {
      bmr,
      tdee,
      bmi,
      bmiCategory,
      bmiColor,
      bmiPct: Math.round(bmiPct),
      calories: targetCalories,
      protein: targetProteinGrams,
      carbs: targetCarbsGrams,
      fats: targetFatGrams,
      deltaLabel,
      palLabel: palNames[actKey] || `Activity (${multiplier.toFixed(2)}x)`,
      water: Number(p.waterTarget) || 3200,
      fiber: 32
    };
  },

  // --- Profile Completion Calculator ---
  getProfileCompletion() {
    if (!this.data.isLoggedIn || !this.data.profile) {
      return { pct: 0, completed: [], missing: [] };
    }

    const p = this.data.profile;
    const checks = [
      { key: "name", label: "Name", val: p.name && p.name.trim() !== "" },
      { key: "age", label: "Age", val: p.age > 0 },
      { key: "height", label: "Height", val: p.height > 0 },
      { key: "weight", label: "Weight", val: p.weight > 0 },
      { key: "gender", label: "Sex / Gender", val: !!p.gender },
      { key: "activityLevel", label: "Activity Level", val: !!p.activityLevel },
      { key: "dietPreference", label: "Dietary Preference", val: !!p.dietPreference },
      { key: "goal", label: "Wellness Goal", val: !!p.goal },
      { key: "restrictions", label: "Dietary Restrictions", val: Array.isArray(p.restrictions) }
    ];

    const completed = checks.filter(c => c.val).map(c => c.label);
    const missing = checks.filter(c => !c.val).map(c => c.label);
    const pct = Math.round((completed.length / checks.length) * 100);

    return { pct, completed, missing };
  }

  // --- Profile Actions ---
  updateProfile(newProfile) {
    this.data.profile = { ...this.data.profile, ...newProfile };
    this.recalculateTargets();
    this.saveState();
  }

  setLoggedIn(status, user = null) {
    this.data.isLoggedIn = Boolean(status);
    if (status) {
      if (user) {
        this.data.profile = { ...NutriAIData.defaultProfile, ...this.data.profile, ...user };
      }
      const email = this.data.profile?.email || "demo_user";
      localStorage.setItem("nutriai_active_user_v3", email);
      localStorage.setItem("nutriai_user_email", email);
      this.recalculateTargets();
    } else {
      this.logout();
      return;
    }
    this.saveState();
  }

  logout() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem("nutriai_active_user_v3");
      localStorage.removeItem("nutriai_jwt_token_v4");
      localStorage.removeItem("nutriai_user_email");
    } catch {}
    this.resetToGuestDefaults();
    this.recalculateTargets();
    this.notify();
  }

  // --- Meal & Food Log Actions ---
  toggleMealCheck(mealId) {
    if (!this.data.checkedMeals) this.data.checkedMeals = {};
    this.data.checkedMeals[mealId] = !this.data.checkedMeals[mealId];
    this.saveState();
  }

  addFoodLog(item) {
    if (!Array.isArray(this.data.todayFoodLogs)) this.data.todayFoodLogs = [];
    this.data.todayFoodLogs.push({
      id: "log_" + Date.now(),
      fiber: 0,
      ...item
    });
    this.saveState();
  }

  removeFoodLog(logId) {
    if (Array.isArray(this.data.todayFoodLogs)) {
      this.data.todayFoodLogs = this.data.todayFoodLogs.filter(l => l.id !== logId);
    }
    this.saveState();
  }

  // --- Hydration Actions ---
  addWater(amountMl) {
    this.data.waterLogged = Math.max(0, (this.data.waterLogged || 0) + amountMl);
    this.saveState();
  }

  resetWater() {
    this.data.waterLogged = 0;
    this.data.waterDate = this._getTodayDateString();
    this.saveState();
  }

  // --- Sleep & Steps Actions ---
  setSleep(hours) {
    this.data.sleepLogged = Math.max(0, Number(hours) || 0);
    this.saveState();
  }

  setSteps(steps) {
    this.data.stepsLogged = Math.max(0, Number(steps) || 0);
    this.saveState();
  }

  // --- Weight History Actions ---
  addWeightEntry(date, weight, note = "") {
    if (!Array.isArray(this.data.weightHistory)) this.data.weightHistory = [];
    this.data.weightHistory.push({ date, weight: Number(weight), note });
    this.saveState();
  }

  // --- Habit Actions ---
  toggleHabit(habitId) {
    if (!this.data.completedHabits) this.data.completedHabits = {};
    this.data.completedHabits[habitId] = !this.data.completedHabits[habitId];
    this.saveState();
  }

  getStreakCount() {
    // Dynamic streak calculation: count consecutive days with tracked activity
    let streak = Number(this.data.streak) || 0;
    // If user has checked any meal today or logged water/food, today is active
    const totals = this.getTodayTotals();
    const hasActivityToday = totals.calories > 0 || (this.data.waterLogged && this.data.waterLogged > 0) || Object.values(this.data.completedHabits || {}).some(Boolean);
    if (hasActivityToday && streak === 0) {
      streak = 1;
    }
    return streak;
  }

  // --- Active Day Navigation ---
  setActiveDay(day) {
    this.data.activeDay = day;
    this.saveState();
  }

  /**
   * Summary Consumed Totals for Today
   * Sums:
   * 1. Explicitly logged food entries in todayFoodLogs
   * 2. Planned meals for today that have been explicitly checked off by the user
   */
  getTodayTotals() {
    let cals = 0, p = 0, c = 0, f = 0, fiber = 0;

    // 1. Explicit food log entries
    if (Array.isArray(this.data.todayFoodLogs)) {
      this.data.todayFoodLogs.forEach(item => {
        cals += Number(item.cals) || 0;
        p += Number(item.p) || 0;
        c += Number(item.c) || 0;
        f += Number(item.f) || 0;
        fiber += Number(item.fiber) || 0;
      });
    }

    // 2. Explicitly checked meals from Today's Schedule
    const today = this.data.activeDay || this._getTodayDayCode();
    if (this.data.checkedMeals && typeof NutriAIMealFilter !== "undefined") {
      const todayPlannedMeals = NutriAIMealFilter.getFilteredMeals(today, this.data.profile, this.targets);
      todayPlannedMeals.forEach(meal => {
        if (this.data.checkedMeals[meal.id]) {
          cals += Number(meal.calories) || 0;
          p += Number(meal.protein) || 0;
          c += Number(meal.carbs) || 0;
          f += Number(meal.fats) || 0;
          fiber += Number(meal.fiber) || 0;
        }
      });
    }

    return {
      calories: Math.round(cals),
      protein: Math.round(p),
      carbs: Math.round(c),
      fats: Math.round(f),
      fiber: Math.round(fiber)
    };
  }

  /**
   * Returns a clean, single structured snapshot of real tracked nutrition & targets
   */
  getNutritionState() {
    const totals = this.getTodayTotals() || { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    const targets = this.targets || {};
    const p = (this.data && this.data.profile) ? this.data.profile : {};

    const dailyTarget = Number(targets.calories) || 0;
    const caloriesConsumed = Number(totals.calories) || 0;
    const caloriesRemaining = Math.max(0, dailyTarget - caloriesConsumed);

    const proteinTarget = Number(targets.protein) || 0;
    const proteinConsumed = Number(totals.protein) || 0;
    const proteinRemaining = Math.max(0, proteinTarget - proteinConsumed);

    const carbsTarget = Number(targets.carbs) || 0;
    const carbsConsumed = Number(totals.carbs) || 0;
    const carbsRemaining = Math.max(0, carbsTarget - carbsConsumed);

    const fatTarget = Number(targets.fats) || 0;
    const fatConsumed = Number(totals.fats) || 0;
    const fatRemaining = Math.max(0, fatTarget - fatConsumed);

    const fiberTarget = Number(targets.fiber) || 0;
    const fiberConsumed = Number(totals.fiber) || 0;

    const waterTarget = Number(targets.water) || 0;
    const waterIntake = Number(this.data ? this.data.waterLogged : 0) || 0;
    const waterRemaining = Math.max(0, waterTarget - waterIntake);

    return {
      dailyTarget,
      caloriesConsumed,
      caloriesRemaining,
      proteinConsumed,
      proteinTarget,
      proteinRemaining,
      carbsConsumed,
      carbsTarget,
      carbsRemaining,
      fatConsumed,
      fatTarget,
      fatRemaining,
      fiberConsumed,
      fiberTarget,
      waterIntake,
      waterTarget,
      waterRemaining,
      streak: this.getStreakCount(),
      bmi: targets.bmi,
      bmiCategory: targets.bmiCategory,
      bmr: targets.bmr,
      tdee: targets.tdee,
      profile: { ...p }
    };
  }
}

// Global Singleton State
const appState = new NutriAIState();
window.appState = appState;
