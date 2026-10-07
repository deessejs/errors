---
"@deessejs/errors": patch
---

Tag the release job with `environment: release` so the run is recorded as a deployment to the `release` GitHub environment. Future hardening (required reviewers, branch restrictions, wait timer) can attach to the same environment without further workflow changes. Provenance and trusted publishing are unaffected.
