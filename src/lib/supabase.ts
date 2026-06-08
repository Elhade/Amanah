import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton navigateur — réservé à AuthContext.tsx pour onAuthStateChange.
// Partout ailleurs : utiliser createServerClient() (server.ts) ou passer par un service.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
