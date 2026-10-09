---
'@deessejs/errors': patch
---

chore(ci): document that `dependabot_security_updates` is now enabled at the repo level.

This PR does not change any user-facing behavior. It adds a header comment to `.github/dependabot.yml` so future contributors and audit readers see why security-update PRs will start flowing without any change to the YAML structure.

The actual setting change (turning on `security_and_analysis.dependabot_security_updates`) was performed at the repo admin level on 2026-10-09 during the bulk dependabot alert cleanup tracked in PRs #101–#104. The legacy PR stream (the `groups` block: weekly minor+patch bumps) is intentionally left unchanged — major bumps remain a manual action.

Release notes:
- No new `@deessejs/errors` version is needed for this PR — it changes CI configuration only. Patch bump entry on `@deessejs/errors` is included to satisfy the `ci.yml` lint that requires every PR to `staging` to carry a Changeset. The release engineer can drop this entry from the next release batch if preferred.
