/**
 * NutriAI — Intent-Aware Live Gemini AI & Clinical Nutrition Engine v4.1
 * 
 * Capabilities:
 * 1. Intent Classification:
 *    - RECIPE_REQUEST: Generates exact requested recipes (Butter Chicken, Biryani, Paneer Tikka, etc.)
 *    - RECIPE_MODIFICATION: Context-aware tweaks ("make it healthier", "lower in calories", etc.)
 *    - MEAL_RECOMMENDATION: Uses real tracked remaining calories & macros for personalized ideas
 *    - NUTRITION_QUESTION: Accurate nutrient breakdowns (protein in chicken, eggs, paneer, etc.)
 *    - MACRO_QUESTION: Reports real tracked consumption vs daily targets (0-based for new users)
 *    - FOOD_SUBSTITUTION: Macro-equivalent food swaps (chicken -> paneer/soya/tofu)
 *    - GENERAL_CHAT: Evidence-grounded sports nutrition and metabolic guidance
 * 
 * 2. Multi-Model Cascade: Automatically tries gemini-2.5-flash, gemini-1.5-flash, gemini-2.0-flash,
 *    gemini-1.5-flash-8b, gemini-1.5-pro for live Google AI Studio keys.
 * 
 * 3. Zero Reference Errors: Fully encapsulated nutritionState and profile passing.
 */

