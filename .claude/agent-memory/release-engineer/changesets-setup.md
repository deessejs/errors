---
name: changesets-setup
description: Changesets initialized for @deessejs/errors monorepo
type: reference
---

# Changesets Setup — @deessejs/errors

## Status

Changesets initialized on 2026-06-01.

## Configuration

Location: `.changeset/config.json`
- Access: restricted
- Base branch: main
- Changelog: `@changesets/cli/changelog`
- Commit: false (manual versioning)

## Key Commands

| Command | Purpose |
|---------|---------|
| `npx changeset` | Add changeset for changes |
| `npx changeset version` | Bump versions based on changesets |
| `npx changeset publish` | Publish to npm |

## Initial Changeset

Created `v1-0-0-core-foundation.md` for v1.0.0 major release.

## Changelog Strategy

- **Format**: Keep a Changelog (already in CHANGELOG.md)
- **Changesets integration**: `npx changeset version` auto-generates entries
- **CHANGELOG.md**: No manual editing needed — changesets updates it during release
- **Current state**: `[Unreleased]` section, ready for v1.0.0 entry

## Release Workflow

1. Make code changes
2. Run `npx changeset` to add a changeset (creates `.changeset/*.md`)
3. Commit the changeset file
4. When ready to release, run `npx changeset version`:
   - Updates CHANGELOG.md with entries from changeset files
   - Updates package.json with new version
   - Consumes (removes) changeset files
5. Commit the version bump
6. Run `npx changeset publish` to publish to npm

## Files Created

- `.changeset/config.json` — Configuration
- `.changeset/README.md` — Documentation
- `.changeset/v1-0-0-core-foundation.md` — Initial changeset