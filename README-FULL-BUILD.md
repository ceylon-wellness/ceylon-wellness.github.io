# CEYLON WELLNESS — FULL BUILD

This package continues the STEP 11G foundation and adds the first integrated business-facing journey layer.

## Added in this build

- Design My Wellness Journey flow
- Wellness category selection
- Sri Lanka destination/place selection
- Duration selection
- Budget range selection
- Traveller type
- Accommodation preference
- WhatsApp handoff with journey summary
- Dedicated Reiki page
- Online Reiki Level 1 / Level 2 enquiry flow
- Reiki Level 1 + 2 enquiry option
- Practitioner presentation structure for Dr. Vipula Wanigasekera and Dzemesh Tatsiana
- Certificate data model and publication workflow
- Journey preference persistence attached to a lead
- Analytics consent gating
- Additional Supabase migration `029_full_journey_reiki.sql`

## Certificate rule

Do not publish a practitioner credential from memory or assumption.
Upload the original two certificates and enter the exact title, level, issuing organisation, date and certificate number shown on the documents.

## Pricing rule

Reiki prices are not hard-coded into the public site. The customer can ask through WhatsApp and receive the current price/date information.

## Reviews

Only real customer reviews with appropriate consent should be published.

## Build verification

Run:

```bash
npm install
npm run typecheck
npm run build
```

The packaging environment has not claimed a successful registry-backed production build. Your machine/CI should perform the final dependency install and build.

## Next production integration

1. Apply all Supabase migrations in order.
2. Configure Supabase secrets.
3. Add the two Reiki certificates.
4. Add verified practitioner profiles.
5. Add real consented customer reviews.
6. Replace placeholder domain in `public/sitemap.xml` and `public/robots.txt`.
7. Configure WhatsApp number in `site_settings`.
8. Configure email sender/provider.
9. Run RLS smoke tests.
10. Run the complete customer-to-booking smoke test.

## Business platform phase

See `BUSINESS-PLATFORM-BUILD-2026-10-03.md` for the Admin + CMS + secure quotation + customer booking architecture added in the latest package.
