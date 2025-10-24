// File security utility functions
// Handles file validation, content analysis, and security checks

/**
 * File type validation patterns
 */
const FILE_TYPE_PATTERNS = {
  // Image types
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], magicBytes: ['FFD8FF'] },
  'image/png': { extensions: ['.png'], magicBytes: ['89504E47'] },
  'image/gif': { extensions: ['.gif'], magicBytes: ['47494638'] },
  'image/webp': { extensions: ['.webp'], magicBytes: ['52494646'] },
  
  // Document types
  'application/pdf': { extensions: ['.pdf'], magicBytes: ['25504446'] },
  'application/msword': { extensions: ['.doc'], magicBytes: ['D0CF11E0'] },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
    extensions: ['.docx'], 
    magicBytes: ['504B0304'] 
  },
  
  // Archive types
  'application/zip': { extensions: ['.zip'], magicBytes: ['504B0304'] },
  'application/x-rar-compressed': { extensions: ['.rar'], magicBytes: ['52617221'] }
};

/**
 * Dangerous file extensions
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1'
];

/**
 * Validate file type by magic bytes
 * @param {File} file - File to validate
 * @param {string} expectedType - Expected MIME type
 * @returns {Promise<boolean>} - Whether file type is valid
 */
export const validateFileTypeByMagicBytes = async (file, expectedType) => {
  return new Promise((resolve) => {
    const pattern = FILE_TYPE_PATTERNS[expectedType];
    if (!pattern) {
      resolve(true); // No pattern available, assume valid
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      const hex = Array.from(uint8Array.slice(0, 4))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join('');
      
      const isValid = pattern.magicBytes.some(magic => hex.startsWith(magic));
      resolve(isValid);
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Check if file extension is dangerous
 * @param {string} filename - File name
 * @returns {boolean} - Whether file extension is dangerous
 */
export const isDangerousFileExtension = (filename) => {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return DANGEROUS_EXTENSIONS.includes(extension);
};

/**
 * Validate file name for security
 * @param {string} filename - File name
 * @returns {Object} - Validation result
 */
export const validateFileName = (filename) => {
  const result = {
    isValid: true,
    errors: []
  };

  // Check for dangerous extensions
  if (isDangerousFileExtension(filename)) {
    result.isValid = false;
    result.errors.push('File extension is not allowed for security reasons');
  }

  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    result.isValid = false;
    result.errors.push('File name contains invalid characters');
  }

  // Check for null bytes
  if (filename.includes('\0')) {
    result.isValid = false;
    result.errors.push('File name contains null bytes');
  }

  // Check length
  if (filename.length > 255) {
    result.isValid = false;
    result.errors.push('File name is too long');
  }

  return result;
};

/**
 * Sanitize file name
 * @param {string} filename - Original file name
 * @returns {string} - Sanitized file name
 */
export const sanitizeFileName = (filename) => {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '').replace(/[\/\\]/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Replace invalid characters with underscores
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }
  
  return sanitized;
};

/**
 * Analyze file content for suspicious patterns
 * @param {File} file - File to analyze
 * @returns {Promise<Object>} - Analysis result
 */
export const analyzeFileContent = async (file) => {
  const result = {
    isSuspicious: false,
    warnings: [],
    riskLevel: 'low'
  };

  try {
    // Read first 1KB of file for analysis
    const chunk = file.slice(0, 1024);
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(chunk);
    });

    // Check for script patterns
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\.write/i
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(text)) {
        result.warnings.push('File contains script-like content');
        result.riskLevel = 'high';
        result.isSuspicious = true;
        break;
      }
    }

    // Check for executable patterns
    const executablePatterns = [
      /MZ/, // PE executable
      /\x7fELF/, // ELF executable
      /#!/ // Shell script
    ];

    for (const pattern of executablePatterns) {
      if (pattern.test(text)) {
        result.warnings.push('File appears to be executable');
        result.riskLevel = 'high';
        result.isSuspicious = true;
        break;
      }
    }

    // Check for suspicious file headers
    const suspiciousHeaders = [
      'PK\x03\x04', // ZIP/Office document
      '\x50\x4B\x03\x04', // ZIP
      '\xD0\xCF\x11\xE0' // Microsoft Office
    ];

    for (const header of suspiciousHeaders) {
      if (text.startsWith(header)) {
        result.warnings.push('File has suspicious header');
        result.riskLevel = 'medium';
        if (!result.isSuspicious) {
          result.isSuspicious = true;
        }
      }
    }

  } catch (error) {
    result.warnings.push('Could not analyze file content');
    result.riskLevel = 'medium';
  }

  return result;
};

/**
 * Comprehensive file security validation
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result
 */
export const validateFileSecurity = async (file, options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxSize = 10 * 1024 * 1024, // 10MB
    enableContentAnalysis = true,
    enableMagicByteValidation = true
  } = options;

  const result = {
    isValid: true,
    errors: [],
    warnings: [],
    riskLevel: 'low'
  };

  // Validate file name
  const nameValidation = validateFileName(file.name);
  if (!nameValidation.isValid) {
    result.isValid = false;
    result.errors.push(...nameValidation.errors);
  }

  // Validate file size
  if (file.size > maxSize) {
    result.isValid = false;
    result.errors.push(`File size exceeds maximum allowed size of ${formatFileSize(maxSize)}`);
  }

  // Validate file type
  if (!allowedTypes.includes(file.type)) {
    result.isValid = false;
    result.errors.push(`File type ${file.type} is not allowed`);
  }

  // Validate magic bytes if enabled
  if (enableMagicByteValidation && allowedTypes.includes(file.type)) {
    const magicByteValid = await validateFileTypeByMagicBytes(file, file.type);
    if (!magicByteValid) {
      result.isValid = false;
      result.errors.push('File content does not match declared type');
    }
  }

  // Analyze file content if enabled
  if (enableContentAnalysis) {
    const contentAnalysis = await analyzeFileContent(file);
    result.warnings.push(...contentAnalysis.warnings);
    if (contentAnalysis.riskLevel === 'high') {
      result.riskLevel = 'high';
      result.isSuspicious = true;
    } else if (contentAnalysis.riskLevel === 'medium' && result.riskLevel === 'low') {
      result.riskLevel = 'medium';
    }
  }

  return result;
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size string
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get security recommendations based on validation result
 * @param {Object} validationResult - Result from validateFileSecurity
 * @returns {string[]} - Array of recommendations
 */
export const getSecurityRecommendations = (validationResult) => {
  const recommendations = [];

  if (validationResult.riskLevel === 'high') {
    recommendations.push('File has high security risk - consider rejecting');
  } else if (validationResult.riskLevel === 'medium') {
    recommendations.push('File has medium security risk - review before processing');
  }

  if (validationResult.warnings.length > 0) {
    recommendations.push('Review file content before processing');
  }

  if (validationResult.errors.length > 0) {
    recommendations.push('Fix validation errors before proceeding');
  }

  return recommendations;
};

export default {
  validateFileTypeByMagicBytes,
  isDangerousFileExtension,
  validateFileName,
  sanitizeFileName,
  analyzeFileContent,
  validateFileSecurity,
  getSecurityRecommendations
};
