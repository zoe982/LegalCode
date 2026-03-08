import type { ErrorSource, ErrorStatus, ErrorSeverity, ErrorLogEntry } from '@legalcode/shared';
import { extractApiError } from './apiUtils.js';

export interface ErrorLogFilters {
  source?: ErrorSource | undefined;
  status?: ErrorStatus | undefined;
  severity?: ErrorSeverity | undefined;
}

export interface ErrorLogResponse {
  errors: ErrorLogEntry[];
}

export const errorLogService = {
  async list(filters?: ErrorLogFilters): Promise<ErrorLogResponse> {
    let url = '/api/admin/errors';

    if (filters) {
      const params = new URLSearchParams();
      if (filters.source) params.set('source', filters.source);
      if (filters.status) params.set('status', filters.status);
      if (filters.severity) params.set('severity', filters.severity);
      const qs = params.toString();
      if (qs) url = `${url}?${qs}`;
    }

    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      return extractApiError(response, 'Failed to fetch error log');
    }
    return (await response.json()) as ErrorLogResponse;
  },

  async resolve(id: string): Promise<{ ok: boolean }> {
    const response = await fetch(`/api/admin/errors/${id}/resolve`, {
      method: 'PATCH',
      credentials: 'include',
    });
    if (!response.ok) {
      return extractApiError(response, 'Failed to resolve error');
    }
    return (await response.json()) as { ok: boolean };
  },
};
