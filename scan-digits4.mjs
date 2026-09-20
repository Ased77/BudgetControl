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
    else if (/\.(ts|tsx)$/.test(e)) files.push(p);
  }
}
walk('.');

const wrapped = /toPersianDigits|formatNumber|formatCurrency|formatToman|formatLargeBudgetPersian|toLocaleString\(\s*'fa-IR'|\.map\(|===|!=|typeof|parseInt|parseFloat|Math\./;

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    if (!FA.test(raw)) return;
    // find JSX expressions {expr} where expr looks numeric-ish and expr itself has no Persian
    for (const m of raw.matchAll(/\{([^{}]*)\}/g)) {
      const expr = m[1].trim();
      if (!expr) continue;
      if (FA.test(expr)) continue;
      // must start with an identifier, number, or property (a value), not a keyword
      if (!/^[\w$./(`]/.test(expr)) continue;
      if (wrapped.test(expr)) continue;
      // must be followed by a Persian char or unit right after }
      const after = raw.slice(m.index + m[0].length).trimStart();
      if (!FA.test(after)) continue;
      console.log(`${f}:${i + 1} :: {${expr.slice(0, 70)}}${after.slice(0, 12)}`);
    }
  });
}
