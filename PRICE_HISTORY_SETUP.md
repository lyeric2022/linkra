# Price History Background Service

## Overview

The price history system automatically captures snapshots of all startup prices every 5 minutes. This enables:
- Historical price charts on startup detail pages
- Time range analysis (30min, 1hr, 6hr, 1day, 1week)
- Price change tracking and trends

## How It Works

### Built-in Background Service ✨ NEW

The app now includes a **self-contained background service** that runs inside your Next.js app. No external cron service needed!

**How it works:**
1. When your app starts, the service automatically initializes
2. It captures price snapshots every 5 minutes
3. Data is stored in `startup_price_history` table
4. Runs continuously as long as the app is running

**Location:** `lib/services/price-history-service.ts`

### Configuration

The service is **automatically enabled in production** (`NODE_ENV=production`).

For development/testing, add to your `.env`:
```bash
ENABLE_PRICE_HISTORY_SERVICE=true
```

## Setup Instructions

### 1. Apply Database Migration

The price history table must exist:

```bash
bun run migrate
```

Or manually run the migrations:
- `supabase/migrations/0006_add_price_history.sql`
- `supabase/migrations/0011_update_price_history_to_5min.sql`

### 2. Deploy to Production

The background service will automatically start when you deploy:

```bash
git add .
git commit -m "Add background price history service"
git push
```

That's it! The service runs automatically in production.

## Monitoring

### Check Service Status

Run the diagnostic script:

```bash
bun run check-price-history
```

This shows:
- Total records captured
- Last capture time
- Whether the service is running properly
- Coverage across all startups

### Expected Output

When running correctly:
```
📊 Total records: XXXX
📅 Most recent captures:
   1. 2025-11-23T00:15:00.000Z - Startup: abc123...

⏰ Last capture was 2 minutes ago
✅ Cron appears to be working!
```

## Testing Locally

### Option 1: Enable Background Service

Add to `.env`:
```bash
ENABLE_PRICE_HISTORY_SERVICE=true
```

Then start your dev server:
```bash
bun run dev
```

The service will start and capture every 5 minutes.

### Option 2: Manual API Call

Test the API endpoint directly:
```bash
bun run test-capture-api
```

This triggers a single capture without waiting.

## Architecture

### Files

- `lib/services/price-history-service.ts` - Main service class
- `lib/services/init-services.ts` - Service initialization
- `instrumentation.ts` - Next.js hook to start service on boot
- `app/api/price-history/capture/route.ts` - API endpoint (still available for manual triggers)
- `app/api/price-history/[startupId]/route.ts` - Fetch price history for a startup
- `components/PriceChart.tsx` - UI component with time range selector

### How Intervals Work

The service captures data every 5 minutes by:
1. Rounding the current time to the nearest 5-minute interval
2. Using `interval_timestamp` as a unique constraint
3. Skipping duplicates (if capture runs twice in same interval)

Example timestamps:
- 14:02 → rounds to 14:00
- 14:07 → rounds to 14:05
- 14:13 → rounds to 14:10

### Data Storage

Each capture creates ~2,000+ records (one per startup):

```sql
INSERT INTO startup_price_history (
  startup_id,
  elo_rating,
  price,
  recorded_at,
  interval_timestamp
) VALUES ...
```

The `interval_timestamp` ensures only one record per startup per 5-minute window.

## Comparison: Background Service vs External Cron

| Feature | Background Service | External Cron |
|---------|-------------------|---------------|
| **Setup** | Automatic | Manual configuration needed |
| **Cost** | Free | Depends on service |
| **Reliability** | Runs with your app | Depends on external service |
| **Vercel Plan** | Works on Hobby (free) | Vercel Cron needs Pro plan |
| **Monitoring** | Server logs | External dashboard + logs |

## Troubleshooting

### Service Not Running

Check logs for:
```
🚀 [PRICE-HISTORY-SERVICE] Starting background service...
✅ [PRICE-HISTORY-SERVICE] Background service started
```

If you don't see these:
1. Check `NODE_ENV=production` or `ENABLE_PRICE_HISTORY_SERVICE=true`
2. Verify environment variables are set (Supabase credentials)
3. Check server logs for errors

### No Recent Captures

Run diagnostics:
```bash
bun run check-price-history
```

If last capture is >10 minutes ago:
- Service might have crashed - check logs
- App might have restarted - service will resume automatically
- Database connection issues - check Supabase credentials

### Duplicate Records

The service handles duplicates automatically using the unique constraint on `(startup_id, interval_timestamp)`. You'll see:

```
ℹ️  [PRICE-HISTORY-SERVICE] X records already existed for this interval (skipped)
```

This is normal and prevents duplicate data.

## Migration from Vercel Cron

If you were using Vercel Cron before:

1. **Keep both** - They won't conflict due to duplicate handling
2. **Remove Vercel Cron** - Delete the `crons` section from `vercel.json`
3. **Keep API endpoint** - Still useful for manual triggers

The background service is more reliable and works on all Vercel plans.

## Advanced Configuration

### Change Capture Interval

Edit `lib/services/price-history-service.ts`:

```typescript
private captureInterval = 5 * 60 * 1000 // 5 minutes
```

Change to:
- `1 * 60 * 1000` for 1 minute
- `10 * 60 * 1000` for 10 minutes
- `60 * 60 * 1000` for 1 hour

### Disable in Production

Add to Vercel environment variables:
```
ENABLE_PRICE_HISTORY_SERVICE=false
```

### Multiple Instances

If running multiple server instances (e.g., horizontal scaling):
- Each instance will try to capture
- Duplicates are automatically skipped
- No coordination needed

## API Endpoints

### Capture Price History
```
POST /api/price-history/capture
Authorization: Bearer CRON_SECRET (optional)
```

### Get Price History
```
GET /api/price-history/:startupId?range=1d

Query params:
- range: 30m, 1h, 6h, 1d, 1w (default: 1d)
```

## Performance

- **Fetch**: ~2 seconds for 2,000+ startups (with pagination)
- **Process**: ~100ms to prepare records
- **Insert**: ~1 second for batch inserts
- **Total**: ~3-4 seconds per capture
- **Database growth**: ~2,000 records per 5 minutes = ~576,000 records/day

Consider adding data retention policies for long-term deployment.

## Future Enhancements

Possible improvements:
- Data retention/cleanup (delete records older than X days)
- Aggregation for older data (hourly → daily averages)
- Compression for historical data
- Real-time updates via WebSockets
- Alert system for unusual price movements
