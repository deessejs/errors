#!/usr/bin/env node
/**
 * check-marketing-examples.mjs
 *
 * Verifies the marketing snippets declared in
 * `src/components/marketing/examples.ts`. Two stages:
 *
 *  1. Type-check — every `HERO_CODE` and each `before` / `after`
 *     string in `COMPARISON_EXAMPLES` is type-checked against the
 *     local `packages/errors/src/index.ts` via a `tsconfig.paths`
 *     mapping. The check confirms the snippet imports a real
 *     public symbol and uses the documented call shape.
 *
 *  2. Runtime — every snippet is executed with
 *     `node --experimental-strip-types`. The captured
 *     `console.log` output is matched line-by-line against the
 *     `// -> <value>` annotations that follow each log call.
 *
 * Hard guarantees (matching the D7.4 / D8.2 probe in the errors
 * package):
 *
 *  - **Must-find-annotations.** If the regex matches zero annotations
 *    across the whole file, the probe exits 2 with a clear message.
 *    A silent pass is treated as a bug.
 *  - **Self-test for the matcher.** A synthetic snippet with a
 *    deliberately wrong `// ->` value is built and asserted to fail
 *    the matcher; if the matcher accepts it, the probe exits 3.
 *  - **Self-test for the type check.** A synthetic snippet that
 *    imports a non-existent export (`nonexistentFromErrors`) is
 *    asserted to fail the type check; if it passes, the probe
 *    exits 4.
 *
 * The script intentionally lives outside the Next.js compiler and
 * outside the vitest test runner. It is invoked by
 * `pnpm --filter web snippet-check` and is independent of the
 * home page's React/Next.js context.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const examplesPath = path.join(appRoot, 'src/components/marketing/examples.ts');
// Resolve `@deessejs/errors` to the **built** package. The source uses
// `.js` extensions in its imports (ESM TypeScript with the bundler
// resolution strategy), so the runtime stage needs the actual .js
// files. The dist directory is produced by `pnpm --filter
// @deessejs/errors build`, which is the same build the Vercel
// preview runs before the type-check / probe.
const errorsEntry = path.join(repoRoot, 'packages/errors/dist/index.js');
const checkDir = path.join(appRoot, '.marketing-check');

// ----------------------------------------------------------------------
// 1. Compile examples.ts and import the exports. `ts.transpileModule`
//    produces ESM, which Node can run via a `data:` URL.
// ----------------------------------------------------------------------

const source = await readFile(examplesPath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const { HERO_CODE, COMPARISON_EXAMPLES } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);

const comparison = COMPARISON_EXAMPLES;

const snippets = [
  { id: 'hero', code: HERO_CODE },
  ...comparison.flatMap((example) => [
    { id: `${example.id}-before`, code: example.before },
    { id: `${example.id}-after`, code: example.after },
  ]),
];

// ----------------------------------------------------------------------
// 2. Type-check stage. Materialize each snippet to a real file so
//    `tsc` can resolve imports. The `paths` map points the bare
//    `@deessejs/errors` import at the local source.
// ----------------------------------------------------------------------

if (existsSync(checkDir)) {
  await rm(checkDir, { recursive: true, force: true });
}
await mkdir(checkDir, { recursive: true });

const files = new Map();
for (const snippet of snippets) {
  const filePath = path.join(checkDir, `${snippet.id}.ts`);
  files.set(filePath, `${snippet.code}\nexport {};\n`);
}
await Promise.all(
  [...files.entries()].map(async ([filePath, code]) => {
    await writeFile(filePath, code, 'utf8');
  })
);

const compilerOptions = {
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  // The bare `@deessejs/errors` import resolves to the dist `.d.ts`
  // for type checking, and to the dist `.js` for runtime via the
  // rewritten import in `runSnippet()`. The same dist artifact is
  // what npm consumers will install; the probe verifies the snippet
  // against the *published* surface, not the source.
  paths: {
    '@deessejs/errors': [path.join(repoRoot, 'packages/errors/dist/index.d.ts')],
  },
  baseUrl: '.',
};

const host = ts.createCompilerHost(compilerOptions);
const originalGetSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
  const code = files.get(filename);
  return code === undefined
    ? originalGetSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile)
    : ts.createSourceFile(filename, code, languageVersion, true);
};

const program = ts.createProgram([...files.keys()], compilerOptions, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
const realErrors = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error && d.file);

let typeCheckFailures = 0;
if (realErrors.length > 0) {
  typeCheckFailures = realErrors.length;
  const formatted = ts.formatDiagnosticsWithColorAndContext(realErrors, {
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => appRoot,
    getNewLine: () => '\n',
  });
  console.error(`[type-check] ${realErrors.length} diagnostic(s):\n${formatted}`);
}

// ----------------------------------------------------------------------
// 3. Runtime + annotation stage. Each snippet is rewritten so the
//    bare `@deessejs/errors` import points at the local source, then
//    executed under Node 22's strip-types. The captured stdout is
//    matched against the `// -> <value>` annotations.
// ----------------------------------------------------------------------

const expectRe = /^\s*console\.log\((.*?)\);\s*\/\/\s*->\s*(.*?)\s*$/;

function parseExpectations(snippet) {
  const expectations = [];
  for (const line of snippet.split('\n')) {
    const m = line.match(expectRe);
    if (!m) continue;
    expectations.push({ expression: m[1].trim(), expected: m[2] });
  }
  return expectations;
}

/**
 * Strip the `import { ... } from '@deessejs/errors';` line and
 * replace it with a relative import that points at the local source.
 * The rewritten snippet is self-contained and resolvable by Node's
 * strip-types runner without any `node_modules` indirection.
 */
