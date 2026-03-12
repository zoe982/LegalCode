import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { MemoryRouter } from 'react-router';
import { theme } from '../src/theme/index.js';
import { ToastProvider } from '../src/components/Toast.js';
import type { ReactNode, ReactElement } from 'react';

export interface WrapperOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: WrapperOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const { initialEntries = ['/'], ...renderOptions } = options;
  const queryClient = createQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return { ...result, queryClient };
}

export function createTestWrapper(options: Pick<WrapperOptions, 'initialEntries'> = {}) {
  const { initialEntries = ['/'] } = options;
  const queryClient = createQueryClient();

  function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastProvider>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return { wrapper: TestWrapper, queryClient };
}
