import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.ts'],
    // Benchmarks live under tests/perf/ and use vitest's bench API.
    // They are picked up by `pnpm exec vitest bench` but skipped by `test:run`.
    exclude: [
      'node_modules/**',
      'tests/perf/**',
      // Consumer-from-dist smoke test imports the built entry point
      // (../dist/index.js) which is not part of the source transform
      // pipeline. Run it manually after `pnpm build`:
      //   node --import tsx tests/consumer-from-dist.test.ts
      // or as a separate CI job.
      'tests/consumer-from-dist.test.ts',
    ],
  },
});
