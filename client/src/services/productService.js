// Product service
import api from '../utils/api';
import { API_ENDPOINTS } from '../constants';

class ProductService {
  // Get all products
  async getProducts(params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const endpoint = queryString 
        ? `${API_ENDPOINTS.PRODUCTS.BASE}?${queryString}`
        : API_ENDPOINTS.PRODUCTS.BASE;
      
      return await api.get(endpoint);
    } catch (error) {
      throw error;
    }
  }

  // Get product by ID
  async getProduct(id) {
    try {
      return await api.get(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
    } catch (error) {
      throw error;
    }
  }

  // Create new product
  async createProduct(productData) {
    try {
      return await api.post(API_ENDPOINTS.PRODUCTS.BASE, productData);
    } catch (error) {
      throw error;
    }
  }

  // Update product
  async updateProduct(id, productData) {
    try {
      return await api.put(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`, productData);
    } catch (error) {
      throw error;
    }
  }

  // Delete product
  async deleteProduct(id) {
    try {
      return await api.delete(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
    } catch (error) {
      throw error;
    }
  }

  // Search products
  async searchProducts(query, params = {}) {
    try {
      const searchParams = { q: query, ...params };
      const queryString = new URLSearchParams(searchParams).toString();
      
      return await api.get(`${API_ENDPOINTS.PRODUCTS.SEARCH}?${queryString}`);
    } catch (error) {
      throw error;
    }
  }

  // Bulk update products
  async bulkUpdateProducts(updates) {
    try {
      return await api.post(API_ENDPOINTS.PRODUCTS.BULK_UPDATE, { updates });
    } catch (error) {
      throw error;
    }
  }

  // Get product categories
  async getCategories() {
    try {
      return await api.get(API_ENDPOINTS.CATEGORIES.BASE);
    } catch (error) {
      throw error;
    }
  }

  // Create category
  async createCategory(categoryData) {
    try {
      return await api.post(API_ENDPOINTS.CATEGORIES.BASE, categoryData);
    } catch (error) {
      throw error;
    }
  }

  // Update category
  async updateCategory(id, categoryData) {
    try {
      return await api.put(`${API_ENDPOINTS.CATEGORIES.BASE}/${id}`, categoryData);
    } catch (error) {
      throw error;
    }
  }

  // Delete category
  async deleteCategory(id) {
    try {
      return await api.delete(`${API_ENDPOINTS.CATEGORIES.BASE}/${id}`);
    } catch (error) {
      throw error;
    }
  }
}

export default new ProductService();
