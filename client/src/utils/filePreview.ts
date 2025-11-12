// File preview utility functions
// Handles file preview functionality in both browser and Node.js environments

/**
 * Check if URL.createObjectURL is available (browser environment)
 */
const isBrowserEnvironment = (): boolean => {
  return typeof window !== 'undefined' && typeof URL !== 'undefined' && !!URL.createObjectURL;
};

/**
 * Create a preview URL for a file
 * @param file - The file to create preview for
 * @returns Preview URL or null if not supported
 */
export const createFilePreviewUrl = (file: File | null): string | null => {
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
 * @param url - The URL to revoke
 */
export const revokeFilePreviewUrl = (url: string | null): void => {
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
 * @param file - The file to check
 * @returns Whether preview is supported
 */
export const isFilePreviewSupported = (file: File | null): boolean => {
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
 * @param file - The file to check
 * @returns Preview type ('image', 'document', 'unknown')
 */
export const getFilePreviewType = (file: File | null): 'image' | 'document' | 'unknown' => {
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
 * @param file - The file to read
 * @param onLoad - Callback when file is loaded
 * @param onError - Callback when error occurs
 */
export const readFileContent = (
  file: File | null,
  onLoad?: (result: string | ArrayBuffer | null) => void,
  onError?: (error: any) => void
): void => {
  if (!file) {
    onError?.('No file provided');
    return;
  }

  if (isBrowserEnvironment()) {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      onLoad?.(event.target?.result || null);
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
 * @param file - The file to get icon for
 * @returns Icon type
 */
export const getFileIcon = (file: File | null): string => {
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
 * @param file - The file to validate
 * @returns Validation result
 */
export interface FilePreviewValidation {
  isValid: boolean;
  canPreview: boolean;
  previewType: 'image' | 'document' | 'unknown';
  error: string | null;
}

export const validateFileForPreview = (file: File | null): FilePreviewValidation => {
  const result: FilePreviewValidation = {
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

