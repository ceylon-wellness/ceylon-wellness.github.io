# Production secrets

Set these through Supabase Dashboard → Edge Functions → Secrets or the Supabase CLI.

Example names:

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

RESEND_API_KEY=
EMAIL_FROM=CEYLON WELLNESS <hello@yourdomain.com>
ADMIN_NOTIFICATION_EMAIL=you@yourdomain.com

Future payment:
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

Do not commit values.

Current Supabase guidance says production Edge Function secrets should be managed as production secrets and read at runtime. Do not use the `SUPABASE_` prefix for your own custom secret names; Supabase reserves that prefix for platform-provided variables.
