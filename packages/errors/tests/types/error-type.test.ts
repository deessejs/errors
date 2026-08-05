// Static type tests for the error() factory. They live under tests/types/ and use expectTypeOf to assert types.

import { describe, it, expectTypeOf } from "vitest";
import { z } from "zod";
import * as v from "valibot";
import { type } from "@ark/type";
import { error, raise, ArgsValidationError } from "../../src/index.js";

describe("error() type inference (Standard Schema mode)", () => {
  it("infers the field type from a zod schema", () => {
    const E = error({
      name: "ZodError",
      fields: z.object({ x: z.string() }),
      message: (data: { x: string }) => data.x,
    });
    const instance = E({ x: "hello" });
    expectTypeOf(instance).toMatchTypeOf<{ x: string; name: string; message: string }>();
    expectTypeOf(instance.fields).toEqualTypeOf<{ x: string }>();
  });

  it("infers the field type from a valibot schema", () => {
    const E = error({
      name: "ValibotError",
      fields: v.object({ count: v.number() }),
      message: (data: { count: number }) => String(data.count),
    });
    const instance = E({ count: 42 });
    expectTypeOf(instance.fields).toEqualTypeOf<{ count: number }>();
  });

  it("infers the field type from an arktype schema", () => {
    const E = error({
      name: "ArkError",
      fields: type({ ok: "boolean" }),
      message: (data: { ok: boolean }) => String(data.ok),
    });
    const instance = E({ ok: true });
    expectTypeOf(instance.fields).toEqualTypeOf<{ ok: boolean }>();
  });

  it("preserves transformed output types in the message function", () => {
    const E = error({
      name: "CoerceError",
      fields: z.object({ n: z.coerce.number() }),
      message: (data: { n: number }) => String(data.n),
    });
    const instance = E({ n: "42" });
    // After z.coerce, data.n is number, not string.
    expectTypeOf(instance.fields.n).toEqualTypeOf<number>();
    expectTypeOf(instance.fields.n).not.toEqualTypeOf<string>();
  });

  it("preserves branded types from zod", () => {
    const UserId = z.string().regex(/^usr_/).brand<"UserId">();
    const E = error({
      name: "BrandedError",
      fields: z.object({ id: UserId }),
      message: (data: { id: string & { __brand: "UserId" } }) => data.id,
    });
    const instance = E({ id: "usr_1" as string & { __brand: "UserId" } });
    expectTypeOf(instance.fields.id).toMatchTypeOf<
      string & { __brand: "UserId" }
    >();
  });
});

describe("error() without fields (manual generic)", () => {
  it("respects the manually supplied generic", () => {
    const E = error<{ a: string; b: number }>({ name: "ManualError" });
    const instance = E({ a: "hi", b: 1 });
    expectTypeOf(instance.fields).toEqualTypeOf<{ a: string; b: number }>();
  });

  it("defaults fields to {} when no generic is provided", () => {
    const E = error({ name: "DefaultError" });
    const instance = E();
    expectTypeOf(instance.fields).toEqualTypeOf<Record<string, never>>();
  });
});

describe("error() instance shape", () => {
  it("the instance has the documented core fields", () => {
    const E = error({ name: "ShapeError" });
    const instance = E();
    expectTypeOf(instance.name).toEqualTypeOf<string>();
    expectTypeOf(instance.message).toEqualTypeOf<string>();
    expectTypeOf(instance.stack).toEqualTypeOf<string>();
    expectTypeOf(instance.cause).toEqualTypeOf<Error | null>();
    expectTypeOf(instance.causes).toEqualTypeOf<Error[]>();
    expectTypeOf(instance.notes).toEqualTypeOf<string[]>();
    expectTypeOf(instance.context).toEqualTypeOf<Record<string, unknown> | null>();
  });

  it("the instance methods are bound and chainable", () => {
    const E = error({ name: "ChainError" });
    const a = E();
    const b = a.addNote("n1").addNote("n2");
    expectTypeOf(b.notes).toEqualTypeOf<[string, string]>();

    const cause = new Error("c");
    const c = b.from(cause);
    expectTypeOf(c.cause).toEqualTypeOf<Error>();
  });
});

describe("error() legacy path", () => {
  it("accepts a string message with the legacy template form", () => {
    const E = error<{ name: string }>({
      name: "Legacy",
      message: "Hello {name}",
    });
    const instance = E({ name: "Ada" });
    expectTypeOf(instance.message).toEqualTypeOf<string>();
    expectTypeOf(instance.fields).toEqualTypeOf<{ name: string }>();
  });

  it("the legacy form is still valid TypeScript", () => {
    // Runtime warning is covered indirectly by the existing legacy form tests.
    // Asserting the call-site collection here is brittle (stack format, mock
    // ordering), so we just lock the type contract.
    const E = error<{ a: string }>({ name: "Legacy", message: "{a}" });
    const instance = E({ a: "x" });
    expectTypeOf(instance.message).toEqualTypeOf<string>();
  });
});

describe("ArgsValidationError type contract", () => {
  it("is constructible with source, issues, vendor", () => {
    const e = new ArgsValidationError("X", [{ message: "oops" }], "mock");
    expectTypeOf(e).toMatchTypeOf<Error>();
    expectTypeOf(e.source).toEqualTypeOf<string>();
    expectTypeOf(e.issues).toEqualTypeOf<ReadonlyArray<unknown>>();
    expectTypeOf(e.vendor).toEqualTypeOf<string>();
  });
});

describe("raise() return type", () => {
  it("raises are typed as never", () => {
    const E = error({ name: "RaiseError" });
    // The return type is `never`. The line below is a compile-time check:
    //   the expression must compile, and the inferred return is `never`.
    const r = (): never => raise(E());
    expectTypeOf(r).returns.toEqualTypeOf<never>();
  });
});
