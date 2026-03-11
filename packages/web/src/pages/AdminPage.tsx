import { useEffect } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { ErrorLogTab } from '../components/ErrorLogTab.js';
import { UsersTab } from '../components/UsersTab.js';
import { CategoryManager } from '../components/CategoryManager.js';
import { CountryManager } from '../components/CountryManager.js';
import { TrashManager } from '../components/TrashManager.js';
import { useTopAppBarSetters } from '../contexts/TopAppBarContext.js';

export function AdminPage() {
  const { setConfig, clearConfig } = useTopAppBarSetters();

  useEffect(() => {
    setConfig({ breadcrumbPageName: 'Admin' });
    return () => {
      clearConfig();
    };
  }, [setConfig, clearConfig]);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      {/* Users Section */}
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#12111A',
          mb: 2,
        }}
      >
        Users
      </Typography>
      <UsersTab />

      <Divider sx={{ my: 4, borderColor: '#E4E5ED' }} />

      {/* Categories Section */}
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#12111A',
          mb: 2,
        }}
      >
        Categories
      </Typography>
      <CategoryManager />

      <Divider sx={{ my: 4, borderColor: '#E4E5ED' }} />

      {/* Countries Section */}
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#12111A',
          mb: 2,
        }}
      >
        Countries
      </Typography>
      <CountryManager />

      <Divider sx={{ my: 4, borderColor: '#E4E5ED' }} />

      {/* Trash Section */}
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#12111A',
          mb: 2,
        }}
      >
        Trash
      </Typography>
      <TrashManager />

      <Divider sx={{ my: 4, borderColor: '#E4E5ED' }} />

      {/* Error Log Section */}
      <Typography
        variant="h5"
        component="h2"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#12111A',
          mb: 2,
        }}
      >
        Error Log
      </Typography>
      <ErrorLogTab />
    </Box>
  );
}
