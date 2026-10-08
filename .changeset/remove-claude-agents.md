---
"@deessejs/errors": patch
---

chore: remove internal agent definitions and cross-session memory

Deletes `.claude/agents/` (seven agent definitions) and `.claude/agent-memory/` (six cross-session memory stores) that were committed historically for an internal agent tooling experiment. The published artifact, public API, and runtime behavior are unchanged. Preserved `.claude/settings.local.json` and `.claude/skills/`.
