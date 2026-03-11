/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { OutlineView } from '../../src/components/OutlineView.js';
import type { HeadingEntry } from '../../src/editor/headingTree.js';

const sampleEntries: HeadingEntry[] = [
  {
    level: 1,
    text: 'Introduction',
    pos: 0,
    endPos: 100,
    bodyPreview: 'This is the intro body text...',
    number: '1.',
  },
  {
    level: 2,
    text: 'Background',
    pos: 100,
    endPos: 160,
    bodyPreview: 'Background context here...',
    number: '1.1',
  },
  {
    level: 2,
    text: 'Scope',
    pos: 160,
    endPos: 200,
    bodyPreview: 'Scope of work...',
    number: '1.2',
  },
  {
    level: 1,
    text: 'Obligations',
    pos: 200,
    endPos: 400,
    bodyPreview: 'Party obligations...',
    number: '2.',
  },
  {
    level: 3,
    text: 'Payment Terms',
    pos: 400,
    endPos: 500,
    bodyPreview: 'Payment schedule...',
    number: '2.1.a',
  },
];

function renderOutlineView(props: Partial<React.ComponentProps<typeof OutlineView>> = {}) {
  const defaultProps = {
    entries: sampleEntries,
    onReorderSection: vi.fn(),
    onNavigateToHeading: vi.fn(),
    onClose: vi.fn(),
  };
  return render(
    <ThemeProvider theme={theme}>
      <OutlineView {...defaultProps} {...props} />
    </ThemeProvider>,
  );
}

