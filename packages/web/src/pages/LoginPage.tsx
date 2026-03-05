import { Container, Typography, Button, Box, Paper } from '@mui/material';
import { useAuth } from '../hooks/useAuth.js';

export function LoginPage() {
  const { loginUrl } = useAuth();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={2} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            LegalCode
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Template Management System
          </Typography>
          <Button component="a" href={loginUrl} variant="contained" size="large" fullWidth>
            Sign in with Google
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
