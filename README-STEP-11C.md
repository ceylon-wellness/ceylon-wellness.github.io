# CEYLON WELLNESS — STEP 11C

This build block adds the public premium cinematic UI foundation.

## Add these files

Copy the `src/` files into the existing React/Vite project.

## Media contract

The UI expects approved/licensed media under:

public/media/
  hero/sri-lanka-wellness-hero.mp4
  hero/sri-lanka-wellness-hero.webp
  sri-lanka/tea-country-hero.webp
  sri-lanka/waterfall-hero.webp
  sri-lanka/ocean-hero.webp
  sri-lanka/forest-mountain.webp
  sri-lanka/wildlife.webp
  sri-lanka/sigiriya.webp
  wellness/reiki-session.webp
  wellness/meditation-nature.webp
  people/dr-vipula.webp

Do not populate these with unverified Google images. Use the approved Media Library workflow.

## Required dependency

If not already installed:

npm install react-router-dom lucide-react

## Existing project integration

Keep the existing Supabase services, AI Concierge, Admin, Reviews and quotation/booking modules.
This step only establishes the public-facing visual shell and homepage.

## Next build

STEP 11D:
- real CMS-driven public pages
- AI Concierge full-screen/mobile experience
- lead capture form
- WhatsApp handoff
- Dr. Vipula page with approved YouTube video
- About Me page
- real testimonials from Supabase
- wellness/destination detail templates
