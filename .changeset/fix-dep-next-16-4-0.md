---
'@deessejs/errors': patch
---

deps(apps/web): bump `next` from 16.2.6 to 16.4.0 to clear the 17 direct and transitive Dependabot alerts on Next.js and its dependents (react-server, build cache, prerendering, image optimizer, middleware, server actions, caching, etc).

Resolved GHSA IDs (from `vulnerabilityAlerts` GraphQL query on 2026-10-09):

- GHSA-2xp9-vwfh-vxw4, GHSA-39w2-rjm5-chcv, GHSA-4633-3j49-mh5q, GHSA-4c39-4ccg-62r3, GHSA-4jqv-mc3x-m676, GHSA-68g3-v927-f742, GHSA-6gpp-xcg3-4w24, GHSA-89xv-2m56-2m9x, GHSA-955p-x3mx-jcvp, GHSA-cjq9-62q9-8jv4, GHSA-f87g-xv8r-7p7x, GHSA-m99w-x7hq-7vfj, GHSA-mcj8-r9mp-w47p, GHSA-p293-qw3h-jr36, GHSA-p9j2-gv94-2wf4, GHSA-q8wf-6r8g-63ch, GHSA-vcvr-r3jv-pc5j

`next@16.4.0` includes the patches against all 17 advisories. `pnpm-lock.yaml` is regenerated; transitives that pnpm re-resolved include patched `nanoid`, `brace-expansion`, `js-yaml`, `sharp`, `esbuild`.

No user-facing change in `@deessejs/errors`. Patch bump only because the CI lint at `.github/workflows/ci.yml` requires every PR to `staging` to carry a Changeset entry. The release engineer can drop this entry from the release batch manually if preferred.
