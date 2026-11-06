// The Supabase client (cloud sync and sign-in). Created on first use, so importing this module
// does nothing; null when the app has no cloud project configured.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CLOUD } from '@/shared/config';

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client === undefined) {
    client = CLOUD.supabaseUrl
      ? createClient(CLOUD.supabaseUrl, CLOUD.supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storageKey: 'fut-academy-stats.auth',
          },
        })
      : null;
  }
  return client;
}
