// Custom hook for authentication - re-exported from AuthContext
import { useAuth } from '../contexts/AuthContext';
export { useAuth };

// Custom hook for API calls with loading and error states
import { useState, useEffect } from 'react';

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: any;
  execute: (...args: any[]) => Promise<T>;
}

export const useApi = <T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  dependencies: any[] = []
): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const execute = async (...args: any[]): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dependencies.length > 0) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, execute };
};

// Custom hook for form handling
interface ValidationRule {
  (value: any): string | null;
}

interface ValidationSchema {
  [key: string]: (string | ValidationRule)[];
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  handleChange: (name: string, value: any) => void;
  handleBlur: (name: string) => void;
  validateForm: () => boolean;
  reset: () => void;
  setValue: (name: string, value: any) => void;
  isValid: boolean;
}

export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: ValidationSchema
): UseFormReturn<T> => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (name: string, value: any): void => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleBlur = (name: string): void => {
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));

    // Validate field on blur
    if (validationSchema && validationSchema[name]) {
      validateField(name, values[name]);
    }
  };

  const validateField = (name: string, value: any): boolean => {
    if (!validationSchema || !validationSchema[name]) return true;

    const fieldErrors = validationSchema[name]
      .map(rule => {
        if (typeof rule === 'string') {
          // Simple validation rule
          return validateRule(rule, value);
        } else if (typeof rule === 'function') {
          // Custom validation function
          return rule(value);
        }
        return null;
      })
      .filter((error): error is string => error !== null);

    setErrors(prev => ({
      ...prev,
      [name]: fieldErrors.length > 0 ? fieldErrors[0] : null,
    }));

    return fieldErrors.length === 0;
  };

  const validateRule = (rule: string, value: any): string | null => {
    switch (rule) {
      case 'required':
        return !value || (typeof value === 'string' && !value.trim()) 
          ? 'This field is required' 
          : null;
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) 
          ? 'Please enter a valid email address' 
          : null;
      default:
        return null;
    }
  };

  const validateForm = (): boolean => {
    let isValid = true;

    Object.keys(validationSchema || {}).forEach(name => {
      const fieldValid = validateField(name, values[name]);
      if (!fieldValid) {
        isValid = false;
      }
    });

    setTouched(
      Object.keys(validationSchema || {}).reduce((acc, name) => {
        acc[name] = true;
        return acc;
      }, {} as Record<string, boolean>)
    );

    return isValid;
  };

  const reset = (): void => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  const setValue = (name: string, value: any): void => {
    setValues(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    reset,
    setValue,
    isValid: Object.keys(errors).length === 0,
  };
};

// Custom hook for pagination
interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (items: number) => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
}

export const usePagination = (initialPage: number = 1, initialPageSize: number = 20): UsePaginationReturn => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalItems, setTotalItems] = useState<number>(0);

  const totalPages = Math.ceil(totalItems / pageSize);

  const goToPage = (page: number): void => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = (): void => {
    goToPage(currentPage + 1);
  };

  const prevPage = (): void => {
    goToPage(currentPage - 1);
  };

  const reset = (): void => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    setCurrentPage,
    setPageSize,
    setTotalItems,
    goToPage,
    nextPage,
    prevPage,
    reset,
  };
};

// Custom hook for local storage
export const useLocalStorage = <T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)): void => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};

export default {
  useAuth,
  useApi,
  useForm,
  usePagination,
  useLocalStorage,
};

