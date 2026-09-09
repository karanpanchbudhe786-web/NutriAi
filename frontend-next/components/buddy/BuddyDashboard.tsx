'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export const BuddyDashboard: React.FC = () => {
  const { user } = useAuth();
  const profile = user?.buddyProfile;

  // Hydration state with +250ml action
  const waterGoal = profile?.waterGoalMl || 3200;
  const [waterLogged, setWaterLogged] = useState(1500);

  // Meal log demo state
  const [meals, setMeals] = useState([
    {
      id: 'm1',
      name: 'Paneer Bhurji & Multigrain Rotis',
      venue: 'The Study Mess',
      mealType: 'Breakfast',
      calories: 420,
      protein: 24,
      carbs: 38,
      fats: 16,
      time: '8:45 AM',
    },
    {
      id: 'm2',
      name: 'Campus High-Protein Thali',
      venue: 'Campus Bites Canteen',
      mealType: 'Lunch',
      calories: 680,
      protein: 34,
      carbs: 82,
      fats: 18,
      time: '1:15 PM',
    },
  ]);

  // Log +250ml water action
  const handleAddWater = () => {
    setWaterLogged((prev) => Math.min(prev + 250, waterGoal + 1000));
  };

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.carbs, 0);
  const totalFats = meals.reduce((sum, m) => sum + m.fats, 0);

  const waterPercent = Math.min(100, Math.round((waterLogged / waterGoal) * 100));

  return (
    <div className="space-y-8 p-8">
      {/* 1. Header Greeting & Goal Snapshot */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-6 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
            <span>🌿</span>
            <span>Gen-Z Campus Nutrition</span>
          </span>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900">
            Good morning, {profile?.name || 'there'} 👋
          </h1>
          <p className="text-xs text-gray-600">
            Primary Target: <strong className="text-emerald-700">{profile?.goal}</strong> • Daily Calorie Budget:{' '}
            <strong className="text-gray-900">{profile?.dailyCalorieTarget || 2150} kcal</strong>
          </p>
        </div>

        {/* Wearable Quick Sync Indicator */}
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-xl text-sky-600">
            ⌚
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <span>{profile?.wearableType || 'Apple Health'}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-[11px] text-gray-500">Synced 4m ago • 7,420 steps</div>
          </div>
        </div>
      </div>

      {/* 2. Top Stats Grid: Wearable Sync, Hydration (+250ml), and Macro Rings */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Card A: Wearable Sync & Steps */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Daily Activity & Wearable
            </span>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
              Active Sync
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900">7,420</span>
            <span className="text-xs font-semibold text-gray-500">/ 10,000 steps</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-sky-500" style={{ width: '74%' }}></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-xs">
            <div>
              <span className="text-gray-400">Active Burn:</span>{' '}
              <strong className="text-gray-800">420 kcal</strong>
            </div>
            <div>
              <span className="text-gray-400">Heart Rate:</span>{' '}
              <strong className="text-gray-800">72 bpm</strong>
            </div>
          </div>
        </div>

        {/* Card B: Hydration Logger (+250ml Action) */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Campus Hydration
            </span>
            <button
              type="button"
              onClick={handleAddWater}
              className="flex items-center gap-1 rounded-full bg-sky-500 px-3 py-1 text-xs font-bold text-white shadow-xs transition-transform hover:scale-105 active:scale-95"
            >
              <span>💧</span>
              <span>+250ml</span>
            </button>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-sky-600">{(waterLogged / 1000).toFixed(2)}</span>
            <span className="text-xs font-semibold text-gray-500">
              / {(waterGoal / 1000).toFixed(1)}L Goal
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${waterPercent}%` }}
            ></div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
            <span>Progress: {waterPercent}%</span>
            <span>Remaining: {Math.max(0, waterGoal - waterLogged)}ml</span>
          </div>
        </div>

        {/* Card C: Macro Intake Status */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Today's Macros
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {totalCalories} / {profile?.dailyCalorieTarget || 2150} kcal
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-sky-50 p-2.5">
              <div className="text-[10px] font-bold text-sky-700">Protein</div>
              <div className="text-lg font-black text-sky-900">{totalProtein}g</div>
              <div className="text-[9px] text-gray-500">Target: 120g</div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-2.5">
              <div className="text-[10px] font-bold text-amber-700">Carbs</div>
              <div className="text-lg font-black text-amber-900">{totalCarbs}g</div>
              <div className="text-[9px] text-gray-500">Target: 240g</div>
            </div>
            <div className="rounded-2xl bg-rose-50 p-2.5">
              <div className="text-[10px] font-bold text-rose-700">Fats</div>
              <div className="text-lg font-black text-rose-900">{totalFats}g</div>
              <div className="text-[9px] text-gray-500">Target: 65g</div>
            </div>
          </div>
          <div className="mt-3 text-center text-[11px] font-medium text-gray-400">
            {profile?.dailyCalorieTarget
              ? Math.max(0, profile.dailyCalorieTarget - totalCalories)
              : 1050}{' '}
            kcal remaining today
          </div>
        </div>
      </div>

      {/* 3. Campus Food Discovery Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-gray-900">Campus Food Discovery</h2>
            <p className="text-xs text-gray-500">
              Verified nutritious meals at your mess & canteens near 📍 FC Road, Pune
            </p>
          </div>
          <span className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-2xs">
            4 Campus Partners Active
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'The Study Mess',
              dist: '0.8 km',
              rating: '4.8',
              tag: 'High Protein',
              tagColor: 'bg-emerald-100 text-emerald-800',
              highlight: 'Special Paneer Bhurji Plate (32g Protein)',
            },
            {
              name: 'Campus Bites',
              dist: '1.2 km',
              rating: '4.6',
              tag: 'Budget Friendly',
              tagColor: 'bg-sky-100 text-sky-800',
              highlight: 'Student Mini Thali (Low Oil, High Fiber)',
            },
            {
              name: 'Green Bowl Canteen',
              dist: '1.4 km',
              rating: '4.7',
              tag: 'Healthy',
              tagColor: 'bg-teal-100 text-teal-800',
              highlight: 'Quinoa Sprouts Salad Bowl',
            },
            {
              name: 'SP College Mess',
              dist: '2.1 km',
              rating: '4.5',
              tag: 'Traditional',
              tagColor: 'bg-amber-100 text-amber-800',
              highlight: 'Homestyle Moong Dal Khichdi',
            },
          ].map((canteen, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-3xl border border-gray-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${canteen.tagColor}`}>
                    {canteen.tag}
                  </span>
                  <span className="text-xs font-bold text-amber-500">★ {canteen.rating}</span>
                </div>
                <h3 className="mt-3 text-base font-bold text-gray-900">{canteen.name}</h3>
                <p className="text-xs text-gray-500">📍 {canteen.dist} from campus gate</p>
                <div className="mt-3 rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600">
                  <strong className="text-gray-900">Featured:</strong> {canteen.highlight}
                </div>
              </div>

              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-emerald-50 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
              >
                View Nutritious Menu →
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Today's Logged Meals */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Today's Meal Schedule</h2>
            <p className="text-xs text-gray-500">Tracked meals automatically sync with your metabolic plan</p>
          </div>
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            + Log Custom Meal
          </button>
        </div>

        <div className="mt-4 divide-y divide-gray-100">
          {meals.map((meal) => (
            <div key={meal.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                  🥗
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{meal.name}</div>
                  <div className="text-xs text-gray-500">
                    {meal.venue} • {meal.mealType} at {meal.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="font-bold text-gray-900">{meal.calories} kcal</div>
                <div className="text-sky-700">{meal.protein}g P</div>
                <div className="text-amber-700">{meal.carbs}g C</div>
                <div className="text-rose-700">{meal.fats}g F</div>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Logged
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuddyDashboard;
