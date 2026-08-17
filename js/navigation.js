/**
 * NutriAI — Navigation & View Routing
 * Single-Page navigation, hash history, mobile drawer, active states
 */

const NutriAINav = {
  activeView: "dashboard",

  init() {
    this.bindEvents();
    // Handle initial URL hash
    const isAuth = typeof appState !== "undefined" && Boolean(appState.data && appState.data.isLoggedIn && appState.data.profile);
    const initialRaw = window.location.hash.replace("#", "").replace("/", "").trim();
    let initialHash = initialRaw || (isAuth ? "dashboard" : "login");
    if (!isAuth && initialHash !== "login") {
      initialHash = "login";
    }
    this.navigateTo(initialHash, false);
  },

  bindEvents() {
    // Navigation items click
    document.querySelectorAll("[data-nav-target]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const target = el.getAttribute("data-nav-target");
        this.navigateTo(target);
        this.closeMobileSidebar();
      });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById("mobileNavToggle");
    const backdrop = document.getElementById("sidebarBackdrop");
    const sidebar = document.getElementById("sidebar");

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
        if (backdrop) backdrop.classList.toggle("active");
      });
    }

    if (backdrop && sidebar) {
      backdrop.addEventListener("click", () => {
        this.closeMobileSidebar();
      });
    }

    // Window hashchange
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "").replace("/", "").trim();
      this.navigateTo(hash || "dashboard", false);
    });
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.remove("active");
  },

  navigateTo(viewId, updateHash = true) {
    const isAuth = typeof appState !== "undefined" && Boolean(appState.data && appState.data.isLoggedIn && appState.data.profile);
    const protectedViews = [
      "dashboard", "profile", "mealplan", "nutrition", "wellness",
      "biomarkers", "genetics", "ai-insights", "ai-chat", "reports",
      "specialists", "settings"
    ];

    if (!isAuth) {
      // Unauthenticated users are redirected to login/landing view
      if (protectedViews.includes(viewId) || viewId === "dashboard" || !viewId) {
        viewId = "login";
        if (updateHash) {
          history.replaceState(null, "", "#login");
        }
      }
    } else {
      // Authenticated users requesting login are redirected to dashboard
      if (viewId === "login" || !viewId) {
        viewId = "dashboard";
        if (updateHash) {
          history.replaceState(null, "", "#dashboard");
        }
      }
    }

    const targetSection = document.getElementById(`view-${viewId}`);
    if (!targetSection) {
      viewId = isAuth ? "dashboard" : "login";
      if (updateHash) {
        history.replaceState(null, "", `#${viewId}`);
      }
    }

    this.activeView = viewId;

    // Update active view class
    document.querySelectorAll(".view-section").forEach(sec => {
      sec.classList.remove("active");
    });
    const activeSec = document.getElementById(`view-${viewId}`);
    if (activeSec) activeSec.classList.add("active");

    // Update sidebar nav item active state
    document.querySelectorAll(".nav-item").forEach(item => {
      const target = item.getAttribute("data-nav-target");
      if (target === viewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update topbar header text
    this.updateTopbarTitle(viewId);

    // Update URL hash
    if (updateHash) {
      window.location.hash = viewId;
    }

    // Trigger view-specific re-renders (e.g. canvas charts)
    window.dispatchEvent(new CustomEvent("nutriai:viewchange", { detail: { view: viewId } }));

    // Scroll main content to top
    const mainContent = document.querySelector(".main-content") || document.body;
    mainContent.scrollTo({ top: 0, behavior: "smooth" });
  },

  updateTopbarTitle(viewId) {
    const titles = {
      "login": { title: "NutriAI Wellness Platform", sub: "Clinical AI Nutrition & Precision Metabolic Engine", docTitle: "NutriAI — Clinical AI Nutrition Platform" },
      "dashboard": { title: "Daily Dashboard", sub: "Welcome back, track your nutritional progress", docTitle: "NutriAI — Daily Dashboard" },
      "profile": { title: "Health Profile & Biometrics", sub: "Metabolic rate, body composition, and goal targets", docTitle: "NutriAI — Health Profile & Biometrics" },
      "mealplan": { title: "7-Day Meal Plan", sub: "Personalized nutrient-dense meals & smart grocery list", docTitle: "NutriAI — 7-Day Meal Plan" },
      "nutrition": { title: "Nutrition & Food Tracker", sub: "Macronutrient breakdown, calorie budget, and food log", docTitle: "NutriAI — Nutrition Tracker" },
      "wellness": { title: "Wellness & Habit Streaks", sub: "Hydration, sleep, weight milestones, and daily routines", docTitle: "NutriAI — Wellness & Habits" },
      "biomarkers": { title: "Biomarkers & Laboratory Panels", sub: "Cardiometabolic, lipid, and micronutrient lab tracking [Preview]", docTitle: "NutriAI — Biomarkers" },
      "genetics": { title: "Nutrigenomic Insights", sub: "Genetic metabolic traits and personalized dietary responses [Preview]", docTitle: "NutriAI — Genetics" },
      "ai-insights": { title: "NutriAI Smart Recommendations", sub: "Evidence-grounded meal timing & macro optimization [Preview]", docTitle: "NutriAI — AI Recommendations" },
      "ai-chat": { title: "AI Nutritionist Assistant", sub: "Interactive dietary intelligence grounded in your biometrics & food log", docTitle: "NutriAI — AI Nutritionist" },
      "reports": { title: "Metabolic Health Reports", sub: "Weekly nutrient analytics and executive summaries", docTitle: "NutriAI — Health Reports" },
      "specialists": { title: "Specialist & Dietitian Network", sub: "Connect with board-certified sports dietitians and coaches [Preview]", docTitle: "NutriAI — Specialist Network" },
      "settings": { title: "Settings & Preferences", sub: "App preferences, measurement units, AI keys, and cloud sync", docTitle: "NutriAI — Settings" }
    };

    const info = titles[viewId] || titles["login"];
    const titleEl = document.getElementById("topbarTitle");
    const subEl = document.getElementById("topbarSubtitle");

    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.sub;
    if (info.docTitle) {
      document.title = info.docTitle;
    }
  }
};
