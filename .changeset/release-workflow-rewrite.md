---
"@deessejs/errors": patch
---

Rewrite the release workflow to detect pending changesets explicitly and gate all publish steps on detection. Tag is now pushed at the version bump commit (not the merge commit), fixing the `@deessejs/errors@1.1.1` tag drift. Adds `dry_run` and `packages` inputs to `workflow_dispatch`. Part of the release system plan (Phase 3).
