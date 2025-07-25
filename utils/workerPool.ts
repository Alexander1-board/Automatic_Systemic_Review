interface Task {
  id: number;
  url: string;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  private counter = 0;

  constructor(private size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('../workers/fetchWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const { id, data, log } = e.data;
        if (log) {
          import('../utils/apiLogger').then(m => m.apiLogs.push(log));
        }
        const callback = this.callbacks.get(id);
        if (callback) {
          callback(data);
          this.callbacks.delete(id);
        }
        this.runNext();
      };
      this.workers.push(worker);
    }
  }

  private busy = 0;
  private callbacks = new Map<number, (data: any) => void>();

  private runNext() {
    if (this.busy >= this.workers.length) return;
    const task = this.queue.shift();
    if (!task) return;
    const worker = this.workers[this.busy++];
    worker.postMessage(task);
  }

  fetchJson(url: string): Promise<any> {
    return new Promise((resolve) => {
      const id = this.counter++;
      this.callbacks.set(id, (data) => {
        this.busy--;
        resolve(data);
      });
      this.queue.push({ id, url });
      this.runNext();
    });
  }
}

export const pool = new WorkerPool(Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2)));
