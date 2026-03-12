import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import type { Company } from '@legalcode/shared';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '../hooks/useCompanies.js';

export function CompanyManager() {
  const { data, isLoading, error } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);

  const companies = data?.companies ?? [];

  const handleAdd = () => {
    setFormError(null);
    createCompany.mutate(
      { name },
      {
        onSuccess: () => {
          setName('');
        },
        onError: (err: Error) => {
          setFormError(err.message);
        },
      },
    );
  };

  const handleStartEdit = (company: Company) => {
    setEditTarget(company);
    setEditName(company.name);
  };

  const handleSaveEdit = () => {
    /* v8 ignore next */
    if (!editTarget) return;
    updateCompany.mutate(
      { id: editTarget.id, name: editName },
      {
        onSuccess: () => {
          setEditTarget(null);
          setEditName('');
        },
      },
    );
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setEditName('');
  };

  const handleConfirmDelete = () => {
    /* v8 ignore next */
    if (!deleteTarget) return;
    deleteCompany.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const addDisabled = !name.trim() || createCompany.isPending;

  return (
    <Box>
      {/* Add Company Form */}
      <Box
        aria-label="Add company form"
        sx={{
          backgroundColor: '#F9F9FB',
          borderRadius: '10px',
          p: '20px',
          mb: '24px',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: '1.25rem',
            color: '#12111A',
            mb: '16px',
          }}
        >
          Add Company
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <TextField
            label="Company name"
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            disabled={addDisabled}
            onClick={handleAdd}
            sx={{
              flexShrink: 0,
              backgroundColor: '#8027FF',
              color: '#FFFFFF',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 600,
              lineHeight: '1.125rem',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#6B1FDB',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            {createCompany.isPending ? (
              <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Add'
            )}
          </Button>
        </Box>
        {formError != null && (
          <Alert severity="error" sx={{ mt: '12px' }}>
            {formError}
          </Alert>
        )}
      </Box>

      {/* Companies List */}
      {isLoading && (
        <Box aria-busy="true" sx={{ display: 'flex', justifyContent: 'center', py: '32px' }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error != null && (
        <Alert severity="error">
          {/* v8 ignore next */}
          {error instanceof Error ? error.message : 'Failed to fetch companies'}
        </Alert>
      )}

      {!isLoading && error == null && companies.length === 0 && (
        <Box sx={{ textAlign: 'center', py: '32px' }}>
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              lineHeight: '1.5rem',
              color: '#12111A',
            }}
          >
            No companies yet
          </Typography>
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.75rem',
              fontWeight: 400,
              lineHeight: '1rem',
              color: '#6B6D82',
            }}
          >
            Add a company above to get started.
          </Typography>
        </Box>
      )}

      {!isLoading && error == null && companies.length > 0 && (
        <Table sx={{ '& .MuiTableCell-root': { borderColor: '#E4E5ED' } }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9F9FB' }}>
              <TableCell
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  lineHeight: '1rem',
                  color: '#6B6D82',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: '12px',
                  px: '16px',
                }}
              >
                Name
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  lineHeight: '1rem',
                  color: '#6B6D82',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  py: '12px',
                  px: '16px',
                  width: 120,
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((co) => (
              <TableRow
                key={co.id}
                sx={{
                  transition: 'background-color 150ms ease',
                  '&:hover': { backgroundColor: '#F3F3F7' },
                }}
              >
                <TableCell sx={{ py: '12px', px: '16px' }}>
                  {editTarget?.id === co.id ? (
                    <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={editName}
                        onChange={(e) => {
                          setEditName(e.target.value);
                        }}
                        label="Edit name"
                        sx={{ flex: 1 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || updateCompany.isPending}
                        sx={{
                          backgroundColor: '#8027FF',
                          color: '#FFFFFF',
                          textTransform: 'none',
                          '&:hover': { backgroundColor: '#6B1FDB' },
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        onClick={handleCancelEdit}
                        sx={{ color: '#6B6D82', textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  ) : (
                    <Typography
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        lineHeight: '1.5rem',
                        color: '#12111A',
                      }}
                    >
                      {co.name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: '12px', px: '16px' }}>
                  {editTarget?.id !== co.id && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tooltip title={`Edit ${co.name}`}>
                        <IconButton
                          aria-label={`Edit ${co.name}`}
                          onClick={() => {
                            handleStartEdit(co);
                          }}
                          sx={{
                            color: '#9B9DB0',
                            '&:hover': {
                              color: '#8027FF',
                              backgroundColor: '#F3F0FF',
                              borderRadius: '6px',
                            },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={`Delete ${co.name}`}>
                        <IconButton
                          aria-label={`Delete ${co.name}`}
                          onClick={() => {
                            setDeleteTarget(co);
                          }}
                          sx={{
                            color: '#9B9DB0',
                            '&:hover': {
                              color: '#DC2626',
                              backgroundColor: '#FEE2E2',
                              borderRadius: '6px',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget != null}
        onClose={() => {
          setDeleteTarget(null);
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: '"Source Serif 4", serif',
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: '2rem',
            color: '#12111A',
          }}
        >
          Delete Company
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 400,
              lineHeight: '1.5rem',
              color: '#37354A',
            }}
          >
            Delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: '24px' }}>
          <Button
            onClick={() => {
              setDeleteTarget(null);
            }}
            sx={{
              color: '#6B6D82',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleteCompany.isPending}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#B91C1C',
              },
            }}
          >
            {deleteCompany.isPending ? (
              <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
