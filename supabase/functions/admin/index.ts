// Supabase Edge Function "admin": lets the app's admin give people access to the cloud and remove
// it. Only these two actions need the service role (they create / delete auth users); everything
// else on the Admin page (list accounts, change kind, team members) goes straight to the database
// and is protected by Row Level Security. See docs/cloud-sync-plan.md and docs/supabase-setup.md.
//
// Request: POST with the signed-in user's access token (`Authorization: Bearer <jwt>`, which
// supabase-js `functions.invoke()` sends) and a JSON body:
//   { action: 'create_account', email, kind: 'director' | 'coach' } -> { ok: true, user_id }
//   { action: 'delete_account', user_id }                           -> { ok: true }
// Errors: { error: <code>, message } with an HTTP status (400, 401, 403, 404, 405, 409, 500).
//
// SUPABASE_URL and the service role key are provided by Supabase to every Edge Function. The
// service role key bypasses RLS: it never leaves this function (never in the repo or the app).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

// The app is served from GitHub Pages (another origin). Access is controlled by the JWT, not the
// origin, so any origin may call this.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, error: string, message: string) => json(status, { error, message });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The service role key: the legacy env var, or the default of the newer secret keys (JSON).
function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
    return keys.default || Object.values(keys)[0] || '';
  } catch {
    return '';
  }
}

// Find an existing auth user by email (the admin API has no lookup by email, so page through).
async function findUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email);
    if (u) return u.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function createAccount(admin: SupabaseClient, callerId: string, body: Record<string, unknown>) {
  const email = String(body.email ?? '').trim().toLowerCase();
  const kind = String(body.kind ?? '');
  if (!EMAIL_RE.test(email) || email.length > 254) return fail(400, 'invalid_email', 'Invalid email address');
  if (kind !== 'director' && kind !== 'coach') return fail(400, 'invalid_kind', 'kind must be director or coach');

  const { data: existing, error: lookupError } = await admin.from('accounts').select('user_id').eq('email', email).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return fail(409, 'exists', 'This email already has an account');

  // Reuse the auth user if there is one (e.g. created in the dashboard), else create it. No email
  // is sent: the person signs in with their email and a code from the app.
  let userId = await findUserId(admin, email);
  let created = false;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    created = true;
  }

  const { error } = await admin.from('accounts').insert({ user_id: userId, email, kind, created_by: callerId });
  if (error) {
    if (created) await admin.auth.admin.deleteUser(userId); // don't leave a user without an account
    if (error.code === '23505') return fail(409, 'exists', 'This user already has an account');
    throw error;
  }
  return json(200, { ok: true, user_id: userId });
}

async function deleteAccount(admin: SupabaseClient, callerId: string, body: Record<string, unknown>) {
  const userId = String(body.user_id ?? '');
  if (!UUID_RE.test(userId)) return fail(400, 'invalid_user', 'Invalid user_id');
  if (userId === callerId) return fail(400, 'self', 'You cannot remove your own access');

  // Admins are only removed in the dashboard (is_admin is set there too).
  const { data: target, error: lookupError } = await admin.from('accounts').select('is_admin').eq('user_id', userId).maybeSingle();
  if (lookupError) throw lookupError;
  if (target?.is_admin) return fail(400, 'is_admin', 'Admins can only be removed in the Supabase dashboard');

  // Deleting the auth user removes the accounts row and the team memberships (foreign keys).
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    if (error.status === 404) return fail(404, 'not_found', 'No such user');
    throw error;
  }
  return json(200, { ok: true });
}

export async function handle(req: Request, admin: SupabaseClient): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST');

  try {
    // Who is calling? The user of the access token, and only if their account is an admin.
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!jwt) return fail(401, 'no_session', 'Sign in first');
    const { data: auth, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !auth?.user) return fail(401, 'no_session', 'Sign in again');
    const callerId = auth.user.id;
    const { data: me, error: meError } = await admin.from('accounts').select('is_admin').eq('user_id', callerId).maybeSingle();
    if (meError) throw meError;
    if (!me?.is_admin) return fail(403, 'not_admin', 'Only the admin can do this');

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return fail(400, 'bad_request', 'Body must be JSON');
    }
    if (!body || typeof body !== 'object') return fail(400, 'bad_request', 'Body must be a JSON object');

    switch (body.action) {
      case 'create_account': return await createAccount(admin, callerId, body);
      case 'delete_account': return await deleteAccount(admin, callerId, body);
      default: return fail(400, 'unknown_action', 'Unknown action');
    }
  } catch (e) {
    console.error('admin function error', e);
    return fail(500, 'server_error', e instanceof Error ? e.message : String(e));
  }
}

// One service-role client for all requests (no session of its own).
const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve((req) => handle(req, admin));
