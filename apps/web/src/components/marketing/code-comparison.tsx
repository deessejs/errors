import { CodeBlock } from '@/components/code-block';
import { CodeComparisonTabs } from './code-comparison-tabs';
import { COMPARISON_EXAMPLES } from './examples';

/** Server-rendered snippets are passed through the client tab panel as slots. */
export function CodeComparison() {
  return (
    <CodeComparisonTabs
      examples={COMPARISON_EXAMPLES.map((example) => ({
        id: example.id,
        label: example.label,
        description: example.description,
        before: <CodeBlock code={example.before} title="before.ts" unframed />,
        after: <CodeBlock code={example.after} title="with @deessejs/errors" unframed />,
      }))}
    />
  );
}
