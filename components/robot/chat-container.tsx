import { useRef, useEffect } from 'react';
import { MessageList } from './message-list';

interface ChatContainerProps {
  messages: any[];
}

export const ChatContainer = ({ messages }: ChatContainerProps) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到聊天底部
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 监听消息变化，滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div
      ref={chatContainerRef}
      className="flex h-100 w-full flex-col overflow-auto no-scrollbar">
      {/* 这里假设 MessageList 已经修改 */}
      <MessageList messages={messages} />
    </div>
  );
};
