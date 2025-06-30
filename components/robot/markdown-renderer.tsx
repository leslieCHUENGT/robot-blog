import { MarkdownItProcess } from '@/lib';

export default function renderMarkdown(content: string) {
  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: MarkdownItProcess(content).html }}
    />
  );
}
