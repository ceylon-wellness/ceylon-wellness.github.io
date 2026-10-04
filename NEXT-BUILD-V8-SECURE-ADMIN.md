# Ceylon Wellness V8 — Secure Admin Workspace

## Added
- Optional Supabase-backed traveller lead capture. If Supabase is not configured, the existing WhatsApp-first V7 flow continues.
- Secure `/admin` login using Supabase Auth (email/password).
- Row Level Security: traveller can INSERT only a consented lead; only authenticated users with a row in `user_roles` can read/update leads.
- Simple admin workspace for Priyantha / Dr. Vipula: traveller cards, search, status, contact details, journey brief and itinerary.
- Browser-safe publishable key only. Service-role, email, AI and payment secrets must never be added to Vite/browser environment variables.
- V8 migration adds itinerary, journey reference, language, delivery and flight/pickup fields.

## Setup boundary
V8 code is admin-ready, but secure shared online admin becomes active only after a Supabase project is configured, migrations are applied, two Auth users are created, and their UUIDs are assigned roles. Until then `/admin` displays a setup-required screen and the public planner remains usable.

## Privacy
The public site saves a lead to Supabase only after the traveller explicitly acknowledges the journey-request privacy notice and chooses to send the request. No passport upload, public profile or marketing consent is added.
