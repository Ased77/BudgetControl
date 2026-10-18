import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * One build directory, `dist/`, for every target — local, Docker and Vercel.
 * Vercel's Express preset serves static files from `public/`, so the post-build
 * step in `scripts/vercel-static.mjs` copies `dist/` there; that keeps the
 * deployed bytes identical to the ones tested locally and lets the deployment
 * work whichever preset Vercel resolves the project to. Font sources live in
 * `static/` (Vite's publicDir) because `public/` is a build output on Vercel.
 */
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    publicDir: 'static',
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
