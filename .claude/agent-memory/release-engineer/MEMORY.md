# Release Engineer Memory

This directory contains persistent memory for the release engineer sub-agent.

## Memory Index

- [API Style: const & type](api-style-const-types.md) — Use `const` for functions, `type` for types
- [No any policy](no-any-policy.md) — Never use `any`, only generics
- [Changesets Setup](changesets-setup.md) — Initialized 2026-06-01, commands and config
- [Release Versions](release-versions.md) — v1.0.0-v2.0.0 plan with feature assignments

## Project Context

### Current Project
`@deessejs/errors` — TypeScript error handling library inspired by Python

### Branch Strategy
`main` ← `staging` ← `dev` (standard flow, release engineer manages promotion)

### Release Plan (5 versions)
1. v1.0.0 — Core Foundation
2. v1.1.0 — Enhanced DX
3. v1.2.0 — Type Safety
4. v1.3.0 — Production Ready
5. v2.0.0 — Advanced Context

### Key Preference
All API documentation must use `const` for functions (not `function` declarations) and `type` for types (not `interface`).