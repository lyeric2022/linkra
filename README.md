# Linkra - Startup League Table

A web app where users rank startups head-to-head and trade virtual positions in a simulated market. Built with Next.js, Supabase, and TypeScript.

## Features

- **Pairwise Comparisons**: Users compare two startups side-by-side and pick which they believe in more
  - Elo-based matching ensures fair comparisons (startups with similar ratings)
  - Duplicate prevention - users won't see startups they've already compared
  - Smooth animations showing Elo score changes after each vote
- **Global Rankings**: Real-time rankings based on collective comparisons using Elo rating system
  - Rankings update instantly after each comparison
  - Sort by Elo, votes, name, or price
  - Filter by sector and YC batch
  - Pagination for easy browsing
- **Virtual Trading**: Users allocate virtual currency into startup positions
  - Elo-based pricing: `price = elo_rating / 100`
  - Buy and sell shares with real-time price updates
  - Track average cost basis and gain/loss
- **Portfolio Tracking**: View holdings, performance, and portfolio value
  - Beautiful dashboard showing cash, holdings value, and total portfolio value
  - Individual holding cards with gain/loss indicators
  - Click any holding to view detailed startup page
- **Free Gift Roll**: New users get 5 free rolls to receive 10 shares of random startups
  - Dice animation for engaging UX
  - Gift shares are treated as normal holdings (can be sold, show gain/loss)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, RLS)
- **Package Manager**: Bun
- **Deployment**: Vercel (recommended) or Render
- **See**: `DEPLOYMENT.md` for detailed deployment instructions

## Setup

### Prerequisites

- Node.js 18+ or Bun
- Supabase account (free tier works)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd linkra
```

2. Install dependencies:
```bash
bun install
```

3. Set up Supabase:
   - Create a new Supabase project at https://supabase.com
   - Get your project URL and anon key from Settings > API
   - Get your database password from Settings > Database > Connection string
   - **Note**: Migrations run automatically when you start the dev server (if `SUPABASE_DB_PASSWORD` is set)

4. Create `.env.local` file:
```bash
cp .env.example .env.local
```

5. Add your Supabase credentials to `.env.local`:
   - Copy values from Supabase Dashboard → Settings → API
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service_role key (for ranking algorithm)
   - `SUPABASE_DB_PASSWORD`: Your database password (for auto-migrations)
     - Get it from: Supabase Dashboard → Settings → Database → Connection string

6. Set up Google OAuth (see `GOOGLE_AUTH_SETUP.md`)

7. Run the development server (migrations run automatically):
```bash
bun run dev
```
   - Migrations will run automatically if `SUPABASE_DB_PASSWORD` is set
   - If not set, you'll need to run migrations manually (see below)

8. Seed the database with YC companies:
```bash
bun run seed
```

9. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

The app uses the following main tables:

- **`users`** - User profiles, virtual currency, and free gift count
- **`startups`** - Startup information with Elo ratings (no `market_price` - derived from Elo)
- **`pairwise_comparisons`** - User comparison choices (prevents duplicate comparisons)
- **`holdings`** - User positions in startups (quantity and average cost)
- **`trades`** - Trading history for audit trail
- **`schema_migrations`** - Tracks applied migrations (auto-managed)

**Key Fields**:
- `startups.elo_rating`: Current Elo rating (default: 1500)
- `startups.comparison_count`: Number of comparisons (computed)
- `users.free_gifts_count`: Remaining free gift rolls (default: 5)
- `holdings.average_cost`: Weighted average purchase price

See `supabase/schema.sql` for full schema with RLS policies. Migrations are in `supabase/migrations/` and run automatically on dev server start.

## Ranking Algorithm

The ranking system uses an **Elo-based algorithm** with real-time updates:

- **Initial Rating**: Each startup starts with 1500 Elo
- **K-Factor**: 32 (controls how much ratings change per comparison)
- **Real-time Updates**: Elo scores update immediately after each comparison (only the 2 involved startups)
- **Expected Score Formula**: `E_A = 1 / (1 + 10^((R_B - R_A) / 400))`
- **New Rating**: `R'_A = R_A + K * (S_A - E_A)` where `S_A` is 1 if A wins, 0 if A loses

