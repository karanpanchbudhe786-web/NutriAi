import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';

export const metadata = {
  title: 'NutriAI — Dual-Role Campus Nutrition & Partner Platform',
  description: 'Role-Based campus nutrition for Gen-Z students and canteen partners.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
