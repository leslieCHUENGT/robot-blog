import { MarkdownItProcess } from '@/lib';

export const renderMarkdown = (content: string) => {
  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: MarkdownItProcess(content).html }}
    />
  );
};
