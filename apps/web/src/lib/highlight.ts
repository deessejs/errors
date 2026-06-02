import { createHighlighter } from 'shiki';
import type { BundledLanguage } from 'shiki';

const highlighter = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: ['typescript', 'javascript', 'tsx', 'jsx', 'json', 'bash'],
});

export async function highlightCode(code: string, lang: string): Promise<string> {
	return highlighter.codeToHtml(code, {
		lang: lang as BundledLanguage,
		themes: {
			light: 'github-light',
			dark: 'github-dark',
		},
		transformers: [
			{
				pre(node) {
					delete node.properties.style;
				},
			},
		],
	});
}