import { highlightCode } from '@/lib/highlight';

interface CodeBlockServerProps {
	code: string;
	language: string;
	title?: string;
}

export async function CodeBlockServer({
	code,
	language,
	title,
}: CodeBlockServerProps) {
	const html = await highlightCode(code, language);

	return (
		<figure className="shiki relative my-4 border bg-fd-card rounded-xl overflow-hidden text-sm not-prose">
			{title ? (
				<div className="flex items-center gap-2 h-9.5 border-b border-fd-border px-4 text-fd-muted-foreground">
					<span className="flex-1 truncate font-mono text-[13px]">{title}</span>
				</div>
			) : null}
			<div dangerouslySetInnerHTML={{ __html: html }} />
		</figure>
	);
}