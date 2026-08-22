/**
 * NutriAI — Main Application Controller v3.0 (Production)
 * Handles view rendering, interactive state binding, modals,
 * food logging, meal filtering, weight logging, water tracking,
 * Live Google Gemini AI (Nutritionist, Photo Scanner, Custom Plans),
 * and Supabase Cloud Auth & Sync.
 */

const NutriAIApp = {
  chatHistory: [],
  currentPhotoBase64: null,
  currentPhotoMimeType: "image/jpeg",
  currentBaseFood: null,

  init() {
    // 1. Initialize Navigation
    NutriAINav.init();

    // 2. Initialize Cloud Auth Service
    NutriAIAuthService.init();

    // 3. Subscribe to State changes
    appState.subscribe(state => this.render(state));

    // 4. Bind UI Global Events
    this.bindEvents();
    this.bindPortionControlEvents();
    this.bindAIEvents();
    this.bindSettingsEvents();

    // 5. Initial Render
    this.render(appState);

    // 6. Setup Window Resize for Charts
    window.addEventListener("resize", () => this.renderCharts());
    window.addEventListener("nutriai:viewchange", () => setTimeout(() => this.renderCharts(), 80));

    // 7. Cross-Tab Session Synchronization (debounced — only fires from OTHER tabs)
    // Note: storage events only fire from OTHER tabs, not the current tab.
    // We add an extra guard so a login in progress doesn't trigger logout.
    let _storageDebounce = null;
    window.addEventListener("storage", (e) => {
      if (e.key === "nutriai_active_user_v3" || e.key === "nutriai_jwt_token_v4") {
        clearTimeout(_storageDebounce);
        _storageDebounce = setTimeout(() => {
          const hasSession = Boolean(
            localStorage.getItem("nutriai_active_user_v3") ||
            localStorage.getItem("nutriai_jwt_token_v4")
          );
          // Only logout if user was logged in AND session was genuinely cleared by another tab
          if (!hasSession && appState.data.isLoggedIn && !NutriAIApp._loginInProgress) {
            appState.logout();
            window.location.reload();
          } else if (hasSession && !appState.data.isLoggedIn) {
            window.location.reload();
          }
        }, 1500);
      }
    });

    // 8. Probe Dedicated Backend Server connection
    if (typeof NutriAIApiClient !== "undefined" && NutriAIApiClient) {
      NutriAIApiClient.checkHealth().then(online => {
        if (online) {
          console.log("🟢 NutriAI Dedicated Backend connected on http://localhost:5000/api");
        }
      });
    }
  },

  bindEvents() {
    // Modal Close Buttons (supports [data-modal-close])
    document.querySelectorAll("[data-modal-close]").forEach(btn => {
      btn.addEventListener("click", () => this.closeAllModals());
    });

    // Global Escape Key to close open modals
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        this.closeAllModals();
        NutriAINav.closeMobileSidebar();
      }
    });

    // Close modal on backdrop click
    document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", e => {
        if (e.target === backdrop) this.closeAllModals();
      });
    });

    // Trigger Login Modal
    const loginTrigger = document.getElementById("loginBtnTrigger");
    if (loginTrigger) {
      loginTrigger.addEventListener("click", () => this.openModal("modalAuthLogin"));
    }

    // Trigger Sign In Modal from topbar when unauthenticated
    const topbarSignInBtn = document.getElementById("topbarSignInBtn");
    if (topbarSignInBtn) {
      topbarSignInBtn.addEventListener("click", () => this.openModal("modalAuthLogin"));
    }

    // Guest Hero Action Buttons
    const guestStartWizardBtn = document.getElementById("guestStartWizardBtn");
    if (guestStartWizardBtn) {
      guestStartWizardBtn.addEventListener("click", () => {
        this.resetWizard?.();
        this.openModal("modalWizard");
      });
    }

    const guestSignInBtn = document.getElementById("guestSignInBtn");
    if (guestSignInBtn) {
      guestSignInBtn.addEventListener("click", () => this.openModal("modalAuthLogin"));
    }

    // Switch between Login and Signup Modals
    const switchToSignup = document.getElementById("switchToSignup");
    if (switchToSignup) {
      switchToSignup.addEventListener("click", e => {
        e.preventDefault();
        this.closeAllModals();
        this.resetWizard?.();
        this.openModal("modalAuthSignup");
      });
    }

    const switchToLogin = document.getElementById("switchToLogin");
    if (switchToLogin) {
      switchToLogin.addEventListener("click", e => {
        e.preventDefault();
        this.closeAllModals();
        this.openModal("modalAuthLogin");
      });
    }

    // One-Click Demo Login
    const demoLoginBtn = document.getElementById("demoLoginBtn");
    if (demoLoginBtn) {
      demoLoginBtn.addEventListener("click", () => {
        NutriAIApp._loginInProgress = true;
        appState.setLoggedIn(true, NutriAIData.defaultProfile);
        this.closeAllModals();
        this.showToast("Logged in as Alex Morgan (Demo) ✓", "success");
        NutriAINav.navigateTo("dashboard");
        setTimeout(() => { NutriAIApp._loginInProgress = false; }, 3000);
      });
    }

    // Sign In Form Submit
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async e => {
        e.preventDefault();
        const emailInput = document.getElementById("loginEmail");
        const passInput = document.getElementById("loginPassword");
        const errEl = document.getElementById("loginErrorAlert");
        const submitBtn = document.getElementById("loginSubmitBtn");

        const email = emailInput?.value?.trim() || "";
        const password = passInput?.value || "";

        if (errEl) { errEl.style.display = "none"; errEl.innerHTML = ""; }

        if (!email) {
          if (errEl) { errEl.textContent = "Please enter your email address."; errEl.style.display = "block"; }
          return;
        }
        if (!password) {
          if (errEl) { errEl.textContent = "Please enter your password."; errEl.style.display = "block"; }
          return;
        }

        NutriAIApp._loginInProgress = true;
        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Signing In...";
          }

          const res = await NutriAIAuthService.signIn(email, password);
          this.closeAllModals();
          const name = res.profile?.name || email.split("@")[0];
          this.showToast(`Welcome back, ${name}! ✓`, "success");
          NutriAINav.navigateTo("dashboard");
        } catch (err) {
          if (errEl) {
            const isNoAccount = err.message && (err.message.includes("No account found") || err.message.includes("Sign up") || err.message.includes("create your profile"));
            if (isNoAccount) {
              errEl.innerHTML = `
                <div style="text-align:left;">
                  <div style="margin-bottom:0.5rem;">⚠️ ${err.message}</div>
                  <button type="button" class="btn btn-primary btn-sm"
                    onclick="NutriAIApp.closeAllModals(); NutriAIApp.resetWizard?.(); NutriAIApp.openModal('modalWizard');"
                    style="padding:0.35rem 0.9rem; font-size:0.8125rem;">
                    ✨ Create Account Now
                  </button>
                </div>
              `;
            } else {
              errEl.textContent = err.message || "Sign in failed. Please check your email and password.";
            }
            errEl.style.display = "block";
          }
          this.showToast(err.message || "Sign in failed.", "error");
        } finally {
          NutriAIApp._loginInProgress = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign In";
          }
        }
      });
    }

    // 3-Step Onboarding Wizard Bindings
    this.bindWizardEvents();

    // Topbar User Avatar & Account Dropdown Bindings
    this.bindTopbarUserMenuEvents();

    // Add Food Modal Trigger
    const addFoodBtn = document.getElementById("openAddFoodBtn");
    if (addFoodBtn) {
      addFoodBtn.addEventListener("click", () => {
        this.populateFoodDatabaseDropdown();
        this.openModal("modalAddFood");
      });
    }

    // Food Database Quick Search / Select
    const foodSelect = document.getElementById("foodDbSelect");
    if (foodSelect) {
      foodSelect.addEventListener("change", () => {
        const idx = foodSelect.value;
        if (idx !== "") {
          const item = NutriAIData.foodDatabase[idx];
          if (item) {
            document.getElementById("foodNameInput").value = item.name;
            const is100g = item.name.includes("100g");
            this.setBaseFoodNutrition({
              name: item.name,
              cals: item.cals,
              p: item.p,
              c: item.c,
              f: item.f,
              fiber: item.fiber || 0,
              qty: is100g ? 100 : 1.0,
              unit: is100g ? "g" : "serving",
              portionDescription: is100g ? "100g base portion" : "1 standard serving"
            });
          }
        }
      });
    }

    // Add Food Form Submit
    const addFoodForm = document.getElementById("addFoodForm");
    if (addFoodForm) {
      addFoodForm.addEventListener("submit", e => {
        e.preventDefault();
        let name = document.getElementById("foodNameInput").value.trim();
        const cals = Number(document.getElementById("foodCalsInput").value) || 0;
        const p = Number(document.getElementById("foodProteinInput").value) || 0;
        const c = Number(document.getElementById("foodCarbsInput").value) || 0;
        const f = Number(document.getElementById("foodFatsInput").value) || 0;
        const fiber = Number(document.getElementById("foodFiberInput")?.value) || 0;
        const meal = document.getElementById("foodMealType").value;
        const qty = parseFloat(document.getElementById("foodQuantityInput")?.value) || 1.0;
        const unit = document.getElementById("foodUnitSelect")?.value || "serving";

        if (!name) {
          this.showToast("Please enter a food name.", "error");
          return;
        }

        // Annotate food name with quantity if not already present
        const hasParentheses = name.includes("(") && name.includes(")");
        if (!hasParentheses) {
          if (unit === "g" || unit === "ml") {
            name = `${name} (${qty}${unit})`;
          } else if (qty !== 1.0) {
            name = `${name} (${qty} ${unit}s)`;
          }
        }

        appState.addFoodLog({ name, cals, p, c, f, fiber, meal });
        NutriAIDbService.syncToCloud();
        this.closeAllModals();
        this.showToast(`Logged ${name} (${cals} kcal)`, "success");
        // Reset form & photo
        addFoodForm.reset();
        this.resetPhotoScanner();
        this.currentBaseFood = null;
      });
    }

    // Hydration Quick Buttons (+250ml, +500ml, +750ml, +1000ml)
    document.querySelectorAll("[data-water-add]").forEach(btn => {
      btn.addEventListener("click", () => {
        const amt = Number(btn.getAttribute("data-water-add")) || 250;
        appState.addWater(amt);
        NutriAIDbService.syncToCloud();
        this.showToast(`Added +${amt}ml water 💧`, "info");
      });
    });

    // Water Reset Button
    const waterResetBtn = document.getElementById("waterResetBtn");
    if (waterResetBtn) {
      waterResetBtn.addEventListener("click", () => {
        appState.resetWater();
        NutriAIDbService.syncToCloud();
        this.showToast("Water tracker reset for today.", "info");
      });
    }

    // Profile Form Save
    const profileForm = document.getElementById("healthProfileForm");
    if (profileForm) {
      profileForm.addEventListener("submit", e => {
        e.preventDefault();

        const restrictionCheckboxes = document.querySelectorAll("[name='profileRestriction']:checked");
        const restrictions = Array.from(restrictionCheckboxes).map(cb => cb.value);

        const newProfile = {
          name: document.getElementById("profName").value || "Alex Morgan",
          email: document.getElementById("profEmail").value || "alex.morgan@example.com",
          gender: document.getElementById("profGender").value,
          age: Number(document.getElementById("profAge").value) || 28,
          height: Number(document.getElementById("profHeight").value) || 178,
          weight: Number(document.getElementById("profWeight").value) || 74.2,
          targetWeight: Number(document.getElementById("profTargetWeight").value) || 71.0,
          activityLevel: document.getElementById("profActivity").value,
          goal: document.getElementById("profGoal").value,
          dietPreference: document.getElementById("profDiet").value,
          sleep: Number(document.getElementById("profSleep")?.value) || 7.5,
          exerciseFrequency: document.getElementById("profExerciseFreq")?.value || "3_5",
          mealFrequency: Number(document.getElementById("profMealFreq")?.value) || 4,
          cuisinePreference: document.getElementById("profCuisine")?.value || "mediterranean",
          restrictions: restrictions
        };
        appState.updateProfile(newProfile);
        NutriAIDbService.syncToCloud();
        this.showToast("Health Profile & Macro Targets Recalculated! ✓", "success");
      });
    }

    // Copy Grocery List Button
    const copyGroceryBtn = document.getElementById("copyGroceryBtn");
    if (copyGroceryBtn) {
      copyGroceryBtn.addEventListener("click", () => {
        this.copyGroceryListToClipboard();
      });
    }

    // Weight Log Form
    const weightLogForm = document.getElementById("weightLogForm");
    if (weightLogForm) {
      weightLogForm.addEventListener("submit", e => {
        e.preventDefault();
        const weightInput = document.getElementById("weightLogInput");
        const noteInput = document.getElementById("weightLogNote");
        const weight = Number(weightInput?.value);
        const note = noteInput?.value || "";

        if (!weight || weight <= 0 || weight > 500) {
          this.showToast("Please enter a valid weight (kg).", "error");
          return;
        }

        const today = new Date();
        const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        appState.addWeightEntry(dateStr, weight, note);
        NutriAIDbService.syncToCloud();
        this.showToast(`Weight logged: ${weight} kg`, "success");
        if (weightInput) weightInput.value = "";
        if (noteInput) noteInput.value = "";
        setTimeout(() => NutriAICharts.renderWeightProgress("weightProgressCanvas", appState.data.weightHistory, appState.data.profile.targetWeight), 100);
      });
    }

    // Logout Button (Sidebar)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        NutriAIAuthService.signOut();
        this.showToast("Signed out successfully. See you soon! 👋", "info");
      });
    }

    // Notifications Bell
    const notifBell = document.getElementById("notifBellBtn");
    if (notifBell) {
      notifBell.addEventListener("click", () => {
        this.showToast("No new notifications", "info");
      });
    }

    // Settings Reset Demo Data
    const resetDemoBtn = document.getElementById("resetDemoDataBtn");
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener("click", () => {
        if (confirm("Reset all data to demo defaults? This cannot be undone.")) {
          localStorage.removeItem("nutriai_app_state_v2");
          appState.resetToDefaults();
          appState.recalculateTargets();
          appState.notify();
          this.showToast("App data reset to demo defaults.", "success");
        }
      });
    }
  },

  // --- AI Event Bindings ---
  bindAIEvents() {
    // 1. AI Nutritionist Chat Form
    const chatForm = document.getElementById("aiChatForm");
    if (chatForm) {
      chatForm.addEventListener("submit", async e => {
        e.preventDefault();
        const input = document.getElementById("aiChatInput");
        const msg = input?.value?.trim();
        if (!msg) return;

        input.value = "";
        await this.sendChatMessage(msg);
      });
    }

    // 2. AI Food Photo Scanner Dropzone & File Picker
    const dropzone = document.getElementById("foodPhotoDropzone");
    const fileInput = document.getElementById("foodPhotoFileInput");

    if (dropzone && fileInput) {
      dropzone.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", e => {
        const file = e.target.files?.[0];
        if (file) this.processFoodPhotoFile(file);
      });

      // Drag and drop events
      dropzone.addEventListener("dragover", e => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--primary-500)";
        dropzone.style.background = "#ecfdf5";
      });

      dropzone.addEventListener("dragleave", () => {
        dropzone.style.borderColor = "var(--border-default)";
        dropzone.style.background = "var(--bg-surface-subtle)";
      });

      dropzone.addEventListener("drop", e => {
        e.preventDefault();
        dropzone.style.borderColor = "var(--border-default)";
        dropzone.style.background = "var(--bg-surface-subtle)";
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          this.processFoodPhotoFile(file);
        }
      });
    }

    // 3. AI Custom Meal Plan Generator Form
    const planGenForm = document.getElementById("aiMealPlanGenForm");
    if (planGenForm) {
      planGenForm.addEventListener("submit", async e => {
        e.preventDefault();
        const promptInput = document.getElementById("aiPlanPromptInput");
        const promptText = promptInput?.value?.trim() || "Balanced high-protein meals with diverse seasonal ingredients";
        const loadingEl = document.getElementById("aiPlanGenLoading");
        const submitBtn = document.getElementById("aiPlanGenSubmitBtn");

        if (loadingEl) loadingEl.style.display = "block";
        if (submitBtn) submitBtn.disabled = true;

        try {
          this.showToast("Generating custom 7-day culinary plan with AI...", "info");
          const customPlan = await (window.NutriAIAIService || NutriAIAIService).generateCustom7DayPlan(promptText, appState);
          
          if (customPlan && typeof customPlan === "object") {
            // Merge into NutriAIData
            NutriAIData.mealPlans = { ...NutriAIData.mealPlans, ...customPlan };
            this.renderMealPlanner(appState);
            this.closeAllModals();
            this.showToast("Custom 7-Day Plan generated & synced! ✨", "success");
            NutriAINav.navigateTo("mealplan");
          }
        } catch (err) {
          this.showToast("Plan generation error: " + err.message, "error");
        } finally {
          if (loadingEl) loadingEl.style.display = "none";
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  },

  // --- 3-Step Onboarding Wizard Event Handlers ---
  bindWizardEvents() {
    // Helper to switch wizard steps
    const setWizardStep = (step) => {
      const pane1 = document.getElementById("wizardStepPane1");
      const pane2 = document.getElementById("wizardStepPane2");
      const pane3 = document.getElementById("wizardStepPane3");
      const paneSuccess = document.getElementById("wizardStepPaneSuccess");
      const header = document.getElementById("wizardProgressHeader");

      if (pane1) pane1.style.display = step === 1 ? "block" : "none";
      if (pane2) pane2.style.display = step === 2 ? "block" : "none";
      if (pane3) pane3.style.display = step === 3 ? "block" : "none";
      if (paneSuccess) paneSuccess.style.display = step === 4 ? "block" : "none";
      if (header) header.style.display = step === 4 ? "none" : "block";

      // Update indicator step styling
      const ind1 = document.getElementById("wizardStepIndicator1");
      const ind2 = document.getElementById("wizardStepIndicator2");
      const ind3 = document.getElementById("wizardStepIndicator3");
      const line1 = document.getElementById("wizardLine1");
      const line2 = document.getElementById("wizardLine2");

      if (ind1) ind1.className = `wizard-step ${step === 1 ? "active" : step > 1 ? "completed" : ""}`;
      if (ind2) ind2.className = `wizard-step ${step === 2 ? "active" : step > 2 ? "completed" : ""}`;
      if (ind3) ind3.className = `wizard-step ${step === 3 ? "active" : step > 3 ? "completed" : ""}`;
      if (line1) line1.className = `wizard-step-line ${step >= 2 ? "active" : ""}`;
      if (line2) line2.className = `wizard-step-line ${step >= 3 ? "active" : ""}`;
    };

    this._setWizardStep = setWizardStep;

    this.resetWizard = () => {
      setWizardStep(1);
      ["wizardError1", "wizardError2", "wizardError3"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = "none"; el.innerHTML = ""; }
      });
    };

    // Step 1 -> Step 2
    const btnNext1 = document.getElementById("btnWizardNext1");
    if (btnNext1) {
      btnNext1.addEventListener("click", async () => {
        const name = document.getElementById("wizardName")?.value?.trim();
        const email = document.getElementById("wizardEmail")?.value?.trim();
        const pass = document.getElementById("wizardPassword")?.value;
        const passConf = document.getElementById("wizardPasswordConfirm")?.value;
        const errEl = document.getElementById("wizardError1");

        const showErr = (msg, isHtml = false) => {
          if (errEl) {
            if (isHtml) errEl.innerHTML = msg;
            else errEl.textContent = msg;
            errEl.style.display = "block";
          }
        };

        if (!name) return showErr("Please enter your full name.");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showErr("Please enter a valid email address.");
        if (!pass || pass.length < 6) return showErr("Password must be at least 6 characters long.");
        if (pass !== passConf) return showErr("Passwords do not match. Please re-enter.");

        // Fast Email Duplicate Check in Step 1
        try {
          btnNext1.disabled = true;
          btnNext1.textContent = "Checking...";
          const auth = window.NutriAIAuthService || NutriAIAuthService;
          if (auth && typeof auth.checkEmailExists === "function") {
            const exists = await auth.checkEmailExists(email);
            if (exists) {
              showErr(`
                <div style="display:flex; flex-direction:column; gap:0.5rem; text-align:left;">
                  <div>⚠️ An account already exists for <strong>${email}</strong>. Please sign in or use a different email.</div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.35rem;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="NutriAIApp.switchToSignInFromWizard('${email.replace(/'/g, "\\'")}')" style="padding:0.35rem 0.75rem; font-size:0.8125rem;">🔑 Sign In to Existing Account</button>
                  </div>
                </div>
              `, true);
              btnNext1.disabled = false;
              btnNext1.textContent = "Next: Biometrics →";
              return;
            }
          }
        } catch (e) {
          console.warn("Email precheck warning:", e);
        } finally {
          btnNext1.disabled = false;
          btnNext1.textContent = "Next: Biometrics →";
        }

        if (errEl) errEl.style.display = "none";
        setWizardStep(2);
      });
    }

    // Step 2 -> Back to Step 1
    const btnBack2 = document.getElementById("btnWizardBack2");
    if (btnBack2) {
      btnBack2.addEventListener("click", () => setWizardStep(1));
    }

    // Step 2 -> Step 3
    const btnNext2 = document.getElementById("btnWizardNext2");
    if (btnNext2) {
      btnNext2.addEventListener("click", () => {
        const age = Number(document.getElementById("wizardAge")?.value);
        const sex = document.getElementById("wizardSex")?.value;
        const height = Number(document.getElementById("wizardHeight")?.value);
        const weight = Number(document.getElementById("wizardWeight")?.value);
        const targetWeightVal = document.getElementById("wizardTargetWeight")?.value;
        const targetWeight = targetWeightVal ? Number(targetWeightVal) : null;
        const errEl = document.getElementById("wizardError2");

        const showErr = (msg) => {
          if (errEl) { errEl.textContent = msg; errEl.style.display = "block"; }
        };

        if (!age || isNaN(age) || age < 14 || age > 100) return showErr("Please enter a valid age between 14 and 100.");
        if (!sex) return showErr("Please select your biological sex.");
        if (!height || isNaN(height) || height < 100 || height > 250) return showErr("Please enter a realistic height between 100 and 250 cm.");
        if (!weight || isNaN(weight) || weight < 30 || weight > 300) return showErr("Please enter a realistic weight between 30 and 300 kg.");
        if (targetWeight !== null && (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 300)) {
          return showErr("Target weight must be between 30 and 300 kg.");
        }

        if (errEl) errEl.style.display = "none";
        setWizardStep(3);
      });
    }

    // Step 3 -> Back to Step 2
    const btnBack3 = document.getElementById("btnWizardBack3");
    if (btnBack3) {
      btnBack3.addEventListener("click", () => setWizardStep(2));
    }

    // Step 3 -> Submit & Create Profile
    const btnSubmit = document.getElementById("btnWizardSubmit");
    if (btnSubmit) {
      btnSubmit.addEventListener("click", async () => {
        const name = document.getElementById("wizardName")?.value?.trim();
        const email = document.getElementById("wizardEmail")?.value?.trim();
        const password = document.getElementById("wizardPassword")?.value;
        const age = Number(document.getElementById("wizardAge")?.value);
        const gender = document.getElementById("wizardSex")?.value;
        const height = Number(document.getElementById("wizardHeight")?.value);
        const weight = Number(document.getElementById("wizardWeight")?.value);
        const targetWeight = Number(document.getElementById("wizardTargetWeight")?.value) || weight;

        const activityLevel = document.getElementById("wizardActivity")?.value || "moderate";
        const exerciseFrequency = document.getElementById("wizardExerciseFreq")?.value || "3_5";
        const sleep = Number(document.getElementById("wizardSleep")?.value) || 7.5;
        const mealFrequency = Number(document.getElementById("wizardMealFreq")?.value) || 4;
        const dietPreference = document.getElementById("wizardDiet")?.value || "balanced";
        const cuisinePreference = document.getElementById("wizardCuisine")?.value || "indian";
        const goal = document.getElementById("wizardGoal")?.value || "balanced_nutrition";

        const restrictionCbs = document.querySelectorAll("[name='wizardRestriction']:checked");
        const restrictions = Array.from(restrictionCbs).map(cb => cb.value);

        const errEl = document.getElementById("wizardError3");
        if (errEl) errEl.style.display = "none";

        try {
          btnSubmit.disabled = true;
          btnSubmit.textContent = "Creating Profile...";

          const auth = window.NutriAIAuthService || NutriAIAuthService;
          if (!auth || typeof auth.registerUserFromWizard !== "function") {
            throw new Error("Authentication service is initializing. Please try again in a moment.");
          }

          const result = await auth.registerUserFromWizard({
            fullName: name,
            name,
            email,
            password,
            age,
            sex: gender,
            gender,
            height,
            currentWeight: weight,
            weight,
            targetWeight,
            activity: activityLevel,
            activityLevel,
            exerciseFrequency,
            sleepDuration: sleep,
            sleep,
            mealsPerDay: mealFrequency,
            mealFrequency,
            dietaryStyle: dietPreference,
            dietPreference,
            cuisinePreference,
            cuisine: cuisinePreference,
            wellnessGoal: goal,
            goal,
            allergies: restrictions,
            restrictions
          });

          const profile = result.profile || result.user;

          // Render Success Summary Card
          const summaryCard = document.getElementById("wizardSummaryCard");
          if (summaryCard) {
            const goalNames = {
              balanced_nutrition: "Balanced Nutrition",
              general_fitness: "General Fitness",
              muscle_strength: "Muscle & Strength Support",
              weight_management: "Weight Management",
              healthy_lifestyle: "Healthy Lifestyle"
            };
            const dietNames = {
              balanced: "Non-Vegetarian (Omnivore)",
              vegetarian: "Vegetarian",
              eggetarian: "Eggetarian",
              pescatarian: "Pescatarian",
              vegan: "Vegan",
              keto: "Ketogenic"
            };
            const actNames = {
              sedentary: "Sedentary",
              light: "Lightly Active",
              moderate: "Moderately Active",
              high: "Very Active"
            };

            summaryCard.innerHTML = `
              <div class="wizard-summary-grid">
                <div class="wizard-summary-item">
                  <span class="wizard-summary-label">Name</span>
                  <span class="wizard-summary-val">${profile.name}</span>
                </div>
                <div class="wizard-summary-item">
                  <span class="wizard-summary-label">Age / Sex</span>
                  <span class="wizard-summary-val">${profile.age} yrs · ${profile.gender === 'male' ? 'Male' : 'Female'}</span>
                </div>
                <div class="wizard-summary-item">
                  <span class="wizard-summary-label">Height / Weight</span>
                  <span class="wizard-summary-val">${profile.height} cm · ${profile.weight} kg</span>
                </div>
                <div class="wizard-summary-item">
                  <span class="wizard-summary-label">Calculated BMI</span>
                  <span class="wizard-summary-val" style="color:var(--primary-700);">BMI ${profile.bmi} (${profile.bmiCategory})</span>
                </div>
                <div class="wizard-summary-item">
                  <span class="wizard-summary-label">Activity Level</span>
                  <span class="wizard-summary-val">${actNames[profile.activityLevel] || profile.activityLevel}</span>
                </div>
                <div class="wizard-summary-item">
                  <span class="wizard-summary-label">Dietary Style</span>
                  <span class="wizard-summary-val">${dietNames[profile.dietPreference] || profile.dietPreference}</span>
                </div>
                <div class="wizard-summary-item" style="grid-column: 1 / -1;">
                  <span class="wizard-summary-label">Primary Goal</span>
                  <span class="wizard-summary-val">${goalNames[profile.goal] || profile.goal}</span>
                </div>
              </div>
            `;
          }

          setWizardStep(4);
        } catch (err) {
          if (errEl) {
            const isEmailExists = err.code === "EMAIL_EXISTS" || (err.message && (err.message.includes("already exists") || err.message.includes("EMAIL_EXISTS")));
            if (isEmailExists) {
              errEl.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:0.5rem; text-align:left;">
                  <div>⚠️ An account already exists for <strong>${email}</strong>.</div>
                  <div style="display:flex; gap:0.5rem; margin-top:0.35rem; flex-wrap:wrap;">
                    <button type="button" class="btn btn-primary btn-sm" onclick="NutriAIApp.switchToSignInFromWizard('${email.replace(/'/g, "\\'")}')" style="padding:0.35rem 0.75rem; font-size:0.8125rem;">🔑 Sign In</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="NutriAIApp.goToWizardStep(1)" style="padding:0.35rem 0.75rem; font-size:0.8125rem;">✏️ Change Email</button>
                  </div>
                </div>
              `;
            } else {
              errEl.textContent = err.message || "Failed to create profile.";
            }
            errEl.style.display = "block";
          }
        } finally {
          btnSubmit.disabled = false;
          btnSubmit.textContent = "Save & Create Profile ✓";
        }
      });
    }

    // Step 4: Go to Dashboard
    const btnGoDash = document.getElementById("btnWizardGoDashboard");
    if (btnGoDash) {
      btnGoDash.addEventListener("click", () => {
        this.closeAllModals();
        NutriAINav.navigateTo("dashboard");
        const name = appState.data.profile.name || "there";
        this.showToast(`Welcome to NutriAI, ${name}! Your dashboard is ready. ✨`, "success");
      });
    }
  },

  // --- Settings AI Key & Cloud Bindings ---
  bindSettingsEvents() {
    // 1. Gemini API Key Form
    const apiKeyForm = document.getElementById("geminiApiKeyForm");
    const apiKeyInput = document.getElementById("geminiApiKeyInput");
    const clearKeyBtn = document.getElementById("clearApiKeyBtn");

    if (apiKeyInput) {
      const svc = window.NutriAIAIService;
      apiKeyInput.value = svc ? svc.getApiKey() : "";
    }

    if (apiKeyForm) {
      apiKeyForm.addEventListener("submit", e => {
        e.preventDefault();
        const key = apiKeyInput?.value?.trim();
        if (window.NutriAIAIService) window.NutriAIAIService.setApiKey(key);
        this.updateApiKeyStatus();
        this.showToast("Google Gemini API Key saved securely!", "success");
      });
    }

    if (clearKeyBtn) {
      clearKeyBtn.addEventListener("click", () => {
        if (window.NutriAIAIService) window.NutriAIAIService.setApiKey("");
        if (apiKeyInput) apiKeyInput.value = "";
        this.updateApiKeyStatus();
        this.showToast("API Key cleared (offline mode active).", "info");
      });
    }

    // 2. Supabase Cloud Config Form
    const supabaseForm = document.getElementById("supabaseConfigForm");
    if (supabaseForm) {
      const cfg = NutriAIAuthService.getConfig();
      const urlInput = document.getElementById("supabaseUrlInput");
      const keyInput = document.getElementById("supabaseAnonKeyInput");
      if (urlInput) urlInput.value = cfg.url;
      if (keyInput) keyInput.value = cfg.anonKey;

      supabaseForm.addEventListener("submit", e => {
        e.preventDefault();
        const url = urlInput?.value?.trim();
        const key = keyInput?.value?.trim();
        NutriAIAuthService.saveConfig(url, key);
        this.updateSupabaseStatus();
        this.showToast("Supabase configuration updated!", "success");
      });
    }

    // 3. Dedicated Backend Server Config Form
    const backendForm = document.getElementById("backendConfigForm");
    if (backendForm && typeof NutriAIApiClient !== "undefined") {
      const backendUrlInput = document.getElementById("backendUrlInput");
      const testBackendBtn = document.getElementById("testBackendBtn");

      if (backendUrlInput) {
        backendUrlInput.value = NutriAIApiClient.getBaseUrl();
      }

      backendForm.addEventListener("submit", async e => {
        e.preventDefault();
        const url = backendUrlInput?.value?.trim() || "http://localhost:5000/api";
        NutriAIApiClient.setBaseUrl(url);
        await this.updateBackendStatus();
        this.showToast("Backend API URL saved! ✓", "success");
      });

      if (testBackendBtn) {
        testBackendBtn.addEventListener("click", async () => {
          testBackendBtn.textContent = "Testing...";
          const isOnline = await NutriAIApiClient.checkHealth();
          testBackendBtn.textContent = "Test Connection";
          if (isOnline) {
            this.showToast("🟢 Backend Server is connected & healthy!", "success");
          } else {
            this.showToast("🔴 Could not connect to backend server at that URL.", "error");
          }
          this.updateBackendStatus();
        });
      }
    }
  },

  async updateBackendStatus() {
    const badge = document.getElementById("backendStatusBadge");
    if (badge && typeof NutriAIApiClient !== "undefined") {
      const isOnline = await NutriAIApiClient.checkHealth();
      if (isOnline) {
        badge.textContent = "Connected 🟢";
        badge.className = "badge badge-emerald";
      } else {
        badge.textContent = "Offline / Local ⚠️";
        badge.className = "badge badge-gray";
      }
    }
  },

  updateApiKeyStatus() {
    const badge = document.getElementById("apiKeyStatusBadge");
    const svc = window.NutriAIAIService;
    if (!svc) return; // aiService.js not yet loaded
    const hasKey = svc.hasApiKey();
    if (badge) {
      badge.textContent = hasKey ? "Live Gemini Active ✨" : "Demo Mode";
      badge.className = `badge ${hasKey ? "badge-emerald" : "badge-gray"}`;
    }
  },

  updateSupabaseStatus() {
    const badge = document.getElementById("supabaseStatusBadge");
    const isCloud = NutriAIAuthService.isCloudConfigured();
    if (badge) {
      badge.textContent = isCloud ? "Cloud Synced ☁️" : "Local Mode";
      badge.className = `badge ${isCloud ? "badge-blue" : "badge-gray"}`;
    }
  },

  // --- Topbar User Avatar & Account Dropdown Events ---
  bindTopbarUserMenuEvents() {
    const avatarBtn = document.getElementById("topbarAvatarBtn");
    const dropdown = document.getElementById("userAccountDropdown");
    const healthProfileBtn = document.getElementById("menuHealthProfileBtn");
    const settingsBtn = document.getElementById("menuSettingsBtn");
    const privacyBtn = document.getElementById("menuPrivacyBtn");
    const signOutBtn = document.getElementById("menuSignOutBtn");
    const topbarSignInBtn = document.getElementById("topbarSignInBtn");

    if (avatarBtn && dropdown) {
      avatarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isActive = dropdown.classList.toggle("active");
        avatarBtn.setAttribute("aria-expanded", isActive ? "true" : "false");
      });

      // Close on click outside
      document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatarBtn && !avatarBtn.contains(e.target)) {
          dropdown.classList.remove("active");
          avatarBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    if (healthProfileBtn) {
      healthProfileBtn.addEventListener("click", () => {
        dropdown?.classList.remove("active");
        avatarBtn?.setAttribute("aria-expanded", "false");
        NutriAINav.navigateTo("profile");
      });
    }

    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        dropdown?.classList.remove("active");
        avatarBtn?.setAttribute("aria-expanded", "false");
        NutriAINav.navigateTo("settings");
      });
    }

    if (privacyBtn) {
      privacyBtn.addEventListener("click", () => {
        dropdown?.classList.remove("active");
        avatarBtn?.setAttribute("aria-expanded", "false");
        NutriAINav.navigateTo("settings");
        this.showToast("NutriAI values your privacy: biometric data is secured on your device/cloud.", "info");
      });
    }

    if (signOutBtn) {
      signOutBtn.addEventListener("click", () => {
        dropdown?.classList.remove("active");
        avatarBtn?.setAttribute("aria-expanded", "false");
        NutriAIAuthService.signOut();
        this.showToast("Signed out successfully. See you soon! 👋", "info");
      });
    }

    if (topbarSignInBtn) {
      topbarSignInBtn.addEventListener("click", () => {
        this.openModal("modalAuthLogin");
      });
    }
  },

  // --- AI Chat Logic ---
  async sendChatMessage(message) {
    const messagesContainer = document.getElementById("aiChatMessages");
    if (!messagesContainer) return;

    // 1. Render User Message Bubble
    this.appendChatBubble("user", message);
    this.chatHistory.push({ sender: "user", text: message });

    // 2. Render Temporary AI Typing Shimmer
    const typingId = "typing_" + Date.now();
    const typingBubble = document.createElement("div");
    typingBubble.className = "chat-bubble chat-bubble-ai";
    typingBubble.id = typingId;
    typingBubble.innerHTML = `
      <div class="chat-avatar chat-avatar-ai">🤖</div>
      <div class="chat-content ai-scanning-active" style="font-style:italic; color:var(--text-muted);">
        Thinking and analyzing your biometrics...
      </div>
    `;
    messagesContainer.appendChild(typingBubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 3. Call AI Service
    try {
      const nutritionState = appState.getNutritionState();
      const profile = appState.data.profile;
      const aiService = window.NutriAIAIService;
      if (!aiService || typeof aiService.chatWithNutritionist !== "function") {
        throw new Error("AI Service is loading or not available.");
      }
      const responseText = await aiService.chatWithNutritionist(message, this.chatHistory, nutritionState, profile);
      
      // Remove typing indicator
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      // Render AI Response
      this.appendChatBubble("ai", responseText);
      this.chatHistory.push({ sender: "ai", text: responseText });
    } catch (err) {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      this.appendChatBubble("ai", "I encountered an error retrieving advice. " + err.message);
    }
  },

  appendChatBubble(sender, text) {
    const messagesContainer = document.getElementById("aiChatMessages");
    if (!messagesContainer) return;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble-${sender}`;

    // Format simple markdown into HTML
    const formattedHtml = text
      .replace(/^### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/g, '<br/><br/>');

    if (sender === "user") {
      bubble.innerHTML = `
        <div class="chat-avatar chat-avatar-user">${(appState.data.profile.name || "U").charAt(0).toUpperCase()}</div>
        <div class="chat-content">${text}</div>
      `;
    } else {
      bubble.innerHTML = `
        <div class="chat-avatar chat-avatar-ai">🥗</div>
        <div class="chat-content">${formattedHtml}</div>
      `;
    }

    messagesContainer.appendChild(bubble);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  sendQuickPrompt(promptText) {
    NutriAINav.navigateTo("ai-chat");
    const input = document.getElementById("aiChatInput");
    if (input) input.value = promptText;
    this.sendChatMessage(promptText);
  },

  clearChatHistory() {
    this.chatHistory = [];
    const container = document.getElementById("aiChatMessages");
    if (container) {
      container.innerHTML = `
        <div class="chat-bubble chat-bubble-ai">
          <div class="chat-avatar chat-avatar-ai">🥗</div>
          <div class="chat-content">
            <div style="font-weight:700; margin-bottom:0.25rem; color:#047857;">Hello! I am your NutriAI Clinical Nutritionist.</div>
            I am connected directly to your active health profile and today's food log. Ask me anything about meal ideas, post-workout snacks, micronutrient targets, or ingredient substitutions!
          </div>
        </div>
      `;
    }
  },

  // --- Food Portion & Serving Scaling Logic ---
  bindPortionControlEvents() {
    const qtyInput = document.getElementById("foodQuantityInput");
    const unitSelect = document.getElementById("foodUnitSelect");
    const minusBtn = document.getElementById("foodQtyMinusBtn");
    const plusBtn = document.getElementById("foodQtyPlusBtn");
    const pillsContainer = document.getElementById("quickPortionPills");

    // Stepper button: Minus
    if (minusBtn && qtyInput) {
      minusBtn.addEventListener("click", () => {
        let val = parseFloat(qtyInput.value) || 1.0;
        const u = unitSelect?.value || "serving";
        const step = (u === "g" || u === "ml") ? 25 : 0.25;
        const minVal = (u === "g" || u === "ml") ? 10 : 0.25;
        val = Math.max(minVal, val - step);
        qtyInput.value = (Math.round(val * 100) / 100).toString();
        this.recalculateScaledNutrition();
      });
    }

    // Stepper button: Plus
    if (plusBtn && qtyInput) {
      plusBtn.addEventListener("click", () => {
        let val = parseFloat(qtyInput.value) || 1.0;
        const u = unitSelect?.value || "serving";
        const step = (u === "g" || u === "ml") ? 25 : 0.25;
        val = val + step;
        qtyInput.value = (Math.round(val * 100) / 100).toString();
        this.recalculateScaledNutrition();
      });
    }

    // Direct quantity input changes (input, keyup, change, paste)
    if (qtyInput) {
      ["input", "keyup", "change", "paste"].forEach(evt => {
        qtyInput.addEventListener(evt, () => this.recalculateScaledNutrition());
      });
    }

    // Unit dropdown changes
    if (unitSelect) {
      unitSelect.addEventListener("change", () => {
        const u = unitSelect.value;
        const currentVal = parseFloat(qtyInput?.value) || 1.0;
        const baseWeight = this.currentBaseFood?.baseWeightGrams || (this.currentBaseFood?.baseUnit === "g" ? this.currentBaseFood.baseQty : 250);

        if ((u === "g" || u === "ml") && (currentVal <= 10 || qtyInput.value === "1" || qtyInput.value === "1.0")) {
          qtyInput.value = Math.round(baseWeight * currentVal).toString();
        } else if ((u === "serving" || u === "bowl" || u === "piece") && currentVal >= 20) {
          const ratio = Math.round((currentVal / baseWeight) * 10) / 10;
          qtyInput.value = (ratio > 0 ? ratio : 1.0).toString();
        }
        this.recalculateScaledNutrition();
      });
    }

    // Quick Portion Multiplier Tap Buttons
    if (pillsContainer) {
      pillsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-portion-pill");
        if (!btn) return;
        const portion = parseFloat(btn.getAttribute("data-portion")) || 1.0;
        const u = unitSelect?.value || "serving";
        const baseWeight = this.currentBaseFood?.baseWeightGrams || (this.currentBaseFood?.baseUnit === "g" ? this.currentBaseFood.baseQty : 250);

        if (u === "g" || u === "ml") {
          qtyInput.value = Math.round(baseWeight * portion).toString();
        } else {
          qtyInput.value = (Math.round(portion * 100) / 100).toString();
        }

        pillsContainer.querySelectorAll(".btn-portion-pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");

        this.recalculateScaledNutrition();
      });
    }

    // Capture manual macro edits to re-anchor baseline
    ["foodCalsInput", "foodProteinInput", "foodCarbsInput", "foodFatsInput", "foodFiberInput"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          this.currentBaseFood = {
            name: document.getElementById("foodNameInput")?.value || "Meal",
            baseQty: parseFloat(qtyInput?.value) || 1.0,
            baseUnit: unitSelect?.value || "serving",
            baseWeightGrams: unitSelect?.value === "g" ? (parseFloat(qtyInput?.value) || 250) : 250,
            baseCals: Number(document.getElementById("foodCalsInput")?.value) || 0,
            baseP: Number(document.getElementById("foodProteinInput")?.value) || 0,
            baseC: Number(document.getElementById("foodCarbsInput")?.value) || 0,
            baseF: Number(document.getElementById("foodFatsInput")?.value) || 0,
            baseFiber: Number(document.getElementById("foodFiberInput")?.value) || 0,
            isGramBase: unitSelect?.value === "g"
          };
        });
      }
    });
  },

  setBaseFoodNutrition(foodData) {
    const qtyInput = document.getElementById("foodQuantityInput");
    const unitSelect = document.getElementById("foodUnitSelect");
    const pillsContainer = document.getElementById("quickPortionPills");
    const badge = document.getElementById("portionMultiplierBadge");
    const hint = document.getElementById("foodPortionHint");

    const qty = foodData.qty !== undefined ? foodData.qty : (foodData.quantity || 1.0);
    const unit = foodData.unit || "serving";
    const weightGrams = foodData.weightGrams || foodData.baseWeightGrams || (unit === "g" ? qty : 250);

    this.currentBaseFood = {
      name: foodData.name || foodData.foodName || "",
      baseQty: qty,
      baseUnit: unit,
      baseWeightGrams: weightGrams,
      baseCals: Number(foodData.cals) || 0,
      baseP: Number(foodData.p) || 0,
      baseC: Number(foodData.c) || 0,
      baseF: Number(foodData.f) || 0,
      baseFiber: Number(foodData.fiber) || 0,
      isGramBase: unit === "g" || (typeof foodData.name === "string" && foodData.name.includes("100g"))
    };

    if (qtyInput) qtyInput.value = qty.toString();
    if (unitSelect) unitSelect.value = unit;

    // Reset pills active state
    if (pillsContainer) {
      pillsContainer.querySelectorAll(".btn-portion-pill").forEach(p => {
        const val = parseFloat(p.getAttribute("data-portion"));
        p.classList.toggle("active", Math.abs(val - 1.0) < 0.05);
      });
    }

    if (badge) {
      badge.textContent = `${qty}x Portion`;
    }

    if (hint) {
      if (foodData.portionDescription) {
        hint.innerHTML = `<span>⚡</span> <span><strong>Portion:</strong> ${foodData.portionDescription}. Adjust quantity or tap buttons to scale.</span>`;
        hint.style.display = "flex";
      } else {
        hint.style.display = "none";
      }
    }

    // Populate input fields
    const calsEl = document.getElementById("foodCalsInput");
    const pEl = document.getElementById("foodProteinInput");
    const cEl = document.getElementById("foodCarbsInput");
    const fEl = document.getElementById("foodFatsInput");
    const fiberEl = document.getElementById("foodFiberInput");

    if (calsEl) calsEl.value = this.currentBaseFood.baseCals;
    if (pEl) pEl.value = this.currentBaseFood.baseP;
    if (cEl) cEl.value = this.currentBaseFood.baseC;
    if (fEl) fEl.value = this.currentBaseFood.baseF;
    if (fiberEl) fiberEl.value = this.currentBaseFood.baseFiber;
  },

  recalculateScaledNutrition() {
    const qtyInput = document.getElementById("foodQuantityInput");
    const unitSelect = document.getElementById("foodUnitSelect");
    const badge = document.getElementById("portionMultiplierBadge");
    const hint = document.getElementById("foodPortionHint");
    const pillsContainer = document.getElementById("quickPortionPills");

    let currentQty = parseFloat(qtyInput?.value);
    if (isNaN(currentQty) || currentQty <= 0) return;

    let currentUnit = unitSelect?.value || "serving";

    if (!this.currentBaseFood) {
      this.currentBaseFood = {
        name: document.getElementById("foodNameInput")?.value || "Meal",
        baseQty: (currentUnit === "g" || currentUnit === "ml") ? currentQty : 1.0,
        baseUnit: currentUnit,
        baseWeightGrams: (currentUnit === "g" || currentUnit === "ml") ? currentQty : 250,
        baseCals: Number(document.getElementById("foodCalsInput")?.value) || 0,
        baseP: Number(document.getElementById("foodProteinInput")?.value) || 0,
        baseC: Number(document.getElementById("foodCarbsInput")?.value) || 0,
        baseF: Number(document.getElementById("foodFatsInput")?.value) || 0,
        baseFiber: Number(document.getElementById("foodFiberInput")?.value) || 0,
        isGramBase: currentUnit === "g"
      };
    }

    // Auto-detect if user typed a gram amount (>= 20) while unit was set to "serving"
    if (currentUnit === "serving" && currentQty >= 20) {
      currentUnit = "g";
      if (unitSelect) unitSelect.value = "g";
    }

    let multiplier = 1.0;
    const baseWeight = this.currentBaseFood.baseWeightGrams || (this.currentBaseFood.baseUnit === "g" ? this.currentBaseFood.baseQty : 250);

    if (currentUnit === "g" || currentUnit === "ml") {
      multiplier = currentQty / (baseWeight || 250);
    } else {
      const baseQty = this.currentBaseFood.baseQty || 1.0;
      multiplier = currentQty / (baseQty || 1.0);
    }

    if (isNaN(multiplier) || multiplier <= 0) multiplier = 1.0;

    const scaledCals = Math.max(0, Math.round(this.currentBaseFood.baseCals * multiplier));
    const scaledP = Math.max(0, Math.round(this.currentBaseFood.baseP * multiplier * 10) / 10);
    const scaledC = Math.max(0, Math.round(this.currentBaseFood.baseC * multiplier * 10) / 10);
    const scaledF = Math.max(0, Math.round(this.currentBaseFood.baseF * multiplier * 10) / 10);
    const scaledFiber = Math.max(0, Math.round(this.currentBaseFood.baseFiber * multiplier * 10) / 10);

    const calsEl = document.getElementById("foodCalsInput");
    const pEl = document.getElementById("foodProteinInput");
    const cEl = document.getElementById("foodCarbsInput");
    const fEl = document.getElementById("foodFatsInput");
    const fiberEl = document.getElementById("foodFiberInput");

    if (calsEl) calsEl.value = scaledCals;
    if (pEl) pEl.value = scaledP;
    if (cEl) cEl.value = scaledC;
    if (fEl) fEl.value = scaledF;
    if (fiberEl) fiberEl.value = scaledFiber;

    const multDisplay = Math.round(multiplier * 100) / 100;
    if (badge) {
      badge.textContent = `${multDisplay}x (${currentQty} ${currentUnit})`;
    }

    if (hint) {
      hint.innerHTML = `<span>⚡</span> <span><strong>Scaled (${multDisplay}x):</strong> ${currentQty} ${currentUnit} → <strong>${scaledCals} kcal</strong> (${scaledP}g P, ${scaledC}g C, ${scaledF}g F)</span>`;
      hint.style.display = "flex";
    }

    // Sync active pill state
    if (pillsContainer) {
      pillsContainer.querySelectorAll(".btn-portion-pill").forEach(p => {
        const val = parseFloat(p.getAttribute("data-portion"));
        p.classList.toggle("active", Math.abs(val - multDisplay) < 0.05);
      });
    }
  },

  // --- Food Photo Scanner Logic ---
  processFoodPhotoFile(file) {
    const preview = document.getElementById("foodPhotoPreview");
    const promptText = document.getElementById("dropzonePromptText");
    const loading = document.getElementById("foodScanLoading");
    const dropzone = document.getElementById("foodPhotoDropzone");

    this.currentPhotoMimeType = file.type || "image/jpeg";

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(",")[1];
      this.currentPhotoBase64 = base64Data;

      // Show preview
      if (preview) {
        preview.src = dataUrl;
        preview.style.display = "block";
      }
      if (promptText) promptText.style.display = "none";
      if (loading) loading.style.display = "block";
      if (dropzone) dropzone.classList.add("ai-scanning-active");

      try {
        const aiService = window.NutriAIAIService;
        const analysis = aiService && typeof aiService.analyzeFoodPhoto === "function"
          ? await aiService.analyzeFoodPhoto(base64Data, this.currentPhotoMimeType, "", appState)
          : { foodName: "Logged Meal", cals: 450, p: 30, c: 40, f: 15, fiber: 5, quantity: 1, unit: "serving", portionDescription: "1 serving" };

        // Auto-fill food item name
        if (analysis.foodName) {
          document.getElementById("foodNameInput").value = analysis.foodName;
        }

        // Set baseline nutrition and portion scaling
        this.setBaseFoodNutrition({
          name: analysis.foodName || "Detected Meal",
          cals: analysis.cals || 450,
          p: analysis.p || 30,
          c: analysis.c || 40,
          f: analysis.f || 15,
          fiber: analysis.fiber || 5,
          qty: analysis.quantity || 1.0,
          unit: analysis.unit || "serving",
          portionDescription: analysis.portionDescription || (analysis.weightGrams ? `~${analysis.weightGrams}g` : "1 standard serving")
        });

        this.showToast(`AI Identified: "${analysis.foodName}" (${analysis.cals} kcal). Adjust quantity if needed! ✨`, "success");
      } catch (err) {
        this.showToast("Could not analyze photo: " + err.message, "error");
      } finally {
        if (loading) loading.style.display = "none";
        if (dropzone) dropzone.classList.remove("ai-scanning-active");
      }
    };
    reader.readAsDataURL(file);
  },



  resetPhotoScanner() {
    const preview = document.getElementById("foodPhotoPreview");
    const promptText = document.getElementById("dropzonePromptText");
    const fileInput = document.getElementById("foodPhotoFileInput");
    const hint = document.getElementById("foodPortionHint");
    const badge = document.getElementById("portionMultiplierBadge");
    const qtyInput = document.getElementById("foodQuantityInput");
    const unitSelect = document.getElementById("foodUnitSelect");
    const pillsContainer = document.getElementById("quickPortionPills");

    if (preview) preview.style.display = "none";
    if (promptText) promptText.style.display = "block";
    if (fileInput) fileInput.value = "";
    if (hint) { hint.style.display = "none"; hint.innerHTML = ""; }
    if (badge) badge.textContent = "1.0x Portion";
    if (qtyInput) qtyInput.value = "1.0";
    if (unitSelect) unitSelect.value = "serving";
    if (pillsContainer) {
      pillsContainer.querySelectorAll(".btn-portion-pill").forEach(p => {
        const val = parseFloat(p.getAttribute("data-portion"));
        p.classList.toggle("active", Math.abs(val - 1.0) < 0.05);
      });
    }
    this.currentPhotoBase64 = null;
    this.currentBaseFood = null;
  },

  // --- Modals Management ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  },

  closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
    document.body.style.overflow = "";
  },

  switchToSignInFromWizard(email = "") {
    this.closeAllModals();
    this.openModal("modalAuthLogin");
    if (email) {
      const emailInput = document.getElementById("loginEmail");
      if (emailInput) {
        emailInput.value = email;
        const passInput = document.getElementById("loginPassword");
        if (passInput) passInput.focus();
      }
    }
  },

  goToWizardStep(stepNum) {
    if (typeof this._setWizardStep === "function") {
      this._setWizardStep(stepNum);
    }
  },

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const icons = { success: "✓", info: "ℹ", error: "✕", warning: "⚠" };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || "ℹ"}</span>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));

    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 350);
    }, 3200);
  },

  // --- Master Render Method ---
  render(state) {
    const targets = state.targets;
    const totals = state.getTodayTotals();

    // 1. Render User Badge & Topbar
    this.renderUserBadge(state);

    // 2. Render Dashboard Overview
    this.renderDashboardOverview(state, totals, targets);

    // 3. Render Today's Meal Timeline on Dashboard
    this.renderTodayMealTimeline(state);

    // 4. Render Health Profile Tab
    this.renderHealthProfile(state, targets);

    // 5. Render 7-Day Meal Planner Tab
    this.renderMealPlanner(state);

    // 6. Render Nutrition & Food Tracker Tab
    this.renderNutritionTracker(state, totals, targets);

    // 7. Render Wellness Tab
    this.renderWellness(state, targets);

    // 8. Render Placeholder Sections
    this.renderPlaceholders();

    // 9. Render Settings
    this.renderSettings();

    // 10. Render Canvas Charts
    this.renderCharts();
  },

  renderUserBadge(state) {
    const isLoggedIn = Boolean(state.data && state.data.isLoggedIn && state.data.profile);
    const p = isLoggedIn ? state.data.profile : {};

    // Compute Initial automatically from Name or Email
    let initial = "G";
    if (isLoggedIn) {
      if (p.name && p.name.trim()) {
        initial = p.name.trim().charAt(0).toUpperCase();
      } else if (p.email && p.email.trim()) {
        initial = p.email.trim().charAt(0).toUpperCase();
      }
    }

    const displayName = isLoggedIn ? (p.name || (p.email ? p.email.split("@")[0] : "User")) : "Guest Visitor";
    const displayEmail = isLoggedIn ? (p.email || "") : "";

    const goalTitles = {
      balanced_nutrition: "Balanced Nutrition",
      general_fitness: "General Fitness",
      muscle_strength: "Muscle & Strength",
      weight_management: "Weight Management",
      healthy_lifestyle: "Healthy Lifestyle",
      fat_loss: "Lean Fat Loss",
      muscle_gain: "Hypertrophy / Muscle",
      maintenance: "Weight Maintenance",
      recomposition: "Body Recomp"
    };
    const goalName = isLoggedIn ? (goalTitles[p.goal] || "Balanced Nutrition") : "Sign in to personalize";

    // Topbar Avatar & Dropdown Elements
    const topbarAvatarBtn = document.getElementById("topbarAvatarBtn");
    const topbarUserInitial = document.getElementById("topbarUserInitial");
    const topbarGuestActions = document.getElementById("topbarGuestActions");
    const topbarSignInBtn = document.getElementById("topbarSignInBtn");
    const userAccountDropdown = document.getElementById("userAccountDropdown");

    const menuUserAvatar = document.getElementById("menuUserAvatar");
    const menuUserName = document.getElementById("menuUserName");
    const menuUserEmail = document.getElementById("menuUserEmail");
    const menuUserGoalBadge = document.getElementById("menuUserGoalBadge");

    if (isLoggedIn) {
      if (topbarAvatarBtn) topbarAvatarBtn.style.display = "flex";
      if (topbarGuestActions) topbarGuestActions.style.display = "none";
      if (topbarSignInBtn) topbarSignInBtn.style.display = "none";
      if (topbarUserInitial) topbarUserInitial.textContent = initial;
      if (menuUserAvatar) menuUserAvatar.textContent = initial;
      if (menuUserName) menuUserName.textContent = displayName;
      if (menuUserEmail) menuUserEmail.textContent = displayEmail;
      if (menuUserGoalBadge) menuUserGoalBadge.textContent = goalName;
    } else {
      if (topbarAvatarBtn) topbarAvatarBtn.style.display = "none";
      if (userAccountDropdown) userAccountDropdown.classList.remove("active");
      if (topbarGuestActions) topbarGuestActions.style.display = "flex";
      if (topbarSignInBtn) topbarSignInBtn.style.display = "inline-flex";
    }

    // Sidebar Elements
    const userAvatarEl = document.getElementById("sidebarAvatar");
    const userNameEl = document.getElementById("sidebarUserName");
    const userPlanEl = document.getElementById("sidebarUserPlan");
    const logoutBtn = document.getElementById("logoutBtn");

    if (userAvatarEl) userAvatarEl.textContent = initial;
    if (userNameEl) userNameEl.textContent = displayName;
    if (userPlanEl) userPlanEl.textContent = isLoggedIn ? ("Goal: " + goalName) : "Sign in to personalize";
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "block" : "none";
  },

  renderDashboardOverview(state, totals, targets) {
    const isLoggedIn = Boolean(state.data && state.data.isLoggedIn && state.data.profile && targets);
    const guestHero = document.getElementById("guestWelcomeHero");

    if (!isLoggedIn || !targets) {
      if (guestHero) guestHero.style.display = "block";

      const setDashVal = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
      };

      setDashVal("statCaloriesVal", "—");
      setDashVal("statCaloriesTarget", "/ — kcal");
      setDashVal("statCaloriesRemaining", "Sign in to calculate");
      setDashVal("dashCaloriesBadge", "No Active Profile");
      setDashVal("statProteinVal", "—");
      setDashVal("statProteinTarget", "/ —g");
      setDashVal("statProteinStatus", "—");
      setDashVal("statCarbsVal", "—");
      setDashVal("statCarbsTarget", "/ —g");
      setDashVal("statCarbsStatus", "—");
      setDashVal("statFatsVal", "—");
      setDashVal("statFatsTarget", "/ —g");
      setDashVal("statFatsStatus", "—");
      setDashVal("statWaterVal", "0.0L");
      setDashVal("statWaterTarget", "/ —L");
      setDashVal("statWaterMeta", "Sign in to log water");

      ["statCaloriesProgress", "statProteinProgress", "statCarbsProgress", "statFatsProgress", "statWaterProgress"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.width = "0%";
      });

      this.renderHealthOverviewCard(state, null);
      this.renderHabits(state, totals, null);
      return;
    }

    if (guestHero) guestHero.style.display = "none";

    // Calories Stat
    this._setStatCard("statCaloriesVal", "statCaloriesTarget", "statCaloriesProgress",
      totals.calories, targets.calories, "kcal");

    const remainingEl = document.getElementById("statCaloriesRemaining");
    if (remainingEl) {
      const remaining = targets.calories - totals.calories;
      remainingEl.textContent = totals.calories > 0
        ? (remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over`)
        : "0 kcal logged";
    }

    const calBadge = document.getElementById("dashCaloriesBadge");
    if (calBadge) {
      calBadge.textContent = totals.calories > 0 
        ? `${totals.calories} / ${targets.calories} kcal Consumed` 
        : `Target: ${targets.calories} kcal/day`;
    }

    // Protein Stat
    this._setStatCard("statProteinVal", "statProteinTarget", "statProteinProgress",
      totals.protein, targets.protein, "g");
    const proteinStatus = document.getElementById("statProteinStatus");
    if (proteinStatus) proteinStatus.textContent = "Optimal";

    // Carbs Stat
    this._setStatCard("statCarbsVal", "statCarbsTarget", "statCarbsProgress",
      totals.carbs, targets.carbs, "g");
    const carbsStatus = document.getElementById("statCarbsStatus");
    if (carbsStatus) carbsStatus.textContent = "Steady";

    // Fats Stat
    this._setStatCard("statFatsVal", "statFatsTarget", "statFatsProgress",
      totals.fats, targets.fats, "g");
    const fatsStatus = document.getElementById("statFatsStatus");
    if (fatsStatus) fatsStatus.textContent = "Balanced";

    // Water Stat
    const waterVal = document.getElementById("statWaterVal");
    const waterTarget = document.getElementById("statWaterTarget");
    const waterProgress = document.getElementById("statWaterProgress");
    const waterMeta = document.getElementById("statWaterMeta");
    const waterLogged = state.data.waterLogged || 0;
    if (waterVal) waterVal.textContent = `${(waterLogged / 1000).toFixed(1)}L`;
    if (waterTarget) waterTarget.textContent = `/ ${(targets.water / 1000).toFixed(1)}L`;
    if (waterProgress) {
      const pct = targets.water > 0 ? Math.min(100, (waterLogged / targets.water) * 100) : 0;
      waterProgress.style.width = `${pct}%`;
      if (waterMeta) waterMeta.textContent = `${Math.round(pct)}% of Daily Goal`;
    }

    // Health Overview Summary Card
    this.renderHealthOverviewCard(state, targets);

    // Habits completion
    this.renderHabits(state, totals, targets);
  },

  _setStatCard(valId, targetId, progressId, current, target, unit) {
    const valEl = document.getElementById(valId);
    const targetEl = document.getElementById(targetId);
    const progressEl = document.getElementById(progressId);
    if (valEl) valEl.textContent = current;
    if (targetEl) targetEl.textContent = `/ ${target}${unit}`;
    if (progressEl) {
      const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
      progressEl.style.width = `${pct}%`;
    }
  },

  renderHealthOverviewCard(state, targets) {
    const compBar = document.getElementById("dashProfileCompBar");
    const compPct = document.getElementById("dashProfileCompPct");
    const bmiSummary = document.getElementById("dashBmiSummary");
    const goalSummary = document.getElementById("dashGoalSummary");
    const dietSummary = document.getElementById("dashDietSummary");
    const caloriesSummary = document.getElementById("dashCaloriesSummary");

    if (!state.data.isLoggedIn || !state.data.profile || !targets) {
      if (compBar) compBar.style.width = "0%";
      if (compPct) compPct.textContent = "0%";
      if (bmiSummary) bmiSummary.textContent = "— (Sign in to calculate)";
      if (goalSummary) goalSummary.textContent = "—";
      if (dietSummary) dietSummary.textContent = "—";
      if (caloriesSummary) caloriesSummary.textContent = "— kcal/day";
      return;
    }

    const completion = state.getProfileCompletion();
    const p = state.data.profile;

    if (compBar) compBar.style.width = `${completion.pct}%`;
    if (compPct) compPct.textContent = `${completion.pct}%`;

    if (bmiSummary) {
      bmiSummary.textContent = `BMI ${targets.bmi} · ${targets.bmiCategory}`;
    }

    const goalLabels = {
      balanced_nutrition: "Balanced Nutrition",
      general_fitness: "General Fitness",
      muscle_strength: "Muscle & Strength",
      weight_management: "Weight Management",
      healthy_lifestyle: "Healthy Lifestyle",
      fat_loss: "Fat Loss",
      maintenance: "Maintenance",
      muscle_gain: "Muscle Gain",
      recomposition: "Body Recomp"
    };
    if (goalSummary) goalSummary.textContent = goalLabels[p.goal] || "Wellness";

    const dietLabels = {
      balanced: "Non-Vegetarian (Omnivore)",
      vegetarian: "Vegetarian",
      eggetarian: "Eggetarian",
      vegan: "Vegan",
      keto: "Ketogenic",
      pescatarian: "Pescatarian"
    };
    if (dietSummary) dietSummary.textContent = dietLabels[p.dietPreference] || "Balanced";
    if (caloriesSummary) caloriesSummary.textContent = `${targets.calories} kcal/day`;
  },

  renderHabits(state, totals = appState.getTodayTotals(), targets = appState.targets) {
    const habitsContainer = document.getElementById("habitChipsGrid");
    if (!habitsContainer) return;

    // Update streak badge
    const streak = state.getStreakCount ? state.getStreakCount() : (state.data.streak || 0);
    const streakBadge = document.getElementById("dashStreakBadge");
    if (streakBadge) {
      streakBadge.textContent = `🔥 ${streak} Day Streak`;
    }

    const habits = [
      { id: "habit_protein", icon: "🥩", label: "Hit Protein Target", isAuto: targets && totals.protein >= targets.protein && targets.protein > 0 },
      { id: "habit_water", icon: "💧", label: "3L+ Hydration", isAuto: (state.data.waterLogged || 0) >= 3000 },
      { id: "habit_steps", icon: "👟", label: "10,000 Steps", isAuto: (state.data.stepsLogged || 0) >= 10000 },
      { id: "habit_sleep", icon: "🌙", label: "8h Recovery Sleep", isAuto: (state.data.sleepLogged || 0) >= 8 },
      { id: "habit_fiber", icon: "🥦", label: "30g+ Dietary Fiber", isAuto: totals.fiber >= 30 }
    ];

    habitsContainer.innerHTML = habits.map(h => {
      const isDone = !!state.data.completedHabits[h.id] || !!h.isAuto;
      return `
        <div class="habit-chip ${isDone ? 'completed' : ''}"
             onclick="appState.toggleHabit('${h.id}'); NutriAIDbService.syncToCloud();"
             onkeydown="if(event.key==='Enter'||event.key===' '){appState.toggleHabit('${h.id}'); NutriAIDbService.syncToCloud();}"
             role="button" tabindex="0" aria-pressed="${isDone}"
             aria-label="${h.label} — ${isDone ? 'completed' : 'not done'}">
          <span>${h.icon}</span>
          <span>${h.label}</span>
          <span class="habit-check-icon">${isDone ? "✓" : "+"}</span>
        </div>
      `;
    }).join("");
  },

  renderTodayMealTimeline(state) {
    const listEl = document.getElementById("todayMealsScheduleList");
    if (!listEl) return;

    if (!state.data.isLoggedIn || !state.data.profile || !state.targets) {
      listEl.innerHTML = `
        <div class="guest-lock-banner">
          <div style="font-size:2.25rem; margin-bottom:0.5rem;">🔒</div>
          <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:0.35rem;">Personalized Meal Schedule</h4>
          <p style="font-size:0.875rem; color:var(--text-muted); max-width:440px; margin:0 auto 1rem;">
            Sign in or create your personalized health profile to view today's clinical meal schedule.
          </p>
          <button type="button" class="btn btn-primary btn-sm" onclick="NutriAIApp.openModal('modalWizard')">
            ✨ Start 3-Step Onboarding
          </button>
        </div>
      `;
      return;
    }

    const today = state.data.activeDay || state._getTodayDayCode?.() || "Mon";
    const todayMeals = NutriAIMealFilter.getFilteredMeals(today, state.data.profile, state.targets);

    if (todayMeals.length === 0) {
      listEl.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">No meals planned for today.</div>`;
      return;
    }

    listEl.innerHTML = todayMeals.map(m => {
      const isChecked = !!state.data.checkedMeals[m.id];
      const swapBadge = m._swapped ? `<span class="badge badge-amber" style="font-size:0.7rem; margin-left:0.5rem;">Swapped ↻</span>` : "";
      return `
        <div class="meal-item-card ${isChecked ? 'meal-checked' : ''}">
          <div class="meal-item-left">
            <input type="checkbox" class="meal-checkbox" ${isChecked ? "checked" : ""}
                   onchange="appState.toggleMealCheck('${m.id}'); NutriAIDbService.syncToCloud();"
                   aria-label="Mark ${m.name} as consumed" />
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.2rem; flex-wrap:wrap;">
                <span class="meal-badge-type">${m.type}</span>
                <span class="meal-title">${m.name}</span>
                ${swapBadge}
              </div>
              <div class="meal-macros">
                <span>🔥 ${m.calories} kcal</span>
                <span>•</span>
                <span class="meal-macro-pill" style="color:var(--color-protein);">P: ${m.protein}g</span>
                <span class="meal-macro-pill" style="color:var(--color-carbs);">C: ${m.carbs}g</span>
                <span class="meal-macro-pill" style="color:var(--color-fats);">F: ${m.fats}g</span>
                <span>•</span>
                <span>⏱ ${m.prepTime}</span>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="NutriAIApp.openRecipeModal('${m.id}', '${today}')">Recipe</button>
        </div>
      `;
    }).join("");
  },

  renderHealthProfile(state, targets) {
    if (!state.data.isLoggedIn || !state.data.profile || !targets) {
      return;
    }
    const p = state.data.profile;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? "";
    };

    setVal("profName", p.name || "");
    setVal("profEmail", p.email || "");
    setVal("profGender", p.gender || "male");
    setVal("profAge", p.age || 25);
    setVal("profHeight", p.height || 175);
    setVal("profWeight", p.weight || 70);
    setVal("profTargetWeight", p.targetWeight || 68);
    setVal("profActivity", p.activityLevel || "moderate");
    setVal("profGoal", p.goal || "fat_loss");
    setVal("profDiet", p.dietPreference || "balanced");
    setVal("profSleep", p.sleep || 7.5);
    setVal("profExerciseFreq", p.exerciseFrequency || "3_5");
    setVal("profMealFreq", p.mealFrequency || 4);
    setVal("profCuisine", p.cuisinePreference || "mediterranean");

    const restrictions = p.restrictions || [];
    document.querySelectorAll("[name='profileRestriction']").forEach(cb => {
      cb.checked = restrictions.includes(cb.value);
    });

    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    setTxt("profileBmiVal", targets.bmi);
    const bmiCat = document.getElementById("profileBmiCategory");
    if (bmiCat) { bmiCat.textContent = targets.bmiCategory; bmiCat.style.color = targets.bmiColor; }
    setTxt("profileBmrVal", `${targets.bmr} kcal`);
    setTxt("profileTdeeVal", `${targets.tdee} kcal`);
    setTxt("profileTdeeSubtitle", targets.palLabel || "Physical Activity (PAL)");
    setTxt("profileTargetCals", `${targets.calories} kcal/day`);
    setTxt("profileTargetCalsSubtitle", targets.deltaLabel || "Target Daily Budget");
    setTxt("profileProteinTarget", `${targets.protein}g`);
    setTxt("profileCarbsTarget", `${targets.carbs}g`);
    setTxt("profileFatsTarget", `${targets.fats}g`);

    const completion = state.getProfileCompletion();
    const compBar = document.getElementById("profileCompletionBar");
    const compPct = document.getElementById("profileCompletionPct");
    if (compBar) compBar.style.width = `${completion.pct}%`;
    if (compPct) compPct.textContent = `${completion.pct}%`;

    this.renderBMIScale(targets);
  },

  renderBMIScale(targets) {
    if (!targets) return;
    const needle = document.getElementById("bmiScaleNeedle");
    const bmiLabel = document.getElementById("bmiScaleLabel");

    if (needle) {
      needle.style.left = `${targets.bmiPct}%`;
    }
    if (bmiLabel) {
      bmiLabel.textContent = `BMI ${targets.bmi} — ${targets.bmiCategory}`;
      bmiLabel.style.color = targets.bmiColor;
    }
  },

  renderMealPlanner(state) {
    if (!state.data.isLoggedIn || !state.data.profile || !state.targets) {
      return;
    }
    const activeDay = state.data.activeDay || "Mon";
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const dayBar = document.getElementById("mealPlanDaySelector");
    if (dayBar) {
      dayBar.innerHTML = days.map(d => {
        const meals = NutriAIMealFilter.getFilteredMeals(d, state.data.profile, state.targets);
        const totalCals = meals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
        const isActive = d === activeDay;
        return `
          <button type="button" class="day-btn ${isActive ? 'active' : ''}" data-day-select="${d}">
            <span class="day-name">${d}</span>
            <span class="day-cals">${totalCals} kcal</span>
          </button>
        `;
      }).join("");

      dayBar.querySelectorAll("[data-day-select]").forEach(btn => {
        btn.addEventListener("click", () => {
          appState.setActiveDay(btn.getAttribute("data-day-select"));
        });
      });
    }

    const grid = document.getElementById("mealPlanCardsGrid");
    if (grid) {
      const activeMeals = NutriAIMealFilter.getFilteredMeals(activeDay, state.data.profile, state.targets);
      if (activeMeals.length === 0) {
        grid.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--text-muted); grid-column:1/-1;">No meals available for selected dietary preferences.</div>`;
      } else {
        grid.innerHTML = activeMeals.map(m => {
          const swapLabel = m._swapped
            ? `<div style="font-size:0.75rem; color:var(--color-amber); margin-bottom:0.5rem;">↻ Swapped — compatible with ${state.data.profile.dietPreference}</div>`
            : "";
          return `
            <div class="recipe-card">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                  <span class="badge badge-emerald">${m.type}</span>
                  <span style="font-size:1.35rem;">${m.imageEmoji || "🥗"}</span>
                </div>
                ${swapLabel}
                <h3 style="font-size:1.05rem; margin-bottom:0.5rem;">${m.name}</h3>
                <div style="font-size:0.8125rem; color:var(--text-muted); margin-bottom:0.75rem;">
                  <span>⏱ Prep: ${m.prepTime}</span>
                </div>
                <div class="meal-macros" style="flex-wrap:wrap; gap:0.5rem;">
                  <span class="badge badge-emerald">🔥 ${m.calories} kcal</span>
                  <span class="badge badge-blue">P: ${m.protein}g</span>
                  <span class="badge badge-amber">C: ${m.carbs}g</span>
                  <span class="badge badge-rose">F: ${m.fats}g</span>
                </div>
              </div>
              <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;" onclick="NutriAIApp.swapMeal('${m.id}', '${activeDay}')">Swap ↻</button>
                <button type="button" class="btn btn-primary btn-sm" style="flex:1;" onclick="NutriAIApp.openRecipeModal('${m.id}', '${activeDay}')">View Recipe</button>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    this.renderSmartGroceryList(state);
  },

  renderSmartGroceryList(state) {
    const listContainer = document.getElementById("groceryListContainer");
    if (!listContainer) return;

    const profile = state ? state.data.profile : appState.data.profile;
    const categories = NutriAIMealFilter.buildDynamicGroceryList(profile);

    if (Object.keys(categories).length === 0) {
      listContainer.innerHTML = `<div style="padding:1rem; color:var(--text-muted);">No grocery items generated for current dietary settings.</div>`;
      return;
    }

    listContainer.innerHTML = Object.entries(categories).map(([cat, items]) => `
      <div class="grocery-category">
        <div class="grocery-category-title">${cat}</div>
        <div class="grocery-items-grid">
          ${items.map(item => `
            <label class="grocery-item">
              <input type="checkbox" class="meal-checkbox" style="width:16px; height:16px;" />
              <span>${item}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `).join("");
  },

  copyGroceryListToClipboard() {
    const text = NutriAIMealFilter.buildGroceryClipboardText(appState.data.profile);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast("Grocery list copied to clipboard! 📋", "success");
      }).catch(() => {
        this.showToast("Could not copy to clipboard.", "error");
      });
    } else {
      this.showToast("Clipboard API not available.", "error");
    }
  },

  renderNutritionTracker(state, totals, targets) {
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setWidth = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${Math.min(100, pct)}%`; };

    if (!state.data.isLoggedIn || !state.data.profile || !targets) {
      setTxt("nutritionSummaryCals", "— / — kcal");
      setTxt("nutritionSummaryProtein", "— / —g");
      setTxt("nutritionSummaryCarbs", "— / —g");
      setTxt("nutritionSummaryFats", "— / —g");
      setTxt("nutritionSummaryFiber", "— / —g");
      setWidth("nutCaloriesBar", 0);
      setWidth("nutProteinBar", 0);
      setWidth("nutCarbsBar", 0);
      setWidth("nutFatsBar", 0);
      setWidth("nutFiberBar", 0);
      const remainingEl = document.getElementById("nutritionRemainingCals");
      if (remainingEl) remainingEl.textContent = "Sign in to track";
      const logsContainer = document.getElementById("todayFoodLogsList");
      if (logsContainer) {
        logsContainer.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">Please sign in to log and track your meals.</div>`;
      }
      return;
    }

    const remaining = targets.calories - totals.calories;
    const remainingEl = document.getElementById("nutritionRemainingCals");
    if (remainingEl) {
      remainingEl.textContent = remaining >= 0
        ? `${remaining} kcal remaining`
        : `${Math.abs(remaining)} kcal over target`;
      remainingEl.style.color = remaining >= 0 ? "var(--primary-600)" : "var(--color-danger)";
    }

    const logsContainer = document.getElementById("todayFoodLogsList");
    if (logsContainer) {
      const today = state.data.activeDay || state._getTodayDayCode?.() || "Mon";
      const todayPlannedMeals = (typeof NutriAIMealFilter !== "undefined")
        ? NutriAIMealFilter.getFilteredMeals(today, state.data.profile, state.targets)
        : [];
      
      const checkedPlannedMeals = todayPlannedMeals.filter(m => state.data.checkedMeals && state.data.checkedMeals[m.id]);
      const customLogs = state.data.todayFoodLogs || [];

      if (checkedPlannedMeals.length === 0 && customLogs.length === 0) {
        logsContainer.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--text-muted);">No meals or foods consumed today yet. Check off meals from Today's Schedule or click "+ Log Food Item"!</div>`;
      } else {
        let itemsHtml = "";

        // Render checked meals from schedule
        checkedPlannedMeals.forEach(m => {
          itemsHtml += `
            <div class="meal-item-card" style="margin-bottom:0.75rem; border-left:3px solid var(--primary-500);">
              <div>
                <div style="font-weight:700; font-size:0.9375rem; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
                  <span>${m.imageEmoji || '🥗'} ${m.name}</span>
                  <span class="badge badge-emerald" style="font-size:0.7rem;">✓ Consumed (${m.type})</span>
                </div>
                <div class="meal-macros" style="flex-wrap:wrap; gap:0.4rem; margin-top:0.35rem;">
                  <span>🔥 ${m.calories} kcal</span>
                  <span style="color:var(--color-protein);">P: ${m.protein}g</span>
                  <span style="color:var(--color-carbs);">C: ${m.carbs}g</span>
                  <span style="color:var(--color-fats);">F: ${m.fats}g</span>
                  ${m.fiber ? `<span style="color:#16a34a;">Fiber: ${m.fiber}g</span>` : ""}
                </div>
              </div>
              <button type="button" class="btn btn-outline btn-sm" onclick="appState.toggleMealCheck('${m.id}'); NutriAIDbService.syncToCloud();" title="Uncheck meal">Uncheck</button>
            </div>
          `;
        });

        // Render custom food logs
        customLogs.forEach(item => {
          itemsHtml += `
            <div class="meal-item-card" style="margin-bottom:0.75rem;">
              <div>
                <div style="font-weight:700; font-size:0.9375rem; color:var(--text-main);">${item.name}</div>
                <div class="meal-macros" style="flex-wrap:wrap; gap:0.4rem; margin-top:0.35rem;">
                  <span class="badge badge-gray">${item.meal || 'Custom Log'}</span>
                  <span>🔥 ${item.cals} kcal</span>
                  <span style="color:var(--color-protein);">P: ${item.p}g</span>
                  <span style="color:var(--color-carbs);">C: ${item.c}g</span>
                  <span style="color:var(--color-fats);">F: ${item.f}g</span>
                  ${item.fiber > 0 ? `<span style="color:#16a34a;">Fiber: ${item.fiber}g</span>` : ""}
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
                      onclick="appState.removeFoodLog('${item.id}'); NutriAIDbService.syncToCloud();" aria-label="Remove ${item.name}">✕</button>
            </div>
          `;
        });

        logsContainer.innerHTML = itemsHtml;
      }
    }
  },

  renderWellness(state, targets) {
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    if (!state?.data?.isLoggedIn || !state?.data?.profile || !targets) {
      setTxt("wellnessWaterDisplay", "0.0 L / — L");
      const waterProgBar = document.getElementById("wellnessWaterProgBar");
      if (waterProgBar) waterProgBar.style.width = "0%";
      setTxt("wellnessSleepDisplay", "0 hrs");
      setTxt("wellnessCurrentWeight", "— kg");
      const glassesContainer = document.getElementById("waterGlassesGrid");
      if (glassesContainer) {
        glassesContainer.innerHTML = Array.from({ length: 8 }, () => `
          <div class="water-glass" title="Remaining">💧</div>
        `).join("");
      }
      return;
    }

    const waterLogged = Number(state.data.waterLogged) || 0;
    const waterTarget = Number(targets.water) || 3200;
    const waterLitres = (waterLogged / 1000).toFixed(1);
    const targetLitres = (waterTarget / 1000).toFixed(1);
    const waterProgress = waterTarget > 0 ? Math.min(100, (waterLogged / waterTarget) * 100) : 0;

    setTxt("wellnessWaterDisplay", `${waterLitres} L / ${targetLitres} L`);
    const waterProgBar = document.getElementById("wellnessWaterProgBar");
    if (waterProgBar) waterProgBar.style.width = `${waterProgress}%`;

    setTxt("wellnessSleepDisplay", `${state.data.sleepLogged || 0} hrs`);

    const weightHist = Array.isArray(state.data.weightHistory) ? state.data.weightHistory : [];
    const latestWeight = weightHist.length > 0 ? weightHist[weightHist.length - 1] : null;
    if (latestWeight) {
      setTxt("wellnessCurrentWeight", `${latestWeight.weight} kg`);
      const initialWeight = weightHist[0] ? weightHist[0].weight : latestWeight.weight;
      const weightDiff = (latestWeight.weight - initialWeight).toFixed(1);
      const weightChangeEl = document.getElementById("wellnessWeightChange");
      if (weightChangeEl) {
        const sign = Number(weightDiff) <= 0 ? "" : "+";
        weightChangeEl.textContent = `${sign}${weightDiff} kg since start`;
        weightChangeEl.style.color = Number(weightDiff) <= 0 ? "var(--primary-600)" : "var(--color-danger)";
      }
    } else {
      setTxt("wellnessCurrentWeight", `${state.data.profile.weight || 70} kg`);
    }

    const glassesContainer = document.getElementById("waterGlassesGrid");
    if (glassesContainer) {
      const filledGlasses = waterTarget > 0 ? Math.min(8, Math.round((waterLogged / waterTarget) * 8)) : 0;
      glassesContainer.innerHTML = Array.from({ length: 8 }, (_, i) => `
        <div class="water-glass ${i < filledGlasses ? 'filled' : ''}" title="${i < filledGlasses ? 'Consumed' : 'Remaining'}">
          💧
        </div>
      `).join("");
    }
  },

  renderPlaceholders() {
    const bioGrid = document.getElementById("biomarkersPreviewGrid");
    if (bioGrid && NutriAIData.biomarkersPreview) {
      bioGrid.innerHTML = NutriAIData.biomarkersPreview.map(b => `
        <div class="lab-item-card">
          <div class="lab-item-top">
            <span class="badge badge-emerald">${b.category}</span>
            <span class="badge badge-preview">Demo Panel</span>
          </div>
          <div class="lab-title">${b.marker}</div>
          <div class="lab-value-wrap">
            <span class="lab-value">${b.value}</span>
            <span class="badge badge-emerald" style="font-size:0.75rem;">${b.status}</span>
          </div>
          <div class="lab-range-bar">
            <div class="lab-marker" style="left: ${b.pct}%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted);">
            <span>Ref Range: ${b.range}</span>
          </div>
          <div style="font-size:0.8125rem; color:var(--text-body); margin-top:0.25rem;">
            ${b.note}
          </div>
        </div>
      `).join("");
    }

    const genGrid = document.getElementById("geneticsPreviewGrid");
    if (genGrid && NutriAIData.geneticsPreview) {
      genGrid.innerHTML = NutriAIData.geneticsPreview.map(g => `
        <div class="card card-body" style="margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span class="badge badge-blue">${g.category}</span>
            <span class="badge badge-preview">Nutrigenomics</span>
          </div>
          <h3 style="font-size:1.05rem; margin-bottom:0.35rem;">${g.trait}</h3>
          <div style="font-weight:700; color:var(--primary-700); font-size:0.9375rem; margin-bottom:0.5rem;">
            🧬 Variant: ${g.variant}
          </div>
          <p style="font-size:0.875rem; color:var(--text-body); line-height:1.5;">
            ${g.guidance}
          </p>
        </div>
      `).join("");
    }

    const specGrid = document.getElementById("specialistsDirectoryGrid");
    if (specGrid && NutriAIData.specialists) {
      specGrid.innerHTML = NutriAIData.specialists.map(s => `
        <div class="specialist-card">
          <div class="specialist-avatar">${s.initials}</div>
          <div>
            <h3 class="specialist-name">${s.name}</h3>
            <div class="specialist-title">${s.title}</div>
            <div style="font-size:0.8125rem; color:var(--text-muted); margin-top:0.25rem;">📍 ${s.location}</div>
          </div>
          <div class="badge badge-amber">${s.rating}</div>
          <p style="font-size:0.8125rem; color:var(--text-body); text-align:center;">
            "${s.bio}"
          </p>
          <button type="button" class="btn btn-outline btn-sm" style="width:100%;"
                  onclick="NutriAIApp.openConsultModal('${s.name}')">Book Consultation</button>
        </div>
      `).join("");
    }
  },

  renderSettings() {
    const p = appState.data.profile || {};
    const settingsProfileName = document.getElementById("settingsProfileName");
    const settingsDiet = document.getElementById("settingsDietDisplay");
    const settingsGoal = document.getElementById("settingsGoalDisplay");

    if (settingsProfileName) settingsProfileName.textContent = appState.data.isLoggedIn ? (p.name || "User") : "Guest Visitor";
    if (settingsDiet) settingsDiet.textContent = appState.data.isLoggedIn ? (p.dietPreference || "Not set") : "—";
    if (settingsGoal) settingsGoal.textContent = appState.data.isLoggedIn ? (p.goal || "Not set") : "—";

    this.updateApiKeyStatus();
    this.updateSupabaseStatus();
  },

  renderCharts() {
    const targets = appState.targets;
    const totals = appState.getTodayTotals();

    if (!appState.data.isLoggedIn || !targets) {
      NutriAICharts.renderWeeklyCalories("weeklyCaloriesCanvas", 0);
      NutriAICharts.renderMacroDonut("macroDonutCanvas", 0, 0, 0);
      NutriAICharts.renderWeightProgress("weightProgressCanvas", [], 0);
      return;
    }

    NutriAICharts.renderWeeklyCalories("weeklyCaloriesCanvas", targets.calories);
    NutriAICharts.renderMacroDonut("macroDonutCanvas", totals.protein, totals.carbs, totals.fats);
    NutriAICharts.renderWeightProgress("weightProgressCanvas", appState.data.weightHistory, appState.data.profile?.targetWeight || 0);
  },

  openRecipeModal(mealId, day = "Mon") {
    const dayMeals = NutriAIMealFilter.getFilteredMeals(day, appState.data.profile, appState.targets);
    let meal = dayMeals.find(m => m.id === mealId);

    if (!meal) {
      Object.values(NutriAIData.mealPlans).forEach(meals => {
        const found = meals.find(m => m.id === mealId);
        if (found) meal = found;
      });
    }

    if (!meal) return;

    const titleEl = document.getElementById("recipeModalTitle");
    const bodyEl = document.getElementById("recipeModalBody");

    if (titleEl) titleEl.innerHTML = `${meal.imageEmoji || "🥗"} ${meal.name}`;
    if (bodyEl) {
      const swapNote = meal._swapped
        ? `<div class="badge badge-amber" style="margin-bottom:1rem; display:inline-block;">↻ Auto-swapped to match your dietary settings (${appState.data.profile.dietPreference})</div>`
        : "";

      bodyEl.innerHTML = `
        ${swapNote}
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
          <span class="badge badge-emerald">🔥 ${meal.calories} kcal</span>
          <span class="badge badge-blue">Protein: ${meal.protein}g</span>
          <span class="badge badge-amber">Carbs: ${meal.carbs}g</span>
          <span class="badge badge-rose">Fats: ${meal.fats}g</span>
          ${meal.fiber ? `<span class="badge badge-gray">Fiber: ${meal.fiber}g</span>` : ""}
          <span class="badge badge-gray">⏱ Prep: ${meal.prepTime}</span>
        </div>

        <h4 style="margin-bottom:0.5rem; color:var(--primary-800);">🛒 Ingredients</h4>
        <ul style="padding-left:1.25rem; margin-bottom:1.25rem; font-size:0.9375rem; color:var(--text-body); line-height:1.7;">
          ${meal.ingredients.map(ing => `<li>${ing}</li>`).join("")}
        </ul>

        <h4 style="margin-bottom:0.5rem; color:var(--primary-800);">👨‍🍳 Preparation Steps</h4>
        <ol style="padding-left:1.25rem; font-size:0.9375rem; color:var(--text-body); line-height:1.7;">
          ${meal.instructions.map(st => `<li>${st}</li>`).join("")}
        </ol>
      `;
    }

    this.openModal("modalRecipeViewer");
  },

  swapMeal(mealId, day) {
    const meals = NutriAIMealFilter.getFilteredMeals(day, appState.data.profile, appState.targets);
    const meal = meals.find(m => m.id === mealId);
    if (!meal) {
      this.showToast("Could not find meal to swap.", "error");
      return;
    }

    const alternative = NutriAIMealFilter.getAlternative(meal, appState.data.profile);
    if (!alternative) {
      this.showToast("No alternative meals available for your dietary settings.", "info");
      return;
    }

    this.showToast(`Found alternative: "${alternative.name}" (${alternative.calories} kcal)`, "success");
    setTimeout(() => {
      this.openRecipeModal(alternative.id, day);
    }, 500);
  },

  openConsultModal(specialistName) {
    const specNameEl = document.getElementById("consultSpecName");
    if (specNameEl) specNameEl.textContent = specialistName;
    this.openModal("modalConsultRequest");
  },

  populateFoodDatabaseDropdown() {
    const sel = document.getElementById("foodDbSelect");
    if (!sel) return;

    sel.innerHTML = `<option value="">-- Or search pre-loaded database (${NutriAIData.foodDatabase.length} items) --</option>` +
      NutriAIData.foodDatabase.map((item, idx) => `
        <option value="${idx}">${item.name} (${item.cals} kcal)</option>
      `).join("");
  }
};

// Initialize App when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  NutriAIApp.init();
});
