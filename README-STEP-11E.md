# CEYLON WELLNESS — STEP 11E

## What this adds

- CMS-driven Wellness browser
- CMS-driven Sri Lanka destination browser
- Search + category/region filters
- Public approved Media Library access
- Admin testimonial moderation UI
- Public site settings / dynamic WhatsApp number
- Quotation confirmation Edge Function hook
- SEO metadata component
- Organization structured data
- robots.txt + sitemap.xml
- GitHub Pages production workflow
- 404 redirect helper
- Vite GitHub Pages base configuration

## Important

Replace `YOUR-DOMAIN.example` in `public/robots.txt` and `public/sitemap.xml` before launch.

If using a project GitHub Pages URL such as:
https://USERNAME.github.io/REPOSITORY/
set Vite `base` to `/REPOSITORY/`.

If using a user/org site or custom domain, `/` is correct.

GitHub Pages should use GitHub Actions as the publishing source. Vite requires a build step before the `dist` artifact is deployed.

## Supabase

Run:
supabase db push

New migrations:
023_site_settings_public.sql
024_media_rls.sql
025_lead_indexes.sql

Public content is SELECT-only for published/approved rows. Admin write policies must remain tied to your existing role helpers.

## Email

`send-quotation-confirmation` is an integration hook, not a fake email sender.

Connect your chosen transactional email provider in the Edge Function and store its API key in Supabase Edge Function secrets.

Do not put email-provider secrets in Vite or GitHub public source.

## WhatsApp

`site_settings.whatsapp_number` is the source of truth.

Change the default placeholder in Supabase before launch.

## SEO

For each CMS detail page, the next refinement should read SEO title/description/hero image from the CMS and render canonical + Open Graph + JSON-LD.

The included global Organization schema is only the base layer.

## Production deployment

1. GitHub repository → Settings → Pages.
2. Source → GitHub Actions.
3. Add repository Actions secrets:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
4. Push to main.
5. GitHub Actions builds `dist`.
6. GitHub Pages publishes the artifact.

Never put Supabase secret keys in GitHub Actions frontend build variables.

## Supabase secrets

Set production secrets through Supabase Dashboard or CLI. Current Supabase docs state Edge Function secrets are managed as production secrets and are read by Edge Functions at runtime.

Example:
supabase secrets set OPENAI_API_KEY=...
supabase secrets set EMAIL_PROVIDER_API_KEY=...

Do not send secret values through chat.

## Final production checklist

- [ ] Real domain
- [ ] Real WhatsApp number
- [ ] Verified media licenses
- [ ] Verified Dr. Vipula biography
- [ ] Verified About Me biography
- [ ] Real customer testimonials + consent
- [ ] Supabase RLS audited
- [ ] Admin users/roles tested
- [ ] Email provider connected
- [ ] Quotation PDF tested
- [ ] Payment workflow tested
- [ ] Privacy/Terms/Cookies reviewed
- [ ] Sitemap domain replaced
- [ ] SEO metadata tested
- [ ] Mobile tested
- [ ] GitHub Actions deployment tested