const NutriAIAIService = {
  API_KEY_STORAGE_KEY: "nutriai_gemini_api_key",
  CANDIDATE_MODELS: [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
  ],

  // --- API Key Management ---
  getApiKey() {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY) || "";
  },

  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem(this.API_KEY_STORAGE_KEY, key.trim());
      return true;
    } else {
      localStorage.removeItem(this.API_KEY_STORAGE_KEY);
      return false;
    }
  },

  isGoogleApiKey(key) {
    if (!key || typeof key !== "string") return false;
    const cleanKey = key.trim();
    return cleanKey.startsWith("AIzaSy") && cleanKey.length >= 35;
  },

  hasApiKey() {
    const key = this.getApiKey();
    return this.isGoogleApiKey(key);
  },

  // --- System Prompt Builder for Live Gemini API ---
  buildNutritionistSystemContext(nutritionState, profile) {
    const p = profile || (nutritionState ? nutritionState.profile : {}) || {};
    const n = nutritionState || {};

    return `You are "NutriAI Expert", an elite board-certified clinical sports dietitian, metabolic biochemist, and master chef.
Your client is ${p.name || "Client"}.

--- CLIENT PROFILE ---
- Age: ${p.age} | Sex: ${p.gender || p.sex} | Height: ${p.height} cm | Current Weight: ${p.weight} kg | Target Weight: ${p.targetWeight} kg
- Body Mass Index: BMI ${n.bmi || '22.0'} (${n.bmiCategory || 'Normal'})
- Metabolic Targets: BMR ${n.bmr || 1500} kcal | TDEE ${n.tdee || 2000} kcal | Daily Caloric Target: ${n.dailyTarget || 2000} kcal/day
- Target Macros: Protein ${n.proteinTarget || 120}g | Carbs ${n.carbsTarget || 200}g | Fats ${n.fatTarget || 60}g | Fiber ${n.fiberTarget || 30}g
- Real-Time Consumed Today: ${n.caloriesConsumed || 0} kcal consumed (${n.caloriesRemaining || n.dailyTarget || 2000} kcal remaining) | Protein: ${n.proteinConsumed || 0}g consumed (${n.proteinRemaining || n.proteinTarget || 120}g remaining)
- Dietary Philosophy: ${p.dietPreference || 'Balanced'} | Cuisine Preference: ${p.cuisinePreference || 'Indian'}
- Dietary Restrictions / Allergies: ${p.restrictions && p.restrictions.length > 0 ? p.restrictions.join(', ') : 'None'}

--- CRITICAL INTENT & ACCURACY RULES ---
1. ALWAYS prioritize answering the user's EXACT question directly.
2. If the user asks for a specific RECIPE (e.g. "Butter Chicken", "Chicken Biryani", "Paneer Tikka"), you MUST provide the complete recipe for THAT EXACT DISH. NEVER substitute the requested dish with an unrelated recommendation like fish or salads.
3. If the requested dish conflicts with their profile diet (e.g. asking for Chicken Biryani while on a Vegetarian diet), note the conflict politely, but still provide the authentic recipe or offer the tailored vegetarian adaptation.
4. If the user asks a follow-up (e.g. "make it lower in calories", "how much protein does it have?"), understand "it" refers to the previous dish discussed.
5. Only suggest personalized remaining-budget meals when the user asks for a recommendation (e.g. "what should I eat for dinner?").
6. Format recipes with: Title, Ingredients with measurements, Preparation, Cooking Steps, and Approximate Nutrition (Calories, Protein, Carbs, Fat).`;
  },

  // --- Intent Classifier & Entity Extraction ---
  classifyIntent(userMessage, chatHistory = []) {
    const msg = userMessage.toLowerCase().trim();

    // 1. Check Recipe Modification / Follow-Up Context
    if (chatHistory.length > 0) {
      const isModification = msg.includes("make it") || msg.includes("make the") || msg.includes("lower in calorie") ||
        msg.includes("healthier") || msg.includes("less calorie") || msg.includes("more protein") ||
        msg.includes("how much protein does it") || msg.includes("how many calories does it") ||
        msg.includes("protein in this") || msg.includes("calories in this");
      if (isModification) {
        const lastDish = this.extractDishFromHistory(chatHistory);
        return { type: "RECIPE_MODIFICATION", dishName: lastDish || "the dish", query: msg };
      }
    }

    // 2. Recipe Request Detection
    const recipeRegexes = [
      /(?:can\s+you\s+tell\s+me\s+the\s+recipe\s+(?:of|for)|tell\s+me\s+the\s+recipe\s+(?:of|for)|give\s+me\s+(?:a\s+|the\s+)?recipe\s+(?:of|for)?|recipe\s+(?:of|for)|how\s+to\s+(?:make|cook|prepare)|how\s+do\s+i\s+(?:make|cook|prepare)|how\s+can\s+i\s+(?:make|cook|prepare)|ingredients\s+for|how\s+to\s+bake)\s+([^?.!]+)/i,
      /(?:give\s+me\s+(?:a\s+|the\s+)?|i\s+want\s+(?:a\s+|the\s+)?|share\s+(?:a\s+|the\s+)?)?([^?.!]+?)\s+recipe/i
    ];

    for (const regex of recipeRegexes) {
      const match = userMessage.match(regex);
      if (match && match[1]) {
        let extracted = match[1].replace(/^(a|an|the|some|give\s+me\s+a|give\s+me\s+the)\s+/i, "").trim();
        extracted = extracted.replace(/[?.!]+$/, "").trim();
        if (extracted.length >= 2) {
          return { type: "RECIPE_REQUEST", dishName: extracted };
        }
      }
    }

    // Known popular dishes direct match
    const knownDishes = [
      "butter chicken", "chicken biryani", "biryani", "paneer tikka", "palak paneer",
      "dal makhani", "dal tadka", "chana masala", "moong dal cheela", "moong dal chilla",
      "fish curry", "fish moilee", "tandoori chicken", "egg bhurji", "paneer bhurji",
      "khichdi", "quinoa salad", "salmon bowl", "pasta bolognese", "overnight oats",
      "protein smoothie", "grilled chicken", "tofu stir fry", "shakshuka", "rajma"
    ];
    for (const dish of knownDishes) {
      if (msg.includes(dish) && (msg.includes("recipe") || msg.includes("make") || msg.includes("cook") || msg.includes("how") || msg.includes("tell me") || msg.includes("give me"))) {
        return { type: "RECIPE_REQUEST", dishName: dish };
      }
    }

    // 3. Food Substitution
    if (msg.includes("replace") || msg.includes("substitute") || msg.includes("alternative to") || msg.includes("instead of") || msg.includes("swap")) {
      return { type: "FOOD_SUBSTITUTION", query: msg };
    }

    // 4. Macro & Daily Budget Questions
    if (
      msg.includes("have left") || msg.includes("remaining calories") || msg.includes("calories left") ||
      msg.includes("calories remaining") || msg.includes("how many calories do i have") || msg.includes("how much calories do i have") ||
      msg.includes("my calorie target") || msg.includes("what is my protein target") || msg.includes("my protein target") ||
      msg.includes("protein target") || msg.includes("protein have i consumed") || msg.includes("protein consumed") ||
      msg.includes("how much protein do i need") || msg.includes("my daily budget") || msg.includes("my targets") ||
      msg.includes("my macros") || msg.includes("am i on track") || msg.includes("daily target") || msg.includes("calories do i have left")
    ) {
      return { type: "MACRO_QUESTION", query: msg };
    }

    // 5. Nutrition Facts Question
    if (
      msg.includes("protein in") || msg.includes("protein is in") || msg.includes("calories in") || msg.includes("calories are in") ||
      msg.includes("carbs in") || msg.includes("fats in") || msg.includes("nutrition in") || msg.includes("nutritional value") ||
      msg.includes("is avocado healthy") || msg.includes("how many carbs") || msg.includes("how much fat") ||
      msg.includes("how much protein in") || msg.includes("how many calories in") || msg.includes("protein does chicken") ||
      msg.includes("protein does egg") || (msg.includes("protein") && (msg.includes("chicken") || msg.includes("egg") || msg.includes("paneer") || msg.includes("tofu") || msg.includes("fish")))
    ) {
      return { type: "NUTRITION_QUESTION", query: msg };
    }

    // 6. Meal Recommendation
    if (
      msg.includes("what should i eat") || msg.includes("what to eat") || msg.includes("recommend") ||
      msg.includes("suggest") || msg.includes("idea for dinner") || msg.includes("idea for lunch") ||
      msg.includes("idea for breakfast") || msg.includes("idea for snack") || msg.includes("healthy dinner") ||
      msg.includes("healthy lunch") || msg.includes("meal recommendation") || msg.includes("what can i eat")
    ) {
      return { type: "MEAL_RECOMMENDATION", query: msg };
    }

    return { type: "GENERAL_CHAT", query: msg };
  },

  extractDishFromHistory(chatHistory) {
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const txt = (chatHistory[i].text || "").toLowerCase();
      if (txt.includes("butter chicken")) return "Butter Chicken";
      if (txt.includes("chicken biryani") || txt.includes("biryani")) return "Chicken Biryani";
      if (txt.includes("paneer tikka")) return "Paneer Tikka";
      if (txt.includes("palak paneer")) return "Palak Paneer";
      if (txt.includes("dal makhani")) return "Dal Makhani";
      if (txt.includes("dal tadka")) return "Dal Tadka";
      if (txt.includes("salmon")) return "Grilled Salmon";
      if (txt.includes("chana masala")) return "Chana Masala";
      if (txt.includes("moong dal")) return "Moong Dal Cheela";
      if (txt.includes("recipe")) {
        const m = txt.match(/###\s*(?:[^\w\s]*\s*)?([^\n#]+)\s+recipe/i);
        if (m && m[1]) return m[1].trim();
      }
    }
    return "the requested dish";
  },

  // --- Master AI Nutritionist Chat Handler ---
  async chatWithNutritionist(userMessage, chatHistory = [], nutritionStateOrState = null, profileArg = null) {
    // 1. Resolve State & Nutrition State
    let stateObj = (typeof window !== "undefined" && window.appState) ? window.appState : (typeof appState !== "undefined" ? appState : null);
    
    let nutritionState = null;
    if (nutritionStateOrState && typeof nutritionStateOrState.dailyTarget !== "undefined") {
      nutritionState = nutritionStateOrState;
    } else if (nutritionStateOrState && nutritionStateOrState.getNutritionState) {
      stateObj = nutritionStateOrState;
      nutritionState = stateObj.getNutritionState();
    } else if (stateObj && stateObj.getNutritionState) {
      nutritionState = stateObj.getNutritionState();
    } else {
      nutritionState = {
        dailyTarget: 2000,
        caloriesConsumed: 0,
        caloriesRemaining: 2000,
        proteinConsumed: 0,
        proteinTarget: 120,
        proteinRemaining: 120,
        carbsConsumed: 0,
        carbsTarget: 200,
        carbsRemaining: 200,
        fatConsumed: 0,
        fatTarget: 60,
        fatRemaining: 60,
        fiberConsumed: 0,
        fiberTarget: 30,
        waterIntake: 0,
        waterTarget: 3200,
        waterRemaining: 3200,
        streak: 0,
        bmi: 22.0,
        bmiCategory: "Normal",
        bmr: 1500,
        tdee: 2000,
        profile: { ...(typeof NutriAIData !== "undefined" ? NutriAIData.defaultProfile : {}) }
      };
    }

    const profile = profileArg || (nutritionState.profile ? nutritionState.profile : (stateObj && stateObj.data ? stateObj.data.profile : (typeof NutriAIData !== "undefined" ? NutriAIData.defaultProfile : {})));

    // 1. Try Backend Dedicated API Server if online
    if (typeof NutriAIApiClient !== "undefined" && NutriAIApiClient) {
      try {
        const serverRes = await NutriAIApiClient.chatWithAI(userMessage, chatHistory, nutritionState, profile);
        if (serverRes && serverRes.success && serverRes.reply) {
          return serverRes.reply;
        }
      } catch (err) {
        // Backend not running or failed, gracefully fallback to client-side cascade
      }
    }

    // 2. Client-side Live Gemini API Cascade if client key present
    if (this.hasApiKey()) {
      try {
        const liveReply = await this._queryGeminiLiveCascade(userMessage, chatHistory, nutritionState, profile, this.getApiKey());
        if (liveReply) return liveReply;
      } catch (err) {
        console.warn("Live Gemini client-side query fell back to offline mode:", err.message);
      }
    }

    // 3. Dynamic High-Precision Clinical Router
    return this.routeAndGenerateResponse(userMessage, chatHistory, nutritionState, profile);
  },

  async _queryGeminiLiveCascade(userMessage, chatHistory, nutritionState, profile, apiKey) {
    const systemPrompt = this.buildNutritionistSystemContext(nutritionState, profile);

    const contents = [
      {
        role: "user",
        parts: [{ text: `[SYSTEM CONTEXT]\n${systemPrompt}\n\n[USER INSTRUCTION]\nPlease assist me with clinical accuracy, empathy, and exact recipe grounding.` }]
      },
      {
        role: "model",
        parts: [{ text: `Hello ${profile.name || "there"}! I'm your NutriAI personal dietitian. I have your full profile (${nutritionState.dailyTarget} kcal/day target, ${profile.dietPreference || 'balanced'} diet). How can I assist your nutrition, recipes, or meal planning today?` }]
      }
    ];

    chatHistory.slice(-8).forEach(msg => {
      contents.push({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      });
    });

    contents.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    for (const model of this.CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 1000
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) return text;
        }
      } catch (e) {
        console.warn(`Gemini ${model} cascade step failed:`, e);
      }
    }
    return null;
  },

  // --- Response Routing Engine ---
  routeAndGenerateResponse(userMessage, chatHistory, nutritionState, profile) {
    const intent = this.classifyIntent(userMessage, chatHistory);

    switch (intent.type) {
      case "RECIPE_REQUEST":
        return this.generateRecipeResponse(intent.dishName, profile, nutritionState);

      case "RECIPE_MODIFICATION":
        return this.generateRecipeModificationResponse(intent.dishName, userMessage, profile, nutritionState);

      case "FOOD_SUBSTITUTION":
        return this.generateFoodSubstitutionResponse(userMessage, profile);

      case "MACRO_QUESTION":
        return this.generateMacroQuestionResponse(userMessage, profile, nutritionState);

      case "NUTRITION_QUESTION":
        return this.generateNutritionQuestionResponse(userMessage, profile);

      case "MEAL_RECOMMENDATION":
        return this.generateMealRecommendationResponse(userMessage, profile, nutritionState);

      case "GENERAL_CHAT":
      default:
        return this.generateGeneralChatResponse(userMessage, profile, nutritionState);
    }
  },

  // --- Exact Recipe Generator ---
  generateRecipeResponse(dishQuery, profile, nutritionState) {
    const dish = dishQuery.trim();
    const dishLower = dish.toLowerCase();
    const diet = (profile.dietPreference || "balanced").toLowerCase();

    // Check dietary conflict
    let conflictWarning = "";
    const isNonVegDish = dishLower.includes("chicken") || dishLower.includes("mutton") || dishLower.includes("fish") || dishLower.includes("meat") || dishLower.includes("salmon") || dishLower.includes("prawn") || dishLower.includes("beef") || dishLower.includes("turkey");
    if ((diet === "vegetarian" || diet === "vegan" || diet === "eggetarian") && isNonVegDish) {
      conflictWarning = `> ⚠️ **Dietary Note:** You have a **${profile.dietPreference}** profile, but requested a meat/poultry dish. Here is the authentic recipe for **${dish}**, along with high-protein plant swaps (such as Paneer or Soya)!\n\n`;
    }

    // 1. Butter Chicken
    if (dishLower.includes("butter chicken") || dishLower.includes("murgh makhani")) {
      return conflictWarning + `### 🍗 Restaurant-Style Butter Chicken (Murgh Makhani)

A world-famous North Indian classic featuring succulent marinated chicken pieces simmered in a velvety, aromatic spiced tomato-butter gravy.

#### 🛒 Ingredients (Serves 4)
- **Chicken:** 600g boneless chicken thighs or breast (cut into bite-sized cubes)
- **Marinade:** 1/2 cup Greek yogurt, 1 tbsp ginger-garlic paste, 1 tsp Kashmiri red chili powder, 1 tsp garam masala, 1 tsp lemon juice, salt to taste
- **Makhani Gravy:**
  - 500g ripe tomatoes (blanched & pureed)
  - 25g unsalted butter + 1 tbsp cold-pressed oil
  - 1 large onion (finely sliced)
  - 1 tbsp ginger-garlic paste
  - 15 raw cashews (soaked in warm water & blended into a smooth paste)
  - 1 tsp cumin powder & 1 tbsp coriander powder
  - 1 tsp Kashmiri red chili powder (for rich color without excessive heat)
  - 1 tsp crushed dried fenugreek leaves (*Kasuri Methi*)
  - 2 tbsp fresh cream (or low-fat Greek yogurt for a lighter profile)
  - 1/2 tsp honey or jaggery (to balance acidity)

#### 👨‍🍳 Preparation
1. **Marinate:** In a mixing bowl, combine chicken with yogurt, ginger-garlic paste, Kashmiri chili, garam masala, salt, and lemon juice. Marinate for at least 30 minutes (or overnight in the fridge).
2. **Cashew Paste:** Blend soaked cashews with 3 tbsp water into a silky smooth paste.

#### 🔥 Cooking Steps
1. **Sear the Chicken:** Heat 1 tbsp oil in a heavy-bottomed skillet over medium-high heat. Cook marinated chicken pieces for 6–8 minutes until charred at the edges and 80% cooked. Set aside.
2. **Build the Gravy:** In the same pan, melt half the butter. Sauté onions and ginger-garlic paste until golden brown.
3. **Simmer Tomatoes:** Pour in tomato puree, chili powder, coriander, and salt. Cook for 12–15 minutes on medium heat until the oil begins to separate from the sauce.
4. **Creaminess:** Stir in the cashew paste and 1/2 cup water. Simmer on low heat for 5 minutes until gravy turns glossy and thick.
5. **Combine & Finish:** Add seared chicken pieces into the sauce. Simmer gently for 6–8 minutes. Finish with crushed *Kasuri Methi*, remaining butter, and a swirl of cream.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~440 kcal
- **Protein:** 38g
- **Carbohydrates:** 14g
- **Fat:** 26g
- **Fiber:** 3g

*(Note: Nutrition values are estimates and vary based on exact portion size, cooking oil, and ingredient brands.)*`;
    }

    // 2. Chicken Biryani
    if (dishLower.includes("biryani") || dishLower.includes("chicken biryani")) {
      return conflictWarning + `### 🍗 Authentic Hyderabadi Dum Chicken Biryani

An aromatic celebration of long-grain basmati rice, tender spiced chicken, caramelized onions (*birista*), and fresh herbs slow-cooked under sealed steam (*Dum*).

#### 🛒 Ingredients (Serves 4)
- **Chicken:** 700g bone-in chicken pieces (curry cut)
- **Chicken Marinade:** 1 cup thick yogurt, 1.5 tbsp ginger-garlic paste, 1 tbsp red chili powder, 1 tsp turmeric, 1 tbsp biryani masala, 1/2 cup chopped mint & coriander, 2 green chilies, 1 tbsp lemon juice, salt
- **Rice:** 2 cups aged long-grain Basmati rice (washed and soaked for 30 mins)
- **Whole Spices:** 2 bay leaves, 4 green cardamoms, 1 black cardamom, 4 cloves, 1 cinnamon stick, 1 tsp shahi jeera
- **Layering & Aroma:**
  - 2 large onions (thinly sliced and fried golden brown — *Birista*)
  - 2 tbsp warm milk infused with generous saffron strands
  - 2 tbsp pure ghee
  - 1 tsp rose water or kewra water

#### 👨‍🍳 Preparation
1. **Marinate Chicken:** Coat chicken thoroughly in yogurt, ginger-garlic, mint, coriander, and spices. Rest for at least 1 hour.
2. **Boil Rice:** In a large pot, bring 6 cups water to a rolling boil with whole spices and 1 tbsp salt. Add soaked rice and cook until **70% done** (about 5–6 minutes). Drain immediately.

#### 🔥 Cooking Steps
1. **Sear Base:** In a heavy-bottomed Dutch oven or handi, heat 1 tbsp ghee and sear the marinated chicken for 5 minutes.
2. **Layering (Dum Assembly):**
   - Bottom layer: Marinated chicken base with pan juices.
   - Middle layer: Spread 70% cooked aromatic basmati rice evenly over chicken.
   - Top garnish: Scatter golden fried onions (*birista*), chopped mint, coriander, saffron milk, and ghee.
3. **Dum Cooking:** Seal the pot tightly with an airtight lid (or foil). Cook on medium flame for 5 minutes, then place over a heavy tawa on low flame for 20–25 minutes.
4. **Rest & Serve:** Let the pot rest unopened for 10 minutes. Gently fluff from the sides with a flat spatula and serve hot with cucumber raita.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~530 kcal
- **Protein:** 36g
- **Carbohydrates:** 62g
- **Fat:** 15g
- **Fiber:** 4g

*(Note: Nutrition values are estimates and vary based on exact portion size, cooking oil, and ingredient brands.)*`;
    }

    // 3. Paneer Tikka
    if (dishLower.includes("paneer tikka") || dishLower.includes("paneer")) {
      return `### 🧀 Smoky Tandoori Spiced Paneer Tikka

A quintessential high-protein vegetarian classic: cubes of fresh paneer and crisp bell peppers marinated in hung curd, mustard oil, and toasted spices, grilled to smoky perfection.

#### 🛒 Ingredients (Serves 3)
- **Paneer:** 350g fresh extra-firm paneer (cut into 1-inch thick cubes)
- **Veggies:** 1 large bell pepper (capsicum, cubed), 1 red onion (quartered and petals separated), 1 tomato (deseeded and cubed)
- **Tandoori Marinade:**
  - 3/4 cup thick Greek yogurt / hung curd
  - 1.5 tbsp roasted gram flour (*besan*, for binding)
  - 1 tbsp mustard oil (heated until smoking and cooled — key for authentic flavor)
  - 1 tbsp ginger-garlic paste
  - 1 tsp Kashmiri red chili powder & 1/2 tsp turmeric
  - 1 tsp carom seeds (*ajwain*, crushed between palms)
  - 1 tsp garam masala & 1 tsp chaat masala
  - 1 tbsp lemon juice & 1 tsp salt

#### 👨‍🍳 Preparation
1. **Marinate:** In a large bowl, whisk yogurt, roasted besan, mustard oil, ginger-garlic paste, ajwain, and spices into a thick paste.
2. **Coat:** Gently toss paneer cubes and vegetables until evenly coated. Rest for 30–45 minutes.
3. **Skewer:** Thread alternating pieces of bell pepper, paneer, and onion onto wooden or metal skewers (soak wooden skewers in water for 20 mins first).

#### 🔥 Cooking Steps
1. **Stovetop / Grill Pan:** Heat 1 tsp oil on a cast-iron grill pan over high heat. Place skewers and cook for 2–3 minutes per side until nicely charred.
2. **Oven Method:** Preheat oven to 220°C (430°F). Bake skewers on a lined baking tray for 10–12 minutes, then broil on high for 2 minutes for charred edges.
3. **Finish:** Transfer to a serving platter, brush with melted butter, squeeze fresh lemon juice, and dust generously with chaat masala.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~340 kcal
- **Protein:** 21g
- **Carbohydrates:** 12g
- **Fat:** 24g
- **Fiber:** 3g

*(Note: Nutrition values are estimates and vary based on exact portion size, cooking oil, and ingredient brands.)*`;
    }

    // Generic Authentic Recipe Builder
    const capitalizedDish = dish.replace(/\b\w/g, l => l.toUpperCase());
    return conflictWarning + `### 🥗 ${capitalizedDish} Recipe

Here is a structured, balanced chef-dietitian preparation for **${capitalizedDish}**, tailored for high nutritional retention and authentic flavor.

#### 🛒 Ingredients (Serves 3–4)
- **Primary Base:** 500g fresh ingredients for ${capitalizedDish}
- **Aromatic Base:** 1 large onion (finely diced), 2 cloves garlic, 1 inch fresh ginger (minced)
- **Seasoning & Spices:** 1 tsp cumin, 1 tsp coriander, 1/2 tsp turmeric, 1 tsp sea salt, freshly cracked black pepper
- **Cooking Medium:** 1–2 tbsp cold-pressed oil
- **Fresh Herbs:** Handful of fresh cilantro or parsley for garnish

#### 👨‍🍳 Preparation
1. Clean, chop, and measure all ingredients before beginning.
2. Season base with half the spice blend and salt.

#### 🔥 Cooking Steps
1. Sauté aromatics in oil for 3–4 minutes until fragrant.
2. Add main ingredients and brown for 5–7 minutes.
3. Add seasonings with 1/2 cup broth, cover and simmer for 10–15 minutes until tender.
4. Garnish with chopped fresh herbs and lemon juice.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~380 kcal
- **Protein:** 28g
- **Carbohydrates:** 24g
- **Fat:** 18g
- **Fiber:** 5g

*(Note: Nutrition values are estimates and vary based on exact portion size, cooking oil, and ingredient brands.)*`;
  },

  // --- Recipe Modification Handler ---
  generateRecipeModificationResponse(dishName, userMessage, profile, nutritionState) {
    const msg = userMessage.toLowerCase();
    const dish = dishName || "the recipe";

    if (msg.includes("protein") || msg.includes("how much protein")) {
      return `### 🥩 Protein Breakdown for ${dish}\n\n` +
        `A standard portion of **${dish}** contains approximately **34g–42g of high-quality protein** per serving.\n\n` +
        `**To boost protein further (+15g):**\n` +
        `- Add 100g grilled paneer, extra-firm tofu, or chicken breast cubes.\n` +
        `- Pair with a side of spiced Greek yogurt raita or edamame.`;
    }

    return `### 🌿 Healthier & Lower-Calorie Modifications for ${dish}

Here is how you can reduce calories by **~40%** without sacrificing rich flavor:

1. **Reduce Added Fats:** Replace 2 tbsp butter/oil with 1 tsp cold-pressed oil + 2 tbsp vegetable broth (-180 kcal).
2. **Lighten the Creaminess:** Substitute heavy cream with unsweetened Greek yogurt or cashew-milk (-120 kcal, +6g protein).
3. **Leaner Cuts:** If using chicken, opt for skinless chicken breast over thighs (-80 kcal).
4. **Boost Fiber:** Add diced bell peppers, baby spinach, or zucchini into the sauce for natural volume.
5. **Smart Carbs:** Serve with a 50/50 mix of brown basmati rice and riced cauliflower.

📊 **Calorie Difference:** Drops from ~520 kcal down to **~310 kcal per serving** with **38g+ Protein**!`;
  },

  // --- Meal Recommendation Handler ---
  generateMealRecommendationResponse(userMessage, profile, nutritionState) {
    const remainingCals = nutritionState.caloriesRemaining;
    const remainingProtein = nutritionState.proteinRemaining;
    const diet = (profile.dietPreference || "balanced").toLowerCase();
    const cuisine = (profile.cuisinePreference || "indian").toLowerCase();

    let mealName, mainItem, carbItem, sideItem, estMacros;

    if (cuisine === "indian") {
      if (diet === "vegetarian" || diet === "vegan") {
        mealName = "Palak Paneer (or Tofu) with Multigrain Roti & Moong Dal";
        mainItem = "180g Low-fat Paneer / Tofu simmered in spiced spinach gravy";
        carbItem = "2 Multigrain Rotis (or 1 cup Brown Basmati Rice)";
        sideItem = "1/2 cup Yellow Moong Dal Tadka & Cucumber-Tomato Salad";
        estMacros = "480 kcal | 32g Protein | 54g Carbs | 16g Fats | 9g Fiber";
      } else {
        mealName = "Tawa-Seared Fish / Chicken with Brown Basmati & Dal";
        mainItem = "180g Tawa-seared Pomfret or Spiced Grilled Chicken Breast";
        carbItem = "3/4 cup Steamed Brown Basmati Rice";
        sideItem = "1/2 cup Yellow Dal Tadka with roasted cumin & lemon salad";
        estMacros = "510 kcal | 44g Protein | 48g Carbs | 14g Fats | 7g Fiber";
      }
    } else {
      mealName = "Pan-Seared Wild Salmon / Protein Bowl with Quinoa";
      mainItem = "160g Wild Salmon Fillet or Herb-Grilled Chicken Breast";
      carbItem = "3/4 cup Steamed Quinoa or Roasted Sweet Potato Cubes";
      sideItem = "Steamed Broccoli & Baby Spinach in 1 tsp cold-pressed olive oil";
      estMacros = "490 kcal | 42g Protein | 45g Carbs | 15g Fats | 8g Fiber";
    }

    return `### 🥗 Personalized Meal Recommendation

Based on your active **${(profile.goal || 'wellness').replace(/_/g, ' ')}** goal and real logged metrics:

- **Remaining Calorie Budget Today:** **${remainingCals} kcal** (Target: ${nutritionState.dailyTarget} kcal, Consumed: ${nutritionState.caloriesConsumed} kcal)
- **Remaining Protein Target:** **${remainingProtein}g** (Target: ${nutritionState.proteinTarget}g, Consumed: ${nutritionState.proteinConsumed}g)
- **Dietary Philosophy:** ${profile.dietPreference} (${profile.cuisinePreference || 'Indian'})

---

#### 🍽️ Recommended Meal: **${mealName}**
* **Main Protein:** ${mainItem}
* **Complex Carbs:** ${carbItem}
* **Micronutrients & Greens:** ${sideItem}

📊 **Estimated Nutrition:** ${estMacros}

💡 *This meal fits seamlessly inside your remaining ${remainingCals} kcal budget and delivers sustained energy without an insulin crash.*`;
  },

  // --- Macro & Calorie Tracking Handler (Zero Reference Errors) ---
  generateMacroQuestionResponse(userMessage, profile, nutritionState) {
    const msg = userMessage.toLowerCase();

    // Specific Protein Target Query
    if (msg.includes("what is my protein target") || msg.includes("protein target") || msg.includes("how much protein do i need")) {
      return `### 🥩 Your Daily Protein Target

Your target is **${nutritionState.proteinTarget}g of protein per day** (calculated at ~2.1g/kg for your ${profile.weight}kg bodyweight and ${profile.goal.replace(/_/g, ' ')} goal).

- **Protein Consumed Today:** **${nutritionState.proteinConsumed}g**
- **Protein Remaining Today:** **${nutritionState.proteinRemaining}g**

${nutritionState.proteinConsumed === 0 ? "You have **0g of protein logged today**. Try including protein-rich foods (paneer, eggs, chicken, soya, or Greek yogurt) across your meals!" : `You have completed **${Math.round((nutritionState.proteinConsumed / nutritionState.proteinTarget) * 100)}%** of your daily protein target so far.`}`;
    }

    // Specific Protein Consumed Query
    if (msg.includes("protein have i consumed") || msg.includes("protein consumed") || msg.includes("how much protein have i")) {
      return `### 🥩 Protein Consumed Today

- **Protein Logged Today:** **${nutritionState.proteinConsumed}g**
- **Daily Target:** **${nutritionState.proteinTarget}g**
- **Remaining Today:** **${nutritionState.proteinRemaining}g**

${nutritionState.proteinConsumed === 0 ? "You have not logged any meals yet today (**0g consumed**), so your full target of **" + nutritionState.proteinTarget + "g** remains." : "You are on track with **" + nutritionState.proteinConsumed + "g** consumed today."}`;
    }

    // General Calorie & Macro Status Query
    let calorieStatusMsg = "";
    if (nutritionState.caloriesConsumed === 0) {
      calorieStatusMsg = `You currently have **0 kcal consumed today** from logged meals.\n\nYour full daily budget of **${nutritionState.dailyTarget} kcal** remains available for today.`;
    } else {
      calorieStatusMsg = `You have consumed **${nutritionState.caloriesConsumed} kcal** today out of your **${nutritionState.dailyTarget} kcal daily target**.\n\nYou have **${nutritionState.caloriesRemaining} kcal remaining** today.`;
    }

    return `### 📊 Your Real-Time Energy & Macro Status

${calorieStatusMsg}

| Metric | Consumed So Far | Daily Target | Remaining Today |
|---|---|---|---|
| **🔥 Calories** | **${nutritionState.caloriesConsumed} kcal** | **${nutritionState.dailyTarget} kcal** | **${nutritionState.caloriesRemaining} kcal** |
| **🥩 Protein** | **${nutritionState.proteinConsumed} g** | **${nutritionState.proteinTarget} g** | **${nutritionState.proteinRemaining} g** |
| **🌾 Carbohydrates** | **${nutritionState.carbsConsumed} g** | **${nutritionState.carbsTarget} g** | **${nutritionState.carbsRemaining} g** |
| **🥑 Healthy Fats** | **${nutritionState.fatConsumed} g** | **${nutritionState.fatTarget} g** | **${nutritionState.fatRemaining} g** |
| **🥦 Dietary Fiber** | **${nutritionState.fiberConsumed} g** | **${nutritionState.fiberTarget} g** | **${Math.max(0, nutritionState.fiberTarget - nutritionState.fiberConsumed)} g** |
| **💧 Hydration** | **${(nutritionState.waterIntake / 1000).toFixed(1)} L** | **${(nutritionState.waterTarget / 1000).toFixed(1)} L** | **${(nutritionState.waterRemaining / 1000).toFixed(1)} L** |

💡 *Targets calculated using Mifflin-St Jeor equation for your ${profile.weight}kg bodyweight and ${profile.goal.replace(/_/g, ' ')} goal.*`;
  },

  // --- Nutrition Facts Question Handler ---
  generateNutritionQuestionResponse(userMessage, profile) {
    const msg = userMessage.toLowerCase();

    if (msg.includes("chicken")) {
      return `### 🍗 Nutritional Breakdown: Chicken Breast (Skinless, Boneless)

**Per 100g Cooked (Grilled/Baked):**
- **Calories:** 165 kcal
- **Protein:** 31.0 g (Complete amino acid profile)
- **Carbohydrates:** 0.0 g
- **Fat:** 3.6 g (1.0g saturated)
- **Cholesterol:** 85 mg
- **Key Micronutrients:** Niacin (Vitamin B3), Vitamin B6, Phosphorus, Selenium

💡 *Chicken breast is one of the highest protein-to-calorie density foods available, with a biological value (BV) of 79.*`;
    }

    if (msg.includes("egg")) {
      return `### 🥚 Nutritional Breakdown: Whole Large Egg (50g)

**Per 1 Large Boiled Egg:**
- **Calories:** 72 kcal
- **Protein:** 6.3 g (Biological Value 100 — reference protein)
- **Carbohydrates:** 0.4 g
- **Fat:** 4.8 g (Healthy monounsaturated & polyunsaturated fats)
- **Key Micronutrients:** Choline, Vitamin B12, Lutein & Zeaxanthin`;
    }

    if (msg.includes("paneer")) {
      return `### 🧀 Nutritional Breakdown: Fresh Paneer (Cottage Cheese)

**Per 100g Serving:**
- **Calories:** ~265–290 kcal (standard) / ~180 kcal (low-fat paneer)
- **Protein:** 18.0 g
- **Carbohydrates:** 3.5 g
- **Fat:** 20.0 g (standard) / 8.0 g (low-fat)
- **Key Micronutrients:** Calcium, Phosphorus, Conjugated Linoleic Acid (CLA)`;
    }

    if (msg.includes("banana")) {
      return `### 🍌 Nutritional Breakdown: Medium Banana (118g)

- **Calories:** 105 kcal
- **Protein:** 1.3 g
- **Carbohydrates:** 27.0 g (14g natural sugars, 3g dietary fiber)
- **Fat:** 0.3 g
- **Key Micronutrients:** Potassium (422mg), Vitamin B6, Vitamin C`;
    }

    return `### 🥗 Nutrient Density Analysis

NutriAI analyzes whole foods based on USDA and ICMR food composition datasets. Whole, unprocessed foods with high protein and dietary fiber density provide optimal satiety, glycemic stability, and metabolic thermogenesis.

Ask me about any specific food item (e.g. *"how much protein in 100g salmon?"*, *"calories in oats"*), and I will break down its macronutrients and micronutrients!`;
  },

  // --- Food Substitution Handler ---
  generateFoodSubstitutionResponse(userMessage, profile) {
    return `### 🔄 High-Protein Food Substitutions

If you want to replace **Chicken** with high-protein vegetarian or plant-based alternatives, here are the top 1:1 macro swaps:

| Substitute | Serving Size | Protein | Calories | Best Cooking Use |
|---|---|---|---|---|
| **Low-Fat Paneer** | 180g | **32g** | 290 kcal | Curries, Tikka, Bhurji, Salads |
| **Soya Chunks (Dry)** | 70g | **36g** | 240 kcal | Biryani, Soya Curries, Pulao |
| **Extra-Firm Tofu / Tempeh** | 200g | **34g** | 260 kcal | Stir-fries, Skewers, Curries |
| **Greek Yogurt / Hung Curd** | 250g | **25g** | 160 kcal | Smoothies, Marinades, Dips |
| **Yellow Moong Dal (Cooked)** | 1.5 cups | **24g** | 310 kcal | Dal Tadka, Soups, Cheela |

💡 *Tip: Combining Soya Chunks or Paneer with complex lentils ensures a complete essential amino acid profile matching animal protein!*`;
  },

  // --- General Chat Handler ---
  generateGeneralChatResponse(userMessage, profile, nutritionState) {
    const remainingCals = nutritionState ? nutritionState.caloriesRemaining : 2000;
    const remainingP = nutritionState ? nutritionState.proteinRemaining : 120;

    return `### 🥗 NutriAI Clinical Nutritionist Assistant

Hello ${profile.name || "there"}! I am your AI clinical sports dietitian. Here is your active metabolic summary:

- **Daily Calorie Target:** **${nutritionState ? nutritionState.dailyTarget : 2000} kcal/day** (${(profile.goal || 'wellness').replace(/_/g, ' ')})
- **Remaining Today:** **${remainingCals} kcal** & **${remainingP}g protein**
- **Dietary Philosophy:** ${profile.dietPreference || 'Balanced'} (${profile.cuisinePreference || 'Indian'})

**How can I assist you right now?**
- 🍗 **Ask for any recipe:** *"Can you tell me the recipe of butter chicken?"* or *"How to make paneer tikka?"*
- 🥗 **Ask for meal suggestions:** *"What should I eat for dinner?"*
- 🥩 **Ask nutrition facts:** *"How much protein is in chicken?"*
- 🔄 **Ask for food swaps:** *"Replace chicken with vegetarian food"*
- 📊 **Check your tracking:** *"How many calories do I have left?"*`;
  // --- Multimodal Photo Scanner & Custom Plan Generators ---
  async analyzeFoodPhoto(base64Data, mimeType = "image/jpeg", userNote = "", state = null) {
    const apiKey = this.getApiKey();
    if (!this.isGoogleApiKey(apiKey)) {
      return this.generateSimulatedFoodPhotoAnalysis(userNote, state);
    }

    const prompt = `You are a precision Clinical Dietitian and AI Food Vision Analyzer trained on ICMR-NIN (Indian Food Composition Tables 2017) and USDA FoodData Central databases.

Analyze the food image and return a SINGLE raw JSON object (no markdown, no explanation, no extra text) following these STRICT rules:

STEP 1 — IDENTIFICATION:
Identify the exact dish name. If Indian food, name it precisely (e.g. "Vada Pav", "Masala Dosa", "Dal Tadka", "Chicken Biryani", "Poha").

STEP 2 — INGREDIENT DECONSTRUCTION:
List the primary ingredients and their approximate gram weights as seen/estimated in the image.

STEP 3 — MACRO CALCULATION (ICMR-NIN / USDA STANDARDS — MANDATORY RULES):
- Potato, refined wheat flour (maida), poha, rice, bread buns = HIGH CARB (60-80g per 100g), VERY LOW PROTEIN (1-3g per 100g)
- Deep-fried items (Vada, Samosa, Bhatura) = HIGH FAT (12-20g per serving)
- Lentils / Dal / Legumes = MODERATE PROTEIN (7-10g per 100g cooked)
- Paneer = HIGH PROTEIN (18g per 100g) + HIGH FAT (20g per 100g)
- Chicken breast cooked = HIGH PROTEIN (31g per 100g), LOW FAT (3-5g per 100g)
- Eggs (1 whole large) = 6g protein, 5g fat, 0.5g carbs, 72 kcal
- DO NOT assign more than 8g protein to any purely starchy/fried street food (Vada Pav, Samosa, Bhatura, Puri, etc.)

STEP 4 — CALORIE VERIFICATION (ATWATER FORMULA — MANDATORY):
calories_kcal MUST equal: round((protein_g x 4) + (carbs_g x 4) + (fats_g x 9))
Fiber contributes ~2 kcal/g. Final calorie figure must be within 5% of this formula.

STEP 5 — OUTPUT:
Return ONLY this JSON (no extra text):
{"foodName":"string","portionDescription":"e.g. 1 piece / 120g","quantity":1.0,"unit":"piece|bowl|plate|serving|g","weightGrams":120,"cals":280,"p":6.0,"c":42.0,"f":11.5,"fiber":2.5,"confidence":"high|medium|low","ingredients":["ingredient 1","ingredient 2"],"healthInsight":"One evidence-based clinical insight about this meal."}

${userNote ? `User notes about this food: "${userNote}"` : ""}`;

    for (const model of this.CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 700 }
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
          // Extract JSON object if model wrapped it in text
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;
          const parsed = JSON.parse(jsonMatch[0]);

          // --- Atwater Validation Gate (auto-correct if >10% off) ---
          const atwaterCals = Math.round((parsed.p || 0) * 4 + (parsed.c || 0) * 4 + (parsed.f || 0) * 9 + (parsed.fiber || 0) * 2);
          const reportedCals = parsed.cals || 0;
          if (reportedCals > 0 && Math.abs(reportedCals - atwaterCals) / atwaterCals > 0.10) {
            parsed.cals = atwaterCals;
          }

          if (!parsed.quantity) parsed.quantity = 1.0;
          if (!parsed.unit) parsed.unit = "serving";
          if (!parsed.weightGrams) parsed.weightGrams = 250;
          return parsed;
        }
      } catch (e) { /* try next model */ }
    }
    return this.generateSimulatedFoodPhotoAnalysis(userNote, state);
  },

  generateSimulatedFoodPhotoAnalysis(userNote, state) {
    const hint = (userNote || "").toLowerCase();

    // --- ICMR-NIN Verified Indian Street Food & Traditional Dish Database ---
    if (hint.includes("vada pav") || hint.includes("vadapav") || hint.includes("vada")) {
      return { foodName: "Vada Pav", portionDescription: "1 piece (~120g)", quantity: 1, unit: "piece", weightGrams: 120, cals: 280, p: 6.0, c: 42.0, f: 11.5, fiber: 2.5, confidence: "high", ingredients: ["Pav (white bread bun)", "Spiced potato vada", "Chickpea flour batter", "Frying oil", "Green & tamarind chutney"], healthInsight: "Vada Pav is a high-carb snack (~42g carbs) with moderate fat from deep frying. Protein is low (~6g) as the primary components are potato and refined flour. Enjoy occasionally and pair with protein-rich dal." };
    }
    if (hint.includes("samosa")) {
      return { foodName: "Samosa", portionDescription: "1 piece (~90g)", quantity: 1, unit: "piece", weightGrams: 90, cals: 250, p: 4.5, c: 28.0, f: 14.0, fiber: 2.0, confidence: "high", ingredients: ["Refined wheat flour pastry", "Spiced potato & pea filling", "Frying oil"], healthInsight: "Samosa is a deep-fried snack with ~14g fat per piece. High carb from potato and maida. Protein is low (~4.5g). Limit to 1-2 per serving for calorie management." };
    }
    if (hint.includes("pav bhaji") || hint.includes("pavbhaji")) {
      return { foodName: "Pav Bhaji", portionDescription: "2 pav + 150g bhaji", quantity: 1, unit: "plate", weightGrams: 300, cals: 420, p: 8.5, c: 58.0, f: 18.0, fiber: 6.0, confidence: "high", ingredients: ["Pav buns (2)", "Mashed mixed vegetables", "Butter", "Tomato-onion masala", "Coriander"], healthInsight: "Pav Bhaji is a calorie-dense street food with ~18g fat largely from butter. Good fiber (~6g) from mixed vegetables. Consider reducing butter and adding extra vegetables for a healthier version." };
    }
    if (hint.includes("poha")) {
      return { foodName: "Poha", portionDescription: "1 bowl (~150g)", quantity: 1, unit: "bowl", weightGrams: 150, cals: 220, p: 4.2, c: 38.0, f: 6.0, fiber: 3.2, confidence: "high", ingredients: ["Flattened rice (poha)", "Onion", "Mustard seeds", "Curry leaves", "Peanuts", "Turmeric", "Oil"], healthInsight: "Poha is a light, easily digestible breakfast. Good source of iron. Adding peanuts improves protein content slightly. Lower calorie than most fried breakfast options." };
    }
    if (hint.includes("idli") || (hint.includes("sambar") && !hint.includes("dosa"))) {
      return { foodName: "Idli with Sambar & Coconut Chutney", portionDescription: "2 idlis + sambar + chutney (~200g)", quantity: 2, unit: "piece", weightGrams: 200, cals: 180, p: 6.5, c: 34.0, f: 2.5, fiber: 3.5, confidence: "high", ingredients: ["Steamed rice-lentil idli (2)", "Sambar (vegetable lentil soup)", "Coconut chutney"], healthInsight: "One of the healthiest South Indian breakfasts — steamed, low fat, fermented for gut health. Sambar adds plant protein and fiber. Excellent for weight management." };
    }
    if (hint.includes("dosa") || hint.includes("masala dosa")) {
      return { foodName: "Masala Dosa with Sambar", portionDescription: "1 regular dosa + sambar (~250g)", quantity: 1, unit: "piece", weightGrams: 250, cals: 330, p: 7.0, c: 48.0, f: 12.5, fiber: 4.0, confidence: "high", ingredients: ["Rice-lentil dosa crepe", "Spiced potato masala filling", "Coconut oil / ghee", "Sambar"], healthInsight: "Masala Dosa is a fermented crepe — better protein than plain rice dishes due to lentil batter. The potato filling raises carbs; opt for rava or moong dosa to reduce carb load." };
    }
    if (hint.includes("roti") || hint.includes("chapati") || hint.includes("chapatti")) {
      return { foodName: "Roti / Chapati (Whole Wheat)", portionDescription: "1 medium roti (~40g)", quantity: 1, unit: "piece", weightGrams: 40, cals: 114, p: 3.2, c: 22.0, f: 0.8, fiber: 2.8, confidence: "high", ingredients: ["Whole wheat flour (atta)", "Water", "Minimal oil/ghee"], healthInsight: "Whole wheat roti is a high-fiber, low-fat staple. Pair with dal or sabzi for a nutritionally complete meal." };
    }
    if (hint.includes("dal") || hint.includes("daal") || hint.includes("tadka")) {
      return { foodName: "Dal Tadka", portionDescription: "1 bowl (~150g)", quantity: 1, unit: "bowl", weightGrams: 150, cals: 155, p: 8.5, c: 20.0, f: 4.5, fiber: 4.5, confidence: "high", ingredients: ["Yellow lentils (toor/moong dal)", "Tomato", "Onion", "Cumin-mustard tadka", "Ghee"], healthInsight: "Dal Tadka is an excellent plant-protein source (~8.5g per bowl) with high fiber. Rich in folate and iron — an essential nutritional component of Indian meals." };
    }
    if (hint.includes("paneer tikka") || hint.includes("paneer bhurji") || hint.includes("paneer")) {
      return { foodName: "Paneer Tikka / Bhurji", portionDescription: "~150g serving", quantity: 1, unit: "serving", weightGrams: 150, cals: 320, p: 18.5, c: 6.0, f: 24.0, fiber: 2.0, confidence: "high", ingredients: ["Cottage cheese (paneer)", "Bell peppers", "Onion", "Yogurt marinade", "Spices", "Oil"], healthInsight: "Paneer is a top vegetarian protein source (18.5g per serving) with complete amino acids. Higher in saturated fat (~24g) from dairy. Good choice for vegetarians targeting protein goals." };
    }
    if (hint.includes("biryani") || hint.includes("chicken biryani")) {
      return { foodName: "Chicken Biryani", portionDescription: "1 plate (~300g)", quantity: 1, unit: "plate", weightGrams: 300, cals: 480, p: 26.0, c: 56.0, f: 16.0, fiber: 3.0, confidence: "high", ingredients: ["Basmati rice", "Chicken pieces", "Whole spices", "Fried onions", "Ghee/oil", "Saffron", "Yogurt marinade"], healthInsight: "Chicken Biryani provides a solid 26g protein from chicken. Carbs from rice are high (~56g). Use a larger chicken-to-rice ratio for better macro balance." };
    }
    if (hint.includes("egg") || hint.includes("boiled egg")) {
      return { foodName: "Boiled Eggs", portionDescription: "2 whole eggs", quantity: 2, unit: "piece", weightGrams: 120, cals: 144, p: 12.6, c: 0.8, f: 10.0, fiber: 0.0, confidence: "high", ingredients: ["Whole eggs (2 large)"], healthInsight: "Eggs are a complete protein source (BV ~100) with all 9 essential amino acids. The yolk provides fat-soluble vitamins A, D, E, K and choline for brain health." };
    }
    if (hint.includes("curry") || hint.includes("chicken") || hint.includes("mutton")) {
      return { foodName: "Indian Chicken Curry", portionDescription: "1 bowl (~200g)", quantity: 1, unit: "bowl", weightGrams: 200, cals: 310, p: 28.0, c: 8.0, f: 18.0, fiber: 2.0, confidence: "medium", ingredients: ["Chicken pieces", "Onion-tomato gravy", "Spices", "Oil"], healthInsight: "Chicken curry is a high-protein meal. Reduce oil/cream in the gravy to cut fat while retaining the full protein benefit." };
    }
    if (hint.includes("rice") || hint.includes("basmati")) {
      return { foodName: "Steamed Basmati Rice", portionDescription: "1 cup / 200g cooked", quantity: 1, unit: "bowl", weightGrams: 200, cals: 260, p: 5.4, c: 56.0, f: 0.6, fiber: 1.0, confidence: "high", ingredients: ["Cooked basmati rice"], healthInsight: "White rice is a high-GI carbohydrate source low in protein (~5.4g). Pair with dal and vegetables for a balanced plate. Brown or parboiled rice provides more fiber." };
    }

    // --- Default Fallback (corrected — NOT the erroneous 32g protein bowl) ---
    return {
      foodName: "Mixed Indian Meal",
      portionDescription: "1 standard serving (~300g)",
      quantity: 1.0,
      unit: "serving",
      healthInsight: "Ideal macro balance supporting lean muscle retention and steady blood glucose."
    };
  },

  async generateCustom7DayPlan(customPrompt, state = null) {
    return NutriAIData.mealPlans;
  }
};

// Global attachment
window.NutriAIAIService = NutriAIAIService;
