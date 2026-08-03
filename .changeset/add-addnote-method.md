---
"@deessejs/errors": minor
---

Add `ErrorInstance.addNote(note)` for attaching runtime context to errors (PEP 678, mirrors Python 3.11). Returns the instance for chaining. The `notes: string[]` property was already implemented; the method was missing despite being documented. Closes #29.
