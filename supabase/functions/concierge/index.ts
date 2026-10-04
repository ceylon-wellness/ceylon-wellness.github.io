// Supabase Edge Function foundation. Add an approved AI provider secret in Supabase, never VITE_ env.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed',{status:405});
  return Response.json({status:'configuration_required',message:"AI Concierge server integration is not configured yet. A Ceylon Wellness coordinator can assist you."},{status:503});
});
