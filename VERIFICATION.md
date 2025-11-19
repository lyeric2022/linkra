# How to Verify Everything is Working

## Quick Health Check

Visit: **http://localhost:3000/test**

This page will automatically check:
- ✅ Authentication status
- ✅ User record exists
- ✅ Startups table has data
- ✅ Database permissions
- ✅ Can create comparisons
- ✅ Environment variables

## Manual Verification Steps

### 1. Check Database Tables Exist

```bash
bun run check-db
```

Should show all tables exist.

### 2. Check You're Signed In

- Visit: http://localhost:3000/auth
- Should see "Sign in with Google" button
- After signing in, should redirect to /compare
- Nav bar should show "Sign Out" button

### 3. Check Startups Are Seeded

```bash
bun run seed
```

Should show:
```
✅ Found X companies
📊 Active companies from last year: X
✅ Inserted batch 1/X: X companies
```

Or check in Supabase Dashboard → Table Editor → `startups`

### 4. Test Pairwise Comparison

1. Visit: http://localhost:3000/compare
2. Should see two startup cards side-by-side
3. Click on one
4. Should see success and load next comparison

### 5. Check Rankings Page

Visit: http://localhost:3000/rankings

Should show list of startups with:
- Names
- Ranks (if rankings have been calculated)
- Prices

### 6. Check Portfolio Page

Visit: http://localhost:3000/portfolio

Should show:
- Your cash balance (10,000)
- Holdings value (0 if you haven't traded)
- Total value

### 7. Test Trading

1. Visit: http://localhost:3000/rankings
2. Click on a startup
3. Should see trading interface
4. Try buying 1 share
5. Check portfolio - should show the holding

### 8. API Health Check

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Database is ready"
}
```

## Common Issues & Fixes

### "Table doesn't exist" errors
→ Run migrations in Supabase SQL Editor (copy `supabase/schema.sql`)

### "User record missing" errors
→ Run: `bun run fix-users`

### "403 Forbidden" errors
→ Add INSERT policy: Run `supabase/fix-users-policy.sql` in SQL Editor

### "No startups found"
→ Run: `bun run seed`

### "Cannot create comparisons"
→ Check RLS policies are set up correctly

## Expected Behavior

### When Everything Works:

1. **Sign In**: Google OAuth → Redirects to /compare
2. **Compare**: Click startup → Records comparison → Shows next pair
3. **Rankings**: Shows list of startups ordered by rank
4. **Trading**: Buy/sell shares → Updates portfolio
5. **Portfolio**: Shows holdings and performance

### Database State:

- `users` table: Has your user record
- `startups` table: Has ~1200+ YC companies
- `pairwise_comparisons` table: Grows as you compare
- `holdings` table: Your positions
- `trades` table: Trading history

## Performance Checks

- Page loads in < 2 seconds
- Comparisons save in < 500ms
- Rankings page loads in < 1 second
- Trading executes in < 1 second

## Next Steps After Verification

1. ✅ Everything works → Start using the app!
2. ⚠️ Some issues → Check error messages and fix
3. ❌ Nothing works → Check Supabase connection and migrations

