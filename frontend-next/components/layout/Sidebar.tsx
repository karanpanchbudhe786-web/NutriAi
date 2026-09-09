'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, isBuddy, isBusiness, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white shadow-sm">
      {/* 1. Brand Logo Header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-sm">
          🥗
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-extrabold tracking-tight text-gray-900">
            Nutri<span className="text-emerald-600">AI</span>
          </span>
          <span className="text-[10px] font-medium text-gray-400">
            {isBusiness ? 'Campus Partner Portal' : 'Good Food. Brighter You'}
          </span>
        </div>
      </div>

      {/* 2. Navigation Content — Role Partitioned */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {/* =========================================================
            ROLE A: BUDDY SIDEBAR (Students / Consumers)
            Strictly displays EXPLORE; "FOR BUSINESS" is completely omitted
           ========================================================= */}
        {isBuddy && (
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Explore
            </div>

            <Link
              href="/home"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/home')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">🏠</span>
              <span>Home</span>
            </Link>

            <Link
              href="/meals"
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/meals')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🍽️</span>
                <span>Meals Near You</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Fresh
              </span>
            </Link>

            <Link
              href="/nutrition"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/nutrition')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">📊</span>
              <span>Nutrition Tracker</span>
            </Link>

            <Link
              href="/rewards"
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/rewards')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🎁</span>
                <span>Offers & Rewards</span>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                Perks
              </span>
            </Link>

            <Link
              href="/community"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/community')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">👥</span>
              <span>Community</span>
            </Link>

            {/* AI Assistant for Buddies */}
            <div className="pt-4">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                AI Coach
              </div>
              <Link
                href="/ai-chat"
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive('/ai-chat')
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">🤖</span>
                  <span>AI Nutritionist</span>
                </div>
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                  Live
                </span>
              </Link>
            </div>
          </div>
        )}

        {/* =========================================================
            ROLE B: BUSINESS SIDEBAR (Mess & Canteen Partners)
            Strictly displays BUSINESS MANAGEMENT; Consumer EXPLORE is omitted
           ========================================================= */}
        {isBusiness && (
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Business Management
            </div>

            <Link
              href="/business/dashboard"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/business/dashboard')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">🏪</span>
              <span>Canteen Dashboard</span>
            </Link>

            <Link
              href="/business/menu"
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/business/menu')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🥗</span>
                <span>Menu & Recipe Planner</span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                Live
              </span>
            </Link>

            <Link
              href="/business/orders"
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/business/orders')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">🧾</span>
                <span>Order & Sales Summary</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Today
              </span>
            </Link>

            <Link
              href="/business/insights"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive('/business/insights')
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-base">📈</span>
              <span>Nutrition Insights</span>
            </Link>

            {/* Business Support */}
            <div className="pt-4">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Partner Support
              </div>
              <Link
                href="/business/settings"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive('/business/settings')
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-base">⚙️</span>
                <span>Store Profile & Hours</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 3. Role-Specific Profile Footer */}
      <div className="border-t border-gray-100 bg-gray-50/70 p-4">
        {isBuddy && user.buddyProfile && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">
                {user.buddyProfile.avatar || user.buddyProfile.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-900">
                  {user.buddyProfile.name}
                </div>
                <div className="truncate text-xs font-medium text-emerald-600">
                  🎯 {user.buddyProfile.goal}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs">
              <Link
                href="/settings"
                className="flex-1 rounded-lg border border-gray-200 bg-white py-1.5 text-center font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex-1 rounded-lg border border-red-200 bg-white py-1.5 text-center font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {isBusiness && user.businessProfile && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-white shadow-sm">
                🏪
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-900">
                  {user.businessProfile.canteenName}
                </div>
                <div className="truncate text-[11px] text-gray-500">
                  📍 {user.businessProfile.campusLocation}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs">
              <Link
                href="/business/settings"
                className="flex-1 rounded-lg border border-gray-200 bg-white py-1.5 text-center font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Canteen Settings
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex-1 rounded-lg border border-red-200 bg-white py-1.5 text-center font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
