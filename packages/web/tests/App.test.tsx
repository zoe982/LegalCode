/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { App } from '../src/App.js';
import { server } from '../src/mocks/node.js';
import { http, HttpResponse } from 'msw';

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('App', () => {
  it('shows main content when authenticated', async () => {
    server.use(
      http.get('/auth/me', () =>
        HttpResponse.json({
          user: {
            id: '1',
            email: 'alice@acasus.com',
            name: 'Alice',
            role: 'editor',
          },
        }),
      ),
    );
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /legalcode/i })).toBeInTheDocument();
    });
  });
});
