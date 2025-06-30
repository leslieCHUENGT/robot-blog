import { useRef, useEffect } from 'react';
import { MessageList } from './message-list';
import type { Message } from '@/context/app-store';

interface ChatContainerProps {
  messages: Message[];
}

export const ChatContainer = ({ messages }: ChatContainerProps) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroll = () => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    };

    const rafId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(rafId);
  }, [messages]);

  return (
    <div
      ref={chatContainerRef}
      className="no-scrollbar flex h-100 w-full flex-col overflow-auto">
      {/* 这里假设 MessageList 已经修改 */}
      <MessageList messages={messages} />
    </div>
  );
};
