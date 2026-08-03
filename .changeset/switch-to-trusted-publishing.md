---
"@deessejs/errors": patch
---

Switch the release workflow to npm trusted publishing (OIDC) instead of `secrets.NPM_TOKEN`. The `id-token: write` permission, already declared on the job, is sufficient for GitHub to mint the OIDC token that npm exchanges for a short-lived publish credential. Provenance is generated automatically on public repos. The `NPM_TOKEN` secret can be revoked once the first OIDC publish succeeds.
