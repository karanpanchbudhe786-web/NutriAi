'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

/**
 * ProtectedRoute Guard
 * Wraps page layouts to enforce role-based access control.
 *
 * Rules:
 * 1. Unauthenticated users are redirected to '/login'.
 * 2. Buddy attempting to access any '/business/*' route -> redirected to '/home'.
 * 3. Business Partner attempting to access consumer routes -> redirected to '/business/dashboard'.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      // Role enforcement redirection
      if (user.role === 'buddy') {
        // Strict requirement: Buddy accessing /business/* routes redirects to /home
        router.replace(redirectTo || '/home');
      } else if (user.role === 'business') {
        // Business partner accessing consumer routes redirects to /business/dashboard
        router.replace(redirectTo || '/business/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, user, isLoading, allowedRoles, router, pathname, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Validating NutriAI Role Session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return null; // Prevents flashing of unauthorized UI
  }

  return <>{children}</>;
};

export default ProtectedRoute;
