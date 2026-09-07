/**
 * NutriAI — Navigation & View Routing
 * Single-Page navigation, hash history, mobile drawer, active states
 */

const NutriAINav = {
  activeView: "home",

  init() {
    this.bindEvents();
    // Handle initial URL hash
    const isAuth = typeof appState !== "undefined" && Boolean(appState.data && appState.data.isLoggedIn && appState.data.profile);
    const initialRaw = window.location.hash.replace("#", "").replace("/", "").trim();
    let initialHash = initialRaw || (isAuth ? "dashboard" : "home");
    if (!isAuth && initialHash !== "login" && initialHash !== "home") {
      initialHash = "home";
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
        sidebar.classList.toggle("open");
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
      this.navigateTo(hash || "home", false);
    });
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (sidebar) sidebar.classList.remove("open");
    if (backdrop) backdrop.classList.remove("active");
  },

  navigateTo(viewId, updateHash = true) {
    const isAuth = typeof appState !== "undefined" && Boolean(appState.data && appState.data.isLoggedIn && appState.data.profile);
    const protectedViews = [
      "dashboard", "profile", "mealplan", "nutrition", "wellness",
      "biomarkers", "genetics", "ai-insights", "ai-chat", "reports",
      "specialists", "settings", "meals", "business"
    ];

    if (!isAuth) {
      // Unauthenticated users can view home and login
      if (protectedViews.includes(viewId) || !viewId) {
        viewId = "home";
        if (updateHash) {
          history.replaceState(null, "", "#home");
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
      viewId = isAuth ? "dashboard" : "home";
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
      if (target === viewId || (viewId === "dashboard" && target === "home")) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Toggle Back to Home button vs Guest Actions on Topbar
    const backBtn = document.getElementById("topbarBackHomeBtn");
    const guestBtns = document.getElementById("topbarGuestActions");
    if (backBtn) {
      if (viewId === "login") {
        backBtn.style.display = "inline-flex";
        if (guestBtns) guestBtns.style.display = "none";
      } else {
        backBtn.style.display = "none";
        if (guestBtns && !isAuth) guestBtns.style.display = "flex";
      }
    }

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
      "home":       { title: "NutriAI Wellness Platform", sub: "Healthy Campuses. Healthier Generation.", docTitle: "NutriAI — Good Food. Brighter You." },
      "login":      { title: "NutriAI Wellness Platform", sub: "Healthy Campuses. Healthier Generation.", docTitle: "NutriAI — Sign In" },
      "dashboard":  { title: "NutriAI Wellness Platform", sub: "Healthy Campuses. Healthier Generation.", docTitle: "NutriAI — Dashboard" },
      "profile":    { title: "Health Profile", sub: "Your biometrics, goals & targets", docTitle: "NutriAI — Health Profile" },
      "mealplan":   { title: "7-Day Meal Plan", sub: "Personalized meals for your goals", docTitle: "NutriAI — Meal Plan" },
      "nutrition":  { title: "Nutrition Tracker", sub: "Macronutrients, calories & food log", docTitle: "NutriAI — Nutrition" },
      "wellness":   { title: "Wellness & Progress", sub: "Hydration, weight & streaks", docTitle: "NutriAI — Wellness" },
      "biomarkers": { title: "Biomarkers & Labs", sub: "Lab tracking preview [Demo]", docTitle: "NutriAI — Biomarkers" },
      "genetics":   { title: "Genetic Insights", sub: "Nutrigenomic preview [Demo]", docTitle: "NutriAI — Genetics" },
      "ai-insights":{ title: "AI Recommendations", sub: "Smart meal & macro insights", docTitle: "NutriAI — AI Insights" },
      "ai-chat":    { title: "AI Nutritionist", sub: "Powered by Google Gemini", docTitle: "NutriAI — AI Nutritionist" },
      "reports":    { title: "Insights & Reports", sub: "Weekly nutrition analytics", docTitle: "NutriAI — Reports" },
      "specialists":{ title: "Specialist Network", sub: "Dietitians & wellness coaches", docTitle: "NutriAI — Specialists" },
      "settings":   { title: "Settings", sub: "Account, AI & preferences", docTitle: "NutriAI — Settings" },
      "meals":      { title: "Meals Near You", sub: "Campus mess & canteen discovery", docTitle: "NutriAI — Meals Near You" },
      "business":   { title: "For Business", sub: "Mess & canteen partner hub", docTitle: "NutriAI — Business" }
    };

    const info = titles[viewId] || titles["home"];
    const titleEl = document.getElementById("topbarTitle");
    const subEl = document.getElementById("topbarSubtitle");

    if (titleEl) titleEl.textContent = info.title;
    if (subEl) subEl.textContent = info.sub;
    if (info.docTitle) {
      document.title = info.docTitle;
    }
  }
};
