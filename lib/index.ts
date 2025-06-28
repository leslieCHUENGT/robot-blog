export {
  StreamFetchClient,
  CacheManager,
  MessageProcessor,
  TypeWriterManage,
  MarkdownItProcess,
} from './stream'

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...args: Parameters<typeof clsx>) => {
  return twMerge(clsx(args));
};
export const generateUniqueId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