**Key Features**:
- Upsets (underdogs winning) result in larger rating changes
- Expected wins result in smaller rating changes
- Self-correcting system that converges to accurate rankings over time

**Pricing**: Market price is derived from Elo rating: `price = elo_rating / 100`

## Project Structure

```
linkra/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── ranking/             # Legacy ranking endpoint (not used)
│   │   └── roll/                # Free gift roll endpoint
│   ├── compare/                 # Pairwise comparison page
│   ├── rankings/                # Global rankings page
│   ├── portfolio/               # User portfolio page
│   ├── startup/[id]/           # Startup detail & trading page
│   └── test/                    # System health check page
├── components/                   # React components
│   ├── PairwiseComparison.tsx   # Comparison UI with Elo animations
│   ├── StartupCard.tsx          # Reusable startup card component
│   └── RollButton.tsx           # Free gift roll button with dice animation
├── lib/                          # Utilities and types
│   ├── supabase/                # Supabase client setup
│   ├── types/                   # TypeScript database types
│   └── utils/                   # Helper functions
│       ├── price.ts             # Elo-based price calculations
│       ├── animateNumber.ts      # Smooth number animations
│       └── ensureUserRecord.ts  # Auto-create user records
├── scripts/                      # Utility scripts
│   ├── seed-startups.ts         # Seed database with YC companies
│   ├── dev-with-migrations.ts  # Dev server with auto-migrations & seeding
│   └── fix-users.ts             # Backfill missing user records
└── supabase/                     # Database schema & migrations
    ├── schema.sql                # Full database schema
    └── migrations/               # Versioned migration files
        ├── 0001_initial_schema.sql
        ├── 0002_add_batch_column.sql
        ├── 0003_add_free_gifts_and_remove_welcome_shares.sql
        └── 0004_add_startups_update_policy.sql
```

## Scripts

### Development
- `bun run dev` - Start development server with auto-migrations and auto-seeding
  - Automatically runs migrations from `supabase/migrations/`
  - Automatically seeds database if empty
  - Requires `SUPABASE_DB_PASSWORD` in `.env.local`
- `bun run dev:no-migrate` - Start dev server without migrations (use `npx next dev`)

### Database
- `bun run seed` - Seed database with YC companies from `all-yc-companies.json`
  - Filters to companies from the last year
  - Includes batch, sector, location, website, and description
- `bun run migrate:auto` - Run migrations manually (usually not needed - runs on `dev`)
- `bun run fix-users` - Backfill missing user records for existing auth users
- `bun run check-db` - Quick check if database tables exist

### Production
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Key Features Explained

### Elo Rating System
- **Real-time Updates**: Elo scores update immediately after each comparison (no batch processing needed)
- **Fair Matching**: Comparison pairs are selected based on similar Elo ratings (±200 points)
- **Upset Rewards**: Underdogs winning against favorites result in larger rating changes
- **Self-Correcting**: Over time, ratings converge to accurate relative rankings

### Duplicate Prevention
- Users won't see startups they've already compared
- Prevents repetitive comparisons and improves data quality
- Falls back to allowing duplicates if user has seen >500 startups or <10 startups available

### Free Gift Roll
- New users start with 5 free gift rolls
- Each roll grants 10 shares of a random startup at $0.00 cost basis
- Gift shares are treated as normal holdings (can be sold, show gain/loss)
- Engaging dice animation for better UX

### Pricing Model
- Market price is derived from Elo rating: `price = elo_rating / 100`
- No separate `market_price` column needed
- Prices update automatically as Elo ratings change
- Example: Elo 1500 → $15.00, Elo 1600 → $16.00

## Next Steps

- [ ] Add user stats and leaderboards
- [ ] Add startup submission/editing UI
- [ ] Implement more sophisticated market maker (AMM)
- [ ] Add watchlists
- [ ] Add notifications for rank changes
- [ ] Add comparison history page
- [ ] Add portfolio performance charts

## License

MIT
