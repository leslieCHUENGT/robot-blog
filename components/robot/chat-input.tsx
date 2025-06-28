'use client';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const ChatInput = ({ value, onChange, onSubmit, loading }: ChatInputProps) => {
  return (
    <div className="absolute right-0 bottom-2 z-10 flex w-full items-center rounded-lg  p-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit();
          }
        }}
        className="my-sender flex-1 outline-none focus:ring-0"
        style={{
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="ml-2 rounded bg-blue-500 px-4 py-2 text-white">
        {loading ? '发送中...' : '发送'}
      </button>
    </div>
  );
};
