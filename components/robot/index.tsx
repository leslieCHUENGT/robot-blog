'use client';
import { useEffect, useRef, useState } from 'react';
import { useFullAIApiStore } from '@/context/app-provider';
import { StreamFetchClient, TypeWriterManage, generateUniqueId } from '@/lib';
import { ChatContainer } from './chat-container';
import { ChatInput } from './chat-input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function RobotPage() {
  // 提取需要的状态和操作
  const {
    messages,
    input,
    isRequesting,
    isStreaming,
    setInput,
    addMessage,
    updateAssistantMessage,
    setRequesting,
    setStreaming
  } = useFullAIApiStore();

  const messageManager = useRef<TypeWriterManage>(null);
  const streamFetchApp = useRef<StreamFetchClient | null>(null);

  // 处理发送消息
  const handleSend = () => {
    const content = input.trim();
    if (!content || isRequesting) return;

    // 创建用户消息
    const userMessageId = generateUniqueId();
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content
    };

    // 添加用户消息到状态
    addMessage(userMessage as any);
    setInput('');

    // 创建AI回复消息（加载中状态）
    const assistantMessageId = generateUniqueId();
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    };

    // 添加AI消息到状态
    addMessage(assistantMessage as any);
    setRequesting(true);
    setStreaming(true);

    // 发送请求
    streamFetchApp.current?.sendStreamRequest({
      question: content,
      model: 'Qwen/QwQ-32B',
      id: assistantMessageId
    });
    setValue('');
  };

  const [value, setValue] = useState<string>('');

  // 初始化问候语
  useEffect(() => {
    messageManager.current = new TypeWriterManage(
      18, // 打字机效果速度
      (message: string) => {
        updateAssistantMessage(message);
      },
      () => {}
    );

    streamFetchApp.current = new StreamFetchClient(
      {
        baseUrl: '/api/chat',
        headers: {
          'Content-Type': 'application/json'
        },
        overErrorTimer: 60 * 1000 // 流式中间超时时间，单位为毫秒
      },
      {
        onMessage: (data) => {
          // 解析流式消息
          if (data && data?.content) {
            const { content } = data;
            messageManager.current?.add(content);
          }
        },
        onClose: (lastData: any) => {
          setStreaming(false);
          setRequesting(false);
        },
        onServerError: (lastData: any) => {
          console.error('Server error:', lastData);
          setStreaming(false);
          setRequesting(false);
        },
        onStreamConnectionError: (lastData: any) => {
          console.error('Stream connection error:', lastData);
          setStreaming(false);
          setRequesting(false);
        },
        onConnectionError: (lastData: any) => {
          console.error('Connection error:', lastData);
          setStreaming(false);
          setRequesting(false);
        },
        onParseError: (lastData: any) => {
          console.error('Parse error:', lastData);
          setStreaming(false);
          setRequesting(false);
        }
      }
    );
  }, []);

  return (
    <div
      className={cn(
        'no-scrollbar absolute top-30 right-[-500px] z-999 flex h-200 w-120 flex-col rounded-2xl p-4 pt-16 shadow-xl transition-all'
      )}>
      <ChatContainer messages={messages} />
      <ChatInput
        value={input}
        onChange={(v: string) => {
          setValue(v);
          setInput(v);
        }}
        onSubmit={handleSend}
        loading={isRequesting}
      />
    </div>
  );
}
