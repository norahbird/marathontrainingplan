# Run Planner

Build day-by-day running training plans for a goal race (5K to marathon and beyond), then log what you actually ran against them.

- **Accounts:** sign in with email and password. Plans are saved to your account, so they appear on every device you sign in on. Each account can only see its own plans.
- **Plan builder:** set the race, goal time, plan length and week start day, then fill in each day as a run (distance or time, purpose, description) or rest. Race day is added automatically.
- **Calendar and log:** after finalizing, see a color-coded calendar, or a weekly log where you record completed and skipped runs, actual distance, shoes, notes and interval times, with planned and actual weekly mileage.
- **Backup:** export all plans to a JSON file, or import one, including backups from the earlier local-only version of the app.

## Setup

The app is a static Vite + React site that talks to [Supabase](https://supabase.com) for sign-in and storage. It can share a Supabase project with other apps, since it only adds one table.

1. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the `training_plans` table with Row Level Security and is safe to run more than once.
2. In Supabase **Authentication → URL Configuration**, add the deployed site's address (and `http://localhost:5173` for development) under **Redirect URLs**. Sign-up confirmation emails link back to these.
3. Copy `.env.example` to `.env.local` and fill in the project's URL and anon/public key (Supabase **Project Settings → API**).

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
```

## Deploying (Vercel)

Import this repository as a Vercel project (the Vite preset is detected automatically) and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the project's environment variables. They aren't secret, since the anon key is meant for use in the browser, but the build needs them. `vercel.json` sends every path to the app so links to individual plans work. Every push to `main` deploys.

## Installing on iPhone

Open the site in Safari, tap **Share → Add to Home Screen**. It opens full screen with its own icon. Home Screen apps keep their own sign-in, so sign in once inside the app.
