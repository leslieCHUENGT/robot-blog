export class TypeWriterManage {
  private messageQueue: string[]; // 字符队列
  private delay: number; // 字符间隔时间
  private onMessage: (char: string) => void; // 单字回调
  private onFinish: () => void; // 完成回调
  private isProcessing: boolean; // 处理状态
  private stopFlag: boolean; // 停止标志
  private timeoutId: any; // 定时器ID

  constructor(
    delay: number,
    onMessage: (char: string) => void,
    onFinish: () => void,
    initialValue: string = ''
  ) {
    this.messageQueue = [];
    this.delay = delay;
    this.onMessage = onMessage;
    this.onFinish = onFinish;
    this.isProcessing = false;
    this.stopFlag = false;
    this.timeoutId = null;

    // 初始化时直接添加初始值
    if (initialValue) {
      this.add(initialValue);
    }
  }

  add(chunk: string): void {
    if (typeof chunk !== 'string' || this.stopFlag) return;

    // 拆解数据块为单字并加入队列
    const chars = chunk.split('');
    this.messageQueue.push(...chars);

    // 自动启动处理流程
    if (!this.isProcessing) {
      this.start();
    }
  }

  start(): void {
    this.processQueue();
  }

  processQueue(): void {
    if (this.stopFlag || this.messageQueue.length === 0) {
      this.isProcessing = false;
      if (this.messageQueue.length === 0) this?.onFinish();
      return;
    }

    this.isProcessing = true;
    const char = this.messageQueue.shift()!;
    this.onMessage(char);

    this.timeoutId = setTimeout(() => {
      this.processQueue();
    }, this.delay);
  }

  stop(): void {
    this.stopFlag = true;
  }

  immediatelyStop(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.messageQueue = [];
    this.isProcessing = false;
    this.stopFlag = false;
  }
  // 设置回调函数
  public setOnComplete(callback: () => void) {
    this.onFinish = callback;
    if (this.messageQueue.length === 0) this.onFinish();
  }
}
