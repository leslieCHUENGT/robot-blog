import { renderMarkdown } from './markdown-renderer';

export interface Message {
  id: string;
  role: string;
  content: string;
  timestamp?: number;
}

export const MessageList = ({ messages }: { messages: Message[] }) => {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-2xl font-bold">
        {`我知道他的很多事情，可以来问我哦~`}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((item) => (
        <div
          key={item.id}
          className={`flex ${item.role !== 'user' ? 'justify-start' : 'justify-end'}`}>
          <div
            className={`rounded bg-gray-200 p-3 ${
              item.role !== 'user' ? 'mr-auto ml-0 min-h-[48px]' : 'mr-0 ml-auto'
            }`}>
            {item.role !== 'user' && !item.content ? (
              <div>Loading...</div>
            ) : item.role !== 'user' ? (
              renderMarkdown(item.content)
            ) : (
              item.content
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
