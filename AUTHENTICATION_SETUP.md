# Authentication System Implementation Guide

## Overview
A comprehensive, secure authentication system with multi-factor authentication (2FA SMS), individual and company user support, Google OAuth integration, mandatory profile completion, and maximum security protocols.

## ✅ Implementation Status

All core authentication features have been successfully implemented and the project builds without errors.

### Completed Components

#### 1. **Supabase Configuration** ✓
- File: [`lib/supabase.ts`](src/lib/supabase.ts)
- Environment template: [`.env.local.example`](.env.local.example)
- TypeScript interfaces for `UserProfile` and `UserAddress`
- Placeholder environment variables ready for your Supabase credentials

#### 2. **Authentication Context** ✓
- File: [`contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx)
- Session management with automatic refresh
- User profile loading and state management
- Hooks: `useAuth()` for accessing auth state throughout the app

#### 3. **Authentication Operations Hook** ✓
- File: [`hooks/useAuth.ts`](src/hooks/useAuth.ts)
- Methods:
  - `signupWithEmail()` - Email/password signup with phone verification
  - `signupWithGoogle()` - Google OAuth signup (2FA skipped initially)
  - `loginWithEmail()` - Individual user login
  - `loginWithCompany()` - Company user login
  - `logout()` - Secure session termination
  - `sendPhoneVerificationCode()` - Send SMS OTP
  - `verifyPhoneCode()` - Verify SMS OTP

#### 4. **Auth Modal Component** ✓
- File: [`components/auth/AuthModal.tsx`](src/components/auth/AuthModal.tsx)
- Dual-section design (left: forms, right: animated decoration)
- Tabs for login/signup
- Responsive (mobile-optimized)
- Smooth animations with Framer Motion

#### 5. **Login Form Component** ✓
- File: [`components/auth/LoginForm.tsx`](src/components/auth/LoginForm.tsx)
- Tabs for Individual/Company login
- Individual: Email/Password + Google OAuth
- Company: Username/Password only
- Form validation with Zod
- Error handling and loading states

#### 6. **Signup Form Component** ✓
- File: [`components/auth/SignupForm.tsx`](src/components/auth/SignupForm.tsx)
- Tabs for Individual/Company signup
- **Individual Signup:**
  - Email/Password with strength validation
  - International phone number input
  - Google OAuth option (2FA skipped)
  - Mandatory 2FA SMS verification (10-min expiry, 3 resend max)
  - Mandatory user agreement checkboxes (KVKK, Terms, Privacy)
- **Company Signup:**
  - Username, Company Name, Email, Password
  - Immediate activation (no approval needed)
  - Mandatory user agreements
- Multi-step flow with 2FA verification page

#### 7. **Two-Factor Verification Component** ✓
- File: [`components/auth/TwoFactorVerification.tsx`](src/components/auth/TwoFactorVerification.tsx)
- 6-digit OTP input with number-only validation
- 10-minute countdown timer (turns red when < 60 seconds)
- Resend code button (max 3 attempts)
- Auto-formatted input field
- Error handling and toast notifications

#### 8. **User Menu Component** ✓
- File: [`components/auth/UserMenu.tsx`](src/components/auth/UserMenu.tsx)
- Avatar dropdown with user information
- Menu items:
  - Profile
  - My Orders
  - Addresses
  - Settings
  - Logout
- Animated with Framer Motion
- Shows user initials in avatar fallback

#### 9. **Profile Completion Page** ✓
- File: [`pages/CompleteProfile.tsx`](src/pages/CompleteProfile.tsx)
- **Step 1:** Address & Full Name
  - Street address, city, postal code
  - Saves first address as default
- **Step 2:** Phone Verification
  - International phone number input
  - Mandatory 2FA SMS verification (even for Google OAuth users)
  - 10-minute OTP expiration, 3 resend attempts
  - After verification, profile marked as complete
- Protected route (redirects if profile complete or not authenticated)
- Prevents app navigation until profile 100% complete

#### 10. **Header Component Updates** ✓
- File: [`components/Header.tsx`](src/components/Header.tsx)
- **Unauthenticated State:**
  - "Satın Al" button always visible
  - "Giriş Yap" login button appears (opens AuthModal)
- **Authenticated State:**
  - "Satın Al" button always visible
  - UserMenu avatar icon appears next to it
- Smooth transitions with Framer Motion
- Maintains existing scroll-based styling

#### 11. **Main Application Wrapper** ✓
- File: [`main.tsx`](src/main.tsx)
- Wrapped with `<AuthProvider>` for global auth state

#### 12. **Internationalization (i18n)** ✓
- Turkish translations: [`i18n/locales/tr.json`](src/i18n/locales/tr.json)
- English translations: [`i18n/locales/en.json`](src/i18n/locales/en.json)
- 70+ authentication-related translation keys
- All UI elements, error messages, validation messages localized

---

## 🔒 Security Features Implemented

### 1. **Password Security**
- Minimum 12 characters required
- Must contain: uppercase, lowercase, number, special character (!@#$%^&*)
- Validated with Zod schema
- Password confirmation field

### 2. **Phone Authentication**
- 2FA SMS verification mandatory for all individual users
- 10-minute OTP code expiration
- Maximum 3 resend attempts per verification
- International phone format support (`react-phone-number-input`)
- 6-digit numeric OTP only

### 3. **OAuth Security**
- Google OAuth integration with Supabase
- Callback URL: `/complete-profile`
- Google OAuth users skip 2FA during signup
- But must complete 2FA SMS during profile completion

### 4. **User Agreements**
- Mandatory checkboxes for:
  - Terms & Conditions
  - Privacy Policy
  - KVKK (Turkish Data Protection) Notice
- All links point to placeholder URLs (update with real legal documents)

### 5. **Input Sanitization**
- Zod validation for all forms
- Email validation
- Phone format validation
- No raw HTML/JS injection possible

### 6. **Session Management**
- Supabase session tokens used
- Automatic session refresh
- Secure logout clears session

### 7. **Error Handling**
- Generic error messages to users
- Detailed logging for debugging
- No sensitive info exposed

---

## 🚀 Next Steps & Configuration

### 1. **Set Up Supabase Project**
```bash
# Copy the environment template
cp .env.local.example .env.local

# Add your Supabase credentials to .env.local:
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Get credentials from:** [Supabase Dashboard](https://app.supabase.com/) → Project Settings → API

### 2. **Create Database Tables in Supabase**

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  user_type VARCHAR(50) NOT NULL DEFAULT 'individual',
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  profile_complete BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  phone_verified_at TIMESTAMP,
  oauth_provider VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  street VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table (for future use)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. **Enable Row Level Security (RLS) in Supabase**

```sql
-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Addresses: Users can only access their own addresses
CREATE POLICY "Users can view own addresses" ON addresses 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON addresses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON addresses 
  FOR UPDATE USING (auth.uid() = user_id);

-- Orders: Users can only view their own orders
CREATE POLICY "Users can view own orders" ON orders 
  FOR SELECT USING (auth.uid() = user_id);
```

### 4. **Configure Email Templates in Supabase**

Go to Supabase Dashboard → Authentication → Email Templates

Update templates for:
- Email Confirmation
- Password Reset
- Magic Link (if using)

### 5. **Enable Google OAuth Provider**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials (Web Application)
3. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret
5. Go to Supabase Dashboard → Authentication → Providers → Google
6. Add your credentials

### 6. **Configure Phone SMS Provider**

Supabase Dashboard → Authentication → SMS Provider

Options:
- **Twilio** (recommended)
- **MessageBird**

Complete provider setup with API credentials

### 7. **Update Legal Documents**

Create pages and update links in auth components:

- `/terms` - Terms & Conditions
- `/privacy` - Privacy Policy
- `/kvkk` - KVKK Notice (Turkey)

Placeholder links in:
- [`SignupForm.tsx`](src/components/auth/SignupForm.tsx#L270-L290)
- [`CompleteProfile.tsx`](src/pages/CompleteProfile.tsx#L150-L170)

### 8. **Create Protected Route Wrapper** (If needed)

Example for protecting checkout or order pages:

```tsx
// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, profileComplete, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!profileComplete) {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
}
```

---

## 📱 User Flows

### Individual User Registration Flow
1. Click "Giriş Yap" → AuthModal opens
2. Click "Sign up with Google" OR enter Email/Password
3. If Email/Password:
   - Enter email, password, full name (optional)
   - Enter phone number (international format)
   - Receive SMS with 6-digit code
   - Enter code (expires in 10 minutes)
   - Account created, redirected to `/complete-profile`
4. Complete Profile:
   - Enter full name, address details
   - Enter/verify phone number
   - Receive SMS verification code
   - Enter code
   - Profile marked complete
   - Redirected to home page
5. Avatar icon appears in header

### Google OAuth Flow
1. Click "Sign up with Google"
2. Google authentication popup
3. User data captured (email)
4. Redirected to `/complete-profile`
5. Step 1: Enter name, address
6. Step 2: Enter phone and verify with SMS
7. Profile complete, home page

### Login Flow
1. Click "Giriş Yap" → AuthModal opens (Login tab)
2. **Individual:** Email + Password
3. **Company:** Username + Password
4. Session created, avatar icon appears

### Logout Flow
1. Click avatar icon → UserMenu dropdown
2. Click "Logout"
3. Session destroyed
4. "Giriş Yap" button appears again

---

## 🔑 Environment Variables

Create `.env.local` file:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Google OAuth (configured in Supabase)
VITE_GOOGLE_CLIENT_ID=your-client-id
```

---

## 📦 Dependencies Added

```json
{
  "@supabase/supabase-js": "^2.x.x",
  "@supabase/auth-helpers-react": "^0.15.0",
  "react-phone-number-input": "^3.x.x"
}
```

---

## 🧪 Testing Checklist

- [ ] Individual email/password signup with 2FA
- [ ] Google OAuth signup and profile completion
- [ ] Company user signup
- [ ] Login with individual account
- [ ] Login with company account
- [ ] 2FA SMS code verification
- [ ] 2FA resend code (max 3 attempts)
- [ ] 2FA code expiration (10 minutes)
- [ ] Profile completion flow
- [ ] User avatar menu with logout
- [ ] Session persistence after page reload
- [ ] Logout clears session
- [ ] Language switching (TR/EN)
- [ ] Phone number international format
- [ ] Password strength validation
- [ ] User agreements mandatory
- [ ] Mobile responsive layout

---

## 📝 Translation Keys Reference

All authentication UI strings are in:
- Turkish: [`src/i18n/locales/tr.json`](src/i18n/locales/tr.json)
- English: [`src/i18n/locales/en.json`](src/i18n/locales/en.json)

Search for `"auth":` prefix to find all authentication translations.

---

## 🆘 Troubleshooting

### SMS not sending?
- Verify SMS provider configured in Supabase Dashboard
- Check phone number format (international)
- Ensure SMS provider has credits/active account

### Google OAuth not working?
- Verify redirect URI: `https://your-project.supabase.co/auth/v1/callback`
- Check Google Client ID and Secret
- Ensure domain added to authorized redirect URIs in Google Console

### Profile not saving?
- Check Supabase RLS policies are correct
- Verify user authenticated (check session)
- Check browser console for errors

### 2FA code always shows expired?
- Check server time synchronization
- Verify 10-minute timer logic in `TwoFactorVerification.tsx`
- Check SMS code generation settings in Supabase

---

## 📞 Support & Notes

- All components use existing `shadcn/ui` components - consistency maintained
- Framer Motion animations used throughout
- Fully internationalized (Turkish/English)
- Mobile-first responsive design
- Accessible form inputs with proper labels

**Build Status:** ✅ Success (no errors)
**Project compiles:** ✅ Yes
**All features implemented:** ✅ Yes
