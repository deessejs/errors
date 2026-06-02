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
		<figure className="relative my-4 border border-fd-border rounded-xl overflow-hidden text-sm not-prose">
			{title ? (
				<div className="flex items-center gap-2 h-9.5 border-b border-fd-border bg-fd-secondary px-4 text-fd-muted-foreground">
					<span className="flex-1 truncate font-mono text-[13px]">{title}</span>
				</div>
			) : null}
			<div
				className="[&_pre]:!bg-transparent [&_pre]:p-6 [&_pre]:m-0"
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</figure>
	);
}