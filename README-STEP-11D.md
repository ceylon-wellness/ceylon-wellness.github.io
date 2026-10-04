# CEYLON WELLNESS — STEP 11D

This block turns the STEP 11C public shell into a real CMS/Supabase-connected visitor flow.

## 1. Install
npm install @supabase/supabase-js react-router-dom lucide-react

## 2. Environment
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...

Do NOT put OpenAI, Supabase secret/service keys, payment keys or admin credentials in Vite/browser environment variables.

Supabase's current React guidance uses the project URL plus publishable key for the browser client. Keep elevated secret keys server-side.

## 3. AI Concierge Edge Function

Deploy:
supabase functions deploy ai-concierge

Set secrets in Supabase:
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
supabase secrets set SUPABASE_SECRET_KEY=...

If your project still uses the legacy service-role secret, the function has a compatibility fallback:
SUPABASE_SERVICE_ROLE_KEY

## 4. Lead function

Deploy:
supabase functions deploy create-lead

The function validates required name/email/consent, upserts the customer, then creates a lead.

IMPORTANT:
The exact leads/customers schema from your existing migrations must contain the fields used by this function. If your schema uses different column names, adapt the insert mapping rather than creating duplicate fields.

## 5. Database migration

Run:
supabase db push

Migration:
supabase/migrations/022_public_content_rls.sql

Public users can only SELECT rows whose status is PUBLISHED. Keep all admin writes protected by role/RLS.

## 6. Routes added

/plan-your-journey
/about/dr-vipula
/about
/stories
/wellness/:slug
/sri-lanka/:slug

## 7. Dr. Vipula video

Approved video ID from the project specification:
CmwFc7DDFG8

Embedded as:
https://www.youtube.com/embed/CmwFc7DDFG8

Do not download or re-upload the video.

## 8. Media

Continue using approved/licensed media only:
public/media/hero
public/media/sri-lanka
public/media/wellness
public/media/people

## 9. WhatsApp

Replace FALLBACK_WHATSAPP in src/services/whatsappService.ts with the official business number, or move the number to site_settings and fetch it from Supabase.

## 10. Important production security

- Browser: publishable key only.
- Edge Functions: OpenAI API key + Supabase secret key.
- RLS enabled on exposed tables.
- Public content: SELECT published only.
- Customer/lead/quotation/payment data: private.
- Do not expose service/secret keys in GitHub.
- Rate-limit public AI and lead endpoints before launch.

## 11. AI behavior

The AI produces preliminary concepts only. It must not invent:
prices, availability, bookings, hotel availability, reviews, qualifications, diagnoses, prescriptions or cures.

The human/admin quotation workflow remains the source of truth.

## 12. Next

STEP 11E:
- complete CMS detail templates
- destination/wellness search + filters
- dynamic Media Library rendering
- admin testimonial management UI
- quote request confirmation/email
- secure WhatsApp number from site_settings
- SEO metadata/schema
- sitemap/robots
- production error tracking
- final GitHub Pages deployment
