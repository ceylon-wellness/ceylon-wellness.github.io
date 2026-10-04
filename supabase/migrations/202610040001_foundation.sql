create extension if not exists pgcrypto;
create type public.app_role as enum ('SUPER_ADMIN','SALES_ADMIN','CONTENT_ADMIN','EDITOR');
create type public.lead_status as enum ('NEW','CONTACTED','QUALIFYING','QUOTATION_PREPARING','QUOTATION_SENT','AWAITING_PAYMENT','PAYMENT_RECEIVED','CONFIRMED','COMPLETED','CANCELLED');
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade, display_name text, created_at timestamptz not null default now());
create table if not exists public.user_roles(user_id uuid references auth.users(id) on delete cascade, role app_role not null, primary key(user_id,role));
create table if not exists public.leads(id uuid primary key default gen_random_uuid(), name text, country text, email text, whatsapp text, travel_dates text, duration text, travellers int check(travellers>0), wellness_interests text[], journey_style text, accommodation text, transport text, budget_range text, requirements text, consent boolean not null default false, consent_at timestamptz, privacy_version text, source text, status lead_status not null default 'NEW', admin_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.audit_logs(id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), actor_type text not null default 'user', action text not null, entity_type text, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
alter table public.profiles enable row level security; alter table public.user_roles enable row level security; alter table public.leads enable row level security; alter table public.audit_logs enable row level security;
create policy "own profile read" on public.profiles for select using(auth.uid()=id);
-- Admin policies should be expanded after the first owner account is created. Never expose service-role keys in the browser.
