---
name: fumadocs-meta-json
description: meta.json configuration for navigation tree in Fumadocs
type: reference
---

# Fumadocs meta.json Reference

**Location:** `content/docs/<folder>/meta.json`

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Display name in sidebar |
| `icon` | string | Lucide icon name |
| `defaultOpen` | boolean | Open folder by default |
| `collapsible` | boolean | Allow folder collapse (default: true) |
| `pages` | string[] | Custom page ordering |
| `pagesIndex` | string | Index page path or link |

## pages[] Item Types

| Type | Syntax | Description |
|------|--------|-------------|
| Path | `"./path/to/page"` | Path to page or folder |
| Separator | `"---Label---"` | Section separator |
| Link | `"[Text](url)"` | Internal link |
| External | `"external:[Text](url)"` | External link with icon |
| Rest | `"..."` | Include remaining pages (alphabetical) |
| Reversed | `"z...a"` | Include remaining pages (reversed) |
| Extract | `"...folder"` | Extract items from subfolder |
| Except | `"!item"` | Exclude from `...` or `z...a` |

## Slug Conventions

| Path Pattern | Slugs |
|--------------|-------|
| `./dir/page.mdx` | `['dir', 'page']` |
| `./dir/index.mdx` | `['dir']` |
| `./(group)/page.mdx` | `['page']` (group not in slug) |

## Example

```json
{
  "title": "Guide",
  "defaultOpen": true,
  "pages": [
    "index",
    "getting-started",
    "---API Reference---",
    "...",
    "!deprecated-page",
    "[GitHub](https://github.com/...)"
  ]
}
```

## Root Folder (meta.json with `root: true`)

Marks folder as root - other folders hidden in sidebar.

```json
{
  "title": "Framework",
  "root": true
}
```

Renders as Layout Tabs in Fumadocs UI.