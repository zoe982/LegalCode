import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
} from '@mui/material';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  useTrashTemplates,
  useRestoreTemplate,
  useHardDeleteTemplate,
} from '../hooks/useTemplates.js';
import { DeleteTemplateDialog } from './DeleteTemplateDialog.js';

function daysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const headerCellSx = {
  fontFamily: '"DM Sans", sans-serif',
  fontSize: '0.6875rem',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  color: '#6B6D82',
  backgroundColor: '#F9F9FB',
  borderBottom: '1px solid #E4E5ED',
  letterSpacing: '0.05em',
} as const;

const bodyCellSx = {
  fontFamily: '"DM Sans", sans-serif',
  fontSize: '0.875rem',
  color: '#12111A',
  borderBottom: '1px solid #E4E5ED',
} as const;

export function TrashManager() {
  const { data, isLoading } = useTrashTemplates();
  const restoreMutation = useRestoreTemplate();
  const hardDeleteMutation = useHardDeleteTemplate();

  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handleRestore = useCallback(
    (id: string) => {
      restoreMutation.mutate(id);
    },
    [restoreMutation],
  );

  const handlePermanentDeleteClick = useCallback((id: string, title: string) => {
    setPermanentDeleteTarget({ id, title });
  }, []);

  const handlePermanentDeleteConfirm = useCallback(() => {
    if (permanentDeleteTarget) {
      hardDeleteMutation.mutate(permanentDeleteTarget.id, {
        onSuccess: () => {
          setPermanentDeleteTarget(null);
        },
      });
    }
  }, [permanentDeleteTarget, hardDeleteMutation]);

  const templates = data?.data ?? [];

  if (isLoading) {
    return (
      <Typography
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '0.875rem',
          color: '#6B6D82',
        }}
      >
        Loading...
      </Typography>
    );
  }

  if (templates.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 4,
          gap: 1,
        }}
      >
        <DeleteOutlineRounded sx={{ fontSize: 40, color: '#9B9DB0' }} />
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            color: '#6B6D82',
          }}
        >
          No deleted templates
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Table size="small" aria-label="Deleted templates">
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Title</TableCell>
            <TableCell sx={headerCellSx}>Deleted by</TableCell>
            <TableCell sx={headerCellSx}>Deleted</TableCell>
            <TableCell sx={headerCellSx}>Days remaining</TableCell>
            <TableCell sx={headerCellSx}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {templates.map((template) => {
            const days = template.deletedAt ? daysRemaining(template.deletedAt) : 0;
            return (
              <TableRow
                key={template.id}
                sx={{
                  '&:hover': { backgroundColor: '#F3F3F7' },
                }}
              >
                <TableCell sx={bodyCellSx}>{template.title}</TableCell>
                <TableCell sx={bodyCellSx}>{template.deletedBy ?? '-'}</TableCell>
                <TableCell sx={bodyCellSx}>
                  {template.deletedAt ? formatDate(template.deletedAt) : '-'}
                </TableCell>
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    color: days < 7 ? '#DC2626' : '#12111A',
                    fontWeight: days < 7 ? 600 : 400,
                  }}
                >
                  {String(days)}
                </TableCell>
                <TableCell sx={bodyCellSx}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        handleRestore(template.id);
                      }}
                      sx={{
                        borderColor: '#8027FF',
                        color: '#8027FF',
                        height: 28,
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        borderRadius: '6px',
                        '&:hover': {
                          borderColor: '#6B1FDB',
                          backgroundColor: 'rgba(128, 39, 255, 0.04)',
                        },
                      }}
                    >
                      Restore
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        handlePermanentDeleteClick(template.id, template.title);
                      }}
                      sx={{
                        color: '#DC2626',
                        height: 28,
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: '#FEE2E2',
                        },
                      }}
                    >
                      Delete permanently
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DeleteTemplateDialog
        open={permanentDeleteTarget !== null}
        onClose={() => {
          setPermanentDeleteTarget(null);
        }}
        onConfirm={handlePermanentDeleteConfirm}
        templateTitle={permanentDeleteTarget?.title ?? ''}
        isDeleting={hardDeleteMutation.isPending}
        variant="permanent"
      />
    </>
  );
}
