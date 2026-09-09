/**
 * NutriAI — RBAC & Authentication Type Definitions
 * Strict dual-role platform types: 'buddy' (student/consumer) vs 'business' (mess/canteen partner)
 */

export type UserRole = 'buddy' | 'business' | 'guest';

export interface BuddyProfile {
  name: string;
  email: string;
  avatar?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  goal: 'Lean Fat Loss' | 'Muscle Gain' | 'Balanced Nutrition' | 'Endurance Performance';
  targetBmi: number;
  waterGoalMl: number;
  dailyCalorieTarget: number;
  wearableConnected?: boolean;
  wearableType?: 'Apple Health' | 'Fitbit' | 'Google Fit' | 'Garmin';
}

export interface BusinessProfile {
  canteenName: string;
  ownerName: string;
  email: string;
  avatar?: string;
  campusLocation: string;
  phone?: string;
  category: 'Mess' | 'Canteen' | 'Healthy Cafe' | 'Juice & Salad Bar';
  rating: number;
  totalOrdersToday: number;
  revenueToday: number;
  operatingHours: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  buddyProfile?: BuddyProfile;
  businessProfile?: BusinessProfile;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Beverages';
  price: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
  ingredients: string[];
  allergens?: string[];
  isAvailable: boolean;
  demandScore?: number; // 1-100 score based on student order frequency
}

export interface OrderSummary {
  id: string;
  customerName: string;
  itemNames: string[];
  totalAmount: number;
  status: 'Preparing' | 'Ready for Pickup' | 'Completed';
  orderedAt: string;
}
