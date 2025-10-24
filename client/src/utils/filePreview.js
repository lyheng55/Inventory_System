// File preview utility functions
// Handles file preview functionality in both browser and Node.js environments

/**
 * Check if URL.createObjectURL is available (browser environment)
 */
const isBrowserEnvironment = () => {
  return typeof window !== 'undefined' && typeof URL !== 'undefined' && URL.createObjectURL;
};

/**
 * Create a preview URL for a file
 * @param {File} file - The file to create preview for
 * @returns {string|null} - Preview URL or null if not supported
 */
export const createFilePreviewUrl = (file) => {
  if (!file || !file.type) {
    return null;
  }

  // Only create preview for image files
  if (!file.type.startsWith('image/')) {
    return null;
  }

  // Check if we're in a browser environment
  if (isBrowserEnvironment()) {
    try {
      return URL.createObjectURL(file);
    } catch (error) {
      console.warn('Failed to create object URL:', error);
      return null;
    }
  }

  // In Node.js environment, return a placeholder or null
  console.warn('File preview not available in Node.js environment');
  return null;
};

/**
 * Revoke a preview URL to free memory
 * @param {string} url - The URL to revoke
 */
export const revokeFilePreviewUrl = (url) => {
  if (!url) {
    return;
  }

  if (isBrowserEnvironment()) {
    try {
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to revoke object URL:', error);
    }
  }
};

/**
 * Check if file preview is supported
 * @param {File} file - The file to check
 * @returns {boolean} - Whether preview is supported
 */
export const isFilePreviewSupported = (file) => {
  if (!file || !file.type) {
    return false;
  }

  // Only image files support preview
  if (!file.type.startsWith('image/')) {
    return false;
  }

  // Check if we're in a browser environment
  return isBrowserEnvironment();
};

/**
 * Get file preview type
 * @param {File} file - The file to check
 * @returns {string} - Preview type ('image', 'document', 'unknown')
 */
export const getFilePreviewType = (file) => {
  if (!file || !file.type) {
    return 'unknown';
  }

  if (file.type.startsWith('image/')) {
    return 'image';
  } else if (file.type === 'application/pdf') {
    return 'document';
  } else {
    return 'document';
  }
};

/**
 * Create a file reader for reading file content
 * @param {File} file - The file to read
 * @param {Function} onLoad - Callback when file is loaded
 * @param {Function} onError - Callback when error occurs
 */
export const readFileContent = (file, onLoad, onError) => {
  if (!file) {
    onError?.('No file provided');
    return;
  }

  if (isBrowserEnvironment()) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      onLoad?.(event.target.result);
    };
    
    reader.onerror = (error) => {
      onError?.(error);
    };

    // Read as data URL for images, text for others
    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  } else {
    // In Node.js environment, simulate file reading
    console.warn('File reading not available in Node.js environment');
    onError?.('File reading not supported in this environment');
  }
};

/**
 * Get file icon based on file type
 * @param {File} file - The file to get icon for
 * @returns {string} - Icon type
 */
export const getFileIcon = (file) => {
  if (!file || !file.type) {
    return 'description';
  }

  if (file.type.startsWith('image/')) {
    return 'image';
  } else if (file.type === 'application/pdf') {
    return 'picture_as_pdf';
  } else if (file.type.includes('word')) {
    return 'description';
  } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
    return 'table_chart';
  } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
    return 'slideshow';
  } else {
    return 'description';
  }
};

/**
 * Validate file for preview
 * @param {File} file - The file to validate
 * @returns {Object} - Validation result
 */
export const validateFileForPreview = (file) => {
  const result = {
    isValid: false,
    canPreview: false,
    previewType: 'unknown',
    error: null
  };

  if (!file) {
    result.error = 'No file provided';
    return result;
  }

  if (!file.type) {
    result.error = 'File type not available';
    return result;
  }

  result.isValid = true;
  result.previewType = getFilePreviewType(file);
  result.canPreview = isFilePreviewSupported(file);

  return result;
};

const filePreviewUtils = {
  createFilePreviewUrl,
  revokeFilePreviewUrl,
  isFilePreviewSupported,
  getFilePreviewType,
  readFileContent,
  getFileIcon,
  validateFileForPreview
};

export default filePreviewUtils;
