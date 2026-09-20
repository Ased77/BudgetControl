import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FA = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.kilo', '.freebuff'].includes(e)) continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx|html|css)$/.test(e)) files.push(p);
  }
}
walk('.');

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    if (!/\d/.test(raw) || !FA.test(raw)) return;
    const line = raw
      .replace(/className="[^"]*"/g, '')
      .replace(/id="[^"]*"/g, '')
      .replace(/style="[^"]*"/g, '');
    if (!FA.test(line)) return;
    for (const m of line.matchAll(/\d+(?:[.,]\d+)*/g)) {
      const s = Math.max(0, m.index - 15);
      const e = Math.min(line.length, m.index + m[0].length + 15);
      const ctx = line.slice(s, e);
      if (FA.test(ctx)) console.log(`${f}:${i + 1} :: ${ctx.trim()}`);
    }
  });
}
