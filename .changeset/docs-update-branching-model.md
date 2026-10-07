---
"@deessejs/errors": patch
---

Update `CLAUDE.md` and `CONTRIBUTING.md` to reflect the actual branching model: devs land on `staging`, release engineer cherry-picks to `main` with a `version bump` label, hotfixes branch from `main`. The previous `main <- staging <- dev` model was documented but not practiced. Part of the release system plan (Phase 5).
