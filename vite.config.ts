import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative paths, so the build works under https://<user>.github.io/fut-academy-stats/.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // Ships the licences of bundled packages (supabase-js is MIT) as licenses.md next to the app.
    license: { fileName: 'licenses.md' },
  },
  plugins: [
    // Offline support: builds src/sw.ts into dist/sw.js with the list of files to precache.
    // Same file name and scope as the old hand-written sw.js, so installed apps pick it up.
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false, // src/main.js registers 'sw.js' itself
      manifest: false, // public/manifest.webmanifest is used as it is
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
