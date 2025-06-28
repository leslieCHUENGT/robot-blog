import { full as emoji } from "markdown-it-emoji";
import MarkdownIt from "markdown-it";

export const MarkdownItProcess = (initialMarkdown: string) => {
  let error = null;

  const md = MarkdownIt({
    html: true,
    breaks: true,
  }).use(emoji);
  

  const defaultRender = function (tokens: any, idx: number, options: any, env: any, self: any) {
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.table_open = (tokens: any, idx: number, options: any, env: any, self: any) => {
    // 在表格前插入 <div className="table-container">
    return (
      '<div className="table-container">\n' +
      defaultRender(tokens, idx, options, env, self)
    );
  };

  md.renderer.rules.table_close = (tokens: any, idx: number, options: any, env: any, self: any) => {
    // 在表格后插入 </div>
    return defaultRender(tokens, idx, options, env, self) + "</div>\n";
  };

  md.renderer.rules.fence = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx];
    return `<div className="code-block-container"><pre><code>${md.utils.escapeHtml(
      token.content
    )}</code></pre></div>`;
  };

  md.renderer.rules.code_inline = (tokens: any, idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx];
    return `<div className="code-block-container"><code>${md.utils.escapeHtml(
      token.content
    )}</code></div>`;
  };

  const getHtml = () => {
    try {
      initialMarkdown = initialMarkdown.replace(/`/g, "");
      let htmlContent = md.render(initialMarkdown);
      htmlContent = htmlContent.replace(/\*\*/g, "");
      return htmlContent;
    } catch (err) {
      error = err;
      return InitMarkdown(initialMarkdown);
    } finally {
      // console.timeEnd("Markdown Render Time");
    }
  };

  return {
    html: getHtml(),
    error,
  };
}


const InitMarkdown = (markdown: string) => {
  // 保留超链接的描述文字，去掉链接部分 [text](url)
  markdown = markdown.replace(/\[([^\]]+)\]\(.*?\)/g, "$1");

  // 去除图片链接 ![image](url)（不保留任何内容）
  markdown = markdown.replace(/!\[.*?\]\(.*?\)/g, "");

  // 去除星号 (*)，包括加粗和斜体
  markdown = markdown.replace(/\*/g, "");

  // 去除井号 (#)，通常用于标题
  markdown = markdown.replace(/#/g, "");

  // 去除短横线 (-)，通常用于列表项或分割线
  markdown = markdown.replace(/-/g, "");

  // 去除表情符号 :emoji:
  markdown = markdown.replace(/:[a-zA-Z0-9_]+:/g, "");

  return markdown;
};
