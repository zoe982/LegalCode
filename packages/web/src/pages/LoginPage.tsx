import { Box, Typography, Button } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
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
        backgroundColor: '#FFFFFF',
        marginTop: '-5vh',
        '@keyframes letterFadeIn': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes contentFadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& *': { animation: 'none !important' },
        },
        '@media (max-width: 900px)': {
          marginTop: '-3vh',
        },
      }}
    >
      <Box sx={{ maxWidth: 400, textAlign: 'center' }}>
        {/* Wordmark */}
        <Typography
          component="div"
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontWeight: 700,
            fontSize: '3.5rem',
            color: '#451F61',
            letterSpacing: '-0.02em',
            '@media (max-width: 900px)': {
              fontSize: '2.5rem',
            },
          }}
        >
          {'Acasus'.split('').map((letter, index) => (
            <span
              key={index}
              style={{
                display: 'inline-block',
                animation: `letterFadeIn 400ms ease-out ${String(index * 60)}ms both`,
              }}
            >
              {letter}
            </span>
          ))}
        </Typography>

        {/* Product name */}
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontWeight: 400,
            fontSize: '1.25rem',
            color: '#6B6D82',
            letterSpacing: '0.08em',
            mt: 1,
            animation: 'contentFadeIn 500ms ease-out 800ms both',
            '@media (max-width: 900px)': {
              fontSize: '1rem',
            },
          }}
        >
          LegalCode
        </Typography>

        {/* Hairline separator */}
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: '1px',
            backgroundColor: '#EFE3D3',
            mx: 'auto',
            my: 4,
            animation: 'contentFadeIn 500ms ease-out 800ms both',
            '@media (max-width: 900px)': {
              width: 36,
            },
          }}
        />

        {/* Sign-in button */}
        <Button
          variant="contained"
          onClick={() => {
            void login();
          }}
          sx={{
            height: 44,
            px: 4,
            minWidth: 220,
            backgroundColor: '#8027FF',
            color: '#fff',
            borderRadius: '10px',
            textTransform: 'none',
            animation: 'contentFadeIn 500ms ease-out 800ms both',
            '&:hover': {
              backgroundColor: '#6B1FDB',
            },
            '&:active': {
              backgroundColor: '#5A18B8',
              transform: 'scale(0.98)',
            },
            '&:focus-visible': {
              boxShadow: '0 0 0 3px rgba(128,39,255,0.2)',
            },
            '@media (max-width: 900px)': {
              width: '100%',
              maxWidth: 320,
            },
          }}
        >
          Sign in with Google
        </Button>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: 'center',
          animation: 'contentFadeIn 500ms ease-out 800ms both',
        }}
      >
        <Typography
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            fontSize: '12px',
            color: '#9B9DB0',
          }}
        >
          <LockOutlined sx={{ fontSize: 14 }} />
          Secured with Google OAuth
        </Typography>
        <Typography
          sx={{
            fontSize: '11px',
            color: '#9B9DB0',
            mt: 0.5,
          }}
        >
          © 2026 Acasus
        </Typography>
      </Box>
    </Box>
  );
}
