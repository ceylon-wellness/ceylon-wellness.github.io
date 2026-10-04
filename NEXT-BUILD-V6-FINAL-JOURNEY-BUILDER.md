# Ceylon Wellness V6 — Final Journey Builder

## Added
- Planner-edit mode and clean Traveller Preview mode.
- Internal planner notes are hidden from the traveller-facing document.
- Traveller/group name, journey reference, prepared-by and personalised final note.
- Browser-native Download / Save PDF flow (Print → Save as PDF), with dedicated A4 print styling.
- Traveller-facing labels follow the selected EN / PL / RU / DE / FR interface language.
- WhatsApp hand-off and all V5 wellness-first / budget-friendly / supplier-term rules retained.
- Admin-ready separation between internal planning fields and traveller-facing output.

## Architecture rule
V6 remains 100% static/free on GitHub Pages. The planner workspace is not a secure multi-user admin system yet. Secure shared online editing for Priyantha / Dr. Vipula requires a later authentication + storage phase. V6 deliberately prepares the data/UI separation without pretending public browser state is secure admin access.

## PDF
The PDF button uses the browser print engine. Choose **Save as PDF** in the print dialog. No paid PDF/API service is required.
