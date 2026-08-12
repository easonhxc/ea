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
create index if not exists application_plans_user_idx on public.application_plans(user_id);

create table if not exists public.prediction_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary_major text,
  secondary_major text,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists prediction_runs_user_idx on public.prediction_runs(user_id, created_at desc);

create table if not exists public.saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id text not null,
  status text not null default 'Considering',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, opportunity_id)
);
create index if not exists saved_opportunities_user_idx on public.saved_opportunities(user_id);

create table if not exists public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  item_type text not null default 'task',
  due_date date,
  due_window text,
  priority text not null default 'medium',
  status text not null default 'todo',
  why text,
  success_metric text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists roadmap_items_user_idx on public.roadmap_items(user_id, status, due_date);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_key text not null default 'advisor',
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists conversation_messages_user_idx on public.conversation_messages(user_id, thread_key, created_at);

create table if not exists public.school_overrides (
  school_name text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.high_school_outcome_overrides (
  high_school_id text primary key,
  data jsonb not null default '{}'::jsonb,
  source_url text,
  source_year integer,
  verified boolean not null default false,
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
alter table public.saved_opportunities enable row level security;
alter table public.roadmap_items enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.school_overrides enable row level security;
alter table public.high_school_outcome_overrides enable row level security;
alter table public.feedback enable row level security;

-- UniPath uses authenticated server-side API routes with the server key.
-- No permissive browser policies are required for these application tables.
