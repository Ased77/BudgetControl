/* Temporary validator: structural self-check of openapi.yaml (not a substitute
   for a full linter like @redocly/cli, which needs network install). */
const fs = require('node:fs');
const { parse } = require('yaml');

const doc = parse(fs.readFileSync('openapi.yaml', 'utf8'));
const problems = [];

// 1. Top-level requirements
for (const key of ['openapi', 'info', 'paths']) {
  if (!(key in doc)) problems.push(`missing top-level: ${key}`);
}
if (doc.openapi !== '3.1.0') problems.push(`openapi version is ${doc.openapi}, expected 3.1.0`);
if (!doc.info?.title || !doc.info?.version) problems.push('info.title/version missing');

// 2. Collect operations + paths
const methods = new Set(['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace']);
let opCount = 0;
const opIds = new Map();
for (const [p, item] of Object.entries(doc.paths || {})) {
  if (!p.startsWith('/')) problems.push(`path ${p} does not start with "/"`);
  for (const [m, op] of Object.entries(item)) {
    if (!methods.has(m)) continue; // path-level parameters etc.
    if (typeof op !== 'object' || op === null || !op.responses) {
      problems.push(`${m.toUpperCase()} ${p}: missing responses`);
      continue;
    }
    opCount++;
    if (!op.operationId) problems.push(`${m.toUpperCase()} ${p}: missing operationId`);
    else if (opIds.has(op.operationId)) problems.push(`duplicate operationId ${op.operationId}`);
    else opIds.set(op.operationId, `${m.toUpperCase()} ${p}`);
    for (const code of Object.keys(op.responses)) {
      if (!/^(default|[1-5]\d{2})$/.test(code)) problems.push(`${m.toUpperCase()} ${p}: invalid response code ${code}`);
    }
    const rb = op.requestBody;
    if (rb && !rb.content) problems.push(`${m.toUpperCase()} ${p}: requestBody without content`);
  }
}

// 3. Resolve every $ref
function findRef(root, dot) {
  return dot.split('/').slice(1).reduce((acc, seg) => (acc == null ? undefined : acc[seg]), root);
}
(function walk(node, where) {
  if (typeof node === 'string' && node.startsWith('#/components/')) {
    if (findRef(doc, node) === undefined) problems.push(`unresolved $ref ${node} at ${where}`);
  }
  if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${where}[${i}]`));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, `${where}/${k}`);
})(doc, '$');

// 4. Report
console.log(`openapi: ${doc.openapi}`);
console.log(`paths: ${Object.keys(doc.paths || {}).length}`);
console.log(`operations: ${opCount}`);
console.log(`operationIds unique: ${opIds.size === opCount}`);
if (problems.length === 0) console.log('OK: no structural problems found');
else {
  console.log(`PROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log(' - ' + p));
  process.exitCode = 1;
}
