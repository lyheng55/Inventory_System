// Validation utility functions

type ValidationRule = (value: any) => boolean;
type ValidationRuleWithParams = (...params: any[]) => (value: any) => boolean;
type CustomValidationRule = (value: any) => true | string;

interface ValidationRuleObject {
  name: string;
  params?: any[];
  message?: string;
}

interface ValidationSchema {
  [fieldName: string]: (string | ValidationRuleObject | CustomValidationRule)[];
}

// Validation rules
export const validationRules: Record<string, ValidationRule | ValidationRuleWithParams> = {
  required: (value: any): boolean => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined && value !== '';
  },
  
  email: (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  phone: (value: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/\s/g, ''));
  },
  
  minLength: (min: number) => (value: string): boolean => {
    return !!(value && value.length >= min);
  },
  
  maxLength: (max: number) => (value: string): boolean => {
    return !value || value.length <= max;
  },
  
  numeric: (value: any): boolean => {
    return !isNaN(value) && !isNaN(parseFloat(value));
  },
  
  positive: (value: any): boolean => {
    return parseFloat(value) > 0;
  },
  
  integer: (value: any): boolean => {
    return Number.isInteger(parseFloat(value));
  },
  
  url: (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  date: (value: string | Date): boolean => {
    return !isNaN(Date.parse(value as string));
  },
  
  futureDate: (value: string | Date): boolean => {
    return new Date(value) > new Date();
  },
  
  pastDate: (value: string | Date): boolean => {
    return new Date(value) < new Date();
  },
};

// Validation messages
export const validationMessages: Record<string, string | ((param: any) => string)> = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  minLength: (min: number) => `Minimum length is ${min} characters`,
  maxLength: (max: number) => `Maximum length is ${max} characters`,
  numeric: 'Please enter a valid number',
  positive: 'Please enter a positive number',
  integer: 'Please enter a whole number',
  url: 'Please enter a valid URL',
  date: 'Please enter a valid date',
  futureDate: 'Date must be in the future',
  pastDate: 'Date must be in the past',
};

// Validate a single field
export const validateField = (value: any, rules: (string | ValidationRuleObject | CustomValidationRule)[]): string[] => {
  const errors: string[] = [];
  
  for (const rule of rules) {
    if (typeof rule === 'string') {
      // Simple rule name
      const ruleFunc = validationRules[rule] as ValidationRule;
      if (ruleFunc && !ruleFunc(value)) {
        const message = validationMessages[rule];
        errors.push(typeof message === 'string' ? message : message(0));
      }
    } else if (typeof rule === 'object' && 'name' in rule) {
      // Rule with parameters
      const { name, params = [], message } = rule;
      const ruleFunc = validationRules[name] as ValidationRuleWithParams;
      if (ruleFunc) {
        const ruleWithParams = ruleFunc(...params);
        if (!ruleWithParams(value)) {
          errors.push(message || (typeof validationMessages[name] === 'string' 
            ? validationMessages[name] as string 
            : (validationMessages[name] as (param: any) => string)(params[0])));
        }
      }
    } else if (typeof rule === 'function') {
      // Custom validation function
      const result = rule(value);
      if (result !== true) {
        errors.push(result || 'Invalid value');
      }
    }
  }
  
  return errors;
};

// Validate form data
export const validateForm = <T extends Record<string, any>>(
  data: T, 
  schema: ValidationSchema
): { isValid: boolean; errors: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  
  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldErrors = validateField(data[fieldName], rules);
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Common validation schemas
export const commonSchemas: Record<string, ValidationSchema> = {
  login: {
    email: ['required', 'email'],
    password: ['required', { name: 'minLength', params: [6], message: 'Password must be at least 6 characters' }],
  },
  
  user: {
    firstName: ['required', { name: 'minLength', params: [2] }],
    lastName: ['required', { name: 'minLength', params: [2] }],
    email: ['required', 'email'],
    phone: ['phone'],
    role: ['required'],
  },
  
  product: {
    name: ['required', { name: 'minLength', params: [2] }],
    sku: ['required', { name: 'minLength', params: [3] }],
    costPrice: ['required', 'numeric', 'positive'],
    unitPrice: ['required', 'numeric', 'positive'],
    reorderPoint: ['numeric', 'positive'],
    minStockLevel: ['numeric', 'positive'],
  },
  
  supplier: {
    name: ['required', { name: 'minLength', params: [2] }],
    contactPerson: ['required'],
    email: ['email'],
    phone: ['phone'],
    address: ['required'],
  },
  
  warehouse: {
    name: ['required', { name: 'minLength', params: [2] }],
    code: ['required', { name: 'minLength', params: [2] }],
    address: ['required'],
  },
  
  purchaseOrder: {
    supplierId: ['required'],
    warehouseId: ['required'],
    expectedDeliveryDate: ['required', 'date', 'futureDate'],
  },
};

// Custom validation functions
export const customValidations = {
  // Check if SKU is unique (would need API call in real implementation)
  uniqueSku: async (value: string, currentId: number | null = null): Promise<boolean> => {
    // This would typically make an API call
    // For now, just return true
    return true;
  },
  
  // Check if email is unique
  uniqueEmail: async (value: string, currentId: number | null = null): Promise<boolean> => {
    // This would typically make an API call
    // For now, just return true
    return true;
  },
  
  // Validate password strength
  strongPassword: (value: string): true | string => {
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    if (value.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!hasNumbers) {
      return 'Password must contain at least one number';
    }
    if (!hasSpecialChar) {
      return 'Password must contain at least one special character';
    }
    
    return true;
  },
  
  // Validate file upload
  fileUpload: (file: File | null, options: { maxSize?: number; allowedTypes?: string[] } = {}): true | string => {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = [] } = options; // 5MB default
    
    if (!file) {
      return 'Please select a file';
    }
    
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`;
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `File type must be one of: ${allowedTypes.join(', ')}`;
    }
    
    return true;
  },
};

export default {
  validationRules,
  validationMessages,
  validateField,
  validateForm,
  commonSchemas,
  customValidations,
};

