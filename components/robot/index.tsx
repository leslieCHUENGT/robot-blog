'use client';
import { useEffect, useRef, useState } from 'react';
import { useFullAIApiStore } from '@/context/app-provider';
import { StreamFetchClient, TypeWriterManage, generateUniqueId } from '@/lib';
import { ChatContainer } from './chat-container';
import { ChatInput } from './chat-input';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function RobotPage() {
  // 提取需要的状态和操作
  const {
    messages,
    input,
    isRequesting,
    isVisible,
    setInput,
    addMessage,
    updateAssistantMessage,
    setRequesting,
    setVisible
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
    setVisible(true);

    // 发送请求
    streamFetchApp.current?.sendStreamRequest({
      question: content,
      model: 'Qwen/QwQ-32B',
      id: assistantMessageId
    });
    setValue('');
  };

  const [value, setValue] = useState<string>('');

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
        setVisible(false);
        setRequesting(false);
      },
      onServerError: (lastData: any) => {
        console.error('Server error:', lastData);
        setVisible(false);
        setRequesting(false);
      },
      onStreamConnectionError: (lastData: any) => {
        console.error('Stream connection error:', lastData);
        setVisible(false);
        setRequesting(false);
      },
      onConnectionError: (lastData: any) => {
        console.error('Connection error:', lastData);
        setVisible(false);
        setRequesting(false);
      },
      onParseError: (lastData: any) => {
        console.error('Parse error:', lastData);
        setVisible(false);
        setRequesting(false);
      }
    }
  );

  return isVisible ? (
    <div
      className={cn(
        'no-scrollbar shadow-card absolute top-24 right-0 z-2 flex h-180 w-120 flex-col rounded-2xl p-4 pt-20 transition-all'
      )}>
      <div className="absolute top-4 flex w-112 items-center justify-between">
        <Image src="/icons/ai-logo.svg" alt="logo" width={30} height={30}></Image>{' '}
        <Button
          size="icon"
          onClick={() => {
            setVisible(false);
          }}>
          <X className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all" />
        </Button>
      </div>

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
  ) : (
    <Image
      className="theme-switcher-active--pinks absolute top-7 right-[-20px] z-999 cursor-pointer"
      onClick={() => {
        setVisible(true);
      }}
      src="/icons/ai-logo.svg"
      alt="logo"
      width={30}
      height={30}></Image>
  );
}
