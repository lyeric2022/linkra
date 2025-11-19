# Welcome Shares Troubleshooting

If you signed in but didn't receive your welcome shares (10 shares in 5 random companies), here's how to fix it:

## Step 1: Update Database Functions

The trigger function needs to be updated in your Supabase database:

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/grant-welcome-shares.sql`
3. Paste and run it in the SQL Editor
4. This updates the `grant_welcome_shares()` and `handle_new_user()` functions

## Step 2: Check Your Current Status

Run the diagnostic script to see what's wrong:

```bash
bun run check-welcome-shares
```

This will tell you:
- If you're authenticated
- If you have any holdings
- If startups exist in the database
- What might be preventing shares from being granted

## Step 3: Grant Shares Manually

If you're an existing user (signed in before the trigger was updated), grant shares manually:

```bash
bun run grant-shares
```

This will grant 10 shares in 5 random companies to all users who don't have holdings yet.

## Common Issues

### Issue 1: Database Functions Not Updated
**Symptom**: New users don't get shares automatically  
**Fix**: Run `supabase/grant-welcome-shares.sql` in Supabase SQL Editor

### Issue 2: User Already Existed
**Symptom**: You signed in before the trigger was updated  
**Fix**: Run `bun run grant-shares` to grant shares retroactively

### Issue 3: No Startups in Database
**Symptom**: Error or no shares granted  
**Fix**: Run `bun run seed` to populate startups, then `bun run grant-shares`

### Issue 4: User Already Has Holdings
**Symptom**: Shares weren't granted because you already have some  
**Fix**: This is expected behavior (idempotent check). The gift only applies to users with zero holdings.

## Quick Fix (All-in-One)

If you just want to fix it right now:

```bash
# 1. Make sure startups exist
bun run seed

# 2. Grant shares to existing users
bun run grant-shares

# 3. Verify
bun run check-welcome-shares
```

## For Future Users

After updating the database functions, **new users** will automatically receive welcome shares when they sign up for the first time. The trigger fires when a new user is inserted into `auth.users`.

