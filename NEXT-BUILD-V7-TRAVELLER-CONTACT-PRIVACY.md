# Ceylon Wellness V7 – Traveller Contact & Privacy Handoff

## Added
- Simple traveller contact card: name/group, email, WhatsApp/phone, preferred language.
- Delivery preference: Email + WhatsApp or WhatsApp only.
- Contact details are added to the user-initiated WhatsApp handoff; no static-site database storage is claimed.
- Explicit journey-request privacy acknowledgement before the WhatsApp handoff becomes active.
- Clear data-minimisation messaging: no account, no public profile, no passport upload.
- Privacy foundation page explaining current browser-only/static behaviour and boundaries.
- Marketing consent deliberately kept separate from journey handling.
- Existing V6 planner edit, traveller preview, PDF flow, wellness-first planning and supplier-specific terms retained.

## Architecture boundary
V7 remains static/free on GitHub Pages. Automatic outbound email, secure multi-user admin, shared traveller records and cross-device editing require a later authenticated backend. No API key or email secret is exposed in the browser.

## Final contact setup
The central CONTACTS array remains the single place to add the final three contact slots. Final controller/privacy contact details must be added before commercial launch and the legal text professionally reviewed.
