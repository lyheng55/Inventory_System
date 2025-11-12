// File compression utility functions
// Handles image compression and file optimization

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

export interface CompressionEstimate {
  canCompress: boolean;
  originalSize?: number;
  estimatedSize: number;
  reductionPercent?: number;
  sizeKB?: number;
  estimatedSizeKB?: number;
}

/**
 * Compress an image file to reduce size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export const compressImage = (file: File, options: CompressionOptions = {}): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      maxSizeKB = 1024 // 1MB
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        // Check if compressed size is acceptable
        const sizeKB = blob.size / 1024;
        if (sizeKB > maxSizeKB) {
          // Try with lower quality
          const newQuality = Math.max(0.1, quality * 0.7);
          canvas.toBlob((newBlob) => {
            if (newBlob) {
              const compressedFile = new File([newBlob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image to acceptable size'));
            }
          }, file.type, newQuality);
        } else {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          resolve(compressedFile);
        }
      }, file.type, quality);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Check if file needs compression
 * @param file - The file to check
 * @param options - Compression options
 * @returns Whether file needs compression
 */
export const needsCompression = (file: File | null, options: CompressionOptions = {}): boolean => {
  const {
    maxSizeKB = 1024,
    maxWidth = 1920,
    maxHeight = 1080
  } = options;

  if (!file || !file.type.startsWith('image/')) {
    return false;
  }

  const sizeKB = file.size / 1024;
  return sizeKB > maxSizeKB;
};

/**
 * Get compression estimate
 * @param file - The file to estimate
 * @returns Compression estimate
 */
export const getCompressionEstimate = (file: File | null): CompressionEstimate => {
  if (!file || !file.type.startsWith('image/')) {
    return { canCompress: false, estimatedSize: file?.size || 0 };
  }

  const sizeKB = file.size / 1024;
  const estimatedSize = Math.round(sizeKB * 0.3); // Estimate 70% reduction
  
  return {
    canCompress: true,
    originalSize: file.size,
    estimatedSize: estimatedSize * 1024,
    reductionPercent: 70,
    sizeKB: sizeKB,
    estimatedSizeKB: estimatedSize
  };
};

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Batch compress multiple images
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Array of compressed files
 */
export const batchCompressImages = async (files: File[], options: CompressionOptions = {}): Promise<File[]> => {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  const compressedFiles: File[] = [];

  for (const file of imageFiles) {
    try {
      if (needsCompression(file, options)) {
        const compressed = await compressImage(file, options);
        compressedFiles.push(compressed);
      } else {
        compressedFiles.push(file);
      }
    } catch (error) {
      console.warn(`Failed to compress ${file.name}:`, error);
      compressedFiles.push(file); // Use original if compression fails
    }
  }

  return compressedFiles;
};

const fileCompressionUtils = {
  compressImage,
  needsCompression,
  getCompressionEstimate,
  formatFileSize,
  batchCompressImages
};

export default fileCompressionUtils;

