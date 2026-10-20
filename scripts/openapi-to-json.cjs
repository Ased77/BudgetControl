/* One-shot: emit openapi.json next to openapi.yaml. */
const yamlFs = typeof require === 'function' ? require('node:fs') : null;
const { parse } = require('yaml');
yamlFs.writeFileSync('openapi.json', JSON.stringify(parse(yamlFs.readFileSync('openapi.yaml', 'utf8')), null, 2) + '\n');
console.log('written openapi.json');
