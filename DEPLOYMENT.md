# Deployment Guide

This guide covers deploying Linkra to **Vercel** (recommended) and **Render** (alternative).

## Prerequisites

Before deploying, ensure you have:
- ✅ Supabase project set up with all migrations applied
- ✅ Google OAuth configured in Supabase
- ✅ Environment variables ready
- ✅ Database seeded (optional, can be done after deployment)

---

## 🚀 Vercel Deployment (Recommended)

Vercel is the recommended platform for Next.js apps. It offers:
- Zero-config deployment
- Automatic HTTPS
- Edge network (fast global CDN)
- Built-in CI/CD
- Free tier with generous limits

### Step 1: Prepare Your Repository

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Verify your build works locally**
   ```bash
   bun run build
   ```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js settings
5. Configure environment variables (see below)
6. Click **"Deploy"**

#### Option B: Via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```
   - Follow prompts (use defaults for most)
   - For production: `vercel --prod`

### Step 3: Configure Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Optional (for migrations/seeding):**
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_PASSWORD=your_database_password
```

**Note:** `SUPABASE_DB_PASSWORD` is only needed if you want to run migrations/seeding via scripts. For production, migrations should be run manually or via Supabase dashboard.

### Step 4: Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/*` (if using wildcard)

3. Update **Site URL** to your Vercel domain

### Step 5: Run Database Migrations (One-time)

Migrations should already be applied, but verify:

1. Connect to your Supabase database
2. Run migrations manually if needed:
   ```bash
   # Locally, with SUPABASE_DB_PASSWORD set
   bun run migrate
   ```

### Step 6: Seed Database (Optional)

If you haven't seeded yet:
```bash
# Locally, with SUPABASE_DB_PASSWORD set
bun run seed
```

Or use Supabase SQL Editor to run seed scripts.

### Step 7: Verify Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Test authentication flow
3. Test core features (compare, rankings, portfolio)

---

## 🐳 Render Deployment (Alternative)

Render is a good alternative if you prefer more control or need different features.

### Step 1: Prepare Your Repository

Same as Vercel - push code to Git.

### Step 2: Create Render Account

1. Go to [render.com](https://render.com) and sign up
2. Connect your Git provider (GitHub/GitLab/Bitbucket)

### Step 3: Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your repository
3. Configure settings:
   - **Name**: `linkra` (or your choice)
   - **Environment**: `Node`
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `bun run start`
   - **Plan**: Free (or paid for better performance)

### Step 4: Configure Environment Variables

In Render Dashboard → Your Service → Environment, add:

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

**Optional:**
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_DB_PASSWORD=your_database_password
```

### Step 5: Update Supabase Redirect URLs

Same as Vercel:
1. Add Render URL to Supabase redirect URLs:
   - `https://your-app.onrender.com/auth/callback`

### Step 6: Deploy

1. Click **"Create Web Service"**
2. Render will build and deploy automatically
3. Monitor build logs for any issues

### Step 7: Run Migrations & Seed

Same as Vercel - run migrations and seed locally or via Supabase dashboard.

---

## 🔧 Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase redirect URLs updated
- [ ] Database migrations applied
- [ ] Database seeded (if needed)
- [ ] Authentication flow tested
- [ ] Core features tested
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (optional)

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Module not found"**
- Ensure all dependencies are in `package.json`
- Check that `bun install` runs successfully locally

**Error: "Environment variable missing"**
- Verify all required env vars are set in deployment platform
- Check variable names match exactly (case-sensitive)

### Authentication Not Working

**Redirect loop or auth errors**
- Verify Supabase redirect URLs include your deployment URL
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Ensure Google OAuth is configured in Supabase

### Database Issues

**Migrations not applied**
- Run migrations manually via Supabase SQL Editor
- Or use local script with `SUPABASE_DB_PASSWORD` set

**Data not showing**
- Verify database is seeded
- Check RLS policies allow public read access where needed
- Verify Supabase connection from deployment platform

---

## 📊 Performance Optimization

### Vercel

- Uses Edge Network automatically
- Consider enabling Edge Runtime for API routes if needed
- Use Vercel Analytics for performance monitoring

### Render

- Free tier has cold starts (first request may be slow)
- Consider upgrading to paid plan for better performance
- Use Render's built-in monitoring

---

## 🔄 Continuous Deployment

Both platforms support automatic deployments:

- **Vercel**: Auto-deploys on push to main branch
- **Render**: Auto-deploys on push to main branch (configurable)

To disable auto-deploy, configure in platform settings.

---

## 💰 Cost Comparison

### Vercel
- **Free Tier**: 
  - 100GB bandwidth/month
  - Unlimited deployments
  - Edge network included
- **Pro**: $20/month (more bandwidth, team features)

### Render
- **Free Tier**:
  - 750 hours/month
  - Cold starts (spins down after 15min inactivity)
  - 512MB RAM
- **Starter**: $7/month (always-on, better performance)

**Recommendation**: Vercel is better for Next.js apps due to zero-config and edge network.

---

## 🎯 Next Steps After Deployment

1. Set up custom domain (optional)
2. Configure monitoring/analytics
3. Set up error tracking (Sentry, etc.)
4. Configure backups for Supabase database
5. Set up staging environment (optional)

