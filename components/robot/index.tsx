'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useFullAIApiStore } from '@/context/app-provider';
import { MessageRole } from '@/context/app-store';
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
    isResponsing,
    isVisible,
    isFetchInterface,
    addMessage,
    updateAssistantMessage,
    setResponsing,
    setVisible,
    setFetchInterface,
    updateAssistantStatus
  } = useFullAIApiStore();

  const [input, setInput] = useState('');

  // 使用 useRef 创建打字机管理器实例
  const messageManager = useRef<TypeWriterManage>(
    new TypeWriterManage(
      18, // 打字机效果速度
      (message: string) => {
        updateAssistantMessage(message);
      },
      () => {}
    )
  );

  // 处理请求完成（成功或失败）
  const handleRequestCompletion = useCallback(() => {
    setResponsing(false);
    setFetchInterface(false);
  }, []);

  // 处理发送消息
  const handleSend = () => {
    // 防止重复请求
    if (isFetchInterface) return;

    const content = input.trim();
    if (!content) return;

    // 创建用户消息
    const userMessage = {
      id: generateUniqueId(),
      role: MessageRole.User,
      content
    };

    // 创建AI回复消息（加载中状态）
    const assistantMessage = {
      id: generateUniqueId(),
      role: MessageRole.Assistant,
      content: ''
    };

    // 合并状态更新，减少重新渲染
    setFetchInterface(true);
    addMessage(userMessage);
    addMessage(assistantMessage);
    setInput('');

    // 发送请求
    streamFetchApp.current?.sendStreamRequest({
      question: content,
      model: 'Qwen/QwQ-32B'
    });
  };

  // 处理停止响应
  const handleStop = () => {
    streamFetchApp.current?.disconnect(); // 中止请求

    // 已经响应了
    if (isResponsing) {
      setResponsing(false);
      updateAssistantStatus({ isStreamStop: true, isFastStop: false, isError: false });
    } else if (!isResponsing) {
      // 未响应
      updateAssistantStatus({ isFastStop: true, isStreamStop: false, isError: false });
    }

    setFetchInterface(false);
    messageManager.current?.immediatelyStop();
  };

  const handleRequestMessage = (data: any) => {
    // 正在响应
    if (!isResponsing) {
      setResponsing(true);
      setFetchInterface(true);
    }

    if (data && data?.done) {
      // 流式结束
      messageManager.current.setOnComplete(() => {
        handleRequestCompletion();
      });
      return;
    }

    if (data && data?.content) {
      const { content } = data;
      messageManager.current?.add(content);
    }
  };

  // 使用 useRef 创建流请求客户端实例
  const streamFetchApp = useRef<StreamFetchClient>(
    new StreamFetchClient(
      {
        baseUrl: '/api/chat',
        headers: {
          'Content-Type': 'application/json'
        },
        overErrorTimer: 60 * 1000 // 流式中间超时时间，单位为毫秒
      },
      {
        onMessage: handleRequestMessage,
        onClose: () => {},
        onServerError: handleRequestCompletion,
        onStreamConnectionError: handleRequestCompletion,
        onConnectionError: handleRequestCompletion,
        onParseError: handleRequestCompletion
      }
    )
  );

  // 组件卸载时清理资源
  useEffect(() => {
    const currentStreamFetchApp = streamFetchApp.current;
    const currentMessageManager = messageManager.current;
    return () => {
      currentStreamFetchApp?.disconnect();
      currentMessageManager?.immediatelyStop();
    };
  }, []);

  return isVisible ? (
    <div
      className={cn(
        'no-scrollbar shadow-card absolute top-30 right-0 z-2 flex h-160 w-200 flex-col rounded-2xl p-4 pt-20 transition-all'
      )}>
      <div className="absolute top-4 flex w-192 items-center justify-between">
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
          setInput(v);
        }}
        onSubmit={handleSend}
        onStop={handleStop}
        loading={isFetchInterface}
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
