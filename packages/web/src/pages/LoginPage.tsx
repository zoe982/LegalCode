import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../hooks/useAuth.js';

export function LoginPage() {
  const { login } = useAuth();

  return (
    <Box
      data-testid="login-page"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#F9F9FB',
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 700,
          fontSize: '2.5rem',
          color: '#12111A',
          mb: 0.5,
        }}
      >
        Acasus
      </Typography>
      <Typography
        sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '1rem',
          color: '#6B6D82',
          mb: 5,
        }}
      >
        LegalCode
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => {
          void login();
        }}
        sx={{
          backgroundColor: '#8027FF',
          color: '#fff',
          borderRadius: '12px',
          px: 5,
          '&:hover': {
            backgroundColor: '#6B1FD6',
          },
        }}
      >
        Sign in with Google
      </Button>
    </Box>
  );
}
