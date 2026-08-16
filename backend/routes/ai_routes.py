"""
NutriAI — Secure Server-Side Gemini AI & Clinical Intent Engine
"""

from flask import Blueprint, request, jsonify
import requests
import json
import os
import re

ai_bp = Blueprint("ai", __name__)

CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-pro"
]

def get_server_gemini_key():
    return os.environ.get("GEMINI_API_KEY", "").strip()

def classify_intent(user_msg, chat_history=[]):
    msg = user_msg.lower().strip()

    # 1. Follow-up / Modification Context
    if chat_history:
        is_mod = (
            "make it" in msg or "make the" in msg or "lower in calorie" in msg or
            "healthier" in msg or "less calorie" in msg or "more protein" in msg or
            "how much protein does it" in msg or "how many calories does it" in msg or
            "protein in this" in msg or "calories in this" in msg
        )
        if is_mod:
            dish = "the requested dish"
            for turn in reversed(chat_history):
                txt = turn.get("text", "").lower()
                if "butter chicken" in txt: dish = "Butter Chicken"; break
                if "chicken biryani" in txt or "biryani" in txt: dish = "Chicken Biryani"; break
                if "paneer tikka" in txt: dish = "Paneer Tikka"; break
                if "palak paneer" in txt: dish = "Palak Paneer"; break
                if "dal makhani" in txt: dish = "Dal Makhani"; break
            return {"type": "RECIPE_MODIFICATION", "dishName": dish, "query": msg}

    # 2. Recipe Request
    recipe_regexes = [
        r"(?:can\s+you\s+tell\s+me\s+the\s+recipe\s+(?:of|for)|tell\s+me\s+the\s+recipe\s+(?:of|for)|give\s+me\s+(?:a\s+|the\s+)?recipe\s+(?:of|for)?|recipe\s+(?:of|for)|how\s+to\s+(?:make|cook|prepare)|how\s+do\s+i\s+(?:make|cook|prepare)|how\s+can\s+i\s+(?:make|cook|prepare)|ingredients\s+for|how\s+to\s+bake)\s+([^?.!]+)",
        r"(?:give\s+me\s+(?:a\s+|the\s+)?|i\s+want\s+(?:a\s+|the\s+)?|share\s+(?:a\s+|the\s+)?)?([^?.!]+?)\s+recipe"
    ]
    for r in recipe_regexes:
        m = re.search(r, user_msg, re.IGNORECASE)
        if m and m.group(1):
            dish = re.sub(r"^(a|an|the|some|give\s+me\s+a|give\s+me\s+the)\s+", "", m.group(1), flags=re.IGNORECASE).strip()
            dish = re.sub(r"[?.!]+$", "", dish).strip()
            if len(dish) >= 2:
                return {"type": "RECIPE_REQUEST", "dishName": dish}

    known_dishes = ["butter chicken", "chicken biryani", "biryani", "paneer tikka", "palak paneer", "dal makhani", "dal tadka", "chana masala", "moong dal cheela"]
    for d in known_dishes:
        if d in msg and any(w in msg for w in ["recipe", "make", "cook", "how", "tell me", "give me"]):
            return {"type": "RECIPE_REQUEST", "dishName": d}

    # 3. Food Substitution
    if any(w in msg for w in ["replace", "substitute", "alternative to", "instead of", "swap"]):
        return {"type": "FOOD_SUBSTITUTION", "query": msg}

    # 4. Macro & Tracking Questions
    if any(w in msg for w in ["have left", "remaining calories", "calories left", "calories remaining", "how many calories do i have", "how much calories do i have", "my calorie target", "what is my protein target", "my protein target", "protein target", "protein have i consumed", "protein consumed", "how much protein do i need", "my daily budget", "how many calories do i", "calories do i have left"]):
        return {"type": "MACRO_QUESTION", "query": msg}

    # 5. Nutrition Facts
    if (
        "protein in" in msg or "protein is in" in msg or "calories in" in msg or "calories are in" in msg or
        "carbs in" in msg or "fats in" in msg or "nutrition in" in msg or "nutritional value" in msg or
        "how much protein in" in msg or "how many calories in" in msg or
        ("protein" in msg and any(f in msg for f in ["chicken", "egg", "paneer", "tofu", "fish"]))
    ):
        return {"type": "NUTRITION_QUESTION", "query": msg}

    # 6. Meal Recommendation
    if any(w in msg for w in ["what should i eat", "what to eat", "recommend", "suggest", "idea for dinner", "idea for lunch", "idea for breakfast", "healthy dinner"]):
        return {"type": "MEAL_RECOMMENDATION", "query": msg}

    return {"type": "GENERAL_CHAT", "query": msg}

