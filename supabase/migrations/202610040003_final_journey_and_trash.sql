-- Safe additive migration for V9 commercial/travel admin fields and trash tracking.
-- This does not recreate or drop existing tables or data.

alter table public.leads add column if not exists preferred_language text;
alter table public.leads add column if not exists delivery_preference text;
alter table public.leads add column if not exists journey_ref text;
alter table public.leads add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists arrival_airport text;
alter table public.leads add column if not exists flight_number text;
alter table public.leads add column if not exists landing_time text;
alter table public.leads add column if not exists airport_pickup text;
alter table public.leads add column if not exists currency text default 'USD';
alter table public.leads add column if not exists total_price numeric(12,2);
alter table public.leads add column if not exists advance_deposit_type text default 'percentage';
alter table public.leads add column if not exists advance_deposit_value numeric(12,2);
alter table public.leads add column if not exists advance_amount numeric(12,2);
alter table public.leads add column if not exists remaining_balance numeric(12,2);
alter table public.leads add column if not exists advance_due_date text;
alter table public.leads add column if not exists balance_due_date text;
alter table public.leads add column if not exists quotation_valid_until text;
alter table public.leads add column if not exists booking_status text;
alter table public.leads add column if not exists accommodation_booking_details text;
alter table public.leads add column if not exists transport_booking_details text;
alter table public.leads add column if not exists wellness_booking_details text;
alter table public.leads add column if not exists price_includes text;
alter table public.leads add column if not exists price_excludes text;
alter table public.leads add column if not exists traveller_payment_instructions text;
alter table public.leads add column if not exists traveller_cancellation_terms text;
alter table public.leads add column if not exists supplier_cost numeric(12,2);
alter table public.leads add column if not exists supplier_reference text;
alter table public.leads add column if not exists internal_margin numeric(12,2);
alter table public.leads add column if not exists internal_commercial_notes text;
alter table public.leads add column if not exists deleted_at timestamptz;
alter table public.leads add column if not exists deleted_reason text;

create table if not exists public.reiki_requests (
  id uuid primary key default gen_random_uuid(),
  request_ref text,
  name text,
  email text,
  whatsapp text,
  preferred_language text,
  reiki_level text,
  timezone text,
  preferred_schedule text,
  notes text,
  status text not null default 'NEW',
  admin_notes text,
  consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_reason text
);

alter table public.reiki_requests enable row level security;

create policy if not exists "admins read reiki" on public.reiki_requests
for select to authenticated using (public.is_admin());
create policy if not exists "admins update reiki" on public.reiki_requests
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy if not exists "admins insert reiki" on public.reiki_requests
for insert to authenticated with check (public.is_admin());
create policy if not exists "admins delete reiki" on public.reiki_requests
for delete to authenticated using (public.is_admin());
