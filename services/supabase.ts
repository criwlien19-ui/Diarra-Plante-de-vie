import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// SÉCURITÉ & STABILITÉ : On ne crée le client que si les variables sont présentes.
// Si elles manquent, on exporte un proxy ou un objet qui ne fait rien pour éviter le crash au chargement.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: () => {
        console.error('⚠️ Supabase utilisé sans variables d\'environnement (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
        return () => Promise.resolve({ data: null, error: new Error('Supabase not initialized') });
      }
    });
