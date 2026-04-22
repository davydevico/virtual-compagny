/**
 * Client Supabase public — utilisable dans les composants client ('use client').
 * N'importe PAS supabaseAdmin ni aucune variable serveur.
 */
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
