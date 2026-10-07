---
"@deessejs/errors": minor
---

Resync staging with main after #91 was merged ahead of the 1.4.0 release. The class-based internals refactor (`ErrorInstanceImpl` private class) was superseded by 1.4.0's function-based implementation with RFC 0001 Standard Schema validation, `ArgsValidationError`, and `message-as-function` mode. The structural improvement (instance instanceof Error, real class methods) is preserved in spirit through RFC 0001's type-level guarantees. Closes #88.
