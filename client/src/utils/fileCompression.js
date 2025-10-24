// File compression utility functions
// Handles image compression and file optimization

/**
 * Compress an image file to reduce size
 * @param {File} file - The image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<File>} - Compressed file
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const {
      // maxWidth = 1920,
      // maxHeight = 1080,
      quality = 0.8,
      maxSizeKB = 1024 // 1MB
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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
      img.src = e.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Check if file needs compression
 * @param {File} file - The file to check
 * @param {Object} options - Compression options
 * @returns {boolean} - Whether file needs compression
 */
export const needsCompression = (file, options = {}) => {
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
 * @param {File} file - The file to estimate
 * @returns {Object} - Compression estimate
 */
export const getCompressionEstimate = (file) => {
  if (!file || !file.type.startsWith('image/')) {
    return { canCompress: false, estimatedSize: file.size };
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
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Batch compress multiple images
 * @param {File[]} files - Array of image files
 * @param {Object} options - Compression options
 * @returns {Promise<File[]>} - Array of compressed files
 */
export const batchCompressImages = async (files, options = {}) => {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  const compressedFiles = [];

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
