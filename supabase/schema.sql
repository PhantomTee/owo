create extension if not exists pgcrypto;

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  job_title text,
  circle_user_id text,
  circle_wallet_id text,
  wallet_address text,
  employer_wallet text,
  created_at timestamptz default now()
);

create table if not exists streams (
  id bigint primary key,
  employer_wallet text not null,
  worker_id uuid references workers(id),
  rate_per_second numeric not null,
  monthly_salary_usd numeric,
  start_time timestamptz,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists payment_logs (
  id uuid primary key default gen_random_uuid(),
  stream_id bigint references streams(id),
  amount_usdc numeric not null,
  tx_hash text unique,
  withdrawn_at timestamptz default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  stream_id bigint references streams(id),
  alert_type text,
  message text,
  groq_reasoning text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  streams_checked integer,
  alerts_created integer,
  ran_at timestamptz default now()
);

alter publication supabase_realtime add table streams;
alter publication supabase_realtime add table payment_logs;
