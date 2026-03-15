/// <reference types="@testing-library/jest-dom/vitest" />
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, MenuItem, Divider } from '@mui/material';

// Simulate the KebabMenuItems pattern
function KebabMenu({
  varId,
  anchorEl,
  open,
  onClose,
  onRename,
}: {
  varId: string | null;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onRename: (id: string) => void;
}) {
  const id = varId;
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem
        onClick={() => {
          if (id) onRename(id);
        }}
      >
        Rename
      </MenuItem>
      <Divider />
      <MenuItem>Delete</MenuItem>
    </Menu>
  );
}

function Parent({ onRename }: { onRename: (id: string) => void }) {
  const [kebab, setKebab] = useState<{ anchorEl: HTMLElement | null; varId: string | null }>({
    anchorEl: null,
    varId: null,
  });
  const [inlineEdit, setInlineEdit] = useState<string | null>(null);

  return (
    <>
      <button
        aria-label="more options"
        onClick={(e) => {
          setKebab({ anchorEl: e.currentTarget, varId: 'v1' });
        }}
      >
        More
      </button>
      {inlineEdit && <input defaultValue={inlineEdit} />}
      <KebabMenu
        varId={kebab.varId}
        anchorEl={kebab.anchorEl}
        open={Boolean(kebab.anchorEl)}
        onClose={() => {
          setKebab({ anchorEl: null, varId: null });
        }}
        onRename={(id) => {
          onRename(id);
          setInlineEdit('Party Name');
          setKebab({ anchorEl: null, varId: null });
        }}
      />
    </>
  );
}

describe('MUI Menu click with state reset', () => {
  it('fires onRename when prop-captured id is used', async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(<Parent onRename={onRename} />);
    await user.click(screen.getByRole('button', { name: 'more options' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(onRename).toHaveBeenCalledWith('v1');
  });

  it('shows inline edit input after rename', async () => {
    const onRename = vi.fn();
    const user = userEvent.setup();
    render(<Parent onRename={onRename} />);
    await user.click(screen.getByRole('button', { name: 'more options' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(await screen.findByDisplayValue('Party Name')).toBeInTheDocument();
  });
});
