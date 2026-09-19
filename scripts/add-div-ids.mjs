/**
 * One-off codemod: give every <div> in the .tsx files under src/ a unique,
 * human-readable id so any element in the running app can be referenced from the console, a test
 * or a screenshot annotation.
 *
 * Naming convention: `<component-slug>-<section-hint>`, where the hint comes
 * from the nearest preceding JSX comment (for example the "Brand Header" marker
 * above a block). Divs that have no nearby comment fall back to
 * `<component-slug>-div-<n>`. When more
 * than one div shares the same base name, a `-2`, `-3`, ... suffix keeps ids
 * unique. Divs rendered inside a `.map()` callback get a template-literal id
 * built from the `key` expression of their nearest keyed ancestor, so repeated
 * rows stay unique at runtime.
 *
 * Run: node scripts/add-div-ids.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SRC = path.resolve('src');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && p.endsWith('.tsx')) files.push(p);
  }
})(SRC);

const kebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const slugify = (s) => {
  const slug = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= 32) return slug;
  // Cut at a word boundary rather than mid-word.
  const cut = slug.slice(0, 32);
  const boundary = cut.lastIndexOf('-');
  return (boundary > 12 ? cut.slice(0, boundary) : cut).replace(/-+$/, '');
};

/**
 * Suffix to append to a runtime-rendered id, only when it is safe to embed
 * inside a template literal. Template-literal keys keep their interpolated
 * expressions (the literal part is dropped because the id base is already
 * unique per source div).
 */
const safeKeyExpr = (node) => {
  if (!node) return null;
  if (ts.isJsxExpression(node)) node = node.expression;
  if (!node) return null;
  if (ts.isTemplateExpression(node)) {
    const parts = node.templateSpans.map((s) => s.expression);
    const simple = (p) => (ts.isIdentifier(p) || ts.isPropertyAccessExpression(p)) && !/['"`]/.test(p.getText());
    return parts.every(simple) ? parts.map((p) => p.getText()).join('-') : null;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return /^[A-Za-z0-9_-]+$/.test(node.text) ? node.text : null;
  }
  const text = node.getText();
  if (!text || /['"`]/.test(text)) return null;
  // identifiers, member access, literals, simple concatenation are fine
  return text;
};

const stats = { files: 0, added: 0, dynamic: 0, skipped: 0, already: 0 };

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const prefix = kebab(path.basename(file, '.tsx'));

  // All JSX comments (`{/* ... */}`) with their positions, used as section hints.
  const comments = [];
  const commentRe = /\{\/\*([\s\S]*?)\*\//g;
  let m;
  while ((m = commentRe.exec(text))) {
    comments.push({ end: m.index + m[0].length, slug: slugify(m[1]) });
  }
  const hintAt = (pos) => {
    let best = null;
    for (const c of comments) {
      if (c.end <= pos) best = c;
      else break;
    }
    return best && best.slug ? best.slug : null;
  };

  const used = new Set();
  const alloc = (base) => {
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}-${i++}`;
    used.add(name);
    return name;
  };
  let fallbackCounter = 0;
  // The first unnamed div is almost always the outermost wrapper of a view.
  const fallbackName = () =>
    ++fallbackCounter === 1 ? `${prefix}-root` : `${prefix}-div-${fallbackCounter}`;

  const edits = [];

  const openingElementIdInfo = (el) => {
    const attrs = el.attributes.properties.filter(ts.isJsxAttribute);
    const idAttr = attrs.find((a) => a.name.getText() === 'id');
    const keyAttr = attrs.find((a) => a.name.getText() === 'key');
    return { idAttr, keyAttr };
  };

  const insertId = (el, idSource, isDynamic) => {
    const afterTag = text.slice(el.tagName.getEnd(), el.getEnd());
    if (/^\r?\n/.test(afterTag)) {
      const eol = afterTag.startsWith('\r\n') ? '\r\n' : '\n';
      const attrs = el.attributes.properties;
      let indent = '  ';
      if (attrs.length > 0) {
        const attrStart = attrs[0].getStart(sf);
        const lineStart = text.lastIndexOf('\n', attrStart - 1) + 1;
        indent = text.slice(lineStart, attrStart);
      } else {
        const tagStart = el.getStart(sf);
        const lineStart = text.lastIndexOf('\n', tagStart - 1) + 1;
        indent = text.slice(lineStart, tagStart) + '  ';
      }
      edits.push({ pos: el.tagName.getEnd(), text: `${eol}${indent}id=${idSource}` });
    } else {
      edits.push({ pos: el.tagName.getEnd(), text: ` id=${idSource}` });
    }
    stats.added += 1;
    if (isDynamic) stats.dynamic += 1;
  };

  const visit = (node, ctx) => {
    // Entering a `.map()` callback: everything below repeats at runtime.
    let nextCtx = ctx;
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.getText() === 'map'
    ) {
      nextCtx = { inMap: true, keyExpr: null };
    }

    if (ts.isJsxElement(node)) {
      const { idAttr: openId, keyAttr: openKey } = openingElementIdInfo(node.openingElement);
      let childCtx = nextCtx;
      if (nextCtx.inMap && !nextCtx.keyExpr && openKey && openKey.initializer) {
        const expr = safeKeyExpr(openKey.initializer);
        if (expr) childCtx = { ...nextCtx, keyExpr: expr };
      }
      visit(node.openingElement, childCtx);
      for (const child of node.children) visit(child, childCtx);
      return;
    }

    if (ts.isJsxSelfClosingElement(node)) {
      let childCtx = nextCtx;
      const { keyAttr } = openingElementIdInfo(node);
      if (nextCtx.inMap && !nextCtx.keyExpr && keyAttr && keyAttr.initializer) {
        const expr = safeKeyExpr(keyAttr.initializer);
        if (expr) childCtx = { ...nextCtx, keyExpr: expr };
      }
      visitOpening(childCtx, node);
      return;
    }

    if (ts.isJsxOpeningElement(node)) {
      visitOpening(nextCtx, node);
      return;
    }

    ts.forEachChild(node, (child) => visit(child, nextCtx));
  };

  const visitOpening = (ctx, el) => {
    if (el.tagName.getText() !== 'div') return;
    const { idAttr } = openingElementIdInfo(el);
    if (idAttr) {
      stats.already += 1;
      return;
    }
    const hint = hintAt(el.getStart(sf));
    if (ctx.inMap) {
      if (!ctx.keyExpr) {
        stats.skipped += 1;
        return;
      }
      const base = alloc(hint ? `${prefix}-${hint}` : fallbackName());
      insertId(el, `{\`${base}-\${${ctx.keyExpr}}\`}`, true);
      return;
    }
    const base = alloc(hint ? `${prefix}-${hint}` : fallbackName());
    insertId(el, `"${base}"`, false);
  };

  visit(sf, { inMap: false, keyExpr: null });

  if (edits.length === 0) continue;

  edits.sort((a, b) => b.pos - a.pos);
  let out = text;
  for (const e of edits) out = out.slice(0, e.pos) + e.text + out.slice(e.pos);
  fs.writeFileSync(file, out);
  stats.files += 1;
}

console.log(JSON.stringify(stats, null, 2));
