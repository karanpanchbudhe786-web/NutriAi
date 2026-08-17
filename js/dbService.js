/**
 * NutriAI — Cloud Database Synchronization Service
 * Manages bi-directional sync between local state and Supabase PostgreSQL.
 */

const NutriAIDbService = {

  /**
   * Syncs current local state up to Supabase cloud tables.
   */
  async syncToCloud() {
    if (!NutriAIAuthService.supabaseClient) return;

    try {
      const { data: { user } } = await NutriAIAuthService.supabaseClient.auth.getUser();
      if (!user) return;

      const profilePayload = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
        profile_data: appState.data.profile,
        targets: appState.targets,
        today_food_logs: appState.data.todayFoodLogs,
        weight_history: appState.data.weightHistory,
        water_logged: appState.data.waterLogged,
        checked_meals: appState.data.checkedMeals
      };

      await NutriAIAuthService.supabaseClient
        .from("user_health_state")
        .upsert(profilePayload, { onConflict: "user_id" });

    } catch (e) {
      console.warn("Cloud sync to Supabase failed:", e);
    }
  },

  /**
   * Fetches latest user state from Supabase and hydrates local appState.
   */
  async syncFromCloud() {
    if (!NutriAIAuthService.supabaseClient) return;

    try {
      const { data: { user } } = await NutriAIAuthService.supabaseClient.auth.getUser();
      if (!user) return;

      const { data, error } = await NutriAIAuthService.supabaseClient
        .from("user_health_state")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        if (data.profile_data) appState.data.profile = { ...appState.data.profile, ...data.profile_data };
        if (data.today_food_logs) appState.data.todayFoodLogs = data.today_food_logs;
        if (data.weight_history) appState.data.weightHistory = data.weight_history;
        if (data.water_logged !== undefined) appState.data.waterLogged = data.water_logged;
        if (data.checked_meals) appState.data.checkedMeals = data.checked_meals;

        appState.recalculateTargets();
        appState.saveState();
      }
    } catch (e) {
      console.warn("Cloud sync from Supabase failed:", e);
    }
  }
};
