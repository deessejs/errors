/**
 * Vendor validator tests for the new standard-schema mode (RFC 0001).
 *
 * Each vendor block constructs a schema with StandardSchemaV1 conformance,
 * wires it into error(), and asserts the runtime dispatch produces the
 * expected error or success.
 *
 * The vendor packages (zod, valibot, @ark/type) are devDependencies only.
 */

import { describe, it, expect } from "vitest";
import { z } from "zod";
import * as v from "valibot";
import { type } from "@ark/type";
import { ArgsValidationError, error } from "../src/error/error.js";

describe("error() with vendor Standard Schema implementations", () => {
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

  describe("valibot 1", () => {
    it("renders the message on a passing input", () => {
      const E = error({
        name: "ValibotError",
        fields: v.object({
          tag: v.picklist(["info", "warn", "error"]),
          message: v.string(),
        }),
        message: (data: { tag: string; message: string }) =>
          `[${data.tag}] ${data.message}`,
      });
      const instance = E({ tag: "info", message: "hello" });
      expect(instance.message).toBe("[info] hello");
      expect(instance.fields).toEqual({ tag: "info", message: "hello" });
    });

    it("throws ArgsValidationError on a failing input", () => {
      const E = error({
        name: "ValibotError",
        fields: v.object({
          tag: v.picklist(["info", "warn", "error"]),
        }),
        message: (data: { tag: string }) => data.tag,
      });
      expect(() => E({ tag: "weird" })).toThrow(ArgsValidationError);
    });

    it("exposes the issues and vendor on failure", () => {
      const E = error({
        name: "ValibotIssue",
        fields: v.object({
          count: v.pipe(v.number(), v.minValue(0)),
        }),
        message: (data: { count: number }) => String(data.count),
      });
      let caught: unknown = null;
      try {
        E({ count: -1 });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ArgsValidationError);
      const ae = caught as ArgsValidationError;
      expect(ae.vendor).toBe("valibot");
      expect(ae.issues.length).toBeGreaterThan(0);
    });
  });

  describe("arktype 2", () => {
    it("renders the message on a passing input", () => {
      const E = error({
        name: "ArkError",
        fields: type({
          name: "string",
          "age?": "number",
        }),
        message: (data: { name: string; age?: number }) =>
          `${data.name} ${data.age ?? "(unknown)"}`,
      });
      const instance = E({ name: "ada", age: 36 });
      expect(instance.message).toBe("ada 36");
    });

    it("throws ArgsValidationError on a failing input", () => {
      const E = error({
        name: "ArkError",
        fields: type({ name: "string" }),
        message: (data: { name: string }) => data.name,
      });
      expect(() => E({ name: 42 as unknown as string })).toThrow(
        ArgsValidationError,
      );
    });

    it("exposes the issues and vendor on failure", () => {
      const E = error({
        name: "ArkIssue",
        fields: type({ name: "string" }),
        message: (data: { name: string }) => data.name,
      });
      let caught: unknown = null;
      try {
        E({ name: 42 as unknown as string });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(ArgsValidationError);
      const ae = caught as ArgsValidationError;
      expect(ae.vendor).toBe("arktype");
      expect(ae.issues.length).toBeGreaterThan(0);
    });
  });

  describe("vendor-neutral contract parity", () => {
    const schemas: Array<[string, () => unknown]> = [
      ["zod", () => z.object({ x: z.string() })],
      ["valibot", () => v.object({ x: v.string() })],
      ["arktype", () => type({ x: "string" })],
    ];

    it.each(schemas)(
      "%s exposes '~standard' with version 1 and a vendor string",
      (_name, factory) => {
        const schema = factory() as {
          "~standard": { version: number; vendor: string };
        };
        expect(schema["~standard"]).toBeDefined();
        expect(schema["~standard"].version).toBe(1);
        expect(typeof schema["~standard"].vendor).toBe("string");
      },
    );
  });
});
