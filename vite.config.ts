import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
    assetsInlineLimit: 0,
  },
  server: { host: '127.0.0.1', port: 5173 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
