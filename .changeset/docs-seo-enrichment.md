---
'@deessejs/errors': patch
---

Refresh the README and package.json metadata for the npm listing.

README:
- Adopt the shared ecosystem layout (badges block, What is included table, Quick start, Compatibility, Project structure, Publishing, Architecture notes, Contributing, Acknowledgements).
- Credit `deessejs/package-template` and `deessejs/fp` in the new Acknowledgements section.
- Surface the `addNote()` (PEP 678), `raise()`, `causes()`, and the `Result`/`Try` interop story in both the root and the package README.

Package metadata:
- Replace the placeholder description with a more searchable summary (Python-style, ESM, `@deessejs/fp` interop).
- Add `bugs.url`, `files`, `sideEffects: false`, `engines.node`, and `funding` (GitHub Sponsors).
- Refresh `keywords`: drop `npm-package`, add `standard-schema`, `esm`, `monorepo`.
