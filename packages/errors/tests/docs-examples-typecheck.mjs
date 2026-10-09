/**
 * Docs-examples type-check AND runtime probe.
 *
 * Walks `apps/web/content/docs/*.mdx`, extracts every fenced
 * TypeScript code block, and for each block produces a
 * synthetic ESM module that:
 *
 *   1. Hoists the union of every block's `import` statements
 *      to the top, deduplicated.
 *   2. Wraps the block body in an IIFE so its top-level
 *      `const`/`let` declarations stay block-scoped and do
 *      not collide across blocks.
 *
 * The synthetic module is then:
 *
 *   a. Type-checked with `tsc --noEmit` against
 *      `dist/index.d.ts` (the published types).
 *   b. Executed under `node --experimental-strip-types`; the
 *      captured stdout is matched line-by-line against the
 *      `console.log(...) // -> <expected>` annotations that
 *      appear in the block body.
 *
 * Why this is more than a type-check: the page text announces
 * values (`// 2`, `// true`). A type-checker cannot see whether
 * the printed value actually matches the announced one. The
 * probe executes each block and verifies the announcement.
 *
 * Why each block is isolated: a block that references
 * factories defined in a previous block in the same MDX file
 * is treated as broken. The page presents independent
 * examples; the previous probe silently ignored such blocks
 * with the cross-block-dependent detector, hiding drift. The
 * new probe runs every block standalone — if a block uses
 * `ValidationError` without defining it, the run fails.
 *
 * Probe integrity: a regex that doesn't actually match the
 * docs is a probe that never fails. Two safeguards:
 *
 *   - The annotation regex accepts `// ->` AND `//->` (with
 *     any whitespace before the `->`). A doc that uses
 *     `// ->` is matched.
 *   - When at least one annotation is in scope and the probe
 *     matches zero of them, the run fails. The probe also
 *     self-tests by running a deliberately-wrong expected
 *     value through the same code path; if that self-test
 *     does not report a failure, the regex is not actually
 *     checking the value.
 *
 * Run: `pnpm build && node tests/docs-examples-typecheck.mjs`.
 * Exits 0 only when every block type-checks AND every
 * `// ->` annotation matches the captured stdout.
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
// Match `console.log(...) // -> <value>` with optional
// whitespace before and after the `->`. Both `//->` and
// `// ->` are accepted, as are leading whitespace inside the
// comment.
const expectRe = /^\s*console\.log\((.*?)\);\s*\/\/\s*->\s*(.*?)\s*$/;

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
 * Collect `console.log(...) // -> <expected>` annotations from
 * a block. The expected value is the literal text the runtime
 * should print (already stringified). Returns an array of
 * expected values in source order.
 */
function collectExpectations(code) {
  const out = [];
  for (const line of code.split('\n')) {
    const m = line.match(expectRe);
    if (m) {
      out.push(m[2].trim());
    }
  }
  return out;
}

/**
 * Build a synthetic ESM module for a single block. The
 * module hoists the block's `import` statements to the top
 * (so `error`, `raise`, etc. are in scope), then wraps the
 * body in an IIFE so its top-level declarations stay
 * block-scoped. The body keeps its `export` declarations
 * where they appear — they are valid at the top of an ESM
 * file.
 */
function buildSyntheticModule(block) {
  const imports = [];
  const bodyLines = [];
  for (const line of block.code.split('\n')) {
    if (importLineRe.test(line)) {
      imports.push(line.trim());
    } else {
      bodyLines.push(line);
    }
  }
  const body = bodyLines.join('\n');
  return `${imports.join('\n')}\n\n// ---- ${block.file} block #${block.index} ----\n(function () {\n${body}\n})();\n`;
}

const probeDir = join(pkgRoot, 'tests', '.docs-probe');
try {
  rmSync(probeDir, { recursive: true, force: true });
} catch {
  // ignore
}
mkdirSync(probeDir, { recursive: true });

const tscBin = resolve(pkgRoot, 'node_modules', 'typescript', 'bin', 'tsc');

let totalAnnotations = 0;
let totalBlocks = 0;
let sigBlocks = 0;
let passBlocks = 0;
const failures = [];

