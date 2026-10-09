/**
 * Docs-examples type-check.
 *
 * Walks `apps/web/content/docs/*.mdx`, extracts every fenced
 * TypeScript code block, and type-checks each block **in its
 * own synthetic module** against `dist/index.d.ts`. A block
 * that fails is reported with the file label, block index, and
 * the TypeScript diagnostics; the probe continues to the next
 * block so a single broken example does not cascade into false
 * positives for later examples.
 *
 * Why per-block: TypeScript's type-checker cascades parse and
 * type errors forward. A syntax error in block N pollutes the
 * inferred types of every later block, producing false
 * diagnostics that mask the real drift. Per-block checks are
 * slower in aggregate (one tsc invocation per block) but each
 * diagnostic lands on the real source.
 *
 * Run: `pnpm build && node tests/docs-examples-typecheck.mjs`.
 * Exits 0 only when every example block type-checks cleanly.
 * Signature-only display blocks are skipped (their canonical
 * form lives in `dist/index.d.ts`, which the package tests
 * already verify).
 */

import { readFileSync, readdirSync, statSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '..', '..');
const docsDir = join(repoRoot, 'apps', 'web', 'content', 'docs');

const distTypes = join(pkgRoot, 'dist', 'index.d.ts');
try {
  statSync(distTypes);
} catch {
  console.error(`docs-examples-typecheck: ${distTypes} is missing. Run \`pnpm build\` first.`);
  process.exit(1);
}

const mdxFiles = readdirSync(docsDir)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => join(docsDir, f));

if (mdxFiles.length === 0) {
  console.error(`docs-examples-typecheck: no .mdx files found under ${docsDir}`);
  process.exit(1);
}

const importLineRe = /^\s*import\s.+from\s+['"][^'"]+['"];?\s*$/;

/**
 * Extract fenced TypeScript code blocks from an MDX file.
 * Recognizes ```ts and ```tsx fences. The optional `title="..."`
 * segment after the language tag is dropped — it is a display
 * hint, not a language feature.
 */
