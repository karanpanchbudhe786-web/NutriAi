/**
 * NutriAI — Authentication & Secure User Profile Engine v3.1
 * 
 * Supports:
 * - 3-Step Onboarding Wizard Registration (registerUserFromWizard)
 * - Complete biometrics, lifestyle, and dietary preferences persistence
 * - Salted SHA-256 client password hashing (passwords NEVER stored in plain text)
 * - Duplicate email checking and validation error handling
 * - Multi-user local database (nutriai_users_db_v3)
 * - Cloud Supabase session synchronization
 * - Seamless login profile restoration
 */

const NutriAIAuthService = {
  USERS_DB_KEY: "nutriai_users_db_v3",
  CONFIG_STORAGE_KEY: "nutriai_supabase_config",
  CURRENT_USER_KEY: "nutriai_active_user_v3",
  supabaseClient: null,

  init() {
    const config = this.getConfig();
    if (config.url && config.anonKey && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
        this.checkExistingSession();
      } catch (e) {
        console.warn("Failed to initialize Supabase client:", e);
      }
    }
  },

  getConfig() {
    try {
      const saved = localStorage.getItem(this.CONFIG_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { url: "", anonKey: "" };
    } catch {
      return { url: "", anonKey: "" };
    }
  },

  saveConfig(url, anonKey) {
    if (url && anonKey) {
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
      this.init();
      return true;
    } else {
      localStorage.removeItem(this.CONFIG_STORAGE_KEY);
      this.supabaseClient = null;
      return false;
    }
  },

  isCloudConfigured() {
    return Boolean(this.supabaseClient);
  },

  /**
   * Helper: Secure SHA-256 Password Hash with custom salt
   */
  async hashPassword(password) {
    if (!password) return "";
    try {
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + "_nutriai_salt_2026");
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    } catch (e) {
      console.warn("WebCrypto hash fallback:", e);
    }
    // Simple fallback hash if WebCrypto unavailable
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.charCodeAt(i);
      hash |= 0;
    }
    return "h_" + Math.abs(hash).toString(16);
  },

  getUsersDb() {
    try {
      const raw = localStorage.getItem(this.USERS_DB_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  saveUsersDb(db) {
    try {
      localStorage.setItem(this.USERS_DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.warn("Could not save users db:", e);
    }
  },

  async checkExistingSession() {
    if (this.supabaseClient) {
      try {
        const { data } = await this.supabaseClient.auth.getSession();
        if (data?.session?.user) {
          return data.session.user;
        }
      } catch (e) {
        console.warn("Cloud session check error:", e);
      }
    }
    return null;
  },

  /**
   * Complete 3-Step Onboarding Wizard Registration
   * @param {object} payload - complete user profile and credentials
   */
  async registerUserFromWizard(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid registration data provided.");
    }

    const {
      fullName, name,
      email,
      password,
      age,
      sex, gender,
      height,
      currentWeight, weight,
      targetWeight,
      activity, activityLevel,
      exerciseFrequency,
      sleepDuration, sleep,
      mealsPerDay, mealFrequency,
      dietaryStyle, dietPreference,
      cuisinePreference, cuisine,
      wellnessGoal, goal,
      allergies, restrictions
    } = payload;

    // 1. Validate Step 1 - Account
    const finalName = (fullName || name || "").trim();
    if (!finalName) {
      throw new Error("Full name is required.");
    }

    const emailNorm = (email || "").toLowerCase().trim();
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      throw new Error("Please enter a valid email address.");
    }

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Check duplicate email
    const usersDb = this.getUsersDb();
    if (usersDb[emailNorm]) {
      throw new Error(`An account with email "${emailNorm}" already exists. Please Sign In.`);
    }

    // 2. Validate Step 2 - Biometrics
    const numAge = Number(age);
    if (!numAge || isNaN(numAge) || numAge < 14 || numAge > 100) {
      throw new Error("Please provide a valid age between 14 and 100.");
    }

    const finalSex = (sex || gender || "male").toLowerCase();
    if (finalSex !== "male" && finalSex !== "female") {
      throw new Error("Please select biological sex (male or female).");
    }

    const numHeight = Number(height);
    if (!numHeight || isNaN(numHeight) || numHeight < 100 || numHeight > 250) {
      throw new Error("Please provide a realistic height between 100 and 250 cm.");
    }

    const numWeight = Number(currentWeight || weight);
    if (!numWeight || isNaN(numWeight) || numWeight < 30 || numWeight > 300) {
      throw new Error("Please provide a realistic current weight between 30 and 300 kg.");
    }

    const numTargetWeight = targetWeight ? Number(targetWeight) : numWeight;
    if (isNaN(numTargetWeight) || numTargetWeight < 30 || numTargetWeight > 300) {
      throw new Error("Target weight must be between 30 and 300 kg.");
    }

    // 3. Calculate BMI and BMI Category
    const heightM = numHeight / 100;
    const bmi = Number((numWeight / (heightM * heightM)).toFixed(1));
    let bmiCategory = "Normal";
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 25) bmiCategory = "Normal";
    else if (bmi < 30) bmiCategory = "Overweight";
    else bmiCategory = "Obese";

    // 4. Validate Step 3 - Lifestyle & Nutrition
    const finalActivity = activity || activityLevel || "moderate";
    const finalExerciseFreq = exerciseFrequency || "3_5";
    const finalSleep = Number(sleepDuration || sleep) || 7.5;
    const finalMealFreq = Number(mealsPerDay || mealFrequency) || 4;
    const finalDiet = dietaryStyle || dietPreference || "balanced";
    const finalCuisine = cuisinePreference || cuisine || "indian";
    const finalGoal = wellnessGoal || goal || "balanced_nutrition";
    const finalRestrictions = Array.isArray(restrictions) ? restrictions : (Array.isArray(allergies) ? allergies : []);

    // Generate unique user ID
    const userId = "usr_" + Math.random().toString(36).substr(2, 9);
    const passwordHash = await this.hashPassword(password);

    // 5. Construct Single Source of Truth Profile
    const userProfile = {
      userId,
      name: finalName,
      fullName: finalName,
      email: emailNorm,
      gender: finalSex,
      sex: finalSex,
      age: numAge,
      height: numHeight,
      weight: numWeight,
      currentWeight: numWeight,
      targetWeight: numTargetWeight,
      activityLevel: finalActivity,
      activity: finalActivity,
      exerciseFrequency: finalExerciseFreq,
      sleep: finalSleep,
      sleepDuration: finalSleep,
      mealFrequency: finalMealFreq,
      mealsPerDay: finalMealFreq,
      dietPreference: finalDiet,
      dietaryStyle: finalDiet,
      cuisinePreference: finalCuisine,
      cuisine: finalCuisine,
      goal: finalGoal,
      wellnessGoal: finalGoal,
      restrictions: finalRestrictions,
      allergies: finalRestrictions,
      bmi,
      bmiCategory,
      waterTarget: 3200,
      onboardingCompleted: true,
      createdAt: new Date().toISOString()
    };

    // 6. Save in local database
    usersDb[emailNorm] = {
      userId,
      passwordHash,
      profile: userProfile,
      trackingData: {
        checkedMeals: {},
        todayFoodLogs: [],
        waterLogged: 0,
        sleepLogged: 0,
        stepsLogged: 0,
        streak: 0,
        completedHabits: {},
        weightHistory: [
          { date: "Today", weight: userProfile.weight, note: "Initial check-in" }
        ]
      }
    };
    this.saveUsersDb(usersDb);

    // 7. Set active user session
    localStorage.setItem(this.CURRENT_USER_KEY, emailNorm);

    // 8. Update appState with clean 0-based tracking
    appState.data.isLoggedIn = true;
    appState.data.profile = { ...userProfile };
    appState.clearTrackingData();
    appState.data.weightHistory = [
      { date: "Today", weight: userProfile.weight, note: "Initial check-in" }
    ];
    appState.recalculateTargets();
    appState.saveState();

    // 9. Sync to Supabase cloud if configured
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.auth.signUp({
          email: emailNorm,
          password,
          options: {
            data: { full_name: userProfile.name, profile: userProfile }
          }
        });
      } catch (err) {
        console.warn("Cloud signup warning:", err);
      }
    }

    return {
      success: true,
      user: userProfile,
      profile: userProfile,
      userId
    };
  },

  /**
   * Alias: registerUser (for backwards compatibility)
   */
  async registerUser(payload) {
    return this.registerUserFromWizard(payload);
  },

  /**
   * Alias: signUp (for backwards compatibility)
   */
  async signUp(emailOrPayload, password, name = "", goal = "balanced_nutrition") {
    if (typeof emailOrPayload === "object") {
      return this.registerUserFromWizard(emailOrPayload);
    }
    return this.registerUserFromWizard({
      email: emailOrPayload,
      password,
      name,
      fullName: name,
      goal,
      wellnessGoal: goal,
      age: 25,
      gender: "male",
      sex: "male",
      height: 175,
      weight: 70,
      currentWeight: 70
    });
  },

  /**
   * User Sign-In
   */
  async signIn(email, password) {
    const emailNorm = (email || "").toLowerCase().trim();
    if (!emailNorm) throw new Error("Please enter your email address.");
    if (!password) throw new Error("Please enter your password.");

    const passwordHash = await this.hashPassword(password);

    // Check local database
    const usersDb = this.getUsersDb();
    const userRecord = usersDb[emailNorm];

    if (!userRecord) {
      // Fallback to Supabase if configured
      if (this.supabaseClient) {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({
          email: emailNorm,
          password
        });
        if (error) throw error;
        const user = data.user;
        const name = user.user_metadata?.full_name || emailNorm.split("@")[0];
        appState.setLoggedIn(true, { email: emailNorm, name });
        return { success: true, user, profile: user.user_metadata?.profile || {} };
      }
      throw new Error("No account found with this email. Please click Sign Up to create your profile.");
    }

    if (userRecord.passwordHash !== passwordHash) {
      throw new Error("Incorrect password. Please try again.");
    }

    // Restore full profile & tracking data
    localStorage.setItem(this.CURRENT_USER_KEY, emailNorm);
    appState.data.isLoggedIn = true;
    appState.data.profile = { ...userRecord.profile };
    
    // Restore tracking data if saved, or clean 0
    if (userRecord.trackingData) {
      appState.data.checkedMeals = userRecord.trackingData.checkedMeals || {};
      appState.data.todayFoodLogs = userRecord.trackingData.todayFoodLogs || [];
      appState.data.waterLogged = userRecord.trackingData.waterLogged || 0;
      appState.data.sleepLogged = userRecord.trackingData.sleepLogged || 0;
      appState.data.stepsLogged = userRecord.trackingData.stepsLogged || 0;
      appState.data.streak = userRecord.trackingData.streak || 0;
      appState.data.completedHabits = userRecord.trackingData.completedHabits || {};
      if (Array.isArray(userRecord.trackingData.weightHistory) && userRecord.trackingData.weightHistory.length > 0) {
        appState.data.weightHistory = userRecord.trackingData.weightHistory;
      }
    }

    appState.recalculateTargets();
    appState.saveState();

    return { success: true, profile: userRecord.profile, user: userRecord.profile };
  },

  /**
   * User Sign-Out
   */
  signOut() {
    try {
      localStorage.removeItem(this.CURRENT_USER_KEY);
      localStorage.removeItem("nutriai_jwt_token_v4");
      localStorage.removeItem("nutriai_user_email");
      localStorage.removeItem("nutriai_app_state_v3");
      if (this.supabaseClient) {
        this.supabaseClient.auth.signOut().catch(() => {});
      }
    } catch {}
    if (window.appState) {
      window.appState.logout();
    }
  }
};

// Explicit Global Attachment for universal accessibility
window.NutriAIAuthService = NutriAIAuthService;
