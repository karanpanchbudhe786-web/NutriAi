/**
 * NutriAI — REST API Client & Server Sync Engine v4.0
 * Connects to http://localhost:5000/api with health detection and seamless local fallback.
 */

const NutriAIApiClient = {
  API_BASE_URL_KEY: "nutriai_api_base_url",
  DEFAULT_CLOUD_URL: "https://nutriai-backend-y91i.onrender.com/api",
  DEFAULT_LOCAL_URL: "http://localhost:5000/api",
  TOKEN_KEY: "nutriai_jwt_token_v4",
  isServerOnline: false,

  getBaseUrl() {
    try {
      const custom = localStorage.getItem(this.API_BASE_URL_KEY);
      return custom ? custom.trim().replace(/\/+$/, "") : this.DEFAULT_CLOUD_URL;
    } catch {
      return this.DEFAULT_CLOUD_URL;
    }
  },

  setBaseUrl(url) {
    try {
      if (url && url.trim()) {
        localStorage.setItem(this.API_BASE_URL_KEY, url.trim().replace(/\/+$/, ""));
      } else {
        localStorage.removeItem(this.API_BASE_URL_KEY);
      }
    } catch (e) {
      console.warn("Could not save API base URL:", e);
    }
  },

  /**
   * Probes backend health check endpoint
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.getBaseUrl()}/health`, { 
        method: "GET", 
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        this.isServerOnline = true;
        return true;
      }
    } catch (e) {
      this.isServerOnline = false;
    }
    return false;
  },

  getToken() {
    try {
      return localStorage.getItem(this.TOKEN_KEY) || "";
    } catch {
      return "";
    }
  },

  setToken(token) {
    try {
      if (token) {
        localStorage.setItem(this.TOKEN_KEY, token);
      } else {
        localStorage.removeItem(this.TOKEN_KEY);
      }
    } catch (e) {
      console.warn("Could not set token in localStorage:", e);
    }
  },

  /**
   * Generic JSON request wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const token = this.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Server request failed with status ${res.status}`);
    }
    return data;
  },

  // --- Auth Endpoints ---
  async register(wizardData) {
    const res = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(wizardData)
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async login(email, password) {
    const res = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (res.token) this.setToken(res.token);
    return res;
  },

  async getMe() {
    return await this.request("/auth/me", { method: "GET" });
  },

  // --- Profile Endpoints ---
  async getProfile() {
    return await this.request("/profile", { method: "GET" });
  },

  async updateProfile(profileData) {
    return await this.request("/profile", {
      method: "PUT",
      body: JSON.stringify(profileData)
    });
  },

  // --- Tracking Endpoints ---
  async getTrackingState() {
    return await this.request("/tracking/state", { method: "GET" });
  },

  async toggleMeal(mealData) {
    return await this.request("/tracking/meal/toggle", {
      method: "POST",
      body: JSON.stringify(mealData)
    });
  },

  async logFood(foodItem) {
    return await this.request("/tracking/food/log", {
      method: "POST",
      body: JSON.stringify(foodItem)
    });
  },

  async deleteFoodLog(logId) {
    return await this.request(`/tracking/food/log/${logId}`, {
      method: "DELETE"
    });
  },

  async updateWater(amount, reset = false) {
    return await this.request("/tracking/water", {
      method: "POST",
      body: JSON.stringify({ amount, reset })
    });
  },

  async logWeight(weight, note = "") {
    return await this.request("/tracking/weight", {
      method: "POST",
      body: JSON.stringify({ weight, note })
    });
  },

  // --- AI Endpoints ---
  async chatWithAI(message, chatHistory, nutritionState, profile) {
    return await this.request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, chatHistory, nutritionState, profile })
    });
  },

  async scanFoodPhoto(userNote) {
    return await this.request("/ai/scan-food", {
      method: "POST",
      body: JSON.stringify({ userNote })
    });
  }
};

window.NutriAIApiClient = NutriAIApiClient;
