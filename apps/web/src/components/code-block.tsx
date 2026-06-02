import { codeToHtml } from 'shiki';

interface CodeBlockProps {
	code: string;
	language?: string;
	title?: string;
}

export async function CodeBlock({
	code,
	language = 'typescript',
	title,
}: CodeBlockProps) {
	const html = await codeToHtml(code, {
		lang: language,
		themes: {
			light: 'github-light',
			dark: 'github-dark',
		},
	});

	return (
		<div className="h-full w-full overflow-hidden rounded-none border border-fd-border">
			{title && (
				<div className="flex items-center gap-1.5 px-3 py-2 border-b border-fd-border bg-fd-secondary">
					<div className="h-2.5 w-2.5 rounded-full bg-fd-destructive" />
					<div className="h-2.5 w-2.5 rounded-full bg-fd-primary" />
					<div className="h-2.5 w-2.5 rounded-full bg-fd-accent" />
					<span className="ml-2 font-mono text-[13px] text-fd-muted-foreground">
						{title}
					</span>
				</div>
			)}
			<div className="[&_pre]:!bg-background [&_pre]:p-6 [&_pre]:m-0" dangerouslySetInnerHTML={{ __html: html }} />
		</div>
	);
}