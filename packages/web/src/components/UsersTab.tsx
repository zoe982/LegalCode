import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import DeleteIcon from '@mui/icons-material/Delete';
import type { Role, User } from '@legalcode/shared';
import {
  useUsers,
  useCreateUser,
  useUpdateUserRole,
  useRemoveUser,
  useAllowedEmails,
  useAddAllowedEmail,
  useRemoveAllowedEmail,
} from '../hooks/useUsers.js';
import { useAuth } from '../hooks/useAuth.js';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  /* v8 ignore next */
  const first = parts[0]?.[0] ?? '';
  /* v8 ignore next */
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

const ROLE_CHIP_STYLES: Record<
  Role,
  {
    variant: 'filled' | 'outlined';
    backgroundColor?: string;
    color: string;
    border?: string;
  }
> = {
  admin: {
    variant: 'filled',
    backgroundColor: '#8027FF',
    color: '#FFFFFF',
  },
  editor: {
    variant: 'outlined',
    color: '#12111A',
    border: '1px solid #E4E5ED',
  },
  viewer: {
    variant: 'outlined',
    color: '#6B6D82',
    border: '1px solid #F3F3F7',
  },
};

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const { data: usersData, isLoading: usersLoading, error: usersError } = useUsers();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const removeUser = useRemoveUser();
  const { data: allowedEmailsData } = useAllowedEmails();
  const addAllowedEmail = useAddAllowedEmail();
  const removeAllowedEmail = useRemoveAllowedEmail();

  // Add user form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('viewer');
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add allowed email state
  const [allowedEmailInput, setAllowedEmailInput] = useState('');

  // Confirmation dialogs
  const [removeUserTarget, setRemoveUserTarget] = useState<User | null>(null);
  const [removeEmailTarget, setRemoveEmailTarget] = useState<string | null>(null);

  const users = usersData?.users ?? [];
  const allowedEmails = allowedEmailsData?.emails ?? [];

  const isSelf = useCallback((userId: string) => currentUser?.id === userId, [currentUser]);

  const handleAddUser = () => {
    setFormError(null);
    setFormSuccess(false);
    createUser.mutate(
      { email, name, role },
      {
        onSuccess: () => {
          setEmail('');
          setName('');
          setRole('viewer');
          setFormSuccess(true);
          setTimeout(() => {
            setFormSuccess(false);
          }, 4000);
        },
        onError: (err: Error) => {
          setFormError(err.message);
        },
      },
    );
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    updateUserRole.mutate({ id: userId, role: newRole });
  };

  const handleConfirmRemoveUser = () => {
    /* v8 ignore next */
    if (!removeUserTarget) return;
    removeUser.mutate(removeUserTarget.id, {
      onSuccess: () => {
        setRemoveUserTarget(null);
      },
    });
  };

  const handleAddAllowedEmail = () => {
    addAllowedEmail.mutate(allowedEmailInput, {
      onSuccess: () => {
        setAllowedEmailInput('');
      },
    });
  };

  const handleConfirmRemoveEmail = () => {
    /* v8 ignore next */
    if (!removeEmailTarget) return;
    removeAllowedEmail.mutate(removeEmailTarget, {
      onSuccess: () => {
        setRemoveEmailTarget(null);
      },
    });
  };

  const addUserDisabled = !email.trim() || !name.trim() || createUser.isPending;

  return (
    <Box>
      {/* Add User Form */}
      <Box
        aria-label="Add new user form"
        sx={{
          backgroundColor: '#F9F9FB',
          borderRadius: '10px',
          p: '20px',
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
          Add User
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <TextField
            label="Email"
            type="email"
            size="small"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            sx={{ flex: 1, minWidth: 180 }}
          />
          <TextField
            label="Name"
            size="small"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            sx={{ flex: 1, minWidth: 180 }}
          />
          <Select
            value={role}
            onChange={(e: SelectChangeEvent) => {
              setRole(e.target.value as Role);
            }}
            size="small"
            aria-label="Select role for new user"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="editor">Editor</MenuItem>
            <MenuItem value="viewer">Viewer</MenuItem>
          </Select>
          <Button
            variant="contained"
            disabled={addUserDisabled}
            onClick={handleAddUser}
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
            {createUser.isPending ? (
              <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Add User'
            )}
          </Button>
        </Box>
        {formSuccess && (
          <Alert severity="success" sx={{ mt: '12px' }}>
            User added successfully.
          </Alert>
        )}
        {formError != null && (
          <Alert severity="error" sx={{ mt: '12px' }}>
            {formError}
          </Alert>
        )}
      </Box>

      <Divider sx={{ my: '32px', borderColor: '#E4E5ED' }} />

      {/* Users Section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', mb: '16px' }}>
          <Typography
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 600,
              lineHeight: '1.25rem',
              color: '#12111A',
            }}
          >
            Users
          </Typography>
          {users.length > 0 && (
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 400,
                lineHeight: '1rem',
                color: '#6B6D82',
              }}
            >
              {users.length}
            </Typography>
          )}
        </Box>

        {usersLoading && (
          <Box aria-busy="true" sx={{ display: 'flex', justifyContent: 'center', py: '32px' }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {usersError != null && (
          <Alert severity="error">
            {/* v8 ignore next */}
            {usersError instanceof Error ? usersError.message : 'Failed to fetch users'}
          </Alert>
        )}

        {!usersLoading && usersError == null && users.length === 0 && (
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
              No users yet
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
              Add a user above to get started.
            </Typography>
          </Box>
        )}

        {!usersLoading && usersError == null && users.length > 0 && (
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
                  }}
                >
                  Email
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
                  }}
                >
                  Role
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
                  }}
                >
                  Member Since
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
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const self = isSelf(u.id);
                const chipStyle = ROLE_CHIP_STYLES[u.role];
                return (
                  <TableRow
                    key={u.id}
                    sx={{
                      transition: 'background-color 150ms ease',
                      '&:hover': { backgroundColor: '#F3F3F7' },
                    }}
                  >
                    <TableCell sx={{ py: '12px', px: '16px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            fontFamily: '"DM Sans", sans-serif',
                            backgroundColor: '#8027FF',
                            color: '#FFFFFF',
                          }}
                        >
                          {getInitials(u.name)}
                        </Avatar>
                        <Typography
                          sx={{
                            fontFamily: '"DM Sans", sans-serif',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: '1.5rem',
                            color: '#12111A',
                          }}
                        >
                          {u.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: '12px', px: '16px' }}>
                      <Typography
                        sx={{
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '0.875rem',
                          fontWeight: 400,
                          lineHeight: '1.5rem',
                          color: '#37354A',
                        }}
                      >
                        {u.email}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: '12px', px: '16px' }}>
                      <Chip
                        label={u.role.toUpperCase()}
                        variant={chipStyle.variant}
                        size="small"
                        sx={{
                          borderRadius: '9999px',
                          px: '10px',
                          py: '3px',
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          lineHeight: '1rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          backgroundColor: chipStyle.backgroundColor ?? 'transparent',
                          color: chipStyle.color,
                          border: chipStyle.border ?? 'none',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: '12px', px: '16px' }}>
                      <Typography
                        sx={{
                          fontFamily: '"DM Sans", sans-serif',
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          lineHeight: '1rem',
                          color: '#6B6D82',
                        }}
                      >
                        {formatDate(u.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: '12px', px: '16px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tooltip
                          title={self ? 'You cannot modify your own account' : ''}
                          disableHoverListener={!self}
                        >
                          <span>
                            <Select
                              value={u.role}
                              onChange={(e: SelectChangeEvent) => {
                                handleRoleChange(u.id, e.target.value as Role);
                              }}
                              size="small"
                              disabled={self}
                              aria-label={`Change role for ${u.name}`}
                              sx={{ minWidth: 100 }}
                            >
                              <MenuItem value="admin">Admin</MenuItem>
                              <MenuItem value="editor">Editor</MenuItem>
                              <MenuItem value="viewer">Viewer</MenuItem>
                            </Select>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={self ? 'You cannot modify your own account' : `Remove ${u.name}`}
                        >
                          <span>
                            <IconButton
                              disabled={self}
                              onClick={() => {
                                setRemoveUserTarget(u);
                              }}
                              aria-label={`Remove ${u.name}`}
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
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Box>

      <Divider sx={{ my: '32px', borderColor: '#E4E5ED' }} />

      {/* Allowed Emails Section */}
      <Box>
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
          Allowed Emails
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: '1rem',
            color: '#6B6D82',
            mb: '12px',
          }}
        >
          Email addresses that are allowed to sign in to LegalCode.
        </Typography>
        <Box sx={{ display: 'flex', gap: '8px', mb: '16px' }}>
          <TextField
            label="Add email"
            size="small"
            value={allowedEmailInput}
            onChange={(e) => {
              setAllowedEmailInput(e.target.value);
            }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            disabled={!allowedEmailInput.trim() || addAllowedEmail.isPending}
            onClick={handleAddAllowedEmail}
            sx={{
              flexShrink: 0,
              borderColor: '#E4E5ED',
              color: '#12111A',
              textTransform: 'none',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 600,
            }}
          >
            Add
          </Button>
        </Box>

        {allowedEmails.length === 0 && (
          <Box sx={{ textAlign: 'center', py: '16px' }}>
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 400,
                lineHeight: '1rem',
                color: '#6B6D82',
              }}
            >
              No allowed emails configured.
            </Typography>
          </Box>
        )}

        {allowedEmails.length > 0 && (
          <List disablePadding>
            {allowedEmails.map((emailAddr) => (
              <ListItem
                key={emailAddr}
                sx={{
                  py: '12px',
                  px: '16px',
                  '&:hover': { backgroundColor: '#F3F3F7' },
                }}
                secondaryAction={
                  <Tooltip title={`Remove ${emailAddr}`}>
                    <IconButton
                      edge="end"
                      aria-label={`Remove ${emailAddr} from allowed list`}
                      onClick={() => {
                        setRemoveEmailTarget(emailAddr);
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
                }
              >
                <ListItemText
                  primary={emailAddr}
                  slotProps={{
                    primary: {
                      sx: {
                        fontFamily: '"DM Sans", sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        lineHeight: '1.5rem',
                        color: '#37354A',
                      },
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Remove User Confirmation Dialog */}
      <Dialog
        open={removeUserTarget != null}
        onClose={() => {
          setRemoveUserTarget(null);
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
          Remove User
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
            Remove <strong>{removeUserTarget?.name}</strong> ({removeUserTarget?.email}) from
            LegalCode? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: '24px' }}>
          <Button
            onClick={() => {
              setRemoveUserTarget(null);
            }}
            sx={{
              color: '#6B6D82',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveUser}
            variant="contained"
            disabled={removeUser.isPending}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#B91C1C',
              },
            }}
          >
            {removeUser.isPending ? (
              <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Remove'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Allowed Email Confirmation Dialog */}
      <Dialog
        open={removeEmailTarget != null}
        onClose={() => {
          setRemoveEmailTarget(null);
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
          Remove Allowed Email
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
            Remove {removeEmailTarget} from the allowed list? They will not be able to log in.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: '24px' }}>
          <Button
            onClick={() => {
              setRemoveEmailTarget(null);
            }}
            sx={{
              color: '#6B6D82',
              textTransform: 'none',
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRemoveEmail}
            variant="contained"
            disabled={removeAllowedEmail.isPending}
            sx={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#B91C1C',
              },
            }}
          >
            {removeAllowedEmail.isPending ? (
              <CircularProgress size={16} sx={{ color: '#FFFFFF' }} />
            ) : (
              'Remove'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
