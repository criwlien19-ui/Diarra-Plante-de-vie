import { createClient } from '@supabase/supabase-js';

// SÉCURITÉ : Les clés doivent être définies dans les variables d'environnement.
// Ne jamais hardcoder de clés API en fallback dans le code source.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // En dev, afficher un message clair. En prod, l'app ne peut pas fonctionner sans ces clés.
  console.error('⚠️ Variables d\'environnement Supabase manquantes (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Vérifiez votre fichier .env.local ou les variables Vercel.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
