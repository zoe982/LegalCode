/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { InlineSuggestionCard } from '../../src/components/InlineSuggestionCard.js';
import type { Suggestion } from '../../src/types/suggestions.js';

function makeSuggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: 's-1',
    templateId: 't-1',
    authorId: 'u-1',
    authorName: 'Alice Smith',
    authorEmail: 'alice@example.com',
    type: 'insert',
    anchorFrom: '10',
    anchorTo: '10',
    originalText: '',
    replacementText: 'new text',
    status: 'pending',
    resolvedBy: null,
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('InlineSuggestionCard', () => {
  it('renders insert suggestion with "Insert" label', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ type: 'insert', replacementText: 'new text' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Insert')).toBeInTheDocument();
  });

  it('renders insert suggestion with replacement text preview', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ type: 'insert', replacementText: 'a mutual indemnification' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('a mutual indemnification')).toBeInTheDocument();
  });

  it('renders delete suggestion with "Delete" label', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({
          type: 'delete',
          originalText: 'old text',
          replacementText: null,
        })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders delete suggestion with original text', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({
          type: 'delete',
          originalText: 'the original clause',
          replacementText: null,
        })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('the original clause')).toBeInTheDocument();
  });

  it('shows author display name', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ authorName: 'Alice Smith', authorEmail: 'alice@example.com' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('falls back to email prefix when name equals email', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({
          authorName: 'bob@example.com',
          authorEmail: 'bob@example.com',
        })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('renders author avatar with initials', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ authorName: 'Alice Smith', authorEmail: 'alice@example.com' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('calls onAccept with suggestion id when Accept button is clicked', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ id: 's-42' })}
        onAccept={onAccept}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('button', { name: /accept/i }));
    expect(onAccept).toHaveBeenCalledWith('s-42');
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onReject with suggestion id when Reject button is clicked', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ id: 's-99' })}
        onAccept={vi.fn()}
        onReject={onReject}
      />,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('button', { name: /reject/i }));
    expect(onReject).toHaveBeenCalledWith('s-99');
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('renders Delete button when canDelete is true', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onDelete={vi.fn()}
        canDelete={true}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('calls onDelete with suggestion id when Delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ id: 's-del' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onDelete={onDelete}
        canDelete={true}
      />,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('s-del');
  });

  it('does not render Delete button when canDelete is false', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onDelete={vi.fn()}
        canDelete={false}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('does not render Delete button when canDelete is undefined', () => {
    render(
      <InlineSuggestionCard suggestion={makeSuggestion()} onAccept={vi.fn()} onReject={vi.fn()} />,
      { wrapper: Wrapper },
    );
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('calls onClick with suggestion id when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ id: 's-click' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onClick={onClick}
      />,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith('s-click');
  });

  it('does not crash when onClick is not provided and card is clicked', async () => {
    const user = userEvent.setup();
    render(
      <InlineSuggestionCard suggestion={makeSuggestion()} onAccept={vi.fn()} onReject={vi.fn()} />,
      { wrapper: Wrapper },
    );
    await user.click(screen.getByRole('article'));
  });

  it('renders with active data attribute when isActive is true', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        isActive={true}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('article')).toHaveAttribute('data-active', 'true');
  });

  it('renders without active data attribute when isActive is false', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        isActive={false}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('article')).not.toHaveAttribute('data-active', 'true');
  });

  it('renders without crashing when given long replacement text', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ replacementText: 'a'.repeat(500) })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('renders a relative timestamp of "just now" for very recent suggestions', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ createdAt: new Date().toISOString() })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('accepts optional style prop without crashing', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        style={{ top: 100 }}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByRole('article')).toBeInTheDocument();
  });

  it('falls back to email prefix when authorName is an empty string', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ authorName: '', authorEmail: 'carol@example.com' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // getDisplayName: name is falsy (empty string) -> falls back to email.split('@')[0]
    expect(screen.getByText('carol')).toBeInTheDocument();
  });

  it('shows single-word initials when display name has one part (no space/dot)', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ authorName: 'Zoe', authorEmail: 'zoe@example.com' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // getInitials: parts.length < 2 -> displayName.slice(0, 2).toUpperCase()
    expect(screen.getByText('ZO')).toBeInTheDocument();
  });

  it('renders relative timestamp in minutes when suggestion was created ~5 mins ago', () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ createdAt: fiveMinsAgo })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('renders relative timestamp in hours when suggestion was created ~3 hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ createdAt: threeHoursAgo })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('3h ago')).toBeInTheDocument();
  });

  it('renders relative timestamp in days when suggestion was created ~2 days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ createdAt: twoDaysAgo })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });

  it('renders empty replacement text for insert when replacementText is null', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ type: 'insert', replacementText: null })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // Falls back to '' via the ?? '' operator — card should render without crashing
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByText('Insert')).toBeInTheDocument();
  });

  it('does not call onDelete when canDelete is true but Delete button is not clicked', () => {
    const onDelete = vi.fn();
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onDelete={onDelete}
        canDelete={true}
      />,
      { wrapper: Wrapper },
    );
    // Button present but not yet clicked
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('handles initials for dotted display name (e.g. email prefix with dots)', () => {
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({
          authorName: 'john.doe@example.com',
          authorEmail: 'john.doe@example.com',
        })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // getDisplayName: name === email -> falls back to email.split('@')[0] = 'john.doe'
    // getInitials: split by /[\s.]+/ -> ['john', 'doe'] -> 2 parts -> 'JD'
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('produces empty-string initials when display name starts with a delimiter (parts[0] is empty)', () => {
    // A name beginning with a dot splits as ['', 'foo', 'bar'] via /[\s.]+/
    // parts[0] = '' -> parts[0][0] is undefined -> ?? '' fires
    // parts[1] = 'foo' -> parts[1][0] = 'F'
    // result: ('' + 'F').toUpperCase() = 'F'
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ authorName: '.foo bar', authorEmail: 'x@example.com' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // The avatar text is 'F' (empty first part + 'F' from second part)
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('produces empty-string initials when display name ends with a delimiter (parts[1] is empty)', () => {
    // A name ending with a dot splits as ['foo', ''] via /[\s.]+/
    // parts[0] = 'foo' -> parts[0][0] = 'F'
    // parts[1] = '' -> parts[1][0] is undefined -> ?? '' fires
    // result: ('F' + '').toUpperCase() = 'F'
    render(
      <InlineSuggestionCard
        suggestion={makeSuggestion({ authorName: 'foo.', authorEmail: 'x@example.com' })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
      { wrapper: Wrapper },
    );
    // The avatar text is 'F' (first char of 'foo' + empty string from trailing dot)
    expect(screen.getByText('F')).toBeInTheDocument();
  });
});
