import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useTemplateVersions } from '../hooks/useTemplates.js';
import { templateService } from '../services/templates.js';
import { computeDiff, type DiffLine } from '../utils/diff.js';
import type { TemplateVersion } from '@legalcode/shared';
import { useTopAppBarConfig } from '../contexts/TopAppBarContext.js';

type DiffMode = 'unified' | 'side-by-side';

const REMOVED_BG = '#D32F2F1A';
const ADDED_BG = '#2D6A4F1A';
const MONO_FONT = '"JetBrains Mono", "Fira Code", "Consolas", monospace';
const ACCENT = '#8027FF';

export function DiffViewPage() {
  const {
    id,
    v1: v1Param,
    v2: v2Param,
  } = useParams<{
    id: string;
    v1: string;
    v2: string;
  }>();
  const navigate = useNavigate();
  const { setConfig, clearConfig } = useTopAppBarConfig();

  const templateId = id ?? '';
  const [leftVersion, setLeftVersion] = useState(Number(v1Param ?? '1'));
  const [rightVersion, setRightVersion] = useState(Number(v2Param ?? '2'));
  const [diffMode, setDiffMode] = useState<DiffMode>('unified');

  const [leftContent, setLeftContent] = useState<TemplateVersion | null>(null);
  const [rightContent, setRightContent] = useState<TemplateVersion | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  const { data: versions, isLoading: versionsLoading } = useTemplateVersions(templateId);

  // Set top app bar config
  useEffect(() => {
    setConfig({
      breadcrumbTemplateName: 'Version Comparison',
    });
    return () => {
      clearConfig();
    };
  }, [setConfig, clearConfig]);

  // Fetch version contents
  useEffect(() => {
    if (!templateId) {
      setLoadingContent(false);
      return;
    }
    setLoadingContent(true);

    void Promise.all([
      templateService.getVersion(templateId, leftVersion),
      templateService.getVersion(templateId, rightVersion),
    ]).then(([left, right]) => {
      setLeftContent(left);
      setRightContent(right);
      setLoadingContent(false);
    });
  }, [templateId, leftVersion, rightVersion]);

  /* v8 ignore next 3 -- MUI Select onChange not easily testable in jsdom */
  const handleLeftVersionChange = useCallback((event: SelectChangeEvent<number>) => {
    setLeftVersion(event.target.value);
  }, []);

  /* v8 ignore next 3 -- MUI Select onChange not easily testable in jsdom */
  const handleRightVersionChange = useCallback((event: SelectChangeEvent<number>) => {
    setRightVersion(event.target.value);
  }, []);

  const handleBackToEditor = useCallback(() => {
    void navigate(`/templates/${templateId}`);
  }, [navigate, templateId]);

  const diffLines = useMemo<DiffLine[]>(() => {
    if (!leftContent || !rightContent) return [];
    return computeDiff(leftContent.content, rightContent.content);
  }, [leftContent, rightContent]);

  // Split diff lines for side-by-side view
  const sideBySidePanels = useMemo(() => {
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];

    for (const line of diffLines) {
      if (line.type === 'unchanged') {
        left.push(line);
        right.push(line);
      } else if (line.type === 'removed') {
        left.push(line);
        right.push(null);
      } else {
        left.push(null);
        right.push(line);
      }
    }

    return { left, right };
  }, [diffLines]);

  if (versionsLoading || loadingContent) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {/* Version selectors */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="left-version-label">From</InputLabel>
          <Select<number>
            labelId="left-version-label"
            value={leftVersion}
            onChange={handleLeftVersionChange}
            label="From"
          >
            {(versions ?? []).map((v) => (
              <MenuItem key={v.id} value={v.version}>
                v{String(v.version)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="right-version-label">To</InputLabel>
          <Select<number>
            labelId="right-version-label"
            value={rightVersion}
            onChange={handleRightVersionChange}
            label="To"
          >
            {(versions ?? []).map((v) => (
              <MenuItem key={v.id} value={v.version}>
                v{String(v.version)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Diff mode toggle */}
        <Box sx={{ display: 'flex', gap: 0 }}>
          <Button
            variant={diffMode === 'unified' ? 'contained' : 'outlined'}
            onClick={() => {
              setDiffMode('unified');
            }}
            aria-pressed={diffMode === 'unified'}
            size="small"
            sx={{
              borderRadius: '8px 0 0 8px',
              textTransform: 'none',
              ...(diffMode === 'unified'
                ? {
                    backgroundColor: ACCENT,
                    '&:hover': { backgroundColor: '#6B1FD6' },
                  }
                : {
                    color: '#451F61',
                    borderColor: '#D4C5B3',
                  }),
            }}
          >
            Unified
          </Button>
          <Button
            variant={diffMode === 'side-by-side' ? 'contained' : 'outlined'}
            onClick={() => {
              setDiffMode('side-by-side');
            }}
            aria-pressed={diffMode === 'side-by-side'}
            size="small"
            sx={{
              borderRadius: '0 8px 8px 0',
              textTransform: 'none',
              ...(diffMode === 'side-by-side'
                ? {
                    backgroundColor: ACCENT,
                    '&:hover': { backgroundColor: '#6B1FD6' },
                  }
                : {
                    color: '#451F61',
                    borderColor: '#D4C5B3',
                  }),
            }}
          >
            Side-by-side
          </Button>
        </Box>

        {/* Back to editor */}
        <Button
          onClick={handleBackToEditor}
          aria-label="Back to editor"
          sx={{
            ml: 'auto',
            color: ACCENT,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Back to editor
        </Button>
      </Box>

      {/* Diff content */}
      <Box data-testid="diff-container" sx={{ flex: 1, overflow: 'auto' }}>
        {diffMode === 'unified' ? (
          <UnifiedDiff lines={diffLines} />
        ) : (
          <SideBySideDiff
            left={sideBySidePanels.left}
            right={sideBySidePanels.right}
            leftVersion={leftVersion}
            rightVersion={rightVersion}
          />
        )}
      </Box>
    </Box>
  );
}

function UnifiedDiff({ lines }: { lines: DiffLine[] }) {
  return (
    <Box
      sx={{
        maxWidth: 860,
        mx: 'auto',
        fontFamily: MONO_FONT,
        fontSize: '0.875rem',
        lineHeight: 1.6,
      }}
    >
      {lines.map((line, idx) => {
        const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        const bg =
          line.type === 'added' ? ADDED_BG : line.type === 'removed' ? REMOVED_BG : 'transparent';

        return (
          <Box
            key={idx}
            data-testid={`diff-line-${line.type}`}
            sx={{
              backgroundColor: bg,
              px: 2,
              py: 0.25,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: MONO_FONT,
                fontSize: 'inherit',
                color:
                  line.type === 'added'
                    ? '#2D6A4F'
                    : line.type === 'removed'
                      ? '#D32F2F'
                      : '#451F61',
                userSelect: 'none',
                mr: 1,
                display: 'inline-block',
                width: '1ch',
              }}
            >
              {prefix}
            </Typography>
            {line.text}
          </Box>
        );
      })}
    </Box>
  );
}

function SideBySideDiff({
  left,
  right,
  leftVersion,
  rightVersion,
}: {
  left: (DiffLine | null)[];
  right: (DiffLine | null)[];
  leftVersion: number;
  rightVersion: number;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Box data-testid="diff-side-left" sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 600,
            color: '#9A8DA6',
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Version {String(leftVersion)}
        </Typography>
        <Box sx={{ fontFamily: MONO_FONT, fontSize: '0.875rem', lineHeight: 1.6 }}>
          {left.map((line, idx) => {
            if (!line) {
              return (
                <Box key={idx} sx={{ py: 0.25, px: 2, minHeight: '1.6em' }}>
                  &nbsp;
                </Box>
              );
            }
            const bg = line.type === 'removed' ? REMOVED_BG : 'transparent';
            return (
              <Box
                key={idx}
                data-testid={`diff-line-${line.type}`}
                sx={{ backgroundColor: bg, px: 2, py: 0.25, whiteSpace: 'pre-wrap' }}
              >
                {line.text}
              </Box>
            );
          })}
        </Box>
      </Box>
      <Box data-testid="diff-side-right" sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 600,
            color: '#9A8DA6',
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Version {String(rightVersion)}
        </Typography>
        <Box sx={{ fontFamily: MONO_FONT, fontSize: '0.875rem', lineHeight: 1.6 }}>
          {right.map((line, idx) => {
            if (!line) {
              return (
                <Box key={idx} sx={{ py: 0.25, px: 2, minHeight: '1.6em' }}>
                  &nbsp;
                </Box>
              );
            }
            const bg = line.type === 'added' ? ADDED_BG : 'transparent';
            return (
              <Box
                key={idx}
                data-testid={`diff-line-${line.type}`}
                sx={{ backgroundColor: bg, px: 2, py: 0.25, whiteSpace: 'pre-wrap' }}
              >
                {line.text}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
