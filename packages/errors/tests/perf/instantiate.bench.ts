// Performance benchmarks. Run with: pnpm exec vitest bench
// Not part of the regular test run; benchmarks are informational.

import { bench, describe } from "vitest";
import { z } from "zod";
import { error } from "../src/index.js";

const NoFields = error({ name: "NoFields" });
const WithFields = error({
  name: "WithFields",
  fields: z.object({ x: z.string() }),
  message: (data: { x: string }) => data.x,
});
const Legacy = error<{ a: string }>({ name: "Legacy", message: "Hello {a}" });

describe("error factory instantiation", () => {
  bench("no fields, no message", () => {
    NoFields();
  });

  bench("with zod schema, function message", () => {
    WithFields({ x: "hello" });
  });

  bench("legacy string-template form", () => {
    Legacy({ a: "world" });
  });
});
