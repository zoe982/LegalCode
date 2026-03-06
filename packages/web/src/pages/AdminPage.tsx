import { Box, Typography } from '@mui/material';

export function AdminPage() {
  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#451F61',
          mb: 2,
        }}
      >
        Admin
      </Typography>
      <Typography sx={{ color: '#6B5A7A', fontSize: '0.875rem' }}>
        User management and system configuration
      </Typography>
    </Box>
  );
}
