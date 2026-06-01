# Implementation Tasks

## Overview

This folder contains all implementation tasks for v1.0.0 Core Foundation.

## Task List

| ID | Task | Status |
|----|------|--------|
| 01 | error() factory | ✅ Complete |
| 02 | raise() function | ✅ Complete |
| 03 | is() function | ✅ Complete |
| 04 | inherits option | ✅ Complete |
| 05 | .from() method | ✅ Complete |
| 06 | causes() function | ✅ Complete |
| 07 | message templates | ✅ Complete |
| 08 | ErrorInstance properties | ✅ Complete |

## Execution Order

Tasks should be implemented in this order:

1. **Task 01: error() factory** — Core building block
2. **Task 08: ErrorInstance properties** — Foundation for all errors
3. **Task 04: inherits option** — Depends on error() factory
4. **Task 03: is() function** — Depends on inherits
5. **Task 05: .from() method** — Adds chaining to error instances
6. **Task 06: causes() function** — Depends on .from()
7. **Task 07: message templates** — Enhances error() factory
8. **Task 02: raise() function** — Can be implemented anytime, tested last

## API Surface

After all implementation tasks:

```typescript
// src/index.ts exports
export { error } from './error';
export { raise } from './raise';
export { is } from './is';
export { causes } from './causes';

export type { ErrorInstance, ErrorFactory, ErrorConfig } from './types';
```