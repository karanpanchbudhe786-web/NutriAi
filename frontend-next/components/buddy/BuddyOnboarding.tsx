'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BuddyProfile } from '../../types/auth';

interface BuddyOnboardingProps {
  onComplete?: () => void;
}

export const BuddyOnboarding: React.FC<BuddyOnboardingProps> = ({ onComplete }) => {
  const { user, onboardBuddy } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState({
    name: user?.buddyProfile?.name || '',
    email: user?.email || '',
    age: user?.buddyProfile?.age || 20,
    gender: (user?.buddyProfile?.gender || 'male') as 'male' | 'female' | 'other',
    heightCm: user?.buddyProfile?.heightCm || 175,
    weightKg: user?.buddyProfile?.weightKg || 70,
    goal: (user?.buddyProfile?.goal || 'Lean Fat Loss') as
      | 'Lean Fat Loss'
      | 'Muscle Gain'
      | 'Balanced Nutrition'
      | 'Endurance Performance',
    waterGoalMl: user?.buddyProfile?.waterGoalMl || 3000,
    wearableConnected: true,
    wearableType: 'Apple Health' as const,
  });

  // Calculate live clinical metrics
  const heightM = formData.heightCm / 100;
  const currentBmi = parseFloat((formData.weightKg / (heightM * heightM)).toFixed(1));
  const targetBmi = formData.goal === 'Lean Fat Loss' ? 22.0 : 23.5;

  // Mifflin-St Jeor formula estimate
  const bmr =
    formData.gender === 'male'
      ? 10 * formData.weightKg + 6.25 * formData.heightCm - 5 * formData.age + 5
      : 10 * formData.weightKg + 6.25 * formData.heightCm - 5 * formData.age - 161;
  const calorieTarget = Math.round(
    formData.goal === 'Lean Fat Loss' ? bmr * 1.35 - 350 : bmr * 1.45 + 250
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile: BuddyProfile = {
      name: formData.name,
      email: formData.email,
      age: Number(formData.age),
      gender: formData.gender,
      heightCm: Number(formData.heightCm),
      weightKg: Number(formData.weightKg),
      goal: formData.goal,
      targetBmi,
      waterGoalMl: Number(formData.waterGoalMl),
      dailyCalorieTarget: calorieTarget,
      wearableConnected: formData.wearableConnected,
      wearableType: formData.wearableType,
    };
    onboardBuddy(profile);
    if (onComplete) onComplete();
  };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Step {step} of 2 • Buddy Onboarding
          </span>
          <h2 className="mt-2 text-2xl font-black text-gray-900">
            {step === 1 ? 'Personal Bio & Account' : 'Campus Physiology & Metabolic Target'}
          </h2>
        </div>
        <div className="text-3xl">🥗</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Alex Morgan"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="alex.morgan@campus.edu"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Age
                </label>
                <input
                  type="number"
                  required
                  min="16"
                  max="90"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Biological Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gender: e.target.value as 'male' | 'female' | 'other',
                    })
                  }
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Non-binary / Other</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700"
            >
              Continue to Physiology Metrics →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Height (cm)
                </label>
                <input
                  type="number"
                  required
                  min="120"
                  max="230"
                  value={formData.heightCm}
                  onChange={(e) => setFormData({ ...formData, heightCm: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  required
                  min="35"
                  max="200"
                  value={formData.weightKg}
                  onChange={(e) => setFormData({ ...formData, weightKg: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Primary Nutrition Goal
              </label>
              <select
                value={formData.goal}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goal: e.target.value as BuddyProfile['goal'],
                  })
                }
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="Lean Fat Loss">🔥 Lean Fat Loss</option>
                <option value="Muscle Gain">💪 Muscle Hypertrophy & Protein</option>
                <option value="Balanced Nutrition">🥗 Balanced Campus Nutrition</option>
                <option value="Endurance Performance">⚡ High Energy & Endurance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Daily Water Goal (ml)
              </label>
              <input
                type="number"
                step="250"
                min="1000"
                max="6000"
                value={formData.waterGoalMl}
                onChange={(e) => setFormData({ ...formData, waterGoalMl: Number(e.target.value) })}
                className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Recommended: 3,000ml to 3,500ml for active students
              </span>
            </div>

            {/* Real-Time Calculated Target Preview */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                ⚡ Real-Time Calibrated Targets
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white p-2 shadow-xs">
                  <div className="text-[10px] text-gray-500">Current BMI</div>
                  <div className="text-base font-extrabold text-gray-900">{currentBmi}</div>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-xs">
                  <div className="text-[10px] text-gray-500">Target BMI</div>
                  <div className="text-base font-extrabold text-emerald-700">{targetBmi}</div>
                </div>
                <div className="rounded-xl bg-white p-2 shadow-xs">
                  <div className="text-[10px] text-gray-500">Daily Calorie Target</div>
                  <div className="text-base font-extrabold text-emerald-700">
                    {calorieTarget} <span className="text-[10px] font-normal">kcal</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700"
              >
                Save Profile & Enter Buddy Dashboard →
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default BuddyOnboarding;
