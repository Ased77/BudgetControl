import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FA = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const digits = /[0-9]/;
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', '.kilo', '.freebuff'].includes(e)) continue;
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(ts|tsx|html)$/.test(e)) files.push(p);
  }
}
walk('.');

function extractStrings(line, isTs) {
  const out = [];
  // template literals with newlines handled per-line only; single-line templates
  let i = 0;
  let inStr = null;
  let start = 0;
  while (i < line.length) {
    const c = line[i];
    if (!inStr) {
      if (c === "'" || c === '"' || c === '`') { inStr = c; start = i + 1; }
      i++;
    } else {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) {
        out.push(line.slice(start, i));
        inStr = null;
      }
      i++;
    }
  }
  return out;
}

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    if (!FA.test(raw) || !digits.test(raw)) return;
    const strings = extractStrings(raw);
    // JSX/HTML text: strip all tag attributes+tags, keep text between tags
    const jsxText = raw.replace(/<[^<>]*>/g, (tag) => (/\>/.test(tag) ? '' : tag));
    strings.push(jsxText);
    for (const s of strings) {
      if (!FA.test(s) || !digits.test(s)) continue;
      // show the digit-containing runs with context
      const runs = [...s.matchAll(/[0-9][0-9._-]*/g)].map((m) => {
        const st = Math.max(0, m.index - 12);
        return `{${s.slice(st, m.index + m[0].length + 12).trim()}}`;
      });
      console.log(`${f}:${i + 1} STRING :: ${(runs || []).join(' | ')}`);
    }
  });
}
