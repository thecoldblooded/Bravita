# Supabase RLS Policy Fix

## Problem
Address saving fails with error: "Adres kaydedilirken hata oluştu"

This is caused by missing RLS (Row Level Security) INSERT policy on the `addresses` table.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to: **SQL Editor** (left sidebar)
3. Click: **New Query**

### Step 2: Copy & Run the RLS Setup SQL
1. Open the file: `SUPABASE_RLS_SETUP.sql` (in this project root)
2. Copy all the SQL commands
3. Paste into the Supabase SQL Editor
4. Click: **Run** button

### Step 3: Verify RLS Policies
After running the SQL, you should see output like:
```
tablename  | policyname                    | permissive | cmd
-----------|-------------------------------|-----------|-----
addresses  | Users can view own addresses  | t          | SELECT
addresses  | Users can insert own addresses| t          | INSERT
addresses  | Users can update own addresses| t          | UPDATE
addresses  | Users can delete own addresses| t          | DELETE
profiles   | Users can view own profile    | t          | SELECT
profiles   | Users can insert own profile  | t          | INSERT
profiles   | Users can update own profile  | t          | UPDATE
```

## What These Policies Do

- **SELECT**: Each user can only see their own data
- **INSERT**: Each user can only insert data with their own `user_id` or `id`
- **UPDATE**: Each user can only modify their own data
- **DELETE**: Each user can only delete their own data

## Key: `auth.uid()` Function

The `auth.uid()` function returns the currently authenticated user's ID from Supabase Auth.

When a user inserts into `addresses` table:
- The RLS policy checks: `auth.uid() = user_id`
- Only the authenticated user's own insertions are allowed

## If Still Getting Errors

Check the browser console (F12 > Console tab) for the exact error message, which will show:
- Error code (e.g., "new row violates row-level security policy")
- Details about which policy is failing

Common issues:
1. RLS policies not created → Run the SQL file
2. Wrong column names → Verify column names in your actual Supabase tables
3. Not authenticated → Check if session exists before insert

## Testing the Fix

1. Clear browser cache (Ctrl+Shift+Delete)
2. Go back to the app
3. Sign up with Google or email
4. Try filling out the Complete Profile form again
5. Address should now save successfully ✓