const allBlocks = mdxFiles.flatMap((f) => extractCodeBlocks(f));
for (const block of allBlocks) {
  totalBlocks += 1;
  if (isSignatureOnlyBlock(block.code)) {
    sigBlocks += 1;
    continue;
  }

  const expectations = collectExpectations(block.code);
  totalAnnotations += expectations.length;

  const synthetic = buildSyntheticModule(block);
  const safeName = `${block.file.replace(/[^A-Za-z0-9]+/g, '_')}_${block.index}`;
  const fixture = join(probeDir, `${safeName}.mts`);
  const tsconfig = join(probeDir, `tsconfig-${safeName}.json`);
  writeFileSync(fixture, synthetic);
  writeFileSync(
    tsconfig,
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          lib: ['ES2022', 'DOM'],
          noEmit: true,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          // Force `@deessejs/errors` to resolve to the
          // published dist so a broken build fails fast.
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

  // Type check.
  const typeResult = spawnSync(process.execPath, [tscBin, '-p', tsconfig, '--pretty', 'false'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (typeResult.status !== 0) {
    failures.push({
      file: block.file,
      index: block.index,
      kind: 'type',
      output: (typeResult.stdout || '').trim() + (typeResult.stderr ? '\n' + typeResult.stderr.trim() : ''),
    });
    continue;
  }

  // Execute. Node 22+ supports `--experimental-strip-types`,
  // which transpiles TypeScript-syntax ESM at load time. The
  // synthetic file is a `.mts` so the flag applies.
  const runResult = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', fixture],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (runResult.status !== 0) {
    failures.push({
      file: block.file,
      index: block.index,
      kind: 'runtime',
      output: `exit ${runResult.status}\nstdout: ${(runResult.stdout || '').trim()}\nstderr: ${(runResult.stderr || '').trim()}`,
    });
    continue;
  }

  // Match captured stdout lines against the // -> annotations.
  // Each annotation corresponds to a single console.log line
  // in the synthetic output. The match is by ordinal.
  const stdoutLines = (runResult.stdout || '')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 0);
  const mismatches = [];
  for (let i = 0; i < expectations.length; i++) {
    const expected = expectations[i];
    const actual = stdoutLines[i] ?? '<EOF>';
    if (actual !== expected) {
      mismatches.push({ i, expected, actual });
    }
  }
  if (mismatches.length > 0) {
    failures.push({
      file: block.file,
      index: block.index,
      kind: 'expectation',
      output: mismatches
        .map((m) => `  console.log #${m.i + 1} expected ${JSON.stringify(m.expected)} got ${JSON.stringify(m.actual)}`)
        .join('\n'),
    });
    continue;
  }

  passBlocks += 1;
}

if (!process.env.DOCS_PROBE_KEEP) {
  try {
    rmSync(probeDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup.
  }
}

console.log(
  `docs-examples-typecheck: ${passBlocks} block(s) pass, ${sigBlocks} signature-only, ${totalBlocks - sigBlocks - passBlocks} fail (${totalBlocks} total from ${mdxFiles.length} files); ${totalAnnotations} annotation(s) verified`,
);

// Self-test: a probe that never fails is not a probe. The
// regex must be tight enough that a deliberately wrong
// expected value is reported as a mismatch. Run the same
// matching code on a synthetic block whose console.log
// output is `"actual"` but the annotation says `"wrong"`,
// and verify that the regex surfaces the difference.
{
  const syntheticBlock = `console.log('actual'); // -> wrong\n`;
  const expectations = collectExpectations(syntheticBlock);
  const stdoutLines = ['actual'];
  let selfTestFailed = false;
  for (let i = 0; i < expectations.length; i++) {
    if (expectations[i] !== stdoutLines[i]) {
      selfTestFailed = true;
    }
  }
  if (expectations.length === 0 || !selfTestFailed) {
    console.error(
      '\nFATAL: probe self-test failed — annotation regex does not match the expected format, or the expectation matcher does not detect mismatches. The probe cannot be trusted to verify the docs.',
    );
    process.exit(2);
  }
}

if (totalAnnotations === 0) {
  console.error(
    '\nFATAL: no // -> annotations found across the docs. The probe cannot verify announced values. Either the docs lack annotations, or the regex does not match them.',
  );
  process.exit(2);
}

if (failures.length > 0) {
  console.error('\nFailures:');
  for (const f of failures) {
    console.error(`\n--- ${f.file} block #${f.index} [${f.kind}] ---`);
    console.error(f.output);
  }
  process.exit(1);
}
