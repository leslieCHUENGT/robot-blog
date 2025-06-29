import { createStore } from "zustand/vanilla";
import { produce } from "immer";

type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

export enum MessageRole {
  User = 'user',
  Assistant = 'assistant'
}

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  isStreamStop?: boolean;
  isFastStop?: boolean;
  isError?: boolean;
};

type AssistantStatus = AtLeastOne<{
  isStreamStop: boolean;
  isFastStop: boolean;
  isError: boolean;
}>;

export type AppState = {
  messages: Message[]; // 对话历史
  isVisible: boolean; // 机器人是否可见
  isResponsing: boolean; // 是否接口正在响应
  isFetchInterface: boolean; // 是否已经请求接口
};

export type AppActions = {
  addMessage: (message: Message) => void; // 添加消息
  updateAssistantMessage: (content: string) => void; // 更新AI消息
  updateAssistantStatus: (status: AssistantStatus) => void; // 更新AI状态
  clearMessages: () => void; // 清空消息
  setResponsing: (isResponsing: boolean) => void; // 设置请求状态
  setVisible: (isVisible: boolean) => void; // 设置可见状态
  setFetchInterface: (isFetchInterface: boolean) => void; // 设置是否请求接口
};

export type AppStore = AppState & AppActions;

export const defaultInitState: AppState = {
  messages: [],
  isResponsing: false,
  isFetchInterface: false,
  isVisible: true,
};

export const initAppStore = (): AppState => {
  return defaultInitState;
};

export const createAppStore = (initState: AppState = defaultInitState) => {
  return createStore<AppStore>()((set) => ({
    ...initState,
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
          const lastMessage = draft.messages[draft.messages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content += content;
          }
        })
      );
    },
    //  更新AI状态
    updateAssistantStatus: (status: AssistantStatus) => {
      set(
        produce((draft: AppState) => {
          const lastMessage = draft.messages[draft.messages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            status.isStreamStop && (lastMessage.isStreamStop = status.isStreamStop);
            status.isFastStop && (lastMessage.isFastStop = status.isFastStop);
            status.isError && (lastMessage.isError = status.isError);
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
    setResponsing: (isResponsing) => {
      set(
        produce((draft: AppState) => {
          draft.isResponsing = isResponsing;
        })
      );
    },
    // 设置是否可见
    setVisible: (isVisible) => {
      set(
        produce((draft: AppState) => {
          draft.isVisible = isVisible;
        })
      );
    },
    // 设置是否已经请求接口
    setFetchInterface: (isFetchInterface) => {
      set(
        produce((draft: AppState) => {
          draft.isFetchInterface = isFetchInterface;
        })
      );
    },
  }));
};
