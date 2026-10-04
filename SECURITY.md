# Security
- Never commit secrets; `.env.example` contains browser-safe placeholders only.
- Supabase RLS must remain enabled on customer/business tables.
- AI cannot confirm bookings, prices, availability, payments or refunds.
- Payment success must be server/webhook verified.
- Customer data must never be exposed across customers.
- Production admin requires Supabase Auth and role checks before business data is enabled.
