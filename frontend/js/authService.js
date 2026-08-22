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
   * Fast check if email is already registered (local DB + remote backend)
   */
  async checkEmailExists(email) {
    const emailNorm = (email || "").toLowerCase().trim();
    if (!emailNorm || !emailNorm.includes("@")) return false;

    // 1. Local DB check
    const usersDb = this.getUsersDb();
    if (usersDb && usersDb[emailNorm]) {
      return true;
    }

    // 2. Remote backend check
    if (typeof NutriAIApiClient !== "undefined" && NutriAIApiClient && NutriAIApiClient.checkEmail) {
      try {
        const res = await NutriAIApiClient.checkEmail(emailNorm);
        if (res && res.exists) return true;
      } catch {}
    }

    return false;
  },

  /**
   * Onboarding Wizard Single-Action Registration
   */
  async registerUserFromWizard(payload = {}) {
    const {
      name,
      fullName,
      email,
      password,
      age,
      gender,
      sex,
      height,
      weight,
      currentWeight,
      targetWeight,
      activityLevel,
      activity,
      exerciseFrequency,
      sleep,
      sleepDuration,
      mealFrequency,
      mealsPerDay,
      dietPreference,
      dietaryStyle,
      cuisinePreference,
      cuisine,
      goal,
      wellnessGoal,
      restrictions,
      allergies
    } = payload;

    // 1. Validate Step 1 - Account
    const finalName = (fullName || name || "").trim();
    if (!finalName) {
      throw new Error("Please enter your full name.");
    }

    const emailNorm = (email || "").toLowerCase().trim();
    if (!emailNorm || !emailNorm.includes("@") || !emailNorm.includes(".")) {
      throw new Error("Please enter a valid email address.");
    }

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Fast check for duplicate email
    const usersDb = this.getUsersDb();
    if (usersDb[emailNorm]) {
      const err = new Error(`An account already exists for ${emailNorm}. Please sign in.`);
      err.code = "EMAIL_EXISTS";
      throw err;
    }

    if (typeof NutriAIApiClient !== "undefined" && NutriAIApiClient && NutriAIApiClient.checkEmail) {
      try {
        const checkRes = await NutriAIApiClient.checkEmail(emailNorm);
        if (checkRes && checkRes.exists) {
          const err = new Error(`An account already exists for ${emailNorm}. Please sign in.`);
          err.code = "EMAIL_EXISTS";
          throw err;
        }
      } catch (e) {
        if (e.code === "EMAIL_EXISTS" || e.status === 409) throw e;
      }
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

    // 9. Sync to Remote Backend API if available
    if (typeof NutriAIApiClient !== "undefined" && NutriAIApiClient && NutriAIApiClient.register) {
      try {
        await NutriAIApiClient.register({
          ...userProfile,
          password
        });
      } catch (backendErr) {
        console.warn("Backend registration sync notice:", backendErr);
      }
    }

    // 10. Sync to Supabase cloud if configured
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
   * User Sign-In (Local Database → Backend API → Supabase)
   * 
   * Priority:
   * 1. Local usersDb (instantaneous, always tried first)
   * 2. Remote Backend (with 8s timeout, skipped if local succeeded)
   * 3. Supabase Cloud (if configured)
   */
  async signIn(email, password) {
    const emailNorm = (email || "").toLowerCase().trim();
    if (!emailNorm) throw new Error("Please enter your email address.");
    if (!password || password.length < 1) throw new Error("Please enter your password.");

    const passwordHash = await this.hashPassword(password);
    const usersDb = this.getUsersDb();
    let userRecord = usersDb[emailNorm];
    let authSource = "local";

    // ─── PHASE 1: Local password verification ───────────────────────────────
    if (userRecord) {
      const localValid = (userRecord.passwordHash === passwordHash) ||
                         (userRecord.password && userRecord.password === password);
      if (!localValid) {
        // Local record exists but password doesn't match — definitive failure
        throw new Error("Incorrect password. Please try again, or use 'Forgot password'.");
      }
      // Local auth successful — skip remote calls
    }

    // ─── PHASE 2: Remote Backend API (only if not found locally) ────────────
    if (!userRecord) {
      const hasApiClient = typeof NutriAIApiClient !== "undefined" && NutriAIApiClient && NutriAIApiClient.login;
      if (hasApiClient) {
        try {
          // 8-second timeout so Render cold-starts don't block login forever
          const backendPromise = NutriAIApiClient.login(emailNorm, password);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("BACKEND_TIMEOUT")), 8000)
          );
          const backendRes = await Promise.race([backendPromise, timeoutPromise]);

          if (backendRes && (backendRes.token || backendRes.user || backendRes.profile)) {
            authSource = "backend";
            const profile = backendRes.profile || backendRes.user || { email: emailNorm, name: emailNorm.split("@")[0] };
            // Normalise profile fields
            profile.email = profile.email || emailNorm;
            profile.name = profile.name || profile.fullName || emailNorm.split("@")[0];
            userRecord = {
              userId: profile.userId || backendRes.user?.id || ("usr_" + Math.random().toString(36).substr(2, 9)),
              passwordHash,
              profile,
              trackingData: backendRes.trackingData || null
            };
            usersDb[emailNorm] = userRecord;
            this.saveUsersDb(usersDb);
          }
        } catch (backendErr) {
          if (backendErr.message === "BACKEND_TIMEOUT") {
            console.warn("⏱ Backend login timed out — proceeding with local auth only.");
          } else if (backendErr.status === 401) {
            throw new Error("Incorrect password. Please try again.");
          } else if (backendErr.status === 404) {
            // Email not in backend — continue to Supabase or show sign-up
          } else {
            console.warn("Backend login error:", backendErr.message);
          }
        }
      }
    }

    // ─── PHASE 3: Supabase Cloud Auth fallback ──────────────────────────────
    if (!userRecord && this.supabaseClient) {
      try {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({ email: emailNorm, password });
        if (error) {
          if (error.message && (error.message.includes("Invalid") || error.message.includes("credentials"))) {
            throw new Error("Incorrect email or password. Please try again.");
          }
        } else if (data?.user) {
          authSource = "supabase";
          const user = data.user;
          const name = user.user_metadata?.full_name || emailNorm.split("@")[0];
          const profile = user.user_metadata?.profile || { email: emailNorm, name };
          profile.email = profile.email || emailNorm;
          userRecord = { userId: user.id, passwordHash, profile };
          usersDb[emailNorm] = userRecord;
          this.saveUsersDb(usersDb);
        }
      } catch (supaErr) {
        if (supaErr.message && !supaErr.message.includes("supabase")) throw supaErr;
        console.warn("Supabase auth skipped:", supaErr.message);
      }
    }

    // ─── PHASE 4: If still no user record → account does not exist ──────────
    if (!userRecord) {
      // Check demo shortcut
      if (emailNorm === "alex@nutriai.demo" || emailNorm === "demo@nutriai.com" || password === "demo123") {
        const demoProfile = { ...NutriAIData.defaultProfile };
        localStorage.setItem(this.CURRENT_USER_KEY, demoProfile.email || "alex@nutriai.demo");
        localStorage.setItem("nutriai_user_email", demoProfile.email || "alex@nutriai.demo");
        appState.data.isLoggedIn = true;
        appState.data.profile = demoProfile;
        appState.recalculateTargets();
        appState.saveState();
        return { success: true, profile: demoProfile, user: demoProfile };
      }
      throw new Error(`No account found for "${emailNorm}". Please click "Sign up" below to create your profile.`);
    }

    // ─── PHASE 5: Restore session into appState ─────────────────────────────
    localStorage.setItem(this.CURRENT_USER_KEY, emailNorm);
    localStorage.setItem("nutriai_user_email", emailNorm);

    // Ensure profile has required fields
    const resolvedProfile = {
      ...NutriAIData.defaultProfile,
      ...userRecord.profile,
      email: emailNorm
    };

    appState.data.isLoggedIn = true;
    appState.data.profile = resolvedProfile;

    // Restore tracking data if backend returned it
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

    console.log(`✅ NutriAI: Authenticated "${emailNorm}" via ${authSource}`);
    return { success: true, profile: resolvedProfile, user: resolvedProfile };
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
      if (typeof NutriAIApiClient !== "undefined" && NutriAIApiClient) {
        NutriAIApiClient.logout();
      }
    } catch {}

    if (window.appState) {
      window.appState.logout();
    }

    // Clear AI chat messages container if present
    const chatContainer = document.getElementById("aiChatMessages");
    if (chatContainer) {
      chatContainer.innerHTML = `
        <div class="ai-chat-bubble ai">
          <div class="bubble-avatar">🤖</div>
          <div class="bubble-content">
            <p>Hello! I am your <strong>NutriAI Nutrition Assistant</strong>. Sign in or create a profile to ask personalized dietary advice!</p>
          </div>
        </div>
      `;
    }

    // Close any open popovers or dropdowns
    const dropdown = document.getElementById("userAccountDropdown");
    if (dropdown) dropdown.classList.remove("active");
    const avatarBtn = document.getElementById("topbarAvatarBtn");
    if (avatarBtn) avatarBtn.setAttribute("aria-expanded", "false");

    // Navigate immediately away from protected views to #/login
    if (typeof NutriAINav !== "undefined" && NutriAINav) {
      NutriAINav.navigateTo("login", true);
    }
  }
};

// Explicit Global Attachment for universal accessibility
window.NutriAIAuthService = NutriAIAuthService;
