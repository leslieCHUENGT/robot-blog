'use client';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export const ChatInput = ({ value, onChange, onSubmit, loading }: ChatInputProps) => {
  return (
    <div className="absolute right-0 bottom-10 z-9999 w-full rounded-lg p-10 pt-4 pb-4">
      <div className="flex w-full flex-col items-center justify-center gap-1">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSubmit();
              onChange('');
            }
          }}
          placeholder="您有什么想问我的吗？"
          className="max-h-20 min-h-10 w-full rounded-lg border"
          style={{
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}
        />
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="w-full rounded px-4 py-2 text-white">
          {loading ? '回答...' : '发送'}
        </Button>
      </div>
    </div>
  );
};
