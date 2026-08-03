# Authoring a Pull Request

**What:** Standards for the description and body of a pull request opened against `@deessejs/errors`. Companion to `implementing-an-issue.md` (which covers the work itself) and `releasing-a-new-version.md` (which covers the release flow).

**Why it matters:** A PR is the contract you sign with the reviewer and the release engineer. The diff shows the change, but only the body answers the questions a reviewer asks first: *what changed, why, is it safe, how do I use it*. Standardizing the body raises the floor without slowing anyone down.

## Roles

Two audiences read your PR body:

- **The reviewer** — needs to understand the intent, the risk, and the testing story in under a minute.
- **The release engineer** — needs to know if the changeset is present, whether the mergeable target has any preparation to do, and whether your PR unlocks or blocks anything downstream.

Write for both. If a section is not relevant for your change, omit it and add a one-line "why" elsewhere.

## Section-by-section template

The body has six optional sections. Use only the ones that apply, in this order:

### `## Summary`

One paragraph, two or three sentences. What changed and why. The reviewer can stop here if they trust the change; keep it tight.

### `## Why`

The motivation. Link the issue (`Closes #N` or `Refs #N`). Add background only if it does not fit in the issue — most of the time, the issue already carries this.

### `## What changed`

Bulleted list of concrete changes. Tie each bullet to a file or a logical unit, not to a commit. The reviewer reads this alongside the diff to see whether each piece of code is accounted for.

### `## Code sample`

Mandatory for any PR that touches `src/**` and alters the public API (new method, new export, new option, new type, signature change, behavior change). Optional for chores, refactors without API change, and documentation-only PRs.

The reviewer wants to see how the change reads in real code, not just the diff. If your PR removes or alters an existing usage, the reviewer needs to see both sides; if your PR only adds new usage, a single After block is enough.

**Format A — Before/After** (default).

Use this when the PR changes the way existing code is written, when a public API moved, or when something that used to work no longer does.

```text
Before:
[code that the reviewer would have written last week]

After:
[code the reviewer should write next week]
```

**Format B — After only** (acceptable when the PR only adds new usage without breaking any existing usage).

```text
After this PR, callers can do:
[code]
```

**What good looks like for a method-add PR (illustrative, not real):**

```text
Before:
const err = AppError();
err.notes.push("Attempt 1 failed");
err.notes.push("Retrying...");
// → Type error: property 'notes' is not assignable

After:
const err = AppError()
  .addNote("Attempt 1 failed")
  .addNote("Retrying...");
// err.notes === ["Attempt 1 failed", "Retrying..."]
```

**What good looks like for an additive PR:**

```text
After this PR, callers can do:
import { withSpan } from "@deessejs/errors";

await withSpan("read", async (span) => {
  await span.record({ hits: 42 });
});
```

**Rules:**

- Code samples must compile. Verify by running the sample through `pnpm build` or `pnpm type-check` in your head before pasting it. If the sample needs explanation, add a comment, do not approximate.
- TypeScript samples get backtick fences with `ts` or `typescript` language tag so they highlight correctly on GitHub.
- Bullet the snippet (`- \`\`\`ts ... \`\`\``) if the body has multiple snippets. Otherwise a plain fenced block is fine.
- Reuse exact names from the codebase. If you renamed a symbol, show both the old and the new names in the Before block.

### `## Verified locally`

What you ran and the outcome. Keep it factual.

```text
- `pnpm test --run` — 82/82 tests pass
- `pnpm lint`
- `pnpm type-check`
- `pnpm build`
```

Bullet, not prose. The reviewer wants to scan, not read.

### `## Risk`

One paragraph or three bullets. By default, risk is **low** unless something specific makes it medium or high. Naming the risk explicitly ("signature change", "adds a new dependency", "modifies the output format") is more useful than rating it on a scale.

If your PR has zero risk, write "Low. This change is purely additive and existing code is unaffected." or equivalent. Do not leave the section empty.

## What goes in the title

Title format: `<type>(<scope>): <subject>`.

| Type | Use for |
| ---- | ------- |
| `feat` | new capability |
| `fix` | bug fix |
| `chore` | non-functional maintenance |
| `ci` | GitHub Actions workflows |
| `docs` | documentation under `docs/` |
| `refactor` | internal restructuring, no public-API change |
| `test` | tests only |

The scope is the area affected (`errors`, `release`, `cli`). If unsure, omit — `feat(errors): ...` is fine, `feat: ...` is fine too.

