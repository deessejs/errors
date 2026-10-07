---
"@deessejs/errors": patch
---

Fix npm trusted publishing (OIDC) end-to-end. Three changes:

1. Release workflow bumps Node 22 → 24 (the runner default; matches our other release workflows, and aligns with npm CLI ≥ 11.5.1 + Node ≥ 22.14.0 requirements for trusted publishing).
2. `Publish packages` step now passes `env: NPM_CONFIG_PROVENANCE: 'true'`, which forces pnpm publish down the OIDC code path instead of falling back to a token.
3. `packages/errors/package.json` now declares `publishConfig.provenance: true`, so npm always emits a provenance attestation on publish (belt + suspenders alongside the env var).
