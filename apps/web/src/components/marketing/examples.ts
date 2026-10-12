/**
 * Marketing snippets — runnable against the public 2.0.0 API.
 *
 * Compiled by `apps/web/scripts/check-marketing-examples.mjs`:
 *  1. each `export const *_CODE` string is type-checked against the
 *     local `packages/errors/dist/index.d.ts` (the path is wired in
 *     the probe's `tsconfig.paths` mapping);
 *  2. each string is executed under `node --experimental-strip-types`
 *     to capture `console.log` output;
 *  3. the captured output is matched line-by-line against the
 *     `// -> <value>` annotation that follows each `console.log`.
 *
 * The annotations are NOT documentation. They are an executable
 * contract: a snippet whose runtime output does not match its
 * annotation fails the probe with a clear diff and the script exits
 * with a non-zero status.
 *
 * This module intentionally has no top-level imports. The snippets
 * are inert string exports; the probe is the only consumer that
 * runs them. Keeping `examples.ts` dependency-free means the home
 * page bundle does not accidentally pull in the errors library.
 *
 * The "before" snippets intentionally use `// @ts-nocheck` to
 * portray the fragile JavaScript approach without the snippet
 * failing the strict type-check. The "after" snippets are fully
 * typed and exercise the public 2.0.0 surface.
 */

/** HERO_CODE — single factory, single raise, message is rendered. */
export const HERO_CODE = `import { z } from 'zod';
import { error, is } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({
    field: z.string(),
    reason: z.string(),
  }),
  message: (d) => \`Field "\${d.field}" is invalid: \${d.reason}\`,
});

const err = ValidationError({ field: 'email', reason: 'invalid format' });
console.log(err.name); // -> ValidationError
console.log(err.fields.field); // -> email
console.log(err.message); // -> Field "email" is invalid: invalid format

// is() narrows the type so fields are readable without a cast.
if (is(err, ValidationError)) {
  console.log(err.fields.reason); // -> invalid format
}
`;

/** COMPARISON_EXAMPLES — three before/after pairs, all runnable. */
export const COMPARISON_EXAMPLES = [
  {
    id: 'errors-with-fields',
    label: 'Errors with fields',
    description:
      'Both versions surface a field name. The @deessejs/errors version lets TypeScript narrow on it without a cast.',
    before: `// @ts-nocheck — the "before" version uses string-matching and a
// loosely-typed API. The nocheck is intentional: the "after" snippet
// is the one that should pass strict type-checking.
function validate(input) {
  if (!input.email) {
    throw new Error('Validation failed: email is required');
  }
  return input;
}

try {
  validate({ email: '' });
} catch (err) {
  // err.message is the only carrier. String-matching for 'email'
  // couples the catch site to the throw site.
  console.log(err.message.includes('email')); // -> true
}
`,
    after: `import { z } from 'zod';
import { error, raise, is } from '@deessejs/errors';

const ValidationError = error({
  name: 'ValidationError',
  fields: z.object({ field: z.string(), reason: z.string() }),
  message: (d) => \`Field "\${d.field}" is invalid: \${d.reason}\`,
});

function validate(input: { email: string }): { email: string } {
  if (!input.email) {
    raise(ValidationError({ field: 'email', reason: 'is required' }));
  }
  return input;
}

try {
  validate({ email: '' });
} catch (err) {
  if (is(err, ValidationError)) {
    // err is narrowed: err.fields is { field: string; reason: string }.
    console.log(err.fields.field); // -> email
    console.log(err.fields.reason); // -> is required
  }
}
`,
  },
  {
    id: 'errors-in-a-hierarchy',
    label: 'Errors in a hierarchy',
    description:
      'Both versions distinguish a validation error from other errors. Inheritance makes the category part of the type, so is(err, AppError) just works.',
    before: `// @ts-nocheck — the "before" version uses class-based inheritance.
// The relationship is documented in a JSDoc, not enforced by types.
class AppError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

function fail() {
  throw new ValidationError('boom');
}

try {
  fail();
} catch (err) {
  // The relationship is documented in a JSDoc; nothing forces it.
  console.log(err instanceof AppError); // -> true
}
`,
    after: `import { z } from 'zod';
import { error, raise, is } from '@deessejs/errors';

const AppError = error({ name: 'AppError' });

const ValidationError = error({
  name: 'ValidationError',
  inherits: AppError,
  fields: z.object({ field: z.string() }),
  message: (d) => \`Invalid \${d.field}\`,
});

function fail(): never {
  raise(ValidationError({ field: 'email' }));
}

try {
  fail();
} catch (err) {
  // Both checks pass: the hierarchy is enforced at compile time.
  console.log(is(err, ValidationError)); // -> true
  console.log(is(err, AppError)); // -> true
}
`,
  },
  {
    id: 'errors-with-a-cause',
    label: 'Errors with a cause',
    description:
      'Both versions preserve the underlying cause. The .from() method attaches it on the same instance, and causes() walks the chain in order.',
    before: `// @ts-nocheck — the "before" version wraps the cause in a string
// message, dropping the structured .cause. The nocheck keeps the
// snippet readable as a deliberate "before".
function saveUser(payload) {
  try {
    if (!payload.email) throw new Error('db: missing email');
    return { id: 'u-1' };
  } catch (dbErr) {
    // The db message is the only carrier. The original Error is lost.
    throw new Error('Save failed: ' + dbErr.message);
  }
}

try {
  saveUser({ email: '' });
} catch (err) {
  // err.cause does not exist on the rethrown string-message wrapper.
  console.log(err.message.startsWith('Save failed')); // -> true
}
`,
    after: `import { z } from 'zod';
import { error, raise, causes } from '@deessejs/errors';

const DbError = error({
  name: 'DbError',
  fields: z.object({ code: z.string() }),
  message: (d) => \`db: \${d.code}\`,
});

const AppError = error({
  name: 'AppError',
  fields: z.object({ op: z.string() }),
  message: (d) => \`\${d.op} failed\`,
});

function saveUser(payload: { email: string }): { id: string } {
  try {
    if (!payload.email) raise(DbError({ code: 'missing-email' }));
    return { id: 'u-1' };
  } catch (dbErr) {
    // .from() attaches the original Error on the same instance,
    // then raise() throws. The whole chain is preserved.
    if (dbErr instanceof Error) {
      raise(AppError({ op: 'save' }).from(dbErr));
    }
    throw dbErr;
  }
}

try {
  saveUser({ email: '' });
} catch (err) {
  if (err instanceof Error) {
    console.log(err.message); // -> save failed
    // causes() returns the chain in order, immediate cause first.
    const chain = causes(err);
    console.log(chain.length); // -> 1
    // chain[0] is the immediate cause: the DbError raised inside saveUser.
    console.log(chain.length > 0 && chain[0] ? chain[0].name : 'none'); // -> DbError
  }
}
`,
  },
] as const;
