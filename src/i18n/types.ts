import type { en } from "./locales/en";

type Source = typeof en;

/** 所有语言的词典类型：key 与英文一致，函数型消息的参数一致 */
export type Messages = {
  [K in keyof Source]: Source[K] extends (...args: infer A) => string ? (...args: A) => string : string;
};

export type MessageKey = keyof Messages;

export type MessageArgs<K extends MessageKey> = Messages[K] extends (...args: infer A) => string
  ? A
  : [];
