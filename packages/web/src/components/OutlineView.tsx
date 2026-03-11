import { useState, useCallback } from 'react';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DragIndicatorRounded from '@mui/icons-material/DragIndicatorRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import type { HeadingEntry } from '../editor/headingTree.js';

type DepthFilter = 'sections' | 'subsections' | 'all';

interface OutlineViewProps {
  entries: HeadingEntry[];
  onReorderSection: (fromPos: number, fromEndPos: number, toPos: number) => void;
  onNavigateToHeading: (pos: number) => void;
  onClose: () => void;
}

const INDENT_PER_LEVEL = 24; // px per heading level beyond H1

function getIndent(level: number): number {
  return (level - 1) * INDENT_PER_LEVEL;
}

function maxDepthForFilter(filter: DepthFilter): number {
  if (filter === 'sections') return 1;
  if (filter === 'subsections') return 2;
  return 4;
}

/**
 * Given a list of entries and a collapsed set (keyed by entry.pos), compute
 * the set of positions that are hidden because an ancestor is collapsed.
 */
function computeHiddenByCollapse(entries: HeadingEntry[], collapsed: Set<number>): Set<number> {
  const hidden = new Set<number>();
  let hidingUntilLevel: number | null = null;

  for (const entry of entries) {
    if (hidingUntilLevel !== null) {
      if (entry.level > hidingUntilLevel) {
        hidden.add(entry.pos);
        continue;
      } else {
        // Same or higher level — stop hiding
        hidingUntilLevel = null;
      }
    }
    if (collapsed.has(entry.pos)) {
      hidingUntilLevel = entry.level;
    }
  }

  return hidden;
}

/**
 * An entry "has children" if any subsequent entry has a deeper level before
 * the next entry with the same or higher level.
 */
function entryHasChildren(entries: HeadingEntry[], index: number): boolean {
  const entry = entries[index];
  if (!entry) return false;
  for (let i = index + 1; i < entries.length; i++) {
    const next = entries[i];
    if (!next) break;
    if (next.level <= entry.level) break;
    if (next.level > entry.level) return true;
  }
  return false;
}

