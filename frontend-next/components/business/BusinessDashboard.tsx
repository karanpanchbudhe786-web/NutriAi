'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MenuItem } from '../../types/auth';

export const BusinessDashboard: React.FC = () => {
  const { user } = useAuth();
  const profile = user?.businessProfile;

  // Recipe/Menu items state
  const [recipes, setRecipes] = useState<MenuItem[]>([
    {
      id: 'r1',
      name: 'Paneer Bhurji & Multigrain Rotis',
      category: 'Breakfast',
      price: 90,
      calories: 420,
      proteinG: 24,
      carbsG: 38,
      fatsG: 16,
      ingredients: ['Fresh Paneer 100g', 'Multigrain Flour', 'Onions', 'Tomatoes', 'Cold Pressed Oil'],
      allergens: ['Dairy', 'Gluten'],
      isAvailable: true,
      demandScore: 94,
    },
    {
      id: 'r2',
      name: 'High-Protein Soya Chunks Curry & Rice',
      category: 'Lunch',
      price: 110,
      calories: 520,
      proteinG: 36,
      carbsG: 68,
      fatsG: 12,
      ingredients: ['Textured Soya Chunks', 'Brown Basmati Rice', 'Spiced Onion Puree'],
      allergens: ['Soy'],
      isAvailable: true,
      demandScore: 88,
    },
    {
      id: 'r3',
      name: 'Sprouted Moong & Peanut Chaat',
      category: 'Snacks',
      price: 50,
      calories: 260,
      proteinG: 16,
      carbsG: 32,
      fatsG: 8,
      ingredients: ['Sprouted Moong', 'Roasted Peanuts', 'Lemon Juice', 'Chaat Masala', 'Cucumber'],
      allergens: ['Peanuts'],
      isAvailable: true,
      demandScore: 81,
    },
  ]);

  // Modal / new dish state
  const [showAddDish, setShowAddDish] = useState(false);
  const [newDish, setNewDish] = useState({
    name: '',
    category: 'Lunch' as MenuItem['category'],
    price: 80,
    calories: 400,
    proteinG: 20,
    carbsG: 50,
    fatsG: 12,
    ingredients: '',
    allergens: '',
  });

  const handleAddDishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item: MenuItem = {
      id: `r_${Date.now()}`,
      name: newDish.name,
      category: newDish.category,
      price: Number(newDish.price),
      calories: Number(newDish.calories),
      proteinG: Number(newDish.proteinG),
      carbsG: Number(newDish.carbsG),
      fatsG: Number(newDish.fatsG),
      ingredients: newDish.ingredients.split(',').map((s) => s.trim()),
      allergens: newDish.allergens ? newDish.allergens.split(',').map((s) => s.trim()) : [],
      isAvailable: true,
      demandScore: 75,
    };
    setRecipes([item, ...recipes]);
    setShowAddDish(false);
    setNewDish({
      name: '',
      category: 'Lunch',
      price: 80,
      calories: 400,
      proteinG: 20,
      carbsG: 50,
      fatsG: 12,
      ingredients: '',
      allergens: '',
    });
  };

  const toggleAvailability = (id: string) => {
    setRecipes(
      recipes.map((r) => (r.id === id ? { ...r, isAvailable: !r.isAvailable } : r))
    );
  };

  return (
    <div className="space-y-8 p-8">
      {/* 1. Header Canteen Operations Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-white p-6 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <span>🏪</span>
            <span>Campus Partner Operations Hub</span>
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
            {profile?.canteenName || 'Campus Partner Hub'}
          </h1>
          <p className="text-xs text-gray-600">
            Location: <strong>{profile?.campusLocation || 'Campus Food Court'}</strong> • Hours:{' '}
            <strong>{profile?.operatingHours || '8 AM – 9 PM'}</strong> • Rating:{' '}
            <strong className="text-amber-600">★ {profile?.rating || 4.8}</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddDish(true)}
          className="flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-amber-700"
        >
          <span>+</span>
          <span>Add New Campus Dish</span>
        </button>
      </div>

      {/* 2. Daily Sales / Orders Summary Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Revenue</div>
          <div className="mt-2 text-3xl font-black text-gray-900">
            ₹{profile?.revenueToday?.toLocaleString() || '18,450'}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span>↑ +14.2%</span>
            <span className="text-gray-400">vs yesterday</span>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Orders Served</div>
          <div className="mt-2 text-3xl font-black text-gray-900">
            {profile?.totalOrdersToday || 142}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <span>↑ +18 orders</span>
            <span className="text-gray-400">during lunch peak</span>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Active Subscriptions
          </div>
          <div className="mt-2 text-3xl font-black text-gray-900">86</div>
          <div className="mt-2 text-xs font-semibold text-gray-500">Monthly Mess Members</div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Average Order Value
          </div>
          <div className="mt-2 text-3xl font-black text-gray-900">₹130</div>
          <div className="mt-2 text-xs font-semibold text-gray-500">₹90 – ₹180 student spend</div>
        </div>
      </div>

      {/* 3. Customer Demand & Nutrition Analytics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Demand Breakdown */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Student Demand & Rush Analytics</h2>
              <p className="text-xs text-gray-500">Live ordering patterns and student meal trends</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              High Protein Trending 🔥
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-700">High Protein Meals (25g+ Protein)</span>
                <span className="text-emerald-700">68% of student searches</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '68%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-700">Balanced Vegetarian Thalis</span>
                <span className="text-sky-700">22% of student searches</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-sky-500" style={{ width: '22%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-700">Low Oil / Low Calorie Salads</span>
                <span className="text-amber-700">10% of student searches</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-amber-500" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-amber-50/60 p-4 text-xs text-amber-900">
            <strong>💡 Partner AI Recommendation:</strong> Adding a 30g protein Paneer/Sprouts combo
            between 12:30 PM and 2:00 PM will capture up to 35 additional orders daily.
          </div>
        </div>

        {/* Peak Rush Hours Card */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-bold text-gray-900">Peak Dining Hours</h2>
          <p className="text-xs text-gray-500">Staff preparation forecast</p>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs">
              <span className="font-semibold text-gray-800">8:00 AM – 9:30 AM</span>
              <span className="rounded bg-sky-100 px-2 py-0.5 font-bold text-sky-800">
                Breakfast (Moderate)
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-xs">
              <span className="font-semibold text-rose-900">12:30 PM – 2:30 PM</span>
              <span className="rounded bg-rose-600 px-2 py-0.5 font-bold text-white">
                Lunch (Peak Rush ⚡)
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-xs">
              <span className="font-semibold text-gray-800">5:00 PM – 6:30 PM</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                Snacks (Steady)
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-xs">
              <span className="font-semibold text-rose-900">8:00 PM – 10:00 PM</span>
              <span className="rounded bg-rose-600 px-2 py-0.5 font-bold text-white">
                Dinner (Peak Rush ⚡)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Recipe & Menu Manager with Ingredients & Nutrition Facts */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Active Menu & Recipe Manager</h2>
            <p className="text-xs text-gray-500">
              Each dish displays verified nutrition facts visible to students
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddDish(true)}
            className="rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
          >
            + Add Recipe
          </button>
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          {recipes.map((dish) => (
            <div key={dish.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="max-w-md">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{dish.name}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    {dish.category}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {dish.demandScore}% Student Demand
                  </span>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  <strong>Ingredients:</strong> {dish.ingredients.join(', ')}
                </div>

                {dish.allergens && dish.allergens.length > 0 && (
                  <div className="mt-1 text-[11px] text-amber-700">
                    ⚠️ Contains: {dish.allergens.join(', ')}
                  </div>
                )}
              </div>

              {/* Nutrition Facts Badges */}
              <div className="flex items-center gap-3 text-xs">
                <div className="rounded-xl bg-gray-50 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-gray-400">Price</div>
                  <div className="font-extrabold text-gray-900">₹{dish.price}</div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-emerald-600">Calories</div>
                  <div className="font-extrabold text-emerald-800">{dish.calories}</div>
                </div>
                <div className="rounded-xl bg-sky-50 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-sky-600">Protein</div>
                  <div className="font-extrabold text-sky-800">{dish.proteinG}g</div>
                </div>
                <div className="rounded-xl bg-amber-50 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-amber-600">Carbs</div>
                  <div className="font-extrabold text-amber-800">{dish.carbsG}g</div>
                </div>
                <div className="rounded-xl bg-rose-50 px-3 py-1.5 text-center">
                  <div className="text-[10px] text-rose-600">Fats</div>
                  <div className="font-extrabold text-rose-800">{dish.fatsG}g</div>
                </div>

                {/* In-Stock Toggle */}
                <button
                  type="button"
                  onClick={() => toggleAvailability(dish.id)}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    dish.isAvailable
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {dish.isAvailable ? '✓ In Stock' : '✕ Sold Out'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Recipe Modal */}
      {showAddDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-black text-gray-900">Add New Campus Dish</h3>
              <button
                type="button"
                onClick={() => setShowAddDish(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDishSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newDish.name}
                  onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
                  placeholder="e.g. Quinoa & Paneer Power Bowl"
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Category</label>
                  <select
                    value={newDish.category}
                    onChange={(e) =>
                      setNewDish({ ...newDish, category: e.target.value as MenuItem['category'] })
                    }
                    className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={newDish.price}
                    onChange={(e) => setNewDish({ ...newDish, price: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nutrition Facts Grid */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                <div className="text-xs font-bold uppercase text-gray-700">
                  Nutrition Facts (Per Serving)
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Calories</label>
                    <input
                      type="number"
                      required
                      value={newDish.calories}
                      onChange={(e) =>
                        setNewDish({ ...newDish, calories: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Protein (g)</label>
                    <input
                      type="number"
                      required
                      value={newDish.proteinG}
                      onChange={(e) =>
                        setNewDish({ ...newDish, proteinG: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Carbs (g)</label>
                    <input
                      type="number"
                      required
                      value={newDish.carbsG}
                      onChange={(e) =>
                        setNewDish({ ...newDish, carbsG: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Fats (g)</label>
                    <input
                      type="number"
                      required
                      value={newDish.fatsG}
                      onChange={(e) => setNewDish({ ...newDish, fatsG: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">
                  Ingredients (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quinoa, Paneer, Bell Peppers, Olive Oil"
                  value={newDish.ingredients}
                  onChange={(e) => setNewDish({ ...newDish, ingredients: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700">
                  Allergen Warnings (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dairy, Gluten, Nuts"
                  value={newDish.allergens}
                  onChange={(e) => setNewDish({ ...newDish, allergens: e.target.value })}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDish(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
                >
                  Publish to Campus Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;
