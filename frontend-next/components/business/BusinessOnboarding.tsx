'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BusinessProfile } from '../../types/auth';

interface BusinessOnboardingProps {
  onComplete?: () => void;
}

export const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({ onComplete }) => {
  const { user, onboardBusiness } = useAuth();

  const [formData, setFormData] = useState({
    canteenName: user?.businessProfile?.canteenName || '',
    ownerName: user?.businessProfile?.ownerName || '',
    email: user?.email || '',
    campusLocation: user?.businessProfile?.campusLocation || '',
    phone: user?.businessProfile?.phone || '',
    category: (user?.businessProfile?.category || 'Mess') as BusinessProfile['category'],
    operatingHours: user?.businessProfile?.operatingHours || '7:30 AM – 10:00 PM',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile: BusinessProfile = {
      canteenName: formData.canteenName,
      ownerName: formData.ownerName,
      email: formData.email,
      campusLocation: formData.campusLocation,
      phone: formData.phone,
      category: formData.category,
      rating: 4.8,
      totalOrdersToday: 0,
      revenueToday: 0,
      operatingHours: formData.operatingHours,
    };
    onboardBusiness(profile);
    if (onComplete) onComplete();
  };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-gray-100 bg-white p-8 shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Canteen Partner Onboarding
          </span>
          <h2 className="mt-2 text-2xl font-black text-gray-900">
            Register Your Campus Mess or Canteen
          </h2>
          <p className="text-xs text-gray-500">
            Connect directly with health-conscious Gen-Z students on campus
          </p>
        </div>
        <div className="text-3xl">🏪</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Mess / Canteen Brand Name
          </label>
          <input
            type="text"
            required
            value={formData.canteenName}
            onChange={(e) => setFormData({ ...formData, canteenName: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="e.g. The Study Mess"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Proprietor / Manager Name
            </label>
            <input
              type="text"
              required
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="Vikram Joshi"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Contact Phone Number
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="+91 98220 12345"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Business Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="manager@thestudymess.com"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
            Campus Address & Location Landmark
          </label>
          <input
            type="text"
            required
            value={formData.campusLocation}
            onChange={(e) => setFormData({ ...formData, campusLocation: e.target.value })}
            className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="e.g. FC Road, Opposite Fergusson College Gate 2, Pune"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Establishment Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as BusinessProfile['category'],
                })
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <option value="Mess">Campus Mess (Subscription)</option>
              <option value="Canteen">University Canteen (A La Carte)</option>
              <option value="Healthy Cafe">Healthy Student Cafe</option>
              <option value="Juice & Salad Bar">Juice, Smoothie & Salad Bar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Operating Hours
            </label>
            <input
              type="text"
              required
              value={formData.operatingHours}
              onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              placeholder="7:30 AM – 10:00 PM"
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-amber-700"
        >
          Complete Canteen Registration & Open Dashboard →
        </button>
      </form>
    </div>
  );
};

export default BusinessOnboarding;
