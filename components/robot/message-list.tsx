'use client';
import { memo, useMemo } from 'react';
import { renderMarkdown } from './markdown-renderer';

export interface Message {
  id: string;
  role: string;
  content: string;
  timestamp?: number; // 添加时间戳用于排序
}

// 使用React.memo防止不必要的重渲染
export const MessageList = memo(({ messages }: { messages: Message[] }) => {
  // 使用useMemo缓存处理后的消息列表
  const processedMessages = useMemo(() => {
    // 复制原数组避免修改原始数据
    return [...messages].map((item) => ({
      ...item
    }));
  }, [messages]);

  // 缓存空状态提示
  const emptyState = useMemo(
    () => (
      <div className="flex h-full items-center justify-center">您有什么想问我的吗？</div>
    ),
    []
  );

  // 缓存消息渲染逻辑
  const renderMessages = useMemo(
    () => (
      <div className="space-y-4">
        {processedMessages.map((item) => (
          <div
            key={item.id}
            className={`flex ${item.role !== 'user' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`rounded bg-gray-200 p-3 ${item.role !== 'user' ? 'mr-auto ml-0' : 'mr-0 ml-auto'}`}>
              {item.role !== 'user' ? renderMarkdown(item.content) : item.content}
            </div>
          </div>
        ))}
      </div>
    ),
    [processedMessages]
  );

  return messages.length > 0 ? renderMessages : emptyState;
});
