import type { Company } from '@legalcode/shared';
import { extractApiError } from './apiUtils.js';

export interface CompanyListResponse {
  companies: Company[];
}

export interface CompanyResponse {
  company: Company;
}

export interface CreateCompanyInput {
  name: string;
}

export interface UpdateCompanyInput {
  name: string;
}

export const companyService = {
  async list(): Promise<CompanyListResponse> {
    const response = await fetch('/api/companies', { credentials: 'include' });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch companies');
    }
    return (await response.json()) as CompanyListResponse;
  },

  async create(input: CreateCompanyInput): Promise<CompanyResponse> {
    const response = await fetch('/api/companies', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create company');
    }
    return (await response.json()) as CompanyResponse;
  },

  async update(id: string, input: UpdateCompanyInput): Promise<CompanyResponse> {
    const response = await fetch(`/api/companies/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to update company');
    }
    return (await response.json()) as CompanyResponse;
  },

  async remove(id: string): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/companies/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to delete company');
    }
    return (await response.json()) as { ok: boolean };
  },
};
