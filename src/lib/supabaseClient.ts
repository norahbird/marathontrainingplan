import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the build is missing its Supabase settings; main.tsx shows a setup message instead of the app. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Read what an emailed link (password reset, sign-up confirmation) put in the URL before the
// Supabase client consumes and clears it. Its own PASSWORD_RECOVERY event can fire before the
// app subscribes, so the app relies on this instead.
function readEmailLinkRedirect() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  return {
    isPasswordRecovery: params.get('type') === 'recovery',
    linkError: params.get('error_description') ?? query.get('error_description'),
  };
}
export const emailLinkRedirect = readEmailLinkRedirect();

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'not-configured');
