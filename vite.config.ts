import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],

      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },

      // Optimisation du build pour la production
      build: {
        // Seuil d'avertissement pour les chunks (en Ko)
        chunkSizeWarningLimit: 800,
        rollupOptions: {
          output: {
            // Code splitting manuel : séparer les grosses dépendances
            manualChunks: {
              // Regrouper React et React-DOM dans un chunk séparé
              'react-vendor': ['react', 'react-dom'],
              // Framer Motion dans son propre chunk (lib lourde ~140KB)
              'framer-motion': ['framer-motion'],
              // Supabase client dans son propre chunk
              'supabase': ['@supabase/supabase-js'],
              // Gemini SDK dans son propre chunk
              'gemini': ['@google/genai'],
            }
          }
        },
        // Activer la compression des assets
        sourcemap: false,
        // Minification optimale
        minify: 'esbuild',
      },

      // Variables d'env exposées côté client : uniquement celles préfixées VITE_
      // (comportement par défaut de Vite — documenté ici pour clarté)
      envPrefix: 'VITE_',
    };
});
