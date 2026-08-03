---
"@deessejs/errors": patch
---

Fix a bug in the release workflow: `git diff --quiet` (without `--cached`) compared the working tree to the index, which is in sync immediately after `git add -A`. This caused the version bump commit to be skipped, leaving the working tree in a `pnpm changeset publish`-able state but never pushed to `main`. Use `git diff --cached --quiet` so the comparison is against the last commit (HEAD), which is what we actually want.
