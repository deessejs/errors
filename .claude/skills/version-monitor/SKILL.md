---
name: version-monitor
description: Check for outdated npm packages in the monorepo
---

## Outdated packages

Run this command to check for outdated packages:

```bash
pnpm outdated --recursive
```

## Output columns

| Column | Meaning |
|--------|---------|
| Package | Dependency name |
| Current | Currently installed version |
| Wanted | Max version allowed by semver range (^, ~, etc.) |
| Latest | Most recent release on npm |

## Interpretation guide

| Status | Meaning | Action |
|--------|---------|--------|
| **Wanted = Latest** | Up to date within semver | None |
| **Current < Wanted** | Update available within semver range | Generally safe to update |
| **Wanted < Latest** | Major version available | Review changelog for breaking changes |

## Safe update commands

### Update specific package
```bash
pnpm update <package-name>
# Example: pnpm update lodash
```

### Update all minor/patch versions
```bash
pnpm update
# Respects semver ranges (^4.1.7 → won't jump to 5.0.0)
```

### Force latest version
```bash
pnpm update --latest
# May introduce breaking changes — review first
```

## Workflow recommendation

1. Run this skill to see which packages need attention
2. For major updates: check changelog with `pnpm view <package> changelog`
3. Update one package at a time and run tests
4. Commit before updating to preserve working state

## Filter by package

To check a specific package:
```bash
pnpm outdated --filter <package-name>
```