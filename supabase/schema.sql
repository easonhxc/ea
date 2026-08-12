
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.application_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_name text not null,
  program text,
  major text,
  round text not null default 'RD',
  probability double precision,
  probability_min double precision,
  probability_max double precision,
  tier text,
  status text not null default 'Planning',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists application_plans_user_idx
  on public.application_plans(user_id);

create table if not exists public.prediction_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary_major text,
  secondary_major text,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists prediction_runs_user_idx
  on public.prediction_runs(user_id, created_at desc);

create table if not exists public.school_overrides (
  school_name text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.application_plans enable row level security;
alter table public.prediction_runs enable row level security;
alter table public.school_overrides enable row level security;
alter table public.feedback enable row level security;

-- The app intentionally uses server-side API routes with the service-role key.
-- No direct browser table access is needed, so no permissive RLS policies are created.
