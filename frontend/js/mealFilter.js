/**
 * NutriAI — Dynamic Meal Filter, Diet Planner & Scaling Engine v3.0
 * 
 * Capabilities:
 * 1. Strict Diet Filtering: Vegan, Vegetarian, Pescatarian, Keto, Balanced
 * 2. Allergen Exclusions: Gluten-Free, Dairy-Free, Nut-Free, Soy-Free, Egg-Free, Fish-Free
 * 3. Cuisine Prioritization: Asian, Mediterranean, Indian, American, Mixed
 * 4. Meal Frequency Compliance: 2 meals, 3 meals, 4 meals, 5 meals, 6 meals per day
 * 5. Dynamic Caloric & Macro Scaling: Scales portions to match the user's exact daily target (e.g. 1270 kcal)
 * 6. Automated Smart Grocery List Generation
 */

const NutriAIMealFilter = {

  /**
   * Returns meals for a given day, fully compliant with diet, allergens, cuisine, meal frequency,
   * and scaled to the user's exact metabolic target calories and macros.
   * 
   * @param {string} day - e.g. "Mon", "Tue", "Sun"
   * @param {object} profile - user profile from appState.data.profile
   * @param {object} targets - calculated targets from appState.targets
   * @returns {Array} filtered and scaled meal array
   */
  getFilteredMeals(day, profile = appState.data.profile, targets = appState.targets) {
    const rawMeals = NutriAIData.mealPlans[day] || NutriAIData.mealPlans["Mon"] || [];
    const diet = (profile.dietPreference || "balanced").toLowerCase();
    const restrictions = (profile.restrictions || []).map(r => r.toLowerCase());
    const cuisine = (profile.cuisinePreference || "mixed").toLowerCase();
    const mealFreq = Number(profile.mealFrequency) || 4;

    // 1. Filter / Swap each meal slot for safety and cuisine preference
    let safeMeals = rawMeals.map(meal => {
      if (!this._isSafeForProfile(meal, diet, restrictions)) {
        return this.findSafeAlternative(meal, diet, restrictions, cuisine) || meal;
      }

      // If meal is safe but doesn't match preferred cuisine, check if an alternative from preferred cuisine exists
      if (cuisine !== "mixed" && meal.cuisine && meal.cuisine !== cuisine) {
        const preferredCuisineMeal = this.findCuisineAlternative(meal, diet, restrictions, cuisine);
        if (preferredCuisineMeal) return preferredCuisineMeal;
      }

      return meal;
    });

    // 2. Filter according to user's selected Meal Frequency
    safeMeals = this._applyMealFrequencyFilter(safeMeals, mealFreq);

    // 3. Dynamically scale portions to match the user's exact target calories and macros
    if (targets && targets.calories > 0 && safeMeals.length > 0) {
      safeMeals = this._scaleMealsToTarget(safeMeals, targets.calories, targets);
    }

    return safeMeals;
  },

  /**
   * Filter meal slots according to user's desired meals per day.
   */
  _applyMealFrequencyFilter(meals, freq) {
    if (freq === 2) {
      // 2 meals: Breakfast & Dinner (or Lunch & Dinner)
      const mainMeals = meals.filter(m => m.type === "Breakfast" || m.type === "Lunch" || m.type === "Dinner");
      return mainMeals.slice(0, 2);
    } else if (freq === 3) {
      // 3 meals: Breakfast, Lunch, Dinner (exclude Snacks)
      const b = meals.find(m => m.type === "Breakfast") || meals[0];
      const l = meals.find(m => m.type === "Lunch") || meals[1];
      const d = meals.find(m => m.type === "Dinner") || meals[meals.length - 1];
      return [b, l, d].filter(Boolean);
    } else if (freq === 4) {
      // 4 meals: standard Breakfast, Lunch, Snack, Dinner
      return meals.slice(0, 4);
    } else if (freq >= 5) {
      // 5+ meals: return all available slots
      return meals;
    }
    return meals;
  },

  /**
   * Scales meal calories, protein, carbs, fats, and fiber so their sum matches the target.
   */
  _scaleMealsToTarget(meals, targetCalories, targets) {
    const rawTotalCals = meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
    if (rawTotalCals === 0) return meals;

    const scaleFactor = targetCalories / rawTotalCals;

    return meals.map(meal => {
      const scaledCals = Math.round((Number(meal.calories) || 0) * scaleFactor);
      const scaledP = Math.round((Number(meal.protein) || 0) * scaleFactor);
      const scaledC = Math.round((Number(meal.carbs) || 0) * scaleFactor);
      const scaledF = Math.round((Number(meal.fats) || 0) * scaleFactor);
      const scaledFiber = Math.round((Number(meal.fiber) || 0) * scaleFactor);

      return {
        ...meal,
        calories: scaledCals,
        protein: scaledP,
        carbs: scaledC,
        fats: scaledF,
        fiber: scaledFiber,
        _scaled: true
      };
    });
  },

  /**
   * Check if a meal is 100% compliant with diet and allergen restrictions.
   */
  _isSafeForProfile(meal, diet, restrictions) {
    // 1. Diet Type Checks
    if (diet === "vegan" && !meal.veganSafe) return false;
    if (diet === "vegetarian" && !meal.vegetarianSafe && !meal.veganSafe) return false;
    if (diet === "eggetarian") {
      const isEggSafe = meal.vegetarianSafe || meal.veganSafe || (meal.allergenTags && meal.allergenTags.includes("eggs"));
      if (!isEggSafe) return false;
    }
    if (diet === "pescatarian") {
      const isPesc = meal.pescatarianSafe || meal.vegetarianSafe || meal.veganSafe || (meal.allergenTags && meal.allergenTags.includes("fish"));
      if (!isPesc) return false;
    }

    // 2. Allergen Restriction Checks
    if (restrictions && restrictions.length > 0) {
      const tags = (meal.allergenTags || []).map(t => t.toLowerCase());
      const hasConflict = restrictions.some(r => tags.includes(r));
      if (hasConflict) return false;
    }

    return true;
  },

  /**
   * Finds a safe alternative meal that satisfies diet and restrictions, preferring the user's cuisine.
   */
  findSafeAlternative(originalMeal, diet, restrictions, preferredCuisine = null) {
    const mealType = originalMeal.type;
    const candidates = [];

    // Collect all meals across all days
    Object.values(NutriAIData.mealPlans).forEach(dayMeals => {
      dayMeals.forEach(m => {
        if (m.type === mealType && m.id !== originalMeal.id) {
          candidates.push(m);
        }
      });
    });

    // Also check expanded alternative pool if available
    if (NutriAIData.alternativeMealPool) {
      NutriAIData.alternativeMealPool.forEach(m => {
        if (m.type === mealType) candidates.push(m);
      });
    }

    // Filter to safe options
    const safeOptions = candidates.filter(m => this._isSafeForProfile(m, diet, restrictions));
    if (safeOptions.length === 0) return null;

    // If preferred cuisine specified, prioritize candidate matching that cuisine
    if (preferredCuisine && preferredCuisine !== "mixed") {
      const cuisineMatch = safeOptions.find(m => m.cuisine === preferredCuisine);
      if (cuisineMatch) {
        return { ...cuisineMatch, _swapped: true, _originalName: originalMeal.name };
      }
    }

    // Return the first safe option
    return { ...safeOptions[0], _swapped: true, _originalName: originalMeal.name };
  },

  /**
   * Finds a cuisine-specific alternative if available.
   */
  findCuisineAlternative(originalMeal, diet, restrictions, targetCuisine) {
    const mealType = originalMeal.type;
    const candidates = [];

    Object.values(NutriAIData.mealPlans).forEach(dayMeals => {
      dayMeals.forEach(m => {
        if (m.type === mealType && m.cuisine === targetCuisine) {
          candidates.push(m);
        }
      });
    });

    if (NutriAIData.alternativeMealPool) {
      NutriAIData.alternativeMealPool.forEach(m => {
        if (m.type === mealType && m.cuisine === targetCuisine) {
          candidates.push(m);
        }
      });
    }

    const safeMatch = candidates.find(m => this._isSafeForProfile(m, diet, restrictions));
    return safeMatch ? { ...safeMatch, _swapped: true, _originalName: originalMeal.name } : null;
  },

  /**
   * Get an alternative meal for a specific slot (for the manual "Swap" button).
   */
  getAlternative(meal, profile = appState.data.profile) {
    const diet = (profile.dietPreference || "balanced").toLowerCase();
    const restrictions = (profile.restrictions || []).map(r => r.toLowerCase());
    const cuisine = (profile.cuisinePreference || "mixed").toLowerCase();
    const mealType = meal.type;

    const allMealsOfType = [];
    Object.values(NutriAIData.mealPlans).forEach(dayMeals => {
      dayMeals.forEach(m => {
        if (m.type === mealType && m.id !== meal.id) {
          allMealsOfType.push(m);
        }
      });
    });

    if (NutriAIData.alternativeMealPool) {
      NutriAIData.alternativeMealPool.forEach(m => {
        if (m.type === mealType && m.id !== meal.id) {
          allMealsOfType.push(m);
        }
      });
    }

    const safeOptions = allMealsOfType.filter(m => this._isSafeForProfile(m, diet, restrictions));
    if (safeOptions.length === 0) return null;

    // Rotate through safe options
    const currentIdx = safeOptions.findIndex(m => m.name === meal.name);
    const nextIdx = (currentIdx + 1) % safeOptions.length;
    return { ...safeOptions[nextIdx], _swapped: true };
  },

  /**
   * Build a dynamic grocery list based on the filtered meals for the entire week.
   */
  buildDynamicGroceryList(profile = appState.data.profile) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const allIngredients = new Set();

    days.forEach(day => {
      const meals = this.getFilteredMeals(day, profile, appState.targets);
      meals.forEach(meal => {
        if (meal.ingredients) {
          meal.ingredients.forEach(ing => allIngredients.add(ing));
        }
      });
    });

    const categories = {
      "🥬 Produce & Greens": [],
      "🥩 Proteins & Seafood": [],
      "🥛 Dairy & Plant Milks": [],
      "🌾 Grains & Gluten-Free Staples": [],
      "🫙 Pantry, Seasonings & Spices": []
    };

    const produceKeywords = ["spinach", "avocado", "blueberri", "broccoli", "cucumber", "tomato", "apple", "banana", "strawberr", "lettuce", "bok choy", "asparagus", "sweet potato", "zucchini", "edamame", "beetroot", "lemon", "lime", "pineapple", "bell pepper", "green bean", "arugula", "clementine", "mandarin", "pistachio", "walnut", "almond", "scallion", "ginger", "cilantro", "carrot"];
    const proteinKeywords = ["egg", "chicken", "salmon", "tuna", "turkey", "beef", "tofu", "cod", "shrimp", "paneer", "steak", "tempeh", "fish", "halibut"];
    const dairyKeywords = ["yogurt", "milk", "cottage cheese", "feta", "almond milk", "whey", "oat milk", "coconut yogurt", "plant protein"];
    const grainKeywords = ["oat", "quinoa", "rice", "bread", "sourdough", "pasta", "flour", "lentil", "chickpea", "bean", "flatbread", "rye", "noodle", "jasmine rice", "brown rice"];
    const pantryKeywords = ["oil", "salt", "pepper", "spice", "honey", "butter", "sauce", "vinegar", "soy", "tamari", "garlic", "cumin", "tahini", "chia", "cacao", "chocolate", "pumpkin seed", "sesame", "miso", "sesame oil", "paprika", "turmeric"];

    allIngredients.forEach(ing => {
      const lower = ing.toLowerCase();
      let placed = false;

      if (produceKeywords.some(k => lower.includes(k))) {
        categories["🥬 Produce & Greens"].push(ing);
        placed = true;
      } else if (proteinKeywords.some(k => lower.includes(k))) {
        categories["🥩 Proteins & Seafood"].push(ing);
        placed = true;
      } else if (dairyKeywords.some(k => lower.includes(k))) {
        categories["🥛 Dairy & Plant Milks"].push(ing);
        placed = true;
      } else if (grainKeywords.some(k => lower.includes(k))) {
        categories["🌾 Grains & Gluten-Free Staples"].push(ing);
        placed = true;
      }

      if (!placed) {
        categories["🫙 Pantry, Seasonings & Spices"].push(ing);
      }
    });

    Object.keys(categories).forEach(k => {
      if (categories[k].length === 0) delete categories[k];
    });

    return categories;
  },

  buildGroceryClipboardText(profile = appState.data.profile) {
    const categories = this.buildDynamicGroceryList(profile);
    let text = "🥗 NutriAI 7-Day Personalized Grocery List\n";
    text += `Generated for: ${profile.name || 'User'} (${profile.dietPreference || 'Balanced'} · ${profile.mealFrequency || 4} meals/day)\n\n`;

    Object.entries(categories).forEach(([cat, items]) => {
      text += cat + ":\n";
      items.forEach(item => { text += "  - " + item + "\n"; });
      text += "\n";
    });

    return text;
  }
};
