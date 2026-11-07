import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, type Plugin } from 'vitest/config';

// The pwa-install component (install steps on iPhones, src/features/install-app) has Brazilian
// Portuguese only, and follows the phone's language. This swaps in European Portuguese and makes it
// follow the app's language (<html lang>). It fails the build if the package changed and a swap no
// longer applies, so an upgrade can't quietly bring the old texts back.
const PWA_INSTALL_PT: Record<string, string> = {
  s05b70c60d4ea8317: 'Toca em "Abrir no navegador..."',
  s182ab2d6c997515f: 'Adiciona-a ao ecrã principal para uma melhor experiência e um acesso mais fácil.',
  s224cbcec014ef6b5: 'Toca em Partilhar na barra de endereço',
  s233af3b7eb5e0364: 'Adicionar ao ecrã principal',
  s37a9e8aec5713460: 'Mais',
  s4c3161035f3a1413: 'Toca no menu',
  s4e1e10a6ca408245: 'Toca em "Adicionar ao ecrã principal"',
  s6196153c4b0c1ea0: 'Instalar',
  s633502f7cff4f847: 'Abre o menu do navegador',
  s681e399d63311fba: 'Mostrar galeria',
  s6d14a4f70ba4e3cf: 'Toca no menu se não vires o ícone Partilhar',
  s922329d6f6213590: 'Adicionar à Dock',
  s9c63a79ffcc2a3a3: 'Toca em "Adicionar ao ecrã principal"',
  sa2d71bfd9525168d: 'Toca em "Adicionar à Dock"',
  sa5ef80b4bb9b39f8: 'Menos',
  sb527eca1c1d7e7be: 'Abre o menu do navegador da app',
  sba52286c21552a4e: 'Instala-a no dispositivo para uma melhor experiência e um acesso mais fácil.',
  sc16e00a7a8b2fde2: 'Voltar',
  scdaf4bbff76674c8: 'Adicionar ao ecrã principal',
  sd18a5b85f599ff3c: 'Abre o link copiado no Safari',
  se72fc3a84f9b51c3: 'Toca para copiar o link',
  se740f75b95a51807: 'Adiciona-a à Dock para uma melhor experiência e um acesso mais fácil.',
  sfa6c42cdf48d93d2: 'Mas este navegador não o permite. Abre o link num navegador externo para continuar.',
  sfb78526365796a41: 'Toca em "Ver mais" no menu Partilhar',
  sfea652f6580ff086: 'Este site funciona como uma app.',
};

function replaceOnce(code: string, find: RegExp, replace: string, what: string): string {
  const n = code.match(new RegExp(find.source, 'g'))?.length ?? 0;
  if (n !== 1) throw new Error(`pwa-install: expected 1 ${what}, found ${n} (package changed?)`);
  return code.replace(find, replace);
}

function pwaInstallPt(): Plugin {
  return {
    name: 'pwa-install-pt',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@khmyznikov/pwa-install/dist/pwa-install.es.js')) return null;
      // The Brazilian table starts with this message (its keys are the ones above).
      let out = replaceOnce(
        code,
        /=\{s05b70c60d4ea8317:'Toque em [^}]*\}/,
        `=${JSON.stringify(PWA_INSTALL_PT)}`,
        'Portuguese table',
      );
      out = replaceOnce(
        out,
        /\(navigator\.language\)/,
        '(document.documentElement.lang||navigator.language)',
        'language lookup',
      );
      return { code: out, map: null };
    },
  };
}

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
  // Dependencies are pre-bundled for the dev server without the plugins: keep this one out.
  optimizeDeps: { exclude: ['@khmyznikov/pwa-install'] },
  plugins: [
    pwaInstallPt(),
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
