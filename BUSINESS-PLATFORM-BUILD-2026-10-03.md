# CEYLON WELLNESS — BUSINESS PLATFORM BUILD

This phase turns the existing website foundation into a business workflow with:

- Admin authentication and role model
- Admin dashboard
- Lead/CRM list
- Quotation builder
- Localised CMS editor for EN / PL / RU / DE / FR
- Secure quotation access links using random tokens stored only as SHA-256 hashes
- Customer quotation page
- Quotation acceptance → booking creation
- Customer booking details
- Bank-transfer payment workflow
- Payment verification / booking confirmation area for Admin
- Supabase RLS boundaries for private business data

## Customer flow

Visitor → Journey / AI Concierge → Lead → Admin quotation → secure quotation URL → customer review → accept terms → booking created → payment → admin verifies → booking confirmed.

## Admin routes

- `/admin/login`
- `/admin`
- `/admin/leads`
- `/admin/quotations`
- `/admin/bookings`
- `/admin/cms`

## Customer route

- `/quote/:token`

The token is never stored in the database in plaintext. The customer URL contains the random access token; Supabase stores only its SHA-256 hash and expiry.

## Admin bootstrap

1. Create the first user in Supabase Authentication → Users.
2. Copy that user's UUID.
3. Run:

```sql
insert into public.admin_users (user_id, role, display_name)
values ('YOUR-AUTH-USER-UUID', 'SUPER_ADMIN', 'Priyantha');
```

Do not create admin accounts from the public website.

## Required production settings

Public/browser:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Supabase server secrets:
- `SUPABASE_SECRET_KEY` (preferred) or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_NOTIFICATION_EMAIL`

Business settings stored in Supabase:
- legal business name
- registered address
- registration number
- VAT number if applicable
- support email/phone
- bank transfer instructions
- payment provider status

## Payment status

Bank transfer workflow is architected. Card checkout is intentionally not marked live until a real merchant/payment provider is configured and its webhook/signature/idempotency flow is tested.

## Legal status

The website contains operational legal drafts, not legal advice. Before launch, enter the real operating entity details and have the final Terms, Privacy, Cookies, refund/cancellation and complaint process reviewed for the jurisdiction(s) in which the business operates and sells.

## Important production hardening

Before public launch:

1. Apply migration `031_business_platform.sql` after reviewing the existing schema.
2. Configure Supabase Auth and create the first Super Admin.
3. Set all production secrets in Supabase; never put secrets in GitHub or Vite environment variables.
4. Test RLS using a non-admin authenticated user and anon user.
5. Test quotation expiry, revocation and duplicate acceptance.
6. Configure Resend sender/domain and test customer/admin emails.
7. Configure the actual payment provider before enabling card payments.
8. Add a payment webhook with provider signature verification and idempotency.
9. Replace placeholder business contact/payment data.
10. Run the full visitor → lead → quotation → customer → booking → payment verification test on mobile and desktop.
