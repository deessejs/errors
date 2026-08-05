// Edge case tests for the standard-schema runtime path.

import { describe, it, expect, vi } from "vitest";
import { error, ArgsValidationError } from "../src/index.js";

function makeSchema<TInput, TOutput>(opts: {
  vendor: string;
  validate: (input: unknown) =>
    | { value: TOutput }
    | { issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey> }> }
    | Promise<{ value: TOutput } | { issues: ReadonlyArray<{ message: string }> }>;
}): import("@standard-schema/spec").StandardSchemaV1<TInput, TOutput> {
  return {
    "~standard": {
      version: 1,
      vendor: opts.vendor,
      validate: opts.validate as never,
    },
  } as never;
}

describe("standard schema runtime: edge cases", () => {
  it("async validator throws ArgsValidationError with an explicit message", () => {
    const E = error({
      name: "AsyncE",
      fields: makeSchema({
        vendor: "async-vendor",
        validate: async () => ({ value: { x: 1 } }),
      }),
      message: (data: { x: number }) => String(data.x),
    });
    try {
      E({ x: 1 });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ArgsValidationError);
      expect((err as ArgsValidationError).message).toContain("Async schemas");
      expect((err as ArgsValidationError).vendor).toBe("async-vendor");
    }
  });

  it("validator that throws is wrapped in ArgsValidationError", () => {
    const E = error({
      name: "ThrowE",
      fields: makeSchema({
        vendor: "throwing",
        validate: () => {
          throw new Error("kaboom");
        },
      }),
      message: (data: { ok: boolean }) => String(data.ok),
    });
    expect(() => E({ ok: true })).toThrow(/kaboom/);
  });

  it("issues array with non-conformant shape is preserved as-is", () => {
    const weirdIssues = ["string", 42, { totally: "weird" }];
    const E = error({
      name: "WeirdE",
      fields: makeSchema({
        vendor: "weird",
        validate: () => ({ issues: weirdIssues as never }),
      }),
      message: (data: unknown) => String(data),
    });
    try {
      E({});
      throw new Error("expected throw");
    } catch (err) {
      const ave = err as ArgsValidationError;
      expect(ave).toBeInstanceOf(ArgsValidationError);
      expect(ave.issues).toEqual(weirdIssues);
      expect(ave.message).toContain("Argument validation failed");
    }
  });

  it("value with circular references does not break the wrapper", () => {
    type Cycle = { name: string; self?: Cycle };
    const cycle: Cycle = { name: "loop" };
    cycle.self = cycle;

    const E = error({
      name: "CycleE",
      fields: makeSchema({
        vendor: "cycle",
        validate: () => ({ value: cycle }),
      }),
      message: (data: Cycle) => data.name,
    });
    const instance = E(cycle);
    expect(instance.message).toBe("loop");
  });

  it("schema is invoked exactly once per error construction", () => {
    let callCount = 0;
    const E = error({
      name: "CountE",
      fields: makeSchema({
        vendor: "counter",
        validate: (input) => {
          callCount += 1;
          return { value: { x: input } };
        },
      }),
      message: (data: { x: unknown }) => String(data.x),
    });
    E({ x: 1 });
    E({ x: 2 });
    E({ x: 3 });
    expect(callCount).toBe(3);
  });
});


describe("standard schema runtime: more edge cases", () => {
  it("legacy string template still works when no fields is supplied", () => {
    const E = error<{ a: string }>({
      name: "LegacyE",
      message: "Hello {a}",
    });
    const instance = E({ a: "world" });
    expect(instance.message).toBe("Hello world");
  });

  it("legacy string template renders the default name when fields missing", () => {
    const E = error({
      name: "NameOnly",
      message: "Hello {nonexistent}",
    });
    const instance = E({});
    expect(instance.message).toBe("Hello {nonexistent}");
  });

  it("empty function message produces empty string", () => {
    const E = error({
      name: "EmptyE",
      fields: makeSchema({
        vendor: "empty",
        validate: () => ({ value: {} }),
      }),
      message: () => "",
    });
    const instance = E({});
    expect(instance.message).toBe("");
  });

  it("function message that throws is wrapped in a new Error", () => {
    const E = error({
      name: "MessageThrowE",
      fields: makeSchema({
        vendor: "throwmsg",
        validate: () => ({ value: {} }),
      }),
      message: () => {
        throw new Error("user-message-bug");
      },
    });
    expect(() => E({})).toThrow(/user-message-bug/);
  });

  it("schema returning Promise but not awaited is rejected loudly", () => {
    const E = error({
      name: "PromiseSchemaE",
      fields: makeSchema({
        vendor: "promise-rejector",
        validate: () => new Promise(() => {}),
      }),
      message: (data: { ok: boolean }) => String(data.ok),
    });
    expect(() => E({ ok: true })).toThrow(ArgsValidationError);
  });

  it("error name and stack are preserved correctly on the wrapper", () => {
    const E = error({
      name: "StackE",
      fields: makeSchema({
        vendor: "stack",
        validate: () => ({ issues: [{ message: "x" }] }),
      }),
      message: (data: unknown) => String(data),
    });
    try {
      E({});
      throw new Error("expected throw");
    } catch (err) {
      expect((err as ArgsValidationError).name).toBe("ArgsValidationError");
      expect((err as Error).stack).toBeDefined();
      expect((err as Error).stack).toContain("ArgsValidationError");
    }
  });

  it("suppresses deprecation warning when DEESSEJS_ERRORS_LEGACY_TEMPLATES=1", () => {
    const gate = process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES;
    process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = "1";
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const E = error({ name: "GatedE", message: "{nonexistent}" });
      E({});
      E({});
      E({});
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      if (gate === undefined) {
        delete process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES;
      } else {
        process.env.DEESSEJS_ERRORS_LEGACY_TEMPLATES = gate;
      }
    }
  });
});