describe('OutlineView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Outline" title', () => {
    renderOutlineView();
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('renders close button that calls onClose when clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderOutlineView({ onClose });
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders depth filter chips: Sections, Subsections, All levels', () => {
    renderOutlineView();
    expect(screen.getByRole('button', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subsections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All levels' })).toBeInTheDocument();
  });

  it('"All levels" chip is active (filled) by default', () => {
    renderOutlineView();
    const allLevelsChip = screen.getByRole('button', { name: 'All levels' });
    // MUI filled chip has MuiChip-filled class
    expect(allLevelsChip.closest('.MuiChip-root')).toHaveClass('MuiChip-filled');
  });

  it('clicking "Sections" chip filters to H1 entries only', async () => {
    const user = userEvent.setup();
    renderOutlineView();

    await user.click(screen.getByRole('button', { name: 'Sections' }));

    // H1 entries should be visible
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Obligations')).toBeInTheDocument();
    // H2/H3 entries should not be visible
    expect(screen.queryByText('Background')).not.toBeInTheDocument();
    expect(screen.queryByText('Scope')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment Terms')).not.toBeInTheDocument();
  });

  it('clicking "Subsections" chip filters to H1+H2 entries', async () => {
    const user = userEvent.setup();
    renderOutlineView();

    await user.click(screen.getByRole('button', { name: 'Subsections' }));

    // H1 and H2 entries should be visible
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Obligations')).toBeInTheDocument();
    // H3 entries should NOT be visible
    expect(screen.queryByText('Payment Terms')).not.toBeInTheDocument();
  });

  it('clicking "All levels" chip restores all entries', async () => {
    const user = userEvent.setup();
    renderOutlineView();

    // Switch to Sections first
    await user.click(screen.getByRole('button', { name: 'Sections' }));
    expect(screen.queryByText('Background')).not.toBeInTheDocument();

    // Switch back to All levels
    await user.click(screen.getByRole('button', { name: 'All levels' }));
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Payment Terms')).toBeInTheDocument();
  });

  it('renders heading entries with correct indentation based on level', () => {
    renderOutlineView();
    // We verify by data-testid or finding entry containers
    const introEntry = screen.getByTestId('outline-entry-0');
    const backgroundEntry = screen.getByTestId('outline-entry-1');

    // H1 has 0px indent, H2 has 24px indent
    const introContent = within(introEntry).getByTestId('outline-entry-content');
    const backgroundContent = within(backgroundEntry).getByTestId('outline-entry-content');

    expect(introContent).toHaveStyle({ paddingLeft: '0px' });
    expect(backgroundContent).toHaveStyle({ paddingLeft: '24px' });
  });

  it('renders number labels for each entry', () => {
    renderOutlineView();
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('1.1')).toBeInTheDocument();
    expect(screen.getByText('1.2')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('2.1.a')).toBeInTheDocument();
  });

  it('renders heading text for each visible entry', () => {
    renderOutlineView();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Obligations')).toBeInTheDocument();
    expect(screen.getByText('Payment Terms')).toBeInTheDocument();
  });

  it('renders body preview text for each entry', () => {
    renderOutlineView();
    expect(screen.getByText('This is the intro body text...')).toBeInTheDocument();
    expect(screen.getByText('Background context here...')).toBeInTheDocument();
    expect(screen.getByText('Party obligations...')).toBeInTheDocument();
  });

  it('clicking heading text calls onNavigateToHeading with correct pos', async () => {
    const user = userEvent.setup();
    const onNavigateToHeading = vi.fn();
    renderOutlineView({ onNavigateToHeading });

    await user.click(screen.getByText('Introduction'));
    expect(onNavigateToHeading).toHaveBeenCalledWith(0);

    await user.click(screen.getByText('Background'));
    expect(onNavigateToHeading).toHaveBeenCalledWith(100);
  });

  it('renders a drag handle on each visible entry', () => {
    renderOutlineView();
    const dragHandles = screen.getAllByTestId('drag-handle');
    expect(dragHandles.length).toBe(sampleEntries.length);
  });

  it('entries have draggable attribute set to true', () => {
    renderOutlineView();
    const entries = screen.getAllByTestId(/^outline-entry-\d+$/);
    for (const entry of entries) {
      expect(entry).toHaveAttribute('draggable', 'true');
    }
  });

  it('collapse chevron toggles child entries visibility', async () => {
    const user = userEvent.setup();
    renderOutlineView();

    // "Introduction" (H1) has children (H2 items), should have a collapse toggle
    const collapseBtn = screen.getByTestId('collapse-toggle-0');
    expect(screen.getByText('Background')).toBeInTheDocument();

    await user.click(collapseBtn);

    // Children of "Introduction" should now be hidden
    expect(screen.queryByText('Background')).not.toBeInTheDocument();
    expect(screen.queryByText('Scope')).not.toBeInTheDocument();
  });

  it('clicking collapse chevron again expands child entries', async () => {
    const user = userEvent.setup();
    renderOutlineView();

    const collapseBtn = screen.getByTestId('collapse-toggle-0');

    // Collapse
    await user.click(collapseBtn);
    expect(screen.queryByText('Background')).not.toBeInTheDocument();

    // Expand again
    await user.click(collapseBtn);
    expect(screen.getByText('Background')).toBeInTheDocument();
  });

  it('shows empty state message when entries array is empty', () => {
    renderOutlineView({ entries: [] });
    expect(screen.getByText(/no headings found/i)).toBeInTheDocument();
  });

  it('fires drag events on entries', () => {
    renderOutlineView();
    const firstEntry = screen.getByTestId('outline-entry-0');
    // Should not throw when drag events are fired
    expect(() => {
      fireEvent.dragStart(firstEntry, {
        dataTransfer: { setData: vi.fn(), getData: vi.fn(() => '0') },
      });
      fireEvent.dragEnd(firstEntry);
    }).not.toThrow();
  });

  it('fires dragOver on an entry without throwing', () => {
    renderOutlineView();
    const secondEntry = screen.getByTestId('outline-entry-1');
    expect(() => {
      fireEvent.dragOver(secondEntry);
    }).not.toThrow();
  });

  it('drop on a same-level entry calls onReorderSection', () => {
    const onReorderSection = vi.fn();
    renderOutlineView({ onReorderSection });

    const firstEntry = screen.getByTestId('outline-entry-0'); // H1, pos=0
    const fourthEntry = screen.getByTestId('outline-entry-3'); // H1, pos=200

    fireEvent.dragStart(firstEntry, {
      dataTransfer: { setData: vi.fn(), getData: vi.fn(() => '0') },
    });
    fireEvent.drop(fourthEntry, {
      dataTransfer: { getData: vi.fn(() => '0') },
    });

    expect(onReorderSection).toHaveBeenCalledWith(0, 100, 200);
  });

  it('renders H3 entry with 48px indentation', () => {
    renderOutlineView();
    // Payment Terms is H3
    const h3Entry = screen.getByTestId('outline-entry-4');
    const h3Content = within(h3Entry).getByTestId('outline-entry-content');
    expect(h3Content).toHaveStyle({ paddingLeft: '48px' });
  });

  it('entries with no children do not render a collapse chevron', () => {
    const singleH1: HeadingEntry[] = [
      { level: 1, text: 'Only Section', pos: 0, endPos: 100, bodyPreview: '', number: '1.' },
    ];
    renderOutlineView({ entries: singleH1 });
    expect(screen.queryByTestId('collapse-toggle-0')).not.toBeInTheDocument();
  });

  it('drop on different-level entry does not call onReorderSection', () => {
    const onReorderSection = vi.fn();
    renderOutlineView({ onReorderSection });

    // Drag H1 (index 0) onto H2 (index 1) — different levels
    const h1Entry = screen.getByTestId('outline-entry-0'); // H1
    const h2Entry = screen.getByTestId('outline-entry-1'); // H2

    fireEvent.dragStart(h1Entry, {
      dataTransfer: { setData: vi.fn(), getData: vi.fn(() => '0') },
    });
    fireEvent.drop(h2Entry, {
      dataTransfer: { getData: vi.fn(() => '0') },
    });

    expect(onReorderSection).not.toHaveBeenCalled();
  });

  it('drop with invalid dataTransfer does not call onReorderSection', () => {
    const onReorderSection = vi.fn();
    renderOutlineView({ onReorderSection });

    const entry = screen.getByTestId('outline-entry-0');

    fireEvent.drop(entry, {
      dataTransfer: { getData: vi.fn(() => 'not-a-number') },
    });

    expect(onReorderSection).not.toHaveBeenCalled();
  });

  it('drop on same index does not call onReorderSection', () => {
    const onReorderSection = vi.fn();
    renderOutlineView({ onReorderSection });

    const entry = screen.getByTestId('outline-entry-0');

    fireEvent.drop(entry, {
      dataTransfer: { getData: vi.fn(() => '0') },
    });

    expect(onReorderSection).not.toHaveBeenCalled();
  });
});
