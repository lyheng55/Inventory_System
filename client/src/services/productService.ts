// Product service
import api from '../utils/api';
import { API_ENDPOINTS } from '../constants';
import { Product, Category, ProductsResponse } from '../types';

interface ProductParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  lowStock?: boolean;
}

interface SearchParams {
  q: string;
  [key: string]: any;
}

interface BulkUpdate {
  id: number;
  updates: Partial<Product>;
}

class ProductService {
  // Get all products
  async getProducts(params: ProductParams = {}): Promise<ProductsResponse> {
    try {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      const endpoint = queryString 
        ? `${API_ENDPOINTS.PRODUCTS.BASE}?${queryString}`
        : API_ENDPOINTS.PRODUCTS.BASE;
      
      return await api.get<ProductsResponse>(endpoint);
    } catch (error) {
      throw error;
    }
  }

  // Get product by ID
  async getProduct(id: number): Promise<Product> {
    try {
      return await api.get<Product>(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
    } catch (error) {
      throw error;
    }
  }

  // Create new product
  async createProduct(productData: Partial<Product>): Promise<Product> {
    try {
      return await api.post<Product>(API_ENDPOINTS.PRODUCTS.BASE, productData);
    } catch (error) {
      throw error;
    }
  }

  // Update product
  async updateProduct(id: number, productData: Partial<Product>): Promise<Product> {
    try {
      return await api.put<Product>(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`, productData);
    } catch (error) {
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id: number): Promise<void> {
    try {
      return await api.delete<void>(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
    } catch (error) {
      throw error;
    }
  }

  // Search products
  async searchProducts(query: string, params: Record<string, any> = {}): Promise<ProductsResponse> {
    try {
      const searchParams: SearchParams = { q: query, ...params };
      const queryString = new URLSearchParams(
        Object.entries(searchParams).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value.toString();
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      
      return await api.get<ProductsResponse>(`${API_ENDPOINTS.PRODUCTS.SEARCH}?${queryString}`);
    } catch (error) {
      throw error;
    }
  }

  // Bulk update products
  async bulkUpdateProducts(updates: BulkUpdate[]): Promise<{ success: boolean; updated: number }> {
    try {
      return await api.post<{ success: boolean; updated: number }>(API_ENDPOINTS.PRODUCTS.BULK_UPDATE, { updates });
    } catch (error) {
      throw error;
    }
  }

  // Get product categories
  async getCategories(): Promise<Category[]> {
    try {
      return await api.get<Category[]>(API_ENDPOINTS.CATEGORIES.BASE);
    } catch (error) {
      throw error;
    }
  }

  // Create category
  async createCategory(categoryData: Partial<Category>): Promise<Category> {
    try {
      return await api.post<Category>(API_ENDPOINTS.CATEGORIES.BASE, categoryData);
    } catch (error) {
      throw error;
    }
  }

  // Update category
  async updateCategory(id: number, categoryData: Partial<Category>): Promise<Category> {
    try {
      return await api.put<Category>(`${API_ENDPOINTS.CATEGORIES.BASE}/${id}`, categoryData);
    } catch (error) {
      throw error;
    }
  }

  // Delete category
  async deleteCategory(id: number): Promise<void> {
    try {
      return await api.delete<void>(`${API_ENDPOINTS.CATEGORIES.BASE}/${id}`);
    } catch (error) {
      throw error;
    }
  }
}

export default new ProductService();

