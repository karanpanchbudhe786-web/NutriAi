'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onQuickWaterAdd?: () => void;
  onQuickLogMeal?: () => void;
  onQuickAddRecipe?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  onQuickWaterAdd,
  onQuickLogMeal,
  onQuickAddRecipe,
}) => {
  const { user, isBuddy, isBusiness, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const defaultTitle = isBusiness
    ? user?.businessProfile?.canteenName || 'Partner Portal'
    : 'NutriAI Campus Wellness';

  const defaultSubtitle = isBusiness
    ? 'Campus Mess & Canteen Operations'
    : 'Good Food. Brighter You.';

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white/90 px-8 backdrop-blur-md">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title || defaultTitle}</h1>
        <p className="text-xs text-gray-500">{subtitle || defaultSubtitle}</p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          title="Notifications"
        >
          <span>🔔</span>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        {/* ROLE A: BUDDY QUICK ACTIONS */}
        {isBuddy && (
          <>
            <button
              type="button"
              onClick={onQuickLogMeal}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <span>+</span>
              <span>Log Meal</span>
            </button>

            <button
              type="button"
              onClick={onQuickWaterAdd}
              className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
            >
              <span>💧</span>
              <span>+250ml</span>
            </button>
          </>
        )}

        {/* ROLE B: BUSINESS QUICK ACTIONS */}
        {isBusiness && (
          <>
            <button
              type="button"
              onClick={onQuickAddRecipe}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <span>+</span>
              <span>New Dish</span>
            </button>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              ⚡ Store Online
            </div>
          </>
        )}

        {/* User Role Badge & Dropdown */}
        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1.5 pr-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">
              {isBuddy ? user?.buddyProfile?.avatar || 'A' : '🏪'}
            </div>
            <span className="text-xs font-semibold text-gray-700">
              {isBuddy ? user?.buddyProfile?.name : user?.businessProfile?.canteenName}
            </span>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">
              {user?.role}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
              <div className="border-b border-gray-100 px-3 py-2">
                <div className="text-xs font-semibold text-gray-900">{user?.email}</div>
                <div className="text-[11px] text-emerald-600 capitalize">
                  {user?.role === 'buddy' ? 'Student Foodie Profile' : 'Campus Canteen Partner'}
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  <span>↪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
