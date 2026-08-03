---
"@deessejs/errors": patch
---

Remove the `version bump` label gate from the release workflow. Every PR merged to `main` now produces a release if it contains `.changeset/*.md` files in its diff. The `has_changesets` detection step is the only condition. Simplifies the release engineer's job — no more remembering to label.
