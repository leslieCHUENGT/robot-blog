'use client';
import React, { FC } from 'react';
import renderMarkdown from './markdown-renderer';
import type { Message } from '@/context/app-store';

// 消息组件样式配置
const messageStyles = {
  container: 'flex',
  user: {
    container: 'justify-end',
    message: 'mr-0 ml-auto'
  },
  assistant: {
    container: 'justify-start',
    message: 'mr-auto ml-0 min-h-[48px]'
  },
  content: 'rounded bg-gray-200 p-3'
};

// 助手消息渲染组件
const AssistantMessage: FC<{
  content: string;
  isStreamStop: boolean;
  isFastStop: boolean;
  isError: boolean;
}> = React.memo(({ content, isStreamStop, isFastStop, isError }) => {
  console.log('助手消息', content);
  AssistantMessage.displayName = 'AssistantMessage';

  if (isFastStop) {
    return <div>已停止生成</div>;
  }

  // 处理各种状态下的显示
  if (!content) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div className="text-red-500"> [发生错误] </div>;
  }

  if (isStreamStop) {
    return (
      <div>
        {renderMarkdown(content)}
        <span className="text-gray-400"> [已停止生成]</span>
      </div>
    );
  }

  return renderMarkdown(content);
});

// 用户消息渲染组件
const UserMessage: FC<{ content: string }> = React.memo(({ content }) => {
  console.log('用户消息', content);
  UserMessage.displayName = 'UserMessage';
  return content;
});

// 单个消息渲染组件
const MessageItem: FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const roleStyle = isUser ? messageStyles.user : messageStyles.assistant;
  const MessageComponent = isUser ? UserMessage : AssistantMessage;

  return (
    <div className={`${messageStyles.container} ${roleStyle.container}`} key={message.id}>
      <div className={`${messageStyles.content} ${roleStyle.message}`}>
        <MessageComponent
          content={message.content}
          isStreamStop={!!message?.isStreamStop}
          isFastStop={!!message?.isFastStop}
          isError={!!message?.isError}
        />
      </div>
    </div>
  );
};

// 消息列表组件
export const MessageList: FC<{ messages: Message[] }> = ({ messages }) => {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-2xl font-bold">
        {`我知道他的很多事情，可以来问我哦~`}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
};
