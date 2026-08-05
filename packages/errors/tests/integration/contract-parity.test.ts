/**
 * Cross-vendor parity check: every supported Standard Schema implementation
 * must expose a `~standard` namespace with version=1 and a vendor string.
 *
 * Each vendor is parametrized through it.each so a failure points at the
 * specific implementation that drifted off spec.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { type } from '@ark/type';

describe('vendor-neutral contract parity', () => {
  const schemas: Array<[string, () => unknown]> = [
    ['zod', () => z.object({ x: z.string() })],
    ['valibot', () => v.object({ x: v.string() })],
    ['arktype', () => type({ x: 'string' })],
  ];

  it.each(schemas)(
    "%s exposes '~standard' with version 1 and a vendor string",
    (_name, factory) => {
      const schema = factory() as {
        '~standard': { version: number; vendor: string };
      };
      expect(schema['~standard']).toBeDefined();
      expect(schema['~standard'].version).toBe(1);
      expect(typeof schema['~standard'].vendor).toBe('string');
    }
  );
});
