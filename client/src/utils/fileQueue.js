// File upload queue management utility
// Handles file upload queuing, progress tracking, and batch operations

/**
 * File upload queue manager
 */
export class FileUploadQueue {
  constructor(options = {}) {
    this.queue = [];
    this.activeUploads = new Set();
    this.completedUploads = new Set();
    this.failedUploads = new Set();
    this.maxConcurrent = options.maxConcurrent || 3;
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
    this.onQueueUpdate = options.onQueueUpdate || (() => {});
  }

  /**
   * Add files to upload queue
   * @param {File[]} files - Files to add
   * @param {Object} options - Upload options
   */
  addFiles(files, options = {}) {
    const queueItems = files.map(file => ({
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
   * @param {string} id - File ID
   */
  removeFile(id) {
    this.queue = this.queue.filter(item => item.id !== id);
    this.activeUploads.delete(id);
    this.completedUploads.delete(id);
    this.failedUploads.delete(id);
    this.notifyQueueUpdate();
  }

  /**
   * Clear all files from queue
   */
  clearQueue() {
    this.queue = [];
    this.activeUploads.clear();
    this.completedUploads.clear();
    this.failedUploads.clear();
    this.notifyQueueUpdate();
  }

  /**
   * Process upload queue
   */
  async processQueue() {
    while (this.queue.length > 0 && this.activeUploads.size < this.maxConcurrent) {
      const item = this.queue.find(i => i.status === 'queued');
      if (!item) break;

      this.startUpload(item);
    }
  }

  /**
   * Start uploading a file
   * @param {Object} item - Queue item
   */
  async startUpload(item) {
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
      item.error = error;
      item.endTime = Date.now();
      
      this.failedUploads.add(item.id);
      this.onError(item);
    } finally {
      this.activeUploads.delete(item.id);
      this.notifyQueueUpdate();
      this.processQueue(); // Process next item
    }
  }

  /**
   * Upload a single file
   * @param {File} file - File to upload
   * @param {Object} options - Upload options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} - Upload result
   */
  async uploadFile(file, options, onProgress) {
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
   * @returns {string} - Unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Notify queue update
   */
  notifyQueueUpdate() {
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
   * @returns {Object} - Queue statistics
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
  retryFailed() {
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
  cancelAll() {
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
 * @param {Object} options - Queue options
 * @returns {FileUploadQueue} - New queue instance
 */
export const createFileUploadQueue = (options = {}) => {
  return new FileUploadQueue(options);
};

/**
 * Batch upload files with queue management
 * @param {File[]} files - Files to upload
 * @param {Object} options - Upload options
 * @returns {Promise} - Upload results
 */
export const batchUploadFiles = async (files, options = {}) => {
  return new Promise((resolve, reject) => {
    const results = [];
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
