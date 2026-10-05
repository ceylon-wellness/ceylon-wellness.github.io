alter table public.leads
add column if not exists accommodation_booking_status text default 'Pending';

alter table public.leads
add column if not exists transport_booking_status text default 'Pending';

alter table public.leads
add column if not exists wellness_booking_status text default 'Pending';