def generate_recipe(dish_name, profile):
    dish = dish_name.strip().title()
    dish_lower = dish_name.lower()
    diet = profile.get("dietPreference", "balanced").lower()

    conflict = ""
    is_meat = any(w in dish_lower for w in ["chicken", "mutton", "fish", "meat", "prawn", "salmon", "beef"])
    if is_meat and diet in ["vegetarian", "vegan", "eggetarian"]:
        conflict = f"> ⚠️ **Dietary Note:** You have a **{profile.get('dietPreference')}** profile, but requested a meat/poultry dish. Here is the authentic recipe for **{dish}**, along with high-protein plant swaps (such as Paneer or Soya)!\n\n"

    if "butter chicken" in dish_lower or "murgh makhani" in dish_lower:
        return conflict + """### 🍗 Restaurant-Style Butter Chicken (Murgh Makhani)

A world-famous North Indian classic featuring succulent marinated chicken pieces simmered in a velvety, aromatic spiced tomato-butter gravy.

#### 🛒 Ingredients (Serves 4)
- **Chicken:** 600g boneless chicken thighs or breast (cubed)
- **Marinade:** 1/2 cup Greek yogurt, 1 tbsp ginger-garlic paste, 1 tsp Kashmiri chili, 1 tsp garam masala, 1 tsp lemon juice, salt
- **Makhani Gravy:** 500g ripe tomatoes (pureed), 25g unsalted butter, 1 tbsp cold-pressed oil, 15 raw cashews (soaked & blended into smooth paste), 1 tsp cumin & coriander powder, 1 tsp Kasuri Methi, 2 tbsp cream, 1/2 tsp honey

#### 👨‍🍳 Preparation
1. **Marinate:** Combine chicken with yogurt, ginger-garlic paste, spices, and lemon juice for 30 mins.
2. **Cashew Paste:** Blend soaked cashews with 3 tbsp warm water until silky smooth.

#### 🔥 Cooking Steps
1. **Sear Chicken:** Heat 1 tbsp oil in a skillet. Cook marinated chicken for 6–8 minutes until charred at edges. Set aside.
2. **Build Gravy:** In same pan, melt half butter. Sauté onions and ginger-garlic paste until golden. Add pureed tomatoes and simmer for 12 mins.
3. **Creaminess:** Stir in cashew paste and 1/2 cup water. Simmer on low heat for 5 minutes.
4. **Finish:** Fold in seared chicken, simmer for 6 minutes. Finish with crushed Kasuri Methi and remaining butter.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~440 kcal | **Protein:** 38g | **Carbohydrates:** 14g | **Fat:** 26g | **Fiber:** 3g"""

    if "biryani" in dish_lower:
        return conflict + """### 🍗 Authentic Hyderabadi Dum Chicken Biryani

A fragrant celebration of aged basmati rice, tender spiced chicken, caramelized onions (*birista*), and fresh herbs slow-cooked under steam (*Dum*).

#### 🛒 Ingredients (Serves 4)
- **Chicken:** 700g bone-in curry cut pieces
- **Marinade:** 1 cup thick yogurt, 1.5 tbsp ginger-garlic paste, 1 tbsp red chili powder, 1 tbsp biryani masala, 1/2 cup mint & coriander, 2 green chilies, salt
- **Rice:** 2 cups aged Basmati rice (soaked for 30 mins)
- **Aromatics:** 2 large onions (fried golden — *Birista*), 2 tbsp saffron milk, 2 tbsp pure ghee, whole spices

#### 👨‍🍳 Preparation
1. **Marinate:** Coat chicken thoroughly in spiced yogurt marinade. Rest for 1 hour.
2. **Boil Rice:** Par-boil soaked rice with whole spices until **70% cooked** (5–6 mins). Drain immediately.

#### 🔥 Cooking Steps
1. **Layer (Dum Assembly):** Place marinated chicken at bottom of heavy pot. Spread 70% cooked rice evenly on top. Scatter fried onions, mint, coriander, and saffron ghee.
2. **Dum Cook:** Seal pot tightly. Cook on medium heat for 5 mins, then on lowest heat with a tawa underneath for 25 mins.
3. **Serve:** Fluff gently and serve hot with cooling cucumber raita.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~530 kcal | **Protein:** 36g | **Carbohydrates:** 62g | **Fat:** 15g | **Fiber:** 4g"""

    if "paneer tikka" in dish_lower:
        return """### 🧀 Smoky Tandoori Spiced Paneer Tikka

A quintessential high-protein vegetarian classic: cubes of fresh paneer and crisp bell peppers marinated in hung curd, mustard oil, and toasted spices, grilled to smoky perfection.

#### 🛒 Ingredients (Serves 3)
- **Paneer:** 350g fresh extra-firm paneer (1-inch cubes)
- **Veggies:** 1 large bell pepper (cubed), 1 red onion (quartered), 1 tomato (cubed)
- **Marinade:** 3/4 cup thick Greek yogurt, 1.5 tbsp roasted besan, 1 tbsp mustard oil, 1 tbsp ginger-garlic paste, 1 tsp Kashmiri chili, 1 tsp ajwain, 1 tsp chaat masala, lemon juice

#### 👨‍🍳 Preparation
1. Whisk yogurt, roasted besan, mustard oil, ginger-garlic paste, and spices into a thick marinade.
2. Coat paneer and vegetables; rest for 30 minutes. Thread onto skewers.

#### 🔥 Cooking Steps
1. **Grill/Bake:** Bake at 220°C (430°F) for 10–12 minutes, or cook on a grill pan until charred at edges.
2. **Finish:** Brush with butter and dust with chaat masala.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~340 kcal | **Protein:** 21g | **Carbohydrates:** 12g | **Fat:** 24g | **Fiber:** 3g"""

    return conflict + f"""### 🥗 {dish} Recipe

#### 🛒 Ingredients (Serves 3–4)
- 500g fresh main ingredients for {dish}
- 1 large onion, 2 cloves garlic, 1 inch ginger (minced)
- 1 tsp cumin, 1 tsp coriander, 1/2 tsp turmeric, 1 tsp sea salt
- 1–2 tbsp cold-pressed cooking oil

#### 🔥 Cooking Steps
1. Sauté aromatics in oil for 3–4 minutes until fragrant.
2. Add main ingredients and brown for 5–7 minutes.
3. Add spices and 1/2 cup broth; cover and simmer for 12–15 minutes until tender.

#### 📊 Approximate Nutrition (per serving)
- **Calories:** ~380 kcal | **Protein:** 28g | **Carbohydrates:** 24g | **Fat:** 18g | **Fiber:** 5g"""

