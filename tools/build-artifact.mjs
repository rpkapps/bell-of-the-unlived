// Builds dist-artifact/game.html: the whole game as ONE html file (JS and CSS inline, fonts as
// data URIs, no <html>/<head>/<body> — the host wraps it). For hosts whose CSP only allows inline
// scripts, such as a claude.ai Artifact.   node tools/build-artifact.mjs
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
execSync('npx vite build --config tools/vite.artifact.config.ts', { stdio: 'inherit' });
const dir = 'dist-artifact/';
const html = readFileSync(dir + 'index.html', 'utf8');
const js = readFileSync(dir + html.match(/<script[^>]*src="\.\/([^"]+)"/)[1], 'utf8');
let css = readFileSync(dir + html.match(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"/)[1], 'utf8');
css = css.replace(/,\s*url\(\.\/[^)]+\.woff\)\s*format\(["']woff["']\)/g, ''); // woff fallbacks aren't shipped
const title = html.match(/<title>[^<]*<\/title>/)[0];
const baseStyle = html.match(/<style>[\s\S]*?<\/style>/)[0];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1].trim();
const safe = (s, tag) => s.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
const out = `${title}\n${baseStyle}\n<style>${safe(css, 'style')}</style>\n${body}\n<script type="module">${safe(js, 'script')}</script>\n`;
writeFileSync(dir + 'game.html', out);
console.log(`dist-artifact/game.html  ${(out.length / 1e6).toFixed(2)} MB`);
