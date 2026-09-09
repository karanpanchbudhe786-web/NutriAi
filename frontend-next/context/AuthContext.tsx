'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, BuddyProfile, BusinessProfile } from '../types/auth';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBuddy: boolean;
  isBusiness: boolean;
  loginBuddy: (email: string, password?: string) => Promise<void>;
  loginBusiness: (email: string, password?: string) => Promise<void>;
  loginDemoBuddy: () => void;
  loginDemoBusiness: () => void;
  onboardBuddy: (profile: BuddyProfile) => void;
  onboardBusiness: (profile: BusinessProfile) => void;
  logout: () => void;
}

const DEMO_BUDDY_USER: User = {
  id: 'usr_buddy_demo_01',
  email: 'alex.morgan@campus.edu',
  role: 'buddy',
  createdAt: new Date().toISOString(),
  buddyProfile: {
    name: 'Alex Morgan',
    email: 'alex.morgan@campus.edu',
    avatar: 'A',
    age: 21,
    gender: 'male',
    heightCm: 178,
    weightKg: 72,
    goal: 'Lean Fat Loss',
    targetBmi: 22.7,
    waterGoalMl: 3200,
    dailyCalorieTarget: 2150,
    wearableConnected: true,
    wearableType: 'Apple Health',
  },
};

const DEMO_BUSINESS_USER: User = {
  id: 'usr_biz_demo_01',
  email: 'manager@thestudymess.com',
  role: 'business',
  createdAt: new Date().toISOString(),
  businessProfile: {
    canteenName: 'The Study Mess',
    ownerName: 'Vikram Joshi',
    email: 'manager@thestudymess.com',
    avatar: 'S',
    campusLocation: 'FC Road, Opposite Gate 2, Pune',
    phone: '+91 98220 12345',
    category: 'Mess',
    rating: 4.8,
    totalOrdersToday: 142,
    revenueToday: 18450,
    operatingHours: '7:30 AM – 10:00 PM',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'nutriai_auth_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Rehydrate auth state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUser(parsed);
      }
    } catch (e) {
      console.error('Failed to load session:', e);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const persistUser = (newUser: User | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      // Set a cookie so Next.js Edge Middleware can inspect role server-side
      document.cookie = `nutriai_role=${newUser.role}; path=/; max-age=604800; SameSite=Lax`;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `nutriai_role=; path=/; max-age=0; SameSite=Lax`;
    }
  };

  const loginBuddy = async (email: string) => {
    setIsLoading(true);
    // Simulate real auth call
    await new Promise((res) => setTimeout(res, 400));
    const buddyUser: User = {
      id: `usr_${Date.now()}`,
      email,
      role: 'buddy',
      createdAt: new Date().toISOString(),
      buddyProfile: {
        name: email.split('@')[0],
        email,
        age: 20,
        gender: 'other',
        heightCm: 172,
        weightKg: 68,
        goal: 'Balanced Nutrition',
        targetBmi: 23.0,
        waterGoalMl: 3000,
        dailyCalorieTarget: 2000,
      },
    };
    persistUser(buddyUser);
    setIsLoading(false);
  };

  const loginBusiness = async (email: string) => {
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 400));
    const bizUser: User = {
      id: `biz_${Date.now()}`,
      email,
      role: 'business',
      createdAt: new Date().toISOString(),
      businessProfile: {
        canteenName: email.split('@')[0].replace('.', ' ').toUpperCase(),
        ownerName: 'Partner Owner',
        email,
        campusLocation: 'Campus Main Building, Floor 1',
        category: 'Canteen',
        rating: 4.6,
        totalOrdersToday: 0,
        revenueToday: 0,
        operatingHours: '8:00 AM – 9:00 PM',
      },
    };
    persistUser(bizUser);
    setIsLoading(false);
  };

  const loginDemoBuddy = () => {
    persistUser(DEMO_BUDDY_USER);
  };

  const loginDemoBusiness = () => {
    persistUser(DEMO_BUSINESS_USER);
  };

  const onboardBuddy = (profile: BuddyProfile) => {
    if (!user) return;
    const updated: User = {
      ...user,
      buddyProfile: profile,
    };
    persistUser(updated);
  };

  const onboardBusiness = (profile: BusinessProfile) => {
    if (!user) return;
    const updated: User = {
      ...user,
      businessProfile: profile,
    };
    persistUser(updated);
  };

  const logout = () => {
    persistUser(null);
  };

  const role: UserRole = user ? user.role : 'guest';
  const isAuthenticated = !!user;
  const isBuddy = user?.role === 'buddy';
  const isBusiness = user?.role === 'business';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        isBuddy,
        isBusiness,
        loginBuddy,
        loginBusiness,
        loginDemoBuddy,
        loginDemoBusiness,
        onboardBuddy,
        onboardBusiness,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
}
