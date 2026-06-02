import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
	themes: ['github-dark'],
	langs: ['typescript', 'javascript', 'tsx', 'jsx', 'json', 'bash'],
});

export async function highlightCode(code: string, lang: string): Promise<string> {
	return highlighter.codeToHtml(code, {
		lang,
		theme: 'github-dark',
	});
}