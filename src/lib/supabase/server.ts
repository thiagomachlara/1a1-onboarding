import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cria cliente Supabase para uso server-side
 * Usa service role key para bypass RLS
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}

