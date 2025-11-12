// File upload queue management utility
// Handles file upload queuing, progress tracking, and batch operations

interface QueueItem {
  id: string;
  file: File;
  options: UploadOptions;
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error: Error | null;
  result: any;
  startTime: number | null;
  endTime: number | null;
}

interface UploadOptions {
  fieldName?: string;
  endpoint?: string;
  token?: string;
  [key: string]: any;
}

interface QueueOptions {
  maxConcurrent?: number;
  onProgress?: (item: QueueItem) => void;
  onComplete?: (item: QueueItem) => void;
  onError?: (item: QueueItem) => void;
  onQueueUpdate?: (stats: QueueStats) => void;
}

interface QueueStats {
  queue: QueueItem[];
  active: number;
  completed: number;
  failed: number;
  total: number;
}

/**
 * File upload queue manager
 */
export class FileUploadQueue {
  private queue: QueueItem[] = [];
  private activeUploads: Set<string> = new Set();
  private completedUploads: Set<string> = new Set();
  private failedUploads: Set<string> = new Set();
  private maxConcurrent: number;
  private onProgress: (item: QueueItem) => void;
  private onComplete: (item: QueueItem) => void;
  private onError: (item: QueueItem) => void;
  private onQueueUpdate: (stats: QueueStats) => void;

  constructor(options: QueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.onQueueUpdate = options.onQueueUpdate || (() => {});
  }

  /**
   * Add files to upload queue
   * @param files - Files to add
   * @param options - Upload options
   */
  addFiles(files: File[], options: UploadOptions = {}): void {
    const queueItems: QueueItem[] = files.map(file => ({
      id: this.generateId(),
      file,
      options,
      status: 'queued',
      progress: 0,
      error: null,
      result: null,
      startTime: null,
      endTime: null
    }));

    this.queue.push(...queueItems);
    this.notifyQueueUpdate();
    this.processQueue();
  }

  /**
   * Remove file from queue
   * @param id - File ID
   */
  removeFile(id: string): void {
    this.queue = this.queue.filter(item => item.id !== id);
    this.activeUploads.delete(id);
    this.completedUploads.delete(id);
    this.failedUploads.delete(id);
    this.notifyQueueUpdate();
  }

  /**
   * Clear all files from queue
   */
  clearQueue(): void {
    this.queue = [];
    this.activeUploads.clear();
    this.completedUploads.clear();
    this.failedUploads.clear();
    this.notifyQueueUpdate();
  }

  /**
   * Process upload queue
   */
  async processQueue(): Promise<void> {
    while (this.queue.length > 0 && this.activeUploads.size < this.maxConcurrent) {
      const item = this.queue.find(i => i.status === 'queued');
      if (!item) break;

      await this.startUpload(item);
    }
  }

  /**
   * Start uploading a file
   * @param item - Queue item
   */
  private async startUpload(item: QueueItem): Promise<void> {
    item.status = 'uploading';
    item.startTime = Date.now();
    this.activeUploads.add(item.id);

    try {
      const result = await this.uploadFile(item.file, item.options, (progress) => {
        item.progress = progress;
        this.onProgress(item);
      });

      item.status = 'completed';
      item.progress = 100;
      item.result = result;
      item.endTime = Date.now();
      
      this.completedUploads.add(item.id);
      this.onComplete(item);
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error : new Error(String(error));
      item.endTime = Date.now();
      
      this.failedUploads.add(item.id);
      this.onError(item);
    } finally {
      this.activeUploads.delete(item.id);
      this.notifyQueueUpdate();
      await this.processQueue(); // Process next item
    }
  }

  /**
   * Upload a single file
   * @param file - File to upload
   * @param options - Upload options
   * @param onProgress - Progress callback
   * @returns Upload result
   */
  private uploadFile(file: File, options: UploadOptions, onProgress: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append(options.fieldName || 'file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });

      xhr.open('POST', options.endpoint || '/api/uploads/file');
      
      // Add authentication headers if token provided
      if (options.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Generate unique ID for queue item
   * @returns Unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Notify queue update
   */
  private notifyQueueUpdate(): void {
    this.onQueueUpdate({
      queue: this.queue,
      active: this.activeUploads.size,
      completed: this.completedUploads.size,
      failed: this.failedUploads.size,
      total: this.queue.length
    });
  }

  /**
   * Get queue statistics
   * @returns Queue statistics
   */
  getStats() {
    return {
      total: this.queue.length,
      queued: this.queue.filter(item => item.status === 'queued').length,
      uploading: this.queue.filter(item => item.status === 'uploading').length,
      completed: this.completedUploads.size,
      failed: this.failedUploads.size,
      active: this.activeUploads.size
    };
  }

  /**
   * Retry failed uploads
   */
  retryFailed(): void {
    const failedItems = this.queue.filter(item => item.status === 'failed');
    failedItems.forEach(item => {
      item.status = 'queued';
      item.error = null;
      item.progress = 0;
      this.failedUploads.delete(item.id);
    });
    this.notifyQueueUpdate();
    this.processQueue();
  }

  /**
   * Cancel all active uploads
   */
  cancelAll(): void {
    this.queue.forEach(item => {
      if (item.status === 'uploading') {
        item.status = 'cancelled';
        this.activeUploads.delete(item.id);
      }
    });
    this.notifyQueueUpdate();
  }
}

/**
 * Create a new file upload queue
 * @param options - Queue options
 * @returns New queue instance
 */
export const createFileUploadQueue = (options: QueueOptions = {}): FileUploadQueue => {
  return new FileUploadQueue(options);
};

/**
 * Batch upload files with queue management
 * @param files - Files to upload
 * @param options - Upload options
 * @returns Upload results
 */
export const batchUploadFiles = async (files: File[], options: UploadOptions & { maxConcurrent?: number } = {}): Promise<Array<{ success: boolean; item: QueueItem }>> => {
  return new Promise((resolve) => {
    const results: Array<{ success: boolean; item: QueueItem }> = [];
    let completed = 0;
    let failed = 0;

    const queue = new FileUploadQueue({
      maxConcurrent: options.maxConcurrent || 3,
      onComplete: (item) => {
        results.push({ success: true, item });
        completed++;
        if (completed + failed === files.length) {
          resolve(results);
        }
      },
      onError: (item) => {
        results.push({ success: false, item });
        failed++;
        if (completed + failed === files.length) {
          resolve(results);
        }
      }
    });

    queue.addFiles(files, options);
  });
};

const fileQueueUtils = {
  FileUploadQueue,
  createFileUploadQueue,
  batchUploadFiles
};

export default fileQueueUtils;

