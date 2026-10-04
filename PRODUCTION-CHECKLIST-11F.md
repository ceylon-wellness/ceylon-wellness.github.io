# CEYLON WELLNESS — STEP 11F PRODUCTION CHECKLIST

## A. Supabase
- [ ] Run all migrations through 028
- [ ] Review RLS for EVERY public schema table
- [ ] Test anon cannot read customers/leads/payments/bookings
- [ ] Test admins can only access allowed modules
- [ ] Test content admins cannot access sensitive sales data
- [ ] Enable database backups / recovery plan
- [ ] Confirm Storage buckets and policies
- [ ] Confirm Auth admin accounts and MFA policy where appropriate

Supabase currently recommends enabling RLS for exposed tables and treating policies + grants together as the authorization model.

## B. Secrets
Production Edge Function secrets:
- OPENAI_API_KEY
- OPENAI_MODEL
- RESEND_API_KEY
- EMAIL_FROM
- ADMIN_NOTIFICATION_EMAIL
- SUPABASE project-provided secret key mechanism
- Future payment provider secrets

NEVER put these in:
- VITE_ variables
- public/
- GitHub source
- browser localStorage
- frontend JavaScript

## C. Email
Use Resend or another verified transactional provider.
Before launch:
- verify sending domain
- configure SPF/DKIM/DMARC
- test customer confirmation
- test admin notification
- test quotation email
- test booking confirmation
- test failure logging

## D. Quotation PDF
- Generate from server-side Edge Function
- Pull quotation data from Supabase
- Include quotation number
- Customer/journey/dates/travellers
- Itemized services
- Total/advance/balance
- Validity
- Terms
- No fake pricing

## E. Payments
MVP:
- Bank transfer
- Customer uploads proof
- Admin verifies
- Payment becomes SUCCEEDED
- Booking becomes CONFIRMED

Future:
- Stripe/PayPal
- Provider webhook signature verification
- Idempotency
- Refund handling

Never mark a payment successful merely because the customer says it was paid.

## F. GDPR/privacy
Before public launch:
- legal entity identified
- controller/contact details
- lawful basis reviewed
- privacy policy finalized
- cookie inventory finalized
- consent wording reviewed
- retention periods decided
- deletion/access process tested
- processors/subprocessors documented
- international transfers reviewed where applicable

This code provides technical placeholders, not legal advice.

## G. SEO
- Real domain in sitemap
- robots.txt points to real sitemap
- canonical URLs
- unique title/description per page
- OG image
- Organization schema
- Breadcrumb schema where appropriate
- Article schema for stories
- FAQ schema only where actual FAQs exist
- image alt text
- Search Console verification

## H. GitHub Pages
- Settings → Pages → GitHub Actions
- Add VITE_SUPABASE_URL secret
- Add VITE_SUPABASE_PUBLISHABLE_KEY secret
- Confirm build passes
- Confirm SPA fallback
- Confirm custom domain
- Verify custom domain before production where possible
- HTTPS enabled

## I. Media
- every published image has source
- licence verified
- attribution stored where required
- real people have appropriate permission
- no fake testimonials
- no fake practitioner credentials
- no AI-generated image presented as a real Sri Lankan location

## J. Launch test
Visitor:
Homepage → Wellness → Concierge → Lead → Confirmation

Admin:
Login → Lead → Customer → Quote → PDF → Send → Payment → Booking

Mobile:
iOS Safari + Android Chrome

Failure cases:
- Supabase offline
- AI timeout
- duplicate lead
- email failure
- payment failure
- invalid quote
- expired quote
- missing media
- bad route / 404

## K. Launch status
The application is production-ready only after the checklist above is tested against the actual production Supabase project, actual domain, actual email sender, actual WhatsApp number and actual payment workflow.
