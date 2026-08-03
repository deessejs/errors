---
"@deessejs/errors": patch
---

Add the missing `repository` field to `packages/errors/package.json`. Trusted publishing with provenance requires `package.json:repository.url` to match the GitHub repo URL from the OIDC token — without it, npm rejects the publish with `E422: Error verifying sigstore provenance bundle: "repository.url" is ""`.
