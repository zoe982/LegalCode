/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceAvatars } from '../../src/components/PresenceAvatars.js';

describe('PresenceAvatars', () => {
  it('renders avatar for each connected user', () => {
    const users = [
      { userId: 'u1', email: 'alice@example.com', color: '#ff0000' },
      { userId: 'u2', email: 'bob@example.com', color: '#00ff00' },
    ];
    render(<PresenceAvatars users={users} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders empty group when no users', () => {
    const { container } = render(<PresenceAvatars users={[]} />);
    expect(container.querySelector('.MuiAvatarGroup-root')).toBeInTheDocument();
  });

  it('shows tooltip with user email on hover', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const users = [{ userId: 'u1', email: 'alice@example.com', color: '#ff0000' }];
    render(<PresenceAvatars users={users} />);
    const avatar = screen.getByText('A');
    await userEvent.setup().hover(avatar);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('alice@example.com');
  });

  it('uses first letter of email as avatar initial', () => {
    const users = [{ userId: 'u1', email: 'zoe@example.com', color: '#0000ff' }];
    render(<PresenceAvatars users={users} />);
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('applies user color as avatar background', () => {
    const users = [{ userId: 'u1', email: 'alice@example.com', color: 'rgb(255, 0, 0)' }];
    render(<PresenceAvatars users={users} />);
    const avatar = screen.getByText('A').closest('.MuiAvatar-root');
    expect(avatar).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
  });
});
