# Engineering RFCs

This directory holds Request For Comments documents for substantive engineering changes to the `@deessejs/errors` package or the surrounding tooling. RFCs are how we lock design decisions before any code lands.

## When to write an RFC

Write an RFC when:

- The change touches a public API (exports, types, runtime behavior of a callable).
- Multiple valid design paths exist that trade off against each other.
- The change will land across more than one PR or version.
- A future reader will want to know _why_ the code looks the way it does.

## Lifecycle

1. **Draft.** The author opens a PR adding the RFC. Reviewers push back. Comments are inline.
2. **Accepted.** The author addresses feedback, the maintainer merges the RFC into `main`. The RFC becomes part of the project record.
3. **Implemented.** Implementation PRs reference the RFC by number. Each implementation step is its own PR.
4. **Superseded.** A later RFC replaces this one. The old RFC points to the new one at the top.

## Index

| Number                                   | Title                                                                  | Status | Target version           |
| ---------------------------------------- | ---------------------------------------------------------------------- | ------ | ------------------------ |
| [0001](./0001-standard-schema-fields.md) | Promote `StandardSchemaV1` to runtime validation + message-as-function | Draft  | `@deessejs/errors@1.4.0` |

## Format

Each RFC file follows:

1. Summary
2. Motivation / non-goals
3. Current state (with file references)
4. Open design decisions (the table at the top must be filled in)
5. Proposed API
6. Implementation plan (ordered PRs)
7. Risks
8. Out of scope
9. Decisions locked by this RFC
10. Open questions for the maintainer
11. References

Numbers are assigned by the maintainer. Filenames use the format `NNNN-kebab-case-title.md`.
