# 🚀 Quick Start Guide - Authentication System

## 5-Minute Setup

### Step 1: Create `.env.local`
```bash
cp .env.local.example .env.local
```

### Step 2: Add Supabase Credentials
Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get from: [Supabase Dashboard](https://app.supabase.com/) → Settings → API

### Step 3: Run Database Setup
Copy & paste SQL from [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md) into Supabase SQL Editor

### Step 4: Enable SMS Provider
Supabase Dashboard → Authentication → SMS Provider → Set up Twilio/MessageBird

### Step 5: Enable Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com/) → Create OAuth credentials
2. Redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Copy Client ID and Secret to Supabase → Authentication → Google

### Step 6: Start Dev Server
```bash
npm run dev
```

---

## 🔑 Key Components - Quick Reference

### **Using Auth in Your Component**
```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, session } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please login</div>;
  }
  
  return <div>Welcome, {user?.full_name}!</div>;
}
```

### **Auth Operations**
```tsx
import { useAuthOperations } from '@/hooks/useAuth';

const { 
  signupWithEmail, 
  loginWithEmail, 
  logout,
  isLoading,
  error 
} = useAuthOperations();

// Signup
await signupWithEmail({
  email: 'user@example.com',
  password: 'SecurePass123!',
  phone: '+90500000000',
  userType: 'individual'
});

// Login
await loginWithEmail({
  email: 'user@example.com',
  password: 'SecurePass123!',
  userType: 'individual'
});

// Logout
await logout();
```

### **Open Auth Modal from Anywhere**
```tsx
import { useEffect, useState } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

export function MyComponent() {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <button onClick={() => setAuthOpen(true)}>
        Login
      </button>
      
      <AuthModal 
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab="login"
      />
    </>
  );
}
```

### **Check Profile Completion**
```tsx
const { user, profileComplete } = useAuth();

if (user && !profileComplete) {
  navigate('/complete-profile');
}
```

---

## 📁 Project Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          ← Global auth state
├── hooks/
│   └── useAuth.ts              ← Auth operations
├── lib/
│   └── supabase.ts             ← Supabase client
├── components/
│   └── auth/
│       ├── AuthModal.tsx       ← Login/Signup modal
│       ├── LoginForm.tsx       ← Login tab
│       ├── SignupForm.tsx      ← Signup tab
│       ├── TwoFactorVerification.tsx
│       └── UserMenu.tsx        ← User dropdown
├── pages/
│   └── CompleteProfile.tsx     ← Profile setup page
└── i18n/
    └── locales/
        ├── tr.json            ← Turkish
        └── en.json            ← English
```

---

## 🔄 Common Tasks

### **Redirect to Login**
```tsx
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/?login=true'); // Opens auth modal in Header
```

### **Check if User is Authenticated**
```tsx
const { isAuthenticated } = useAuth();

if (!isAuthenticated) {
  // Not logged in
}
```

### **Get User Information**
```tsx
const { user } = useAuth();

user?.email           // User email
user?.full_name       // For individuals
user?.company_name    // For companies
user?.phone           // Verified phone
user?.user_type       // 'individual' or 'company'
```

### **Handle 2FA SMS**
```tsx
// Already handled in SignupForm and CompleteProfile
// Uses TwoFactorVerification component internally
// 10-minute expiry, 3 resend attempts
```

### **Update Translations**
Add to `src/i18n/locales/tr.json` and `src/i18n/locales/en.json`:
```json
{
  "auth": {
    "your_new_key": "Turkish text"
  }
}
```

Then use in component:
```tsx
const { t } = useTranslation();
<p>{t('auth.your_new_key')}</p>
```

---

## ⚠️ Important Notes

### **Never do this:**
```tsx
// ❌ DON'T: Access Supabase directly in components
import { supabase } from '@/lib/supabase';
const user = await supabase.auth.getUser();

// ✅ DO: Use the useAuth hook
const { user } = useAuth();
```

### **Always validate in Supabase:**
```tsx
// ❌ DON'T: Trust client-side validation only
if (email.length > 0) { /* proceed */ }

// ✅ DO: Add server-side RLS policies
-- RLS policy in Supabase
SELECT * FROM profiles WHERE auth.uid() = id;
```

### **Secure password storage:**
```tsx
// ✅ Supabase handles password hashing automatically
// Never send unhashed passwords
// Never store passwords in localStorage
```

---

## 🆘 Debugging

### **Check Auth State**
```tsx
const { session, user, isAuthenticated } = useAuth();
console.log({ session, user, isAuthenticated });
```

### **Check Errors**
```tsx
const { error } = useAuthOperations();
if (error) console.error('Auth error:', error);
```

### **Monitor Session**
Open browser DevTools → Application → Cookies
Look for: `sb-*-auth-token` (Supabase session token)

### **Enable Debug Logging**
```tsx
// In contexts/AuthContext.tsx, add:
console.log('Auth state changed:', session, user);
```

---

## 📱 Mobile Testing

```bash
# On Windows/Mac, test on mobile:
npm run dev -- --host

# Then access from phone on same network:
http://192.168.x.x:5173
```

Test:
- [ ] AuthModal opens/closes
- [ ] Forms are readable
- [ ] Keyboard doesn't cover inputs
- [ ] SMS verification works
- [ ] Avatar menu opens

---

## 🔗 Useful Links

- [Supabase Dashboard](https://app.supabase.com/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Phone Auth](https://supabase.com/docs/guides/auth/phone-login)
- [Twilio SMS Setup](https://www.twilio.com/)
- [Google OAuth Setup](https://console.cloud.google.com/)
- [React Hook Form Docs](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

---

## ✅ Verification Checklist

After setup, verify:
- [ ] `.env.local` has Supabase credentials
- [ ] Database tables created
- [ ] SMS provider configured
- [ ] Google OAuth working
- [ ] Can signup with email
- [ ] Can receive SMS codes
- [ ] Can login
- [ ] Can logout
- [ ] Avatar appears when logged in
- [ ] Profile completion page accessible
- [ ] Language switching works

---

## 🎯 Tips & Best Practices

1. **Always use `useAuth()`** for authentication state
2. **Never hardcode Supabase operations** - use hooks
3. **Test on mobile** before pushing to production
4. **Keep `.env.local` in `.gitignore`** (never commit secrets)
5. **Monitor error logs** for failed login attempts
6. **Set up SMS alerts** for suspicious activity
7. **Review RLS policies** monthly
8. **Rotate Google OAuth keys** periodically
9. **Test recovery flows** (forgot password, resend SMS, etc.)
10. **Document custom user fields** if you add them

---

## 🚀 You're All Set!

Start the dev server and test the authentication flow:

```bash
npm run dev
# Visit http://localhost:5173
# Click "Giriş Yap" to test
```

For detailed setup: See [AUTHENTICATION_SETUP.md](AUTHENTICATION_SETUP.md)
For full architecture: See [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)

**Happy coding! 🎉**
