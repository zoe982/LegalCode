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
        background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #F9F9FB 0%, #FFFFFF 70%)',
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
      <Box
        sx={{
          maxWidth: 480,
          textAlign: 'center',
          '@media (max-width: 480px)': {
            px: 3,
          },
        }}
      >
        {/* Wordmark */}
        <Typography
          component="div"
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontSize: '4.5rem',
            color: '#451F61',
            letterSpacing: '-0.02em',
            '@media (max-width: 900px)': {
              fontSize: '3rem',
            },
            '@media (max-width: 480px)': {
              fontSize: '2.25rem',
            },
          }}
        >
          {'Acasus LegalCode'.split('').map((letter, index) => (
            <span
              key={index}
              style={
                letter === ' '
                  ? {
                      display: 'inline-block',
                      width: '0.25em',
                      animation: `letterFadeIn 400ms ease-out ${String(index * 50)}ms both`,
                    }
                  : {
                      display: 'inline-block',
                      fontWeight: index <= 5 ? 700 : 400,
                      animation: `letterFadeIn 400ms ease-out ${String(index * 50)}ms both`,
                    }
              }
            >
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </Typography>

        {/* Tagline */}
        <Typography
          sx={{
            fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
            fontWeight: 400,
            fontSize: '0.9375rem',
            color: '#9B9DB0',
            letterSpacing: '0.04em',
            mt: 2,
            animation: 'contentFadeIn 500ms ease-out 900ms both',
          }}
        >
          Legal template management
        </Typography>

        {/* Hairline separator */}
        <Box
          aria-hidden="true"
          sx={{
            width: 56,
            height: '1px',
            backgroundColor: '#EFE3D3',
            mx: 'auto',
            my: 5,
            animation: 'contentFadeIn 500ms ease-out 1000ms both',
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
            height: 48,
            px: 4,
            minWidth: 240,
            backgroundColor: '#8027FF',
            color: '#fff',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9375rem',
            boxShadow: '0 2px 8px rgba(128,39,255,0.25)',
            animation: 'contentFadeIn 500ms ease-out 1100ms both',
            '&:hover': {
              backgroundColor: '#6B1FDB',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(128,39,255,0.35)',
            },
            '&:active': {
              backgroundColor: '#5A18B8',
              transform: 'scale(0.98)',
              boxShadow: '0 1px 4px rgba(128,39,255,0.2)',
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
          animation: 'contentFadeIn 500ms ease-out 1200ms both',
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
