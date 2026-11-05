import { fileURLToPath } from 'node:url';
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
    rolldownOptions: {
      output: {
        // Fixed names (no content hash) until step 4, because public/sw.js lists them in ASSETS.
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
