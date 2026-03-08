import type { Category } from '@legalcode/shared';
import { extractApiError } from './apiUtils.js';

export interface CategoryListResponse {
  categories: Category[];
}

export interface CategoryResponse {
  category: Category;
}

export interface CreateCategoryInput {
  name: string;
}

export interface UpdateCategoryInput {
  name: string;
}

export const categoryService = {
  async list(): Promise<CategoryListResponse> {
    const response = await fetch('/api/categories', { credentials: 'include' });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch categories');
    }
    return (await response.json()) as CategoryListResponse;
  },

  async create(input: CreateCategoryInput): Promise<CategoryResponse> {
    const response = await fetch('/api/categories', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create category');
    }
    return (await response.json()) as CategoryResponse;
  },

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryResponse> {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to update category');
    }
    return (await response.json()) as CategoryResponse;
  },

  async remove(id: string): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to delete category');
    }
    return (await response.json()) as { ok: boolean };
  },
};