export function OutlineView({
  entries,
  onReorderSection,
  onNavigateToHeading,
  onClose,
}: OutlineViewProps) {
  const [depthFilter, setDepthFilter] = useState<DepthFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);

  const toggleCollapse = useCallback((pos: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(pos)) {
        next.delete(pos);
      } else {
        next.add(pos);
      }
      return next;
    });
  }, []);

  const maxDepth = maxDepthForFilter(depthFilter);
  const filteredEntries = entries.filter((e) => e.level <= maxDepth);
  const hiddenByCollapse = computeHiddenByCollapse(filteredEntries, collapsed);
  const visibleEntries = filteredEntries.filter((e) => !hiddenByCollapse.has(e.pos));

  // Map from visible index to original filtered index (for child detection)
  const filteredIndexMap = new Map<number, number>(filteredEntries.map((e, i) => [e.pos, i]));

  const handleDragStart = useCallback(
    (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', String(index));
      setDragSourceIndex(index);
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (targetIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromIndexStr = e.dataTransfer.getData('text/plain');
      const fromIndex = parseInt(fromIndexStr, 10);
      if (isNaN(fromIndex) || fromIndex === targetIndex) {
        setDragSourceIndex(null);
        return;
      }

      const fromEntry = visibleEntries[fromIndex];
      const toEntry = visibleEntries[targetIndex];

      /* v8 ignore next 3 -- defensive guard; visibleEntries always has entries for rendered drop targets */
      if (!fromEntry || !toEntry) {
        setDragSourceIndex(null);
        return;
      }

      // Only allow drops at the same heading level
      if (fromEntry.level !== toEntry.level) {
        setDragSourceIndex(null);
        return;
      }

      onReorderSection(fromEntry.pos, fromEntry.endPos, toEntry.pos);
      setDragSourceIndex(null);
    },
    [visibleEntries, onReorderSection],
  );

  const handleDragEnd = useCallback(() => {
    setDragSourceIndex(null);
  }, []);

  return (
    <Box
      data-testid="outline-view"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--surface-primary)',
        fontFamily: '"DM Sans", sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Outline
        </Typography>
        <IconButton
          aria-label="Close outline"
          size="small"
          onClick={onClose}
          sx={{
            color: 'var(--text-secondary)',
            '&:hover': {
              backgroundColor: 'var(--surface-tertiary)',
              color: 'var(--text-primary)',
            },
          }}
        >
          <CloseRounded sx={{ fontSize: '18px' }} />
        </IconButton>
      </Box>

      {/* Depth filter chips */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        }}
      >
        {(
          [
            { label: 'Sections', value: 'sections' as const },
            { label: 'Subsections', value: 'subsections' as const },
            { label: 'All levels', value: 'all' as const },
          ] satisfies { label: string; value: DepthFilter }[]
        ).map(({ label, value }) => (
          <Chip
            key={value}
            label={label}
            size="small"
            variant={depthFilter === value ? 'filled' : 'outlined'}
            onClick={() => {
              setDepthFilter(value);
            }}
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              height: '26px',
              cursor: 'pointer',
              ...(depthFilter === value
                ? {
                    backgroundColor: '#8027FF',
                    color: '#FFFFFF',
                    borderColor: '#8027FF',
                    '&:hover': {
                      backgroundColor: '#6B1FE0',
                    },
                  }
                : {
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                    '&:hover': {
                      backgroundColor: 'var(--surface-tertiary)',
                    },
                  }),
            }}
          />
        ))}
      </Box>

      {/* Entry list */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          py: 0.5,
        }}
      >
        {visibleEntries.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100px',
            }}
          >
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.8125rem',
                color: 'var(--text-tertiary)',
              }}
            >
              No headings found
            </Typography>
          </Box>
        ) : (
          visibleEntries.map((entry, visibleIdx) => {
            const filteredIdx = filteredIndexMap.get(entry.pos) ?? visibleIdx;
            const hasChildren = entryHasChildren(filteredEntries, filteredIdx);
            const isCollapsed = collapsed.has(entry.pos);
            const isDragging = dragSourceIndex === visibleIdx;

            return (
              <Box
                key={entry.pos}
                data-testid={`outline-entry-${String(visibleIdx)}`}
                draggable="true"
                onDragStart={handleDragStart(visibleIdx)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(visibleIdx)}
                onDragEnd={handleDragEnd}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  opacity: isDragging ? 0.4 : 1,
                  cursor: 'grab',
                  borderRadius: '6px',
                  mx: 1,
                  '&:hover': {
                    backgroundColor: 'var(--surface-secondary)',
                  },
                  '&:hover [data-testid="drag-handle"]': {
                    opacity: 1,
                  },
                }}
              >
                {/* Drag handle */}
                <Box
                  data-testid="drag-handle"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0,
                    color: 'var(--text-tertiary)',
                    flexShrink: 0,
                    mt: '2px',
                  }}
                >
                  <DragIndicatorRounded sx={{ fontSize: '16px' }} />
                </Box>

                {/* Entry content with indentation */}
                <Box
                  data-testid="outline-entry-content"
                  sx={{
                    flex: 1,
                    paddingLeft: `${String(getIndent(entry.level))}px`,
                    minWidth: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {/* Collapse/expand chevron — only for entries with children */}
                    {hasChildren ? (
                      <IconButton
                        data-testid={`collapse-toggle-${String(visibleIdx)}`}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(entry.pos);
                        }}
                        sx={{
                          padding: '2px',
                          color: 'var(--text-tertiary)',
                          '&:hover': {
                            color: 'var(--text-secondary)',
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        {isCollapsed ? (
                          <ChevronRightRounded sx={{ fontSize: '16px' }} />
                        ) : (
                          <ExpandMoreRounded sx={{ fontSize: '16px' }} />
                        )}
                      </IconButton>
                    ) : (
                      <Box sx={{ width: '20px', flexShrink: 0 }} />
                    )}

                    {/* Number label */}
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.6875rem',
                        color: 'var(--text-tertiary)',
                        flexShrink: 0,
                        minWidth: '32px',
                        userSelect: 'none',
                      }}
                    >
                      {entry.number}
                    </Typography>

                    {/* Heading text */}
                    <Typography
                      component="span"
                      onClick={() => {
                        onNavigateToHeading(entry.pos);
                      }}
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.8125rem',
                        fontWeight: entry.level === 1 ? 600 : 400,
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        '&:hover': {
                          color: '#8027FF',
                        },
                      }}
                    >
                      {entry.text}
                    </Typography>
                  </Box>

                  {/* Body preview */}
                  {entry.bodyPreview !== '' && (
                    <Typography
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.6875rem',
                        color: 'var(--text-tertiary)',
                        mt: 0.25,
                        ml: '52px', // align past chevron + number
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.bodyPreview}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
