'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface AuthModalProps {
  initialRole?: UserRole;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ initialRole = 'buddy', onSuccess }) => {
  const { loginBuddy, loginBusiness, loginDemoBuddy, loginDemoBusiness } = useAuth();
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<'buddy' | 'business'>(
    initialRole === 'business' ? 'business' : 'buddy'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      if (selectedRole === 'buddy') {
        await loginBuddy(email, password);
        router.push('/home');
      } else {
        await loginBusiness(email, password);
        router.push('/business/dashboard');
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBuddy = () => {
    loginDemoBuddy();
    router.push('/home');
    if (onSuccess) onSuccess();
  };

  const handleDemoBusiness = () => {
    loginDemoBusiness();
    router.push('/business/dashboard');
    if (onSuccess) onSuccess();
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-2xl">
      {/* Brand Icon Header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-md">
          🥗
        </div>
        <h2 className="mt-4 text-2xl font-black text-gray-900">Welcome to NutriAI 👋</h2>
        <p className="mt-1 text-xs text-gray-500">
          Select your portal to continue your campus wellness journey
        </p>
      </div>

      {/* Role Selector Tabs (Buddy vs Business) */}
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
        <button
          type="button"
          onClick={() => setSelectedRole('buddy')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            selectedRole === 'buddy'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>🧑‍🎓</span>
          <span>Buddy Login</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('business')}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            selectedRole === 'business'
              ? 'bg-white text-amber-700 shadow-xs'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>🏪</span>
          <span>Business Login</span>
        </button>
      </div>

      {/* Role Descriptor Banner */}
      <div
        className={`mt-4 rounded-xl p-3 text-xs font-medium ${
          selectedRole === 'buddy'
            ? 'border border-emerald-100 bg-emerald-50 text-emerald-800'
            : 'border border-amber-100 bg-amber-50 text-amber-800'
        }`}
      >
        {selectedRole === 'buddy' ? (
          <div>
            <strong>Student / Foodie Portal:</strong> Access meals near you, calorie & macro tracking,
            wearables sync, and community perks.
          </div>
        ) : (
          <div>
            <strong>Mess & Canteen Partner Portal:</strong> Manage menu nutrition facts, track daily sales
            & orders, and view student demand analytics.
          </div>
        )}
      </div>

      {/* Credentials Form */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            {selectedRole === 'buddy' ? 'Campus Email' : 'Business Email'}
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              selectedRole === 'buddy' ? 'alex.morgan@campus.edu' : 'manager@thestudymess.com'
            }
            className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Password
            </label>
            <button
              type="button"
              className="text-[11px] font-semibold text-emerald-600 hover:underline"
            >
              Forgot?
            </button>
          </div>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-md transition-all ${
            selectedRole === 'buddy'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-amber-600 hover:bg-amber-700'
          }`}
        >
          {loading ? 'Authenticating...' : `Log In as ${selectedRole === 'buddy' ? 'Buddy' : 'Business'} →`}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200"></div>
        <span className="text-[11px] font-bold uppercase text-gray-400">or instant demo</span>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>

      {/* Instant Demo Login Buttons */}
      <div className="space-y-2">
        {selectedRole === 'buddy' ? (
          <button
            type="button"
            onClick={handleDemoBuddy}
            className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-left transition-all hover:bg-emerald-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-xs">
              A
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-900">Alex Morgan — Demo Student</div>
              <div className="text-[11px] text-emerald-700">⚡ Instant Buddy Login (Full Bio & Goals)</div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDemoBusiness}
            className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-left transition-all hover:bg-amber-100"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 font-bold text-white shadow-xs">
              🏪
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-gray-900">The Study Mess — Demo Partner</div>
              <div className="text-[11px] text-amber-700">
                ⚡ Instant Partner Login (Sales & Recipes)
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
