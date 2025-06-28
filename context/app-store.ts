import { createStore } from "zustand/vanilla";
import { produce } from "immer";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type AppState = {
  messages: Message[]; // 对话历史
  input: string; // 当前输入内容
  isRequesting: boolean; // 是否正在请求接口
  isStreaming: boolean; // 是否正在流式响应
};

export type AppActions = {
  setInput: (input: string) => void; // 更新输入内容
  addMessage: (message: Message) => void; // 添加消息
  updateAssistantMessage: (content: string) => void; // 更新AI消息
  clearMessages: () => void; // 清空消息
  setRequesting: (isRequesting: boolean) => void;
  setStreaming: (isStreaming: boolean) => void;
};

export type AppStore = AppState & AppActions;

export const defaultInitState: AppState = {
  messages: [],
  input: "",
  isRequesting: false,
  isStreaming: false,
};

export const initAppStore = (): AppState => {
  return defaultInitState;
};

export const createAppStore = (initState: AppState = defaultInitState) => {
  return createStore<AppStore>()((set) => ({
    ...initState,
    // 更新输入内容
    setInput: (input) => {
      set(
        produce((draft: AppState) => {
          draft.input = input;
        })
      );
    },
    // 添加消息
    addMessage: (message) => {
      set(
        produce((draft: AppState) => {
          draft.messages.push(message);
        })
      );
    },
    // 更新AI消息（用于流式响应）
    updateAssistantMessage: (content) => {
      set(
        produce((draft: AppState) => {
          const lastLen = draft.messages.length - 1;
          const lastMessage = draft.messages[lastLen];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content += content;
          }
        })
      );
    },
    // 清空消息
    clearMessages: () => {
      set(
        produce((draft: AppState) => {
          draft.messages = [];
        })
      );
    },
    // 设置请求状态
    setRequesting: (isRequesting) => {
      set(
        produce((draft: AppState) => {
          draft.isRequesting = isRequesting;
          // 如果停止请求，也停止流式响应
          if (!isRequesting) {
            draft.isStreaming = false;
          }
        })
      );
    },
    // 设置流式响应状态
    setStreaming: (isStreaming) => {
      set(
        produce((draft: AppState) => {
          draft.isStreaming = isStreaming;
          // 如果开始流式响应，也设置请求状态
          if (isStreaming) {
            draft.isRequesting = true;
          }
        })
      );
    },
  }));
};
