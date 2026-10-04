-- V8 secure admin + traveller lead storage. Run after 202610040001_foundation.sql.
-- Browser uses only the Supabase publishable/anon key. Never expose service_role.

alter table public.leads add column if not exists preferred_language text;
alter table public.leads add column if not exists delivery_preference text;
alter table public.leads add column if not exists journey_ref text;
alter table public.leads add column if not exists itinerary jsonb not null default '[]'::jsonb;
alter table public.leads add column if not exists arrival_airport text;
alter table public.leads add column if not exists flight_number text;
alter table public.leads add column if not exists landing_time text;
alter table public.leads add column if not exists airport_pickup text;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.user_roles r where r.user_id=auth.uid()); $$;

-- A traveller can create a lead only when explicit journey-request consent is present.
create policy "consented traveller lead insert" on public.leads
for insert to anon, authenticated
with check (consent = true and email is not null and whatsapp is not null);

create policy "admins read leads" on public.leads
for select to authenticated using (public.is_admin());
create policy "admins update leads" on public.leads
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins read roles" on public.user_roles
for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy "admins read profiles" on public.profiles
for select to authenticated using (id=auth.uid() or public.is_admin());

-- Owner bootstrap is intentionally manual: create the first Auth user in Supabase,
-- then insert its UUID into public.user_roles as SUPER_ADMIN from the SQL editor.
