// Copies third-party license texts into dist/licenses after `vite build`.
import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
const out = 'dist/licenses';
mkdirSync(out, { recursive: true });
const pkgs = ['three', 'three-mesh-bvh', '@fontsource/cinzel', '@fontsource/cormorant-garamond'];
for (const p of pkgs) {
  const dir = `node_modules/${p}`;
  const f = readdirSync(dir).find((n) => /^licen[cs]e/i.test(n));
  if (f && existsSync(`${dir}/${f}`)) copyFileSync(`${dir}/${f}`, `${out}/${p.replace('/', '_')}-${f}`);
}
copyFileSync('docs/LICENSES.md', `${out}/LICENSES.md`);
console.log('licenses copied');
