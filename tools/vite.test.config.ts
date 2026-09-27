// Dev server for automated tests: no HMR / file-watch reloads (other edits must not reload the page mid-test).
import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { host: '127.0.0.1', port: 5191, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
