/**
 * Unit tests for the new-style error factory: function-form message + Standard
 * Schema validation (RFC 0001).
 *
 * These tests use a mock Standard Schema, not zod or valibot, so the suite
 * stays self-contained. Vendor-specific tests (zod, valibot, arktype) live
 * in the consumer-facing docs site; this suite verifies the contract.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArgsValidationError, error } from '../src/error/error.js';
import type { StandardSchemaV1 } from '../src/index.js';

// Build a Standard Schema validator from a plain function. Mirrors zod's
// `safeParse` shape: returns either `{ value }` or `{ issues }`.
// Phase 2: typed I/O so the schema overload of `error()` can
// infer the message parameter and the input shape.
const schema = <I, O = I>(
  predicate: (input: unknown) => input is O,
  validator: string = 'mock'
): StandardSchemaV1<I, O> => ({
  '~standard': {
    version: 1,
    vendor: validator,
    validate: (input: unknown) =>
      predicate(input)
        ? { value: input as O }
        : {
            issues: [
              {
                message: `Predicted value did not match "${validator}"`,
                path: [],
              },
            ],
          },
  },
});

describe('error() with Standard Schema (RFC 0001)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    // Silence legacy-form warning emitted to stderr during the legacy tests.
    if (!warnSpy) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      warnSpy = null;
    }
  });

  afterEach(() => {
    if (warnSpy && typeof (warnSpy as { mockRestore?: () => void }).mockRestore === 'function') {
      (warnSpy as { mockRestore: () => void }).mockRestore();
    }
  });

  describe('legacy string-template form', () => {
    it('accepts only name', () => {
      const Err = error({ name: 'LegacyError' });
      const instance = Err();
      expect(instance.message).toBe('LegacyError');
      expect(instance.name).toBe('LegacyError');
    });

    it('interpolates {placeholder} template', () => {
      // Legacy template form requires a manual generic to declare the
      // shape of the inputs.
      const Err = error<{ field: string; reason: string }>({
        name: 'LegacyError',
        message: 'Field "{field}" is invalid: {reason}',
      });
      const instance = Err({ field: 'email', reason: 'format' });
      expect(instance.message).toBe('Field "email" is invalid: format');
    });

    it('uses message as-is when no placeholders', () => {
      const Err = error({
        name: 'LegacyError',
        message: 'Plain message',
      });
      const instance = Err();
      expect(instance.message).toBe('Plain message');
    });
  });

  describe('standard form with a passing schema', () => {
    it('renders the message from the function', () => {
      const Fields = schema<{ name: string }>(
        (v): v is { name: string } =>
          typeof v === 'object' && v !== null && typeof (v as { name: unknown }).name === 'string'
      );
      const GreetingError = error({
        name: 'GreetingError',
        fields: Fields,
        message: (data) => `Hello, ${data.name}!`,
      });
      const instance = GreetingError({ name: 'world' });
      expect(instance.message).toBe('Hello, world!');
      expect(instance.fields).toEqual({ name: 'world' });
    });

    it('exposes the schema on the factory', () => {
      const Fields = schema<{ x: number }>(
        (v): v is { x: number } =>
          typeof v === 'object' && v !== null && typeof (v as { x: unknown }).x === 'number'
      );
      const E = error({
        name: 'E',
        fields: Fields,
        message: (d) => String(d.x),
      });
      expect((E as unknown as { schema: unknown }).schema).toBe(Fields);
    });
  });

  describe('standard form with a failing schema', () => {
    it('throws ArgsValidationError on a bad input', () => {
      const Fields = schema<{ ok: true }>((input): input is { ok: true } => {
        void input;
        return false;
      }, 'test-validator');
      const E = error({
        name: 'BadInputError',
        fields: Fields,
        message: (d) => String(d.ok),
      });
      // Phase 2: the input shape will be inferred from the schema
      // and `{ wrong: true }` will be rejected at compile time.
      // @ts-expect-error -- input shape not yet inferred from schema
      expect(() => E({ wrong: true })).toThrow(ArgsValidationError);
    });

    it('exposes the source name and issues on the thrown error', () => {
      const Fields = schema<{ ok: true }>((input): input is { ok: true } => {
        void input;
        return false;
      });
      const E = error({
        name: 'BadInputError',
        fields: Fields,
        message: (d) => String(d.ok),
      });
      let caught: unknown = null;
      try {
        // The mock schema rejects all inputs, so this triggers
        // an ArgsValidationError at runtime. The static type requires
        // { ok: true } (the schema's input shape), so we pass it.
        E({ ok: true });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ArgsValidationError);
      expect((caught as ArgsValidationError).source).toBe('BadInputError');
      expect(Array.isArray((caught as ArgsValidationError).issues)).toBe(true);
      expect((caught as ArgsValidationError).name).toBe('ArgsValidationError');
    });

    it('exposes the validator vendor', () => {
      const Fields = schema<{ ok: true }>((input): input is { ok: true } => {
        void input;
        return false;
      }, 'arcane-vendor');
      const TypedFields = Fields as unknown as StandardSchemaV1<{ ok: true }, { ok: true }>;
      const E = error({
        name: 'V',
        fields: TypedFields,
        message: (d) => String(d.ok),
      });
      try {
        // The mock schema rejects all inputs, so this triggers
        // an ArgsValidationError at runtime. The static type requires
        // { ok: true } (the schema's input shape), so we pass it.
        E({ ok: true });
      } catch (err) {
        expect((err as ArgsValidationError).vendor).toBe('arcane-vendor');
      }
    });
  });

  describe('ArgsValidationError class', () => {
    it('extends Error', () => {
      const e = new ArgsValidationError('X', [{ message: 'oops' }], 'mock');
      expect(e).toBeInstanceOf(Error);
      expect(e).toBeInstanceOf(ArgsValidationError);
    });

    it('exposes source, vendor, issues', () => {
      const issues = [{ message: 'first' }, { message: 'second' }];
      const e = new ArgsValidationError('Src', issues, 'mock-vendor');
      expect(e.source).toBe('Src');
      expect(e.vendor).toBe('mock-vendor');
      expect(e.issues).toBe(issues);
    });

    it('serializes issues into message', () => {
      const e = new ArgsValidationError('X', [{ message: 'first' }], 'mock');
      expect(e.message).toContain('Argument validation failed for "X"');
      expect(e.message).toContain('first');
    });
  });

  describe('legacy form retains legacy schema field exposure', () => {
    // Phase 3 makes the presence of `fields` always trigger
    // validation, regardless of the message form. The previous
    // shape — schema + string message, validation skipped — is
    // no longer reachable through the public type signature.
    // The schema is still exposed on the factory when a function
    // message is supplied; the corresponding test lives in
    // the 'standard form' describe above.
    it('exposes the schema on the factory when a function message is supplied', () => {
      const Fields = schema<{ name: string }>(
        (v): v is { name: string } =>
          typeof v === 'object' && v !== null && typeof (v as { name: unknown }).name === 'string'
      );
      // The mock `schema()` helper returns a StandardSchemaV1 with
      // unspecified generics. Cast to the precise shape so the
      // schema overload's data inference matches.
      const TypedFields = Fields as unknown as StandardSchemaV1<{ name: string }, { name: string }>;
      const E = error({
        name: 'MixedError',
        fields: TypedFields,
        message: (d) => d.name,
      });
      expect((E as unknown as { schema: unknown }).schema).toBe(TypedFields);
    });
  });
});
