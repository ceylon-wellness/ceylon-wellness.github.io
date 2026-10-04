# Ceylon Wellness — language, legal, payment and trust build

## Languages

Primary first-class languages:
- English
- Polish
- Russian
- German
- French

The site has a language selector and stores the user's choice locally.

The browser is also allowed to offer its own translation. Browser translation is a fallback controlled by the browser; it is not treated as the legal source of translated terms.

## Legal

The site includes:
- Privacy
- Terms
- Cookies
- Data request
- Reiki cancellation/rescheduling terms
- Hotel/accommodation supplier terms
- Transport cancellation terms
- Consumer-rights reservation

Before launch, the operator's legal identity, registered address, registration number, VAT/tax details if applicable, contact address, governing law and complaint/consumer information must be inserted into the legal pages. Do not invent these details.

## Payment

Architecture:
Quotation → customer acceptance → payment → payment verification → booking confirmation.

Planned methods:
- Bank transfer
- Online card payment through a configured payment provider

The public site does not claim that card payment is live until the merchant/provider account is actually connected.

Payment secrets must remain server-side in Supabase Edge Functions. Supabase documents publishable keys as safe for browser use under RLS, while secret keys bypass RLS and must never be exposed in the browser.

## Trust

The trust layer includes:
- verified practitioner credentials
- real consented testimonials
- clear quotation flow
- supplier-specific cancellation terms
- secure payment architecture
- human review before final quotation
- no medical cure promises
- transparent distinction between Ceylon Wellness and travel/ground-handling partners

## Important

Legal text is a launch draft, not legal advice. Have the final consumer, privacy, tax and travel terms reviewed for the actual operating entity and countries served.
