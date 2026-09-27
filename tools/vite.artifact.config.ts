// Single-file build for hosting where only inline scripts are allowed (e.g. a claude.ai Artifact):
// one JS bundle (no dynamic chunks), CSS with woff2 fonts as data URIs. `node tools/build-artifact.mjs`
// then inlines both into dist-artifact/game.html.
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist-artifact',
    emptyOutDir: true,
    chunkSizeWarningLimit: 8192,
    cssCodeSplit: false,
    modulePreload: false,
    // woff2 inline (every current browser uses it); the woff fallbacks stay out of the page
    assetsInlineLimit: (file: string) => file.endsWith('.woff2'),
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
} as any);
