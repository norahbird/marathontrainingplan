-- Marathon Training Plan schema.
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query). It is safe to
-- run more than once, and can live in the same Supabase project as other apps: it only
-- adds the training_plans table.
--
-- Each row is one training plan, stored whole as JSON. user_id defaults to the signed-in
-- user, and Row Level Security means an account can only ever see or change its own plans.
-- `version` changes on every save; the app only saves over the version it last loaded, so
-- a stale tab on another device can't overwrite newer changes.

create table if not exists training_plans (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table training_plans enable row level security;

drop policy if exists "training_plans_owner_only" on training_plans;
create policy "training_plans_owner_only" on training_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
