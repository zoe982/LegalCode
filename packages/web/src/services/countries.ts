import type { Country } from '@legalcode/shared';
import { extractApiError } from './apiUtils.js';

export interface CountryListResponse {
  countries: Country[];
}

export interface CountryResponse {
  country: Country;
}

export interface CreateCountryInput {
  name: string;
  code: string;
}

export interface UpdateCountryInput {
  name: string;
  code: string;
}

export const countryService = {
  async list(): Promise<CountryListResponse> {
    const response = await fetch('/api/countries', { credentials: 'include' });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch countries');
    }
    return (await response.json()) as CountryListResponse;
  },

  async create(input: CreateCountryInput): Promise<CountryResponse> {
    const response = await fetch('/api/countries', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to create country');
    }
    return (await response.json()) as CountryResponse;
  },

  async update(id: string, input: UpdateCountryInput): Promise<CountryResponse> {
    const response = await fetch(`/api/countries/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to update country');
    }
    return (await response.json()) as CountryResponse;
  },

  async remove(id: string): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/countries/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to delete country');
    }
    return (await response.json()) as { ok: boolean };
  },
};