The subject is a present-tense summary, no period at the end. Keep it to about 50 characters; longer is acceptable if the alternative is a cryptic title.

## What does NOT go in the body

- **The diff paste.** The reviewer has the diff. Re-pasting it as code blocks in the body makes the PR unreadable.
- **The commit list.** GitHub shows commits on the PR page. Listing them in the body duplicates information.
- **Vague acceptance checkmarks.** "Tests pass", "build works" — without saying which commands, this is filler.
- **Apologies and meta-commentary.** "Sorry for the noise", "refactor only, no functional change" — keep it to facts.
- **Marketing language.** "This unlocks a brand new paradigm" — no.

## Length budget

A reasonable PR body is between 80 and 300 lines of markdown. Shorter is fine. Longer means the change is doing too much and should probably be split, or the writer is hedging.

If your body crosses 400 lines, ask yourself: is this two PRs?

## Anti-patterns

- **Body is `// WIP`** or empty. Reviewers bounce off empty PRs. Put a one-liner, even if you are still iterating.
- **Title is `Update stuff`.** Useless. The PR queue becomes a graveyard.
- **Forgetting the changeset on a PR that needs one.** The CI lint on PRs to `staging` blocks the merge, so this is caught at the gate. But it still costs a round-trip.
- **Mentioning the reviewer in the body** (`@username please review`). That is a comment, not body text. Use the GitHub review-requested-by reviewer field.
- **Mixing an unrelated reformat with a logical change.** Make the reformat a separate commit, ideally a separate PR.
- **Big PRs.** Anything over 600 lines of diff or 50 files should be split or at least flagged in the body with a sentence explaining why it cannot be.

## Worked example

A faithful worked example for the recent `.addNote()` PR (the actual body was a bit different; this is the idealised version):

```markdown
Closes #29.

Mirrors Python 3.11 PEP 678 (`BaseException.add_note()`). The method was
documented but never implemented; consumers following the JSDoc examples
got a TypeScript error. The `notes: string[]` storage was already wired up;
only the method was missing.

## Why

The discrepancy between docs and implementation is a real bug. Anyone
copying the JSDoc example from `src/raise/index.ts:34-38` gets a TypeScript
error. Python 3.11 PEP 678 ships this exact pattern; porting it is
consistent with the library\'s Python inspiration.

## What changed

- `src/error/types.ts`: declare `addNote(note: string): ErrorInstance<TFields>` on `ErrorInstance`. Remove the stale TODO and the "implemented in a separate task" notice.
- `src/error/error.ts`: implement `addNote` in the factory closure. Pushes to `notes` and returns `this` for chaining.
- `tests/error.test.ts`: cover single note, chained notes, preservation through `.from()`, and isolation between siblings.

## Code sample

Before:
\`\`\`typescript
const err = AppError();
// Type error: 'addNote' does not exist on type 'ErrorInstance<TFields>'
\`\`\`

After:
\`\`\`typescript
const err = AppError()
  .addNote("Attempt 1 failed")
  .addNote("Retrying...");
\`\`\`

## Verified locally

- `pnpm test --run` — 82/82 tests pass
- `pnpm lint`
- `pnpm type-check`
- `pnpm build`

## Risk

Low. `.addNote()` is purely additive. Existing code is unaffected. The
return-type inference is the only contract change, and it is fully typed.
```

Note how the `## Code sample` section is short, copy-pastable, and anchored on the actual API surface. That is what the reviewer skims first.

## Definition of done

A PR is **publishable** when:

- [ ] Title follows `<type>(<scope>): <subject>`.
- [ ] Body has at least `## Summary`.
- [ ] If the PR touches `src/**` and changes public API, `## Code sample` is present and shows before/after (or after only, justified).
- [ ] `## Verified locally` lists the commands run.
- [ ] `## Risk` is non-empty.
- [ ] Changeset is present (unless documentation-only or CI-only, see `implementing-an-issue.md`).
- [ ] CI is green before reviewer hand-off.

## Reviewer-side complement

This document is about authoring. The reviewer-side counterpart — what to look for when reviewing a PR — is intentionally not part of this file. Reviewer checklists belong in a separate document and should be authored by the reviewer side of the team, not the author side.

## References

- `implementing-an-issue.md` — the workflow that produces a PR.
- `releasing-a-new-version.md` — what happens after a PR lands.
- `release-system.md` — the architectural plan that defines what kind of changes need changesets.
