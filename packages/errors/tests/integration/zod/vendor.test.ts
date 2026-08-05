/**
 * Integration tests for zod with the new standard-schema mode (RFC 0001).
 *
 * These tests are colocated under tests/integration/ because they depend
 * on an external package. They exercise the runtime dispatch end-to-end
 * through error().
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ArgsValidationError, error } from "../../../src/error/error.js";

describe("zod 4", () => {
  it("renders the message on a passing input", () => {
    const E = error({
      name: "ZodValidationError",
      fields: z.object({
        email: z.string().email(),
        age: z.number().int().min(0),
      }),
      message: (data: { email: string; age: number }) =>
        `Field "${data.email}" age ${data.age}`,
    });
    const instance = E({ email: "jane@example.com", age: 30 });
    expect(instance.message).toBe('Field "jane@example.com" age 30');
    expect(instance.fields).toEqual({
      email: "jane@example.com",
      age: 30,
    });
    expect(instance.name).toBe("ZodValidationError");
  });

  it("throws ArgsValidationError on a failing input", () => {
    const E = error({
      name: "ZodValidationError",
      fields: z.object({
        email: z.string().email(),
      }),
      message: (data: { email: string }) => `Field "${data.email}"`,
    });
    expect(() => E({ email: "not-an-email" })).toThrow(
      ArgsValidationError,
    );
  });

  it("exposes the issues and vendor on failure", () => {
    const E = error({
      name: "ZodError",
      fields: z.object({
        email: z.string().email(),
      }),
      message: (data: { email: string }) => `Field ${data.email}`,
    });
    let caught: unknown = null;
    try {
      E({ email: "bogus" });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ArgsValidationError);
    const ae = caught as ArgsValidationError;
    expect(ae.vendor).toBe("zod");
    expect(ae.issues.length).toBeGreaterThan(0);
    expect(ae.source).toBe("ZodError");
  });

  it("preserves transforms in the output type", () => {
    const E = error({
      name: "ZodTransform",
      fields: z.object({
        value: z.coerce.number(),
      }),
      message: (data: { value: number }) => String(data.value),
    });
    const instance = E({ value: "42" });
    expect(typeof instance.fields.value).toBe("number");
    expect(instance.fields.value).toBe(42);
  });
});
