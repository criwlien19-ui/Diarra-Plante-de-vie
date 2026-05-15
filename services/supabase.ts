import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// On ne crée le client que si les variables sont valides.
// Sinon, on exporte un objet simulé pour éviter de faire planter toute l'application React.
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : {
      from: () => ({
        select: () => ({ order: () => Promise.resolve({ data: [], error: { message: "Supabase non configuré" } }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: { message: "Supabase non configuré" } }) }),
        update: () => ({ eq: () => Promise.resolve({ error: { message: "Supabase non configuré" } }) }),
        insert: () => Promise.resolve({ error: { message: "Supabase non configuré" } }),
        upsert: () => Promise.resolve({ error: { message: "Supabase non configuré" } }),
      }),
      storage: {
        from: () => ({
          upload: () => Promise.resolve({ error: { message: "Supabase non configuré" } }),
          getPublicUrl: () => ({ data: { publicUrl: "" } })
        })
      }
    } as any;
