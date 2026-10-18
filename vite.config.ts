import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Vercel's Express preset serves static files from `public/` (its output
 * directory is fixed, not configurable), so on Vercel the client bundle is
 * written there. Everywhere else — local dev, Docker, any other host — the
 * bundle stays in `dist/`, which production Express serves. The source assets
 * therefore live in `static/` rather than `public/`, since `public/` is a build
 * output on one platform and unused on the others.
 */
const outDir = process.env.VERCEL ? 'public' : 'dist';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    publicDir: 'static',
    build: {
      outDir,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR can be disabled via the DISABLE_HMR env var (e.g. for automated tooling).
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