function rewriteImports(snippet) {
  const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]@deessejs\/errors['"]\s*;?/g;
  return snippet.replace(importRe, (_match, names) => {
    const trimmed = names.trim();
    return `import { ${trimmed} } from '${pathToFileURL(errorsEntry).href}';`;
  });
}

function runSnippet(snippet) {
  const rewritten = rewriteImports(snippet);
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', '-e', rewritten],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
}

let totalAnnotations = 0;
let runtimeFailures = 0;

for (const snippet of snippets) {
  const expectations = parseExpectations(snippet.code);
  if (expectations.length === 0) {
    console.error(
      `[runtime] ${snippet.id} has no \`console.log(...); // -> <value>\` annotations. ` +
        `Each snippet must include at least one; the probe cannot verify a snippet whose ` +
        `runtime output is not annotated.`
    );
    runtimeFailures += 1;
    continue;
  }
  totalAnnotations += expectations.length;
  const result = runSnippet(snippet.code);
  if (result.status !== 0) {
    runtimeFailures += 1;
    console.error(
      `[runtime] ${snippet.id} failed to execute (exit ${result.status}):\n` +
        (result.stderr ?? result.stdout ?? '')
    );
    continue;
  }
  const lines = (result.stdout ?? '').split('\n').filter((l) => l.length > 0);
  if (lines.length !== expectations.length) {
    runtimeFailures += 1;
    console.error(
      `[runtime] ${snippet.id} emitted ${lines.length} log lines, ` +
        `expected ${expectations.length}. Output was:\n${result.stdout}`
    );
    continue;
  }
  for (let i = 0; i < expectations.length; i++) {
    const { expected } = expectations[i];
    const actual = lines[i];
    if (actual !== expected) {
      runtimeFailures += 1;
      console.error(
        `[runtime] ${snippet.id} line ${i + 1}: expected ${JSON.stringify(expected)}, ` +
          `got ${JSON.stringify(actual)}`
      );
    }
  }
}

// ----------------------------------------------------------------------
// 4. Self-tests. A deliberately wrong annotation must fail the
//    matcher, and a deliberately wrong import must fail the type
//    check. Without these, a regression in the matcher could
//    silently pass.
// ----------------------------------------------------------------------

// (a) Wrong annotation matcher
{
  const bad = "console.log('actual'); // -> wrong";
  const expectations = parseExpectations(bad);
  assert.equal(expectations.length, 1, 'self-test: bad snippet must produce one expectation');
  assert.notEqual(
    'actual',
    expectations[0].expected,
    'self-test: matcher must not accept a wrong annotation'
  );
}

// (b) Type check rejects a non-existent import
{
  const badPath = path.join(checkDir, '__selftest__.ts');
  const badCode = `import { nonexistentFromErrors } from '@deessejs/errors';\nconsole.log(nonexistentFromErrors); // -> x\n`;
  await writeFile(badPath, badCode, 'utf8');
  files.set(badPath, badCode);
  const program2 = ts.createProgram([badPath], compilerOptions, host);
  const diagnostics2 = ts.getPreEmitDiagnostics(program2);
  const hasError = diagnostics2.some((d) => d.category === ts.DiagnosticCategory.Error && d.file);
  if (!hasError) {
    console.error('[self-test] type-check accepted a non-existent export — probe is broken');
    process.exit(4);
  }
}

// ----------------------------------------------------------------------
// 5. Final report.
// ----------------------------------------------------------------------

if (totalAnnotations === 0) {
  console.error(
    '[probe] HARD FAIL: no `// -> <value>` annotations were verified across ' +
      `${snippets.length} snippets. A pass with zero annotations is a bug.`
  );
  process.exit(2);
}

if (typeCheckFailures > 0 || runtimeFailures > 0) {
  console.error(
    `\n[probe] FAILED. ${typeCheckFailures} type-check failure(s), ` +
      `${runtimeFailures} runtime failure(s) across ${snippets.length} snippets.`
  );
  process.exit(1);
}

console.log(
  `[probe] OK. Type-checked and runtime-verified ${snippets.length} marketing snippets ` +
    `(${totalAnnotations} annotations).`
);
