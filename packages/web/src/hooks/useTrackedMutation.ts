import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { reportError } from '../services/errorReporter.js';

interface TrackedMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  mutationLabel: string;
  onSuccess?: ((data: TData, variables: TVariables) => void) | undefined;
  onError?: ((error: Error) => void) | undefined;
}

const SENSITIVE_PATTERN = /password|token|secret/i;

function sanitizeVariables(vars: unknown): unknown {
  if (vars == null || typeof vars !== 'object') {
    return vars;
  }

  const obj = vars as Record<string, unknown>;
  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (SENSITIVE_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && value.length > 200) {
      sanitized[key] = value.slice(0, 200) + '...';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function useTrackedMutation<TData, TVariables>(
  options: TrackedMutationOptions<TData, TVariables>,
): UseMutationResult<TData, Error, TVariables> {
  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (data: TData, variables: TVariables) => {
      options.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables) => {
      void reportError({
        source: 'functional',
        message: error.message,
        stack: error.stack ?? null,
        metadata: JSON.stringify({
          mutationLabel: options.mutationLabel,
          variables: sanitizeVariables(variables),
        }),
        url: window.location.href,
      });
      options.onError?.(error);
    },
  });
}