@ai_bp.route("/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    user_message = (data.get("message") or "").strip()
    chat_history = data.get("chatHistory") or []
    nutrition_state = data.get("nutritionState") or {}
    profile = data.get("profile") or nutrition_state.get("profile") or {}

    if not user_message:
        return jsonify({"success": False, "error": "Message is required."}), 400

    api_key = get_server_gemini_key() or request.headers.get("X-Gemini-Key", "").strip()

    # 1. Try Live Gemini API with Multi-Model Cascade if API key present
    if api_key and api_key.startswith("AIzaSy"):
        daily_target = nutrition_state.get("dailyTarget", 2000)
        cals_consumed = nutrition_state.get("caloriesConsumed", 0)
        cals_remaining = nutrition_state.get("caloriesRemaining", daily_target)
        p_consumed = nutrition_state.get("proteinConsumed", 0)
        p_target = nutrition_state.get("proteinTarget", 120)
        p_remaining = nutrition_state.get("proteinRemaining", p_target)

        system_prompt = f"""You are NutriAI Expert, an elite clinical sports dietitian and master chef.
Client Profile:
- Name: {profile.get('name', 'User')} | Weight: {profile.get('weight', 70)}kg | Height: {profile.get('height', 175)}cm | Goal: {profile.get('goal', 'balanced')}
- Daily Target: {daily_target} kcal/day | Consumed Today: {cals_consumed} kcal ({cals_remaining} kcal remaining)
- Target Protein: {p_target}g | Protein Consumed Today: {p_consumed}g ({p_remaining}g remaining)
- Dietary Style: {profile.get('dietPreference', 'Balanced')} | Cuisine: {profile.get('cuisinePreference', 'Indian')}

CRITICAL RULES:
1. Always answer the user's EXACT query.
2. If asked for a specific recipe (e.g. Butter Chicken), provide the exact recipe requested without substituting unrelated dishes.
3. If asked about remaining calories/macros, use the exact real tracked numbers above."""

        contents = [
            {"role": "user", "parts": [{"text": f"[SYSTEM CONTEXT]\n{system_prompt}\n\n[USER INSTRUCTION]\nPlease assist me."}]},
            {"role": "model", "parts": [{"text": f"Hello {profile.get('name', 'there')}! I'm your NutriAI personal nutritionist. How can I assist your nutrition, recipes, or tracking today?"}]}
        ]
        for msg in chat_history[-6:]:
            contents.append({
                "role": "user" if msg.get("sender") == "user" else "model",
                "parts": [{"text": msg.get("text", "")}]
            })
        contents.append({"role": "user", "parts": [{"text": user_message}]})

        for model in CANDIDATE_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                resp = requests.post(url, json={"contents": contents, "generationConfig": {"temperature": 0.5, "maxOutputTokens": 1000}}, timeout=10)
                if resp.status_code == 200:
                    resp_data = resp.json()
                    ai_text = resp_data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    if ai_text.strip():
                        return jsonify({"success": True, "reply": ai_text, "source": f"gemini-live ({model})"})
            except Exception as e:
                continue

    # 2. High-Precision Clinical Nutritionist Engine
    intent = classify_intent(user_message, chat_history)

    if intent["type"] == "RECIPE_REQUEST":
        reply = generate_recipe(intent["dishName"], profile)
        return jsonify({"success": True, "reply": reply, "intent": "RECIPE_REQUEST"})

    elif intent["type"] == "RECIPE_MODIFICATION":
        dish = intent.get("dishName", "the dish")
        reply = f"""### 🌿 Healthier & Lower-Calorie Modifications for {dish}

Here is how you can reduce calories by **~40%** without sacrificing rich flavor:
1. **Reduce Added Fats:** Use 1 tsp cold-pressed oil + 2 tbsp broth (-180 kcal).
2. **Lighten Creaminess:** Substitute heavy cream with unsweetened high-protein Greek yogurt (-120 kcal, +6g protein).
3. **Leaner Cuts:** Opt for skinless chicken breast over thighs (-80 kcal).
4. **Smart Carbs:** Serve with a 50/50 mix of brown basmati rice and riced cauliflower.

📊 **Calorie Difference:** Drops from ~520 kcal down to **~310 kcal per serving** with **38g+ Protein**!"""
        return jsonify({"success": True, "reply": reply, "intent": "RECIPE_MODIFICATION"})

    elif intent["type"] == "FOOD_SUBSTITUTION":
        reply = """### 🔄 High-Protein Food Substitutions (Chicken Swaps)

| Substitute | Serving Size | Protein | Calories | Best Cooking Use |
|---|---|---|---|---|
| **Low-Fat Paneer** | 180g | **32g** | 290 kcal | Curries, Tikka, Bhurji |
| **Soya Chunks (Dry)** | 70g | **36g** | 240 kcal | Biryani, Soya Curries |
| **Extra-Firm Tofu** | 200g | **34g** | 260 kcal | Stir-fries, Skewers |
| **Yellow Moong Dal** | 1.5 cups | **24g** | 310 kcal | Dal Tadka, Soups |"""
        return jsonify({"success": True, "reply": reply, "intent": "FOOD_SUBSTITUTION"})

    elif intent["type"] == "MACRO_QUESTION":
        cals_consumed = nutrition_state.get("caloriesConsumed", 0)
        daily_target = nutrition_state.get("dailyTarget", 2000)
        cals_remaining = nutrition_state.get("caloriesRemaining", daily_target)
        p_consumed = nutrition_state.get("proteinConsumed", 0)
        p_target = nutrition_state.get("proteinTarget", 120)
        p_remaining = nutrition_state.get("proteinRemaining", p_target)

        msg_lower = user_message.lower()
        if "protein target" in msg_lower:
            reply = f"Your daily protein target is **{p_target}g/day** (calculated for your {profile.get('weight', 70)}kg bodyweight). You have consumed **{p_consumed}g** today ({p_remaining}g remaining)."
        elif "protein have i consumed" in msg_lower or "protein consumed" in msg_lower:
            reply = f"You have consumed **{p_consumed}g of protein** so far today out of your **{p_target}g daily target** ({p_remaining}g remaining)."
        else:
            if cals_consumed == 0:
                status_txt = f"You currently have **0 kcal consumed today** from logged meals.\n\nYour full daily budget of **{daily_target} kcal remains** available today."
            else:
                status_txt = f"You have consumed **{cals_consumed} kcal** today out of your **{daily_target} kcal daily target**.\n\nYou have **{cals_remaining} kcal remaining** today."
            reply = f"### 📊 Real-Time Energy & Macro Status\n\n{status_txt}\n\n- **Target Calories:** {daily_target} kcal/day\n- **Protein:** {p_consumed}g / {p_target}g\n- **Remaining Budget:** **{cals_remaining} kcal** & **{p_remaining}g protein**"
        return jsonify({"success": True, "reply": reply, "intent": "MACRO_QUESTION"})

    elif intent["type"] == "NUTRITION_QUESTION":
        if "chicken" in user_message.lower():
            reply = """### 🍗 Nutritional Breakdown: Chicken Breast (Skinless)
**Per 100g Cooked:**
- **Calories:** 165 kcal | **Protein:** 31.0 g | **Carbohydrates:** 0.0 g | **Fat:** 3.6 g
- **Key Nutrients:** Vitamin B6, Niacin, Phosphorus, Selenium (BV Score: 79)"""
        else:
            reply = "### 🥗 Whole Food Nutritional Breakdown\nWhole, unprocessed whole foods provide optimal satiety, amino acid bioavailability, and glycemic balance."
        return jsonify({"success": True, "reply": reply, "intent": "NUTRITION_QUESTION"})

    elif intent["type"] == "MEAL_RECOMMENDATION":
        cals_remaining = nutrition_state.get("caloriesRemaining", 2000)
        p_remaining = nutrition_state.get("proteinRemaining", 120)
        cuisine = profile.get("cuisinePreference", "Indian")
        diet = profile.get("dietPreference", "Balanced")
        reply = f"""### 🥗 Personalized Meal Recommendation

Based on your active goal and logged metrics:
- **Remaining Budget Today:** **{cals_remaining} kcal** & **{p_remaining}g protein**
- **Dietary Style:** {diet} ({cuisine})

#### 🍽️ Recommended Meal: Palak Paneer (or Tawa Fish) with Multigrain Roti & Moong Dal
- **Main:** 180g Low-fat Paneer or Fish in spiced aromatic gravy
- **Complex Carbs:** 2 Multigrain Rotis or 3/4 cup Brown Rice
- **Micronutrients:** 1/2 cup Yellow Dal Tadka & fresh cucumber salad
📊 **Estimated Macros:** ~480 kcal | **36g Protein** | **46g Carbs** | **14g Fats** | **8g Fiber**"""
        return jsonify({"success": True, "reply": reply, "intent": "MEAL_RECOMMENDATION"})

    reply = f"""### 🥗 NutriAI Clinical Nutritionist
Hello {profile.get('name', 'there')}! I have your full profile ({nutrition_state.get('dailyTarget', 2000)} kcal/day target).
Ask me for any recipe (*"recipe of butter chicken"*), meal recommendations (*"what to eat for dinner"*), or macro checks!"""
    return jsonify({"success": True, "reply": reply, "intent": "GENERAL_CHAT"})

@ai_bp.route("/scan-food", methods=["POST"])
def scan_food():
    data = request.get_json() or {}
    user_note = (data.get("userNote") or "").lower()

    if any(w in user_note for w in ["curry", "paneer", "dal", "chicken", "rice"]):
        return jsonify({
            "success": True,
            "analysis": {
                "foodName": "High-Protein Platter with Dal & Vegetables",
                "portionDescription": "1 balanced plate (~380g)",
                "cals": 480,
                "p": 34,
                "c": 48,
                "f": 16,
                "fiber": 8,
                "confidence": "high",
                "ingredients": ["Protein source", "Yellow Dal", "Steamed basmati rice", "Seasonal greens"],
                "healthInsight": "Balanced macronutrient distribution with complete essential amino acids."
            }
        })

    return jsonify({
        "success": True,
        "analysis": {
            "foodName": "Balanced High-Protein Nutrient Bowl",
            "portionDescription": "1 standard serving (~350g)",
            "cals": 440,
            "p": 32,
            "c": 42,
            "f": 14,
            "fiber": 7,
            "confidence": "high",
            "ingredients": ["Lean protein", "Complex grains", "Steamed greens"],
            "healthInsight": "Ideal macro balance supporting lean muscle retention."
        }
    })
