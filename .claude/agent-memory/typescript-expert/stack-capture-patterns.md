---
name: stack-capture-patterns
description: Senior to Expert level patterns for stack trace handling
type: reference
---

# Stack Capture Patterns: Senior to Expert Level

## Senior Pattern: String-Based Stack Filtering

Clean up stack traces by filtering internal frames.

```typescript
const STACK_FRAME_PATTERN = /^\s+at\s+/i;

const captureStack = (message: string): string => {
  const stack = new Error().stack || '';

  const lines = stack.split('\n');
  const cleanedLines: string[] = [`Error: ${message}`];

  // Find start index (skip "Error: message" line)
  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (STACK_FRAME_PATTERN.test(lines[i])) {
      startIndex = i;
      break;
    }
  }

  // Filter internal frames
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('node_modules')) continue;
    if (line.includes('__vite')) continue;
    cleanedLines.push(line);
  }

  return cleanedLines.join('\n');
};
```

### Key Senior Points

1. **DX Focus**: Hide `node_modules/@deessejs` and `__vite` to show user-relevant frames
2. **Environmental Awareness**: Document V8-specific nature of `Error.stack`
3. **Defensive Programming**: Fallback to `|| ''` when stack is undefined
4. **Maintainable**: Use constants for regex patterns

---

## Expert Pattern: `Error.captureStackTrace` (V8 Only)

Use V8's built-in mechanism for faster, cleaner stack capture.

```typescript
const captureStack = (message: string): string => {
  // Check for V8 environment
  if (typeof Error.captureStackTrace === 'function') {
    const container: { stack: string } = { stack: '' };

    // Tells V8 to capture stack, stopping at captureStack function
    Error.captureStackTrace(container, captureStack);

    const cleanedStack = `Error: ${message}\n` + container.stack
      .split('\n')
      .slice(1) // Remove captureStack frame
      .filter(line =>
        !line.includes('node_modules') &&
        !line.includes('__vite')
      )
      .join('\n');

    return cleanedStack;
  }

  // Fallback for non-V8 environments
  return `Error: ${message}`;
};
```

### Why Expert Level

- **Performance**: Native V8 handling vs string manipulation
- **Cleaner output**: V8 controls frame inclusion precisely
- **Same filtering**: Still provides DX-focused output

---

## Summary: When to Use Which

| Level | Method | When |
|:---|:---|:---|
| Senior | String manipulation | Cross-environment compatibility |
| Expert | `Error.captureStackTrace` | V8-only, performance-critical |
| Always | Filter internal frames | End-user DX priority |

---

## Key Takeaways

1. **DX First**: Stack traces should point to user code, not library internals
2. **Document Boundaries**: `Error.stack` is V8-specific, document limitations
3. **Defensive**: Always handle `undefined` stack cases
4. **Expert Option**: Use native APIs when available for better performance
