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
import type { Country } from '@legalcode/shared';
import {
  useCountries,
  useCreateCountry,
  useUpdateCountry,
  useDeleteCountry,
} from '../hooks/useCountries.js';

export function CountryManager() {
  const { data, isLoading, error } = useCountries();
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Country | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Country | null>(null);

  const countries = data?.countries ?? [];

  const handleAdd = () => {
    setFormError(null);
    createCountry.mutate(
      { name, code },
      {
        onSuccess: () => {
          setName('');
          setCode('');
        },
        onError: (err: Error) => {
          setFormError(err.message);
        },
      },
    );
  };

  const handleStartEdit = (country: Country) => {
    setEditTarget(country);
    setEditName(country.name);
    setEditCode(country.code);
  };

  const handleSaveEdit = () => {
    /* v8 ignore next */
    if (!editTarget) return;
    updateCountry.mutate(
      { id: editTarget.id, name: editName, code: editCode },
      {
        onSuccess: () => {
          setEditTarget(null);
          setEditName('');
          setEditCode('');
        },
      },
    );
  };

  const handleCancelEdit = () => {
    setEditTarget(null);
    setEditName('');
    setEditCode('');
  };

  const handleConfirmDelete = () => {
    /* v8 ignore next */
    if (!deleteTarget) return;
    deleteCountry.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  };

  const addDisabled = !name.trim() || !code.trim() || createCountry.isPending;

  return (
    <Box>
      {/* Add Country Form */}
      <Box
        aria-label="Add country form"
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
          Add Country
        </Typography>
        <Box
          sx={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <TextField
            label="Country name"
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="Country code"
            size="small"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
            }}
            sx={{ width: 100 }}
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
            {createCountry.isPending ? (
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

      {/* Countries List */}
      {isLoading && (
        <Box aria-busy="true" sx={{ display: 'flex', justifyContent: 'center', py: '32px' }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {error != null && (
        <Alert severity="error">
          {/* v8 ignore next */}
          {error instanceof Error ? error.message : 'Failed to fetch countries'}
        </Alert>
      )}

      {!isLoading && error == null && countries.length === 0 && (
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
            No countries yet
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
            Add a country above to get started.
          </Typography>
        </Box>
      )}

      {!isLoading && error == null && countries.length > 0 && (
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
                  width: 100,
                }}
              >
                Code
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
            {countries.map((country) => (
              <TableRow
                key={country.id}
                sx={{
                  transition: 'background-color 150ms ease',
                  '&:hover': { backgroundColor: '#F3F3F7' },
                }}
              >
                <TableCell sx={{ py: '12px', px: '16px' }}>
                  {editTarget?.id === country.id ? (
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
                      <TextField
                        size="small"
                        value={editCode}
                        onChange={(e) => {
                          setEditCode(e.target.value);
                        }}
                        label="Edit code"
                        sx={{ width: 80 }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || !editCode.trim() || updateCountry.isPending}
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
                      {country.name}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: '12px', px: '16px' }}>
                  {editTarget?.id !== country.id && (
                    <Typography
                      sx={{
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        lineHeight: '1.5rem',
                        color: '#37354A',
                      }}
                    >
                      {country.code}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: '12px', px: '16px' }}>
                  {editTarget?.id !== country.id && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Tooltip title={`Edit ${country.name}`}>
                        <IconButton
                          aria-label={`Edit ${country.name}`}
                          onClick={() => {
                            handleStartEdit(country);
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
                      <Tooltip title={`Delete ${country.name}`}>
                        <IconButton
                          aria-label={`Delete ${country.name}`}
                          onClick={() => {
                            setDeleteTarget(country);
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
          Delete Country
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
            Delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})? This action cannot
            be undone.
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
            disabled={deleteCountry.isPending}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#B91C1C',
              },
            }}
          >
            {deleteCountry.isPending ? (
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
