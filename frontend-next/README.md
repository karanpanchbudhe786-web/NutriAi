# NutriAI — Dual-Role Campus Nutrition Platform (Next.js + Tailwind + RBAC)

A high-performance Next.js and Tailwind CSS application implementing strict Role-Based Access Control (RBAC) for campus nutrition:
- **Buddy Role:** For students and foodies (physiology onboarding, wearable sync, water tracker with +250ml, campus mess discovery, and meal logging).
- **Business Partner Role:** For campus mess and canteen owners (canteen registration, daily sales grid, recipe/menu manager with verified nutrition facts, and student demand analytics).

---

## Project Structure

```text
frontend-next/
├── app/
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Dual-role dynamic dashboard & testing interface
├── components/
│   ├── auth/
│   │   ├── AuthModal.tsx         # Tabbed Buddy vs Business login with Instant Demo
│   │   ├── ProtectedRoute.tsx    # Client-side RBAC route guard
│   │   └── RoleGuard.tsx         # Conditional in-page element guard
│   ├── layout/
│   │   ├── Sidebar.tsx           # Dynamic role-segregated sidebar navigation
│   │   └── Topbar.tsx            # Contextual topbar with role badges & actions
│   ├── buddy/
│   │   ├── BuddyOnboarding.tsx   # 2-Step physiology form (BMI, TDEE, water goal)
│   │   └── BuddyDashboard.tsx    # Wearable sync, water +250ml, food discovery
│   └── business/
│       ├── BusinessOnboarding.tsx # Canteen partner registration & details
│       └── BusinessDashboard.tsx  # Sales grid, recipe manager & demand analytics
├── context/
│   └── AuthContext.tsx           # Central auth state, localStorage & cookie persistence
├── hooks/
│   └── useAuth.ts                # Typed custom hook
├── types/
│   └── auth.ts                   # RBAC types (UserRole, BuddyProfile, BusinessProfile)
├── middleware.ts                 # Next.js Edge Middleware for server-level route guards
└── package.json
```

---

## Getting Started

```bash
cd frontend-next
npm install
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000) to test the application.
