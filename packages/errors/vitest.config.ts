import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.ts'],
    // Benchmarks live under tests/perf/ and use vitest's bench API.
    // They are picked up by `pnpm exec vitest bench` but skipped by `test:run`.
    exclude: ['node_modules/**', 'tests/perf/**'],
  },
});
