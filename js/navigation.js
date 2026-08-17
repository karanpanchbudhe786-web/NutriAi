/**
 * NutriAI — Navigation & View Routing
 * Single-Page navigation, hash history, mobile drawer, active states
 */

const NutriAINav = {
  activeView: "dashboard",

  init() {
    this.bindEvents();
    // Handle initial URL hash
    const initialHash = window.location.hash.replace("#", "") || "dashboard";
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
      const hash = window.location.hash.replace("#", "") || "dashboard";
      this.navigateTo(hash, false);
    });
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.remove("active");
  },

  navigateTo(viewId, updateHash = true) {
    const targetSection = document.getElementById(`view-${viewId}`);
    if (!targetSection) {
      // Invalid hash — fall back and correct the URL
      viewId = "dashboard";
      if (updateHash) {
        history.replaceState(null, "", "#dashboard");
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
      "dashboard": { title: "Daily Dashboard", sub: "Welcome back, track your nutritional progress" },
      "profile": { title: "Health Profile & Biometrics", sub: "Metabolic rate, body composition, and goal targets" },
      "mealplan": { title: "7-Day Meal Plan", sub: "Personalized nutrient-dense meals & smart grocery list" },
      "nutrition": { title: "Nutrition & Food Tracker", sub: "Macronutrient breakdown, calorie budget, and food log" },
      "wellness": { title: "Wellness & Habit Streaks", sub: "Hydration, sleep, weight milestones, and daily routines" },
      "biomarkers": { title: "Biomarkers & Laboratory Panels", sub: "Cardiometabolic, lipid, and micronutrient lab tracking [Preview]" },
      "genetics": { title: "Nutrigenomic Insights", sub: "Genetic metabolic traits and personalized dietary responses [Preview]" },
      "ai-insights": { title: "NutriAI Smart Recommendations", sub: "Evidence-grounded meal timing & macro optimization [Preview]" },
      "ai-chat": { title: "AI Nutritionist Assistant", sub: "Interactive dietary intelligence grounded in your biometrics & food log" },
      "reports": { title: "Metabolic Health Reports", sub: "Weekly nutrient analytics and executive summaries" },
      "specialists": { title: "Specialist & Dietitian Network", sub: "Connect with board-certified sports dietitians and coaches [Preview]" },
      "settings": { title: "Settings & Preferences", sub: "App preferences, measurement units, AI keys, and cloud sync" }
    };

    const info = titles[viewId] || titles["dashboard"];
    const titleEl = document.getElementById("topbarTitle");
    const subEl = document.getElementById("topbarSubtitle");

    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.sub;
  }
};
