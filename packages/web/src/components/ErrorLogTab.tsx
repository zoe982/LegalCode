import { useState, useCallback } from 'react';
import { Box, Typography, Chip, CircularProgress, Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { ErrorLogEntry, ErrorSource, ErrorStatus } from '@legalcode/shared';
import { useErrorLog, useResolveError } from '../hooks/useErrorLog.js';
import { generateFixPrompt } from '../utils/generateFixPrompt.js';
import { relativeTime } from '../utils/relativeTime.js';

const SOURCE_LABELS: Record<ErrorSource, string> = {
  frontend: 'FE',
  backend: 'BE',
  websocket: 'WS',
  functional: 'FUNC',
};

const SOURCE_COLORS: Record<ErrorSource, string> = {
  frontend: '#8027FF',
  backend: '#5C1A99',
  websocket: '#2E7D32',
  functional: '#ED6C02',
};

type SourceFilter = ErrorSource | 'all';
type StatusFilter = ErrorStatus | 'all';

const ACTIVE_CHIP_SX = { backgroundColor: '#8027FF', color: '#fff' } as const;

export function ErrorLogTab() {
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filters: Record<string, string | undefined> = {};
  if (sourceFilter !== 'all') filters.source = sourceFilter;
  if (statusFilter !== 'all') filters.status = statusFilter;

  const { data, isLoading } = useErrorLog(Object.keys(filters).length > 0 ? filters : undefined);
  const resolveError = useResolveError();

  const handleCopyPrompt = useCallback(async (entry: ErrorLogEntry) => {
    const prompt = generateFixPrompt(entry);
    await navigator.clipboard.writeText(prompt);
    setCopiedId(entry.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }, []);

  const handleResolve = useCallback(
    (id: string) => {
      resolveError.mutate(id);
    },
    [resolveError],
  );

  const errors = data?.errors ?? [];

  return (
    <Box>
      {/* Filter bar */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Source filters */}
        <Chip
          label="All"
          variant={sourceFilter === 'all' ? 'filled' : 'outlined'}
          onClick={() => {
            setSourceFilter('all');
          }}
          sx={sourceFilter === 'all' ? ACTIVE_CHIP_SX : undefined}
        />
        {(Object.keys(SOURCE_LABELS) as ErrorSource[]).map((source) => (
          <Chip
            key={source}
            label={SOURCE_LABELS[source]}
            variant={sourceFilter === source ? 'filled' : 'outlined'}
            onClick={() => {
              setSourceFilter(source);
            }}
            sx={sourceFilter === source ? ACTIVE_CHIP_SX : undefined}
          />
        ))}

        <Box sx={{ width: 8 }} />

        {/* Status filters */}
        <Chip
          label="All"
          variant={statusFilter === 'all' ? 'filled' : 'outlined'}
          onClick={() => {
            setStatusFilter('all');
          }}
          sx={statusFilter === 'all' ? ACTIVE_CHIP_SX : undefined}
        />
        <Chip
          label="Open"
          variant={statusFilter === 'open' ? 'filled' : 'outlined'}
          onClick={() => {
            setStatusFilter('open');
          }}
          sx={statusFilter === 'open' ? ACTIVE_CHIP_SX : undefined}
        />
        <Chip
          label="Resolved"
          variant={statusFilter === 'resolved' ? 'filled' : 'outlined'}
          onClick={() => {
            setStatusFilter('resolved');
          }}
          sx={statusFilter === 'resolved' ? ACTIVE_CHIP_SX : undefined}
        />
      </Box>

      {/* Content */}
      {isLoading ? (
        <CircularProgress size={24} />
      ) : errors.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              color: '#451F61',
              mb: 1,
            }}
          >
            No errors recorded
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B5A7A' }}>
            When errors occur, they will appear here.
          </Typography>
        </Box>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {errors.map((entry) => (
            <Box
              component="li"
              key={entry.id}
              role="listitem"
              style={{ opacity: entry.status === 'resolved' ? 0.5 : 1 }}
              sx={{
                p: 2,
                mb: 1,
                backgroundColor: '#F7F0E6',
                borderRadius: '8px',
              }}
            >
              {/* Header row: source badge + message + occurrence count */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={SOURCE_LABELS[entry.source]}
                  size="small"
                  sx={{
                    backgroundColor: SOURCE_COLORS[entry.source],
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 600,
                    color: '#451F61',
                    fontSize: '0.875rem',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.message}
                </Typography>
                {entry.occurrenceCount > 1 && (
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#6B5A7A',
                    }}
                  >
                    {`×${String(entry.occurrenceCount)}`}
                  </Typography>
                )}
              </Box>

              {/* Caption: relative time, url, userId */}
              <Typography variant="caption" sx={{ color: '#6B5A7A', display: 'block', mb: 0.5 }}>
                {relativeTime(entry.timestamp)}
                {entry.url ? ` — ${entry.url}` : ''}
                {entry.userId ? ` — ${entry.userId}` : ''}
              </Typography>

              {/* Stack preview */}
              {entry.stack ? (
                <Box
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    color: '#6B5A7A',
                    backgroundColor: '#EFE3D3',
                    borderRadius: '4px',
                    p: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 1,
                  }}
                >
                  {entry.stack}
                </Box>
              ) : null}

              {/* Actions */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => {
                    void handleCopyPrompt(entry);
                  }}
                  aria-label="Copy Prompt"
                >
                  {copiedId === entry.id ? 'Copied!' : 'Copy Prompt'}
                </Button>
                {entry.status === 'open' && (
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => {
                      handleResolve(entry.id);
                    }}
                    aria-label="Mark Fixed"
                  >
                    Mark Fixed
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
