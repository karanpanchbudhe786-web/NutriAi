'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allow: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard Component
 * In-page element guard that renders children ONLY if the authenticated user's role matches.
 * Use this to conditionally omit buttons, links, banners, or sub-sections.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allow,
  fallback = null,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) return <>{fallback}</>;
  if (!allow.includes(user.role)) return <>{fallback}</>;

  return <>{children}</>;
};

export default RoleGuard;