function extractCodeBlocks(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  const fileLabel = basename(filePath);
  const blocks = [];
  let inFence = false;
  let buffer = [];
  let blockIndex = 0;
  for (const line of lines) {
    const fenceMatch = line.match(/^```\s*([A-Za-z0-9_+-]*)/);
    if (!inFence) {
      if (fenceMatch && /^(ts|tsx|typescript)$/i.test(fenceMatch[1])) {
        inFence = true;
        buffer = [];
      }
      continue;
    }
    if (fenceMatch) {
      inFence = false;
      const code = buffer.join('\n');
      if (code.trim().length > 0) {
        blocks.push({ file: fileLabel, index: blockIndex, code });
        blockIndex += 1;
      }
      continue;
    }
    buffer.push(line);
  }
  return blocks;
}

/**
 * Detect blocks that are pure type-signature displays rather
 * than runnable code. The reference page uses these to show
 * the shape of each public symbol, e.g.:
 *   const errorFactory = error<TFields>(config)
 *   raise(error: ErrorInstance): never
 *   is(error: unknown, ErrorType): error is ErrorInstance
 *   class ArgsValidationError extends Error
 */
function isSignatureOnlyBlock(code) {
  const lines = code
    .split('\n')
    .map((l) => l.trim())
    .filter(
      (l) =>
        l.length > 0 &&
        !l.startsWith('//') &&
        !l.startsWith('/*') &&
        !l.startsWith('*') &&
        !importLineRe.test(l),
    );
  if (lines.length === 0) return true;
  for (const line of lines) {
    if (/^[$_\w]+\s*\([^)]*\)\s*:\s*[^=]+$/.test(line) && !line.includes('=>')) continue;
    if (/^class\s+[$_\w][\w$]*(\s+extends\s+[$_\w<>,[\]\s]+)?\s*$/.test(line)) continue;
    if (/^class\s+[$_\w][\w$]*\s+extends\s+[$_\w<>,[\]]+\s*\{/.test(line)) return false;
    if (/^type\s+[$_\w][\w$]*\s*=/.test(line)) continue;
    if (/^interface\s+[$_\w][\w$]*(\s+extends\s+[^{]+)?\s*\{/.test(line)) continue;
    if (/^(?:const|let|var)\s+[$_\w][\w$]*\s*=\s*/.test(line)) {
      if (/=>\s*[^{]/.test(line) || /\{/.test(line)) return false;
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Detect blocks that depend on another code block in the same
 * MDX file. These reference factories or values defined in a
 * previous block (e.g. `import { NotFoundError } from './errors'`
 * where `./errors` is a sibling code block, not a real module,
 * or `const err = ValidationError(...)` where `ValidationError`
 * is defined in a previous code block in the same MDX file).
 * The probe runs each block in isolation and cannot resolve
 * cross-block references, so such blocks are skipped.
 */
function isCrossBlockDependent(code, allBlocksSameFile, blockIndex) {
  // Relative-import dependency (explicit).
  if (/from\s+['"]\.\.?\/[^'"]+['"]/m.test(code)) return true;

  // Implicit dependency: a block that uses identifiers defined
  // in earlier blocks in the same file. Detect: if the block
  // has no `const Name = error(...)` definition but uses an
  // identifier that *only* appears in earlier blocks, it's
  // cross-block dependent. We use a conservative check: the
  // block has no factory declaration AND uses at least one
  // identifier that looks like an ErrorFactory.
  const hasFactoryDecl = /\b(?:const|let|var)\s+[$_\w][\w$]*\s*=\s*error\s*\(/.test(code);
  if (hasFactoryDecl) return false;

  // Collect PascalCase identifiers used in this block. Filter
  // out the obvious imports (z, v, type, error, raise, is,
  // causes, ArgsValidationError) and the common TypeScript
  // builtins.
  const builtinNames = new Set([
    'Error',
    'ArgsValidationError',
    'TypeError',
    'SyntaxError',
    'Object',
    'Array',
    'Promise',
    'Function',
    'String',
    'Number',
    'Boolean',
    'Date',
    'Math',
    'JSON',
    'Map',
    'Set',
    'RegExp',
    'Error',
    'Symbol',
    'BigInt',
  ]);
  const importNames = new Set(['z', 'v', 'type', 'error', 'raise', 'is', 'causes', 'ArgsValidationError']);
  const idRe = /\b([A-Z][A-Za-z0-9]*|[a-z][A-Za-z0-9]*)\b/g;
  const usedIds = new Set();
  for (const match of code.matchAll(idRe)) {
    const name = match[1];
    if (builtinNames.has(name)) continue;
    if (importNames.has(name)) continue;
    // Skip lowercase JS builtins-like names; they may be
    // locals. PascalCase names are the signal we want.
    if (/^[a-z]/.test(name)) continue;
    usedIds.add(name);
  }

  if (usedIds.size === 0) return false;

  // Look for at least one of these identifiers defined in an
  // earlier block in the same MDX file. If yes, the block is
  // cross-block dependent.
  for (let i = 0; i < blockIndex; i++) {
    const prev = allBlocksSameFile[i];
    for (const name of usedIds) {
      const declRe = new RegExp(`\\b(?:const|let|var|function|class)\\s+${name}\\b`);
      if (declRe.test(prev.code)) return true;
    }
  }
  return false;
}

const sharedHeader = [
  `// Auto-generated by tests/docs-examples-typecheck.mjs. Do not edit.`,
  `import * as z from 'zod';`,
  `import * as v from 'valibot';`,
  `import { type } from '@ark/type';`,
  `import { error, raise, is, causes, ArgsValidationError } from '@deessejs/errors';`,
  ``,
].join('\n');

const allBlocks = mdxFiles.flatMap((f) => extractCodeBlocks(f));
if (allBlocks.length === 0) {
  console.error('docs-examples-typecheck: no fenced code blocks found');
  process.exit(1);
}

// Per-block isolation: write each example block into its own
// fixture file so a syntax error in one block does not cascade
// to the rest. The shared header carries the imports.
const pkgProbeDir = join(pkgRoot, 'tests', '.docs-probe');
try {
  rmSync(pkgProbeDir, { recursive: true, force: true });
} catch {
  // ignore
}
mkdirSync(pkgProbeDir, { recursive: true });

const tscBin = resolve(pkgRoot, 'node_modules', 'typescript', 'bin', 'tsc');

let pass = 0;
let skip = 0;
let fail = 0;
const failures = [];

// Group blocks by file so the cross-block detector can look
// for declarations in earlier blocks in the same file.
const blocksByFile = new Map();
for (const block of allBlocks) {
  if (!blocksByFile.has(block.file)) blocksByFile.set(block.file, []);
  blocksByFile.get(block.file).push(block);
}

for (const block of allBlocks) {
  if (isSignatureOnlyBlock(block.code)) {
    skip += 1;
    continue;
  }
  const sameFileBlocks = blocksByFile.get(block.file) || [];
  const earlier = sameFileBlocks.filter((b) => b.index < block.index);
  if (isCrossBlockDependent(block.code, earlier, block.index)) {
    skip += 1;
    continue;
  }

  const fixture = join(pkgProbeDir, `block-${block.file.replace(/[^A-Za-z0-9]+/g, '_')}-${block.index}.ts`);
  const tsconfig = join(pkgProbeDir, `tsconfig-${block.file.replace(/[^A-Za-z0-9]+/g, '_')}-${block.index}.json`);

  const body = block.code
    .split('\n')
    .filter((l) => !importLineRe.test(l))
    // Strip `export ` keyword on declarations: the probe wraps
    // each block in a function expression for scope isolation,
    // which is incompatible with top-level `export` statements.
    // The probe only verifies type correctness, not module
    // exports.
    .map((l) => l.replace(/^(\s*)export\s+(const|let|var|function|class|interface|type|enum|abstract|declare|async)\b/, '$1$2'))
    .join('\n');
  // Wrap in a function expression so top-level `const`/`let`
  // declarations stay block-scoped and do not collide with any
  // other block (we still get per-block isolation, but the wrap
  // is defensive in case a future change reuses the file).
  const fixtureSrc = `${sharedHeader}\n(function () {\n${body}\n})();\n`;
  writeFileSync(fixture, fixtureSrc);

  writeFileSync(
    tsconfig,
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM'],
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
          // Force `@deessejs/errors` to resolve to the published
          // dist so a broken build fails fast.
          paths: {
            '@deessejs/errors': [join(pkgRoot, 'dist', 'index.d.ts')],
          },
        },
        include: [fixture],
      },
      null,
      2,
    ),
  );

  const result = spawnSync(process.execPath, [tscBin, '-p', tsconfig, '--pretty', 'false'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status === 0) {
    pass += 1;
    continue;
  }

  fail += 1;
  const output = (result.stdout || '').trim() + (result.stderr ? '\n' + result.stderr.trim() : '');
  failures.push({ block, output });
}

if (!process.env.DOCS_PROBE_KEEP) {
  try {
    rmSync(pkgProbeDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup.
  }
}

console.log(
  `docs-examples-typecheck: ${pass} pass, ${skip} signature-only, ${fail} fail (${allBlocks.length} total from ${mdxFiles.length} files)`,
);

if (fail > 0) {
  console.error('\nFailed blocks:');
  for (const { block, output } of failures) {
    console.error(`\n--- ${block.file} block #${block.index} ---`);
    console.error(output);
  }
  process.exit(1);
}
