import { createClient } from "@supabase/supabase-js";

// Cliente de ADMINISTRADOR (solo servidor). Usa la clave secreta y se salta RLS.
// ADMIN client (server-only). Uses the secret key and bypasses RLS.
// NUNCA se importa desde componentes de cliente. NEVER import from client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
