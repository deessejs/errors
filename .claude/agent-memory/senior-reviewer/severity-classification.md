---
name: severity-classification
description: Severity levels for code review - from Critical to Nice-to-have
type: project
---

# Severity Classification

Use these levels when classifying issues in reviews. Order matters: **Critical first, Nice-to-have last**.

## Critical (Blocking)

**The PR cannot merge until fixed.**

- Logic bugs that cause runtime errors or incorrect behavior
- Type mismatches that break the public API
- Missing required functionality explicitly in scope
- Security vulnerabilities
- Data corruption possibilities
- API surface changes that break backward compatibility

## Important (Should Fix)

**Strongly recommended to fix before merge, but not blocking.**

- Unhandled edge cases that could cause subtle bugs
- Missing error handling in error paths
- Performance issues that affect common use cases
- Inconsistent naming with existing codebase
- Missing JSDoc on public APIs
- Tests that don't cover the happy path or common edge cases
- Memory leaks or resource management issues

## Minor (Nice to Have)

**Worth mentioning but PR can merge without them.**

- Code style preferences not enforced by linter
- Minor code duplication (can be refactored later)
- Comments that could be clearer
- Minor performance optimizations
- Future extensibility suggestions
- Documentation improvements

## Nice-to-have (Consider Later)

**Post-merge improvements, not worth blocking.**

- "You could also consider X"
- Refactoring that would improve maintainability
- Additional test coverage for edge cases
- Tooling improvements
- Dependency updates

---

## Decision Flow

```
Is it a BUG or BREAKING CHANGE?
  → YES: Critical (blocking)
  → NO: Continue

Is it MISSING from the SCOPE?
  → YES: Check if intentional, if not flag as Important
  → NO: Continue

Does it AFFECT USERS directly?
  → YES: Important
  → NO: Minor or Nice-to-have

Is it ONLY your preference?
  → YES: Don't mention
  → NO: Classify appropriately
```