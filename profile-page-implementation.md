# Profile Page Implementation Plan

## Overview
Create a comprehensive profile dashboard for logged-in users that manages their personal information, addresses, orders, and settings.

## Design
- **Layout:** Responsive layout with a side navigation menu (desktop) or tab bar/dropdown (mobile).
- **Style:** Consistent with "Bravita" branding - playful, rounded, orange accents, clean white backgrounds.
- **Routing:** Single `/profile` route with query parameters (`?tab=profile`, `?tab=addresses`, etc.) to manage views.

## Components

### 1. `src/pages/Profile.tsx` (Main Container)
- Handles the `tab` query parameter.
- Renders the `ProfileSidebar` and the active content area.
- Checks authentication (redirects to home if not logged in).

### 2. `src/components/profile/ProfileSidebar.tsx`
- Navigation menu with links to different tabs.
- Active state styling.
- Menu items:
  - Profile (Personal Info) - Icon: `User`
  - Addresses - Icon: `MapPin`
  - Orders - Icon: `ShoppingBag`
  - Settings - Icon: `Settings`

### 3. `src/components/profile/ProfileInfo.tsx` (Tab: profile)
- Form to edit:
  - Full Name
  - Phone (Verified status)
  - Gender/Birthday (Optional future-proof)
- Read-only: Email

### 4. `src/components/profile/AddressBook.tsx` (Tab: addresses)
- List of saved addresses.
- "Add New Address" button -> Opens generic `AddressForm` (reuse/create).
- Edit/Delete actions.

### 5. `src/components/profile/OrderHistory.tsx` (Tab: orders)
- List of past orders with status badges.
- Empty state if no orders.

### 6. `src/components/profile/Settings.tsx` (Tab: settings)
- Notification preferences toggle.
- Marketing email toggle.
- Delete Account (Danger zone).

## Integration
- Update `src/App.tsx` to add `/profile` route.
- Update `src/components/auth/UserMenu.tsx` to link to correct tabs.
