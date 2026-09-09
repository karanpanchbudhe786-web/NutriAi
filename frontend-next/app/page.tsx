'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { AuthModal } from '../components/auth/AuthModal';
import { BuddyDashboard } from '../components/buddy/BuddyDashboard';
import { BuddyOnboarding } from '../components/buddy/BuddyOnboarding';
import { BusinessDashboard } from '../components/business/BusinessDashboard';
import { BusinessOnboarding } from '../components/business/BusinessOnboarding';

export default function App() {
  const { user, role, isAuthenticated, isBuddy, isBusiness, loginDemoBuddy, loginDemoBusiness, logout } =
    useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'onboarding'>('dashboard');

  // If unauthenticated: Display Landing / Auth Screen
  if (!isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-radial from-emerald-50 via-teal-50/40 to-gray-50 p-6">
        <AuthModal />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Dynamic RBAC Sidebar (strictly adapts to role) */}
      <Sidebar />

      {/* 2. Main App Content Area (offset by w-64 for sidebar) */}
      <div className="pl-64">
        {/* Dynamic Topbar */}
        <Topbar
          title={
            isBuddy
              ? activeTab === 'dashboard'
                ? 'Buddy Dashboard & Nutrition'
                : 'Buddy Physiology Onboarding'
              : activeTab === 'dashboard'
              ? 'Partner Canteen Hub'
              : 'Register Canteen Partner'
          }
        />

        {/* Dual-Role Testing Banner & Quick Switcher */}
        <div className="border-b border-gray-200 bg-white px-8 py-2.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Active RBAC Session:</span>
              <strong className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 uppercase">
                {role}
              </strong>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {isBuddy ? user.buddyProfile?.name : user.businessProfile?.canteenName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">View Mode:</span>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  activeTab === 'dashboard'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('onboarding')}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  activeTab === 'onboarding'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Onboarding Flow
              </button>

              <span className="mx-1 text-gray-300">|</span>

              <span className="text-gray-400">Switch Role:</span>
              <button
                type="button"
                onClick={loginDemoBuddy}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  isBuddy
                    ? 'border border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🧑‍🎓 Buddy
              </button>
              <button
                type="button"
                onClick={loginDemoBusiness}
                className={`rounded-lg px-2.5 py-1 font-bold ${
                  isBusiness
                    ? 'border border-amber-500 bg-amber-50 text-amber-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🏪 Business
              </button>
            </div>
          </div>
        </div>

        {/* 3. Main Dashboard or Onboarding View */}
        <main className="pb-16">
          {isBuddy && (
            <>
              {activeTab === 'dashboard' ? (
                <BuddyDashboard />
              ) : (
                <div className="py-8">
                  <BuddyOnboarding onComplete={() => setActiveTab('dashboard')} />
                </div>
              )}
            </>
          )}

          {isBusiness && (
            <>
              {activeTab === 'dashboard' ? (
                <BusinessDashboard />
              ) : (
                <div className="py-8">
                  <BusinessOnboarding onComplete={() => setActiveTab('dashboard')} />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
