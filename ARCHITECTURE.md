# Ceylon Wellness OS — Architecture

## Current foundation
React 19 + TypeScript + Vite public application; GitHub Pages deployment; Supabase planned as system of record; Edge Functions for sensitive operations.

## Trust boundary
Browser never receives service-role, payment, email or AI provider secrets. Sensitive actions go through authenticated Edge Functions. AI assists; humans authorise financial, booking, legal and availability commitments.

## Layers
Public experience → Journey Planner / Concierge → Leads → Human Admin → Quotation → Booking → Payment verification.

This release implements the public foundation, guided preliminary journey planner, team/partner structure, supplied Reiki certificate display, safe Admin configuration state, database foundation, and CI deployment. Commercial workflows remain configuration-gated rather than simulated.
