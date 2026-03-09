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
        background:
          'radial-gradient(circle, #E4E5ED 0.5px, transparent 0.5px), radial-gradient(ellipse 80% 60% at 50% 40%, #F9F9FB 0%, #FFFFFF 70%)',
        backgroundSize: '24px 24px, 100% 100%',
        marginTop: '-5vh',
        '@keyframes letterFadeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
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
          maxWidth: 520,
          textAlign: 'center',
          '@media (max-width: 480px)': {
            px: 3,
          },
        }}
      >
        {/* Logo Mark */}
        <Box
          data-testid="logo-mark"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '10px',
            backgroundColor: '#8027FF',
            color: '#fff',
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontSize: '1rem',
            fontWeight: 700,
            mx: 'auto',
            mb: 2.5,
            animation: 'contentFadeIn 400ms cubic-bezier(0.2, 0, 0, 1) 0ms both',
          }}
        >
          LC
        </Box>

        {/* Wordmark */}
        <Typography
          component="div"
          aria-label="Acasus LegalCode"
          sx={{
            fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            color: '#451F61',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            lineHeight: 1.1,
          }}
        >
          {'Acasus LegalCode'.split('').map((letter, index) => (
            <span
              key={index}
              aria-hidden="true"
              style={
                letter === ' '
                  ? {
                      display: 'inline-block',
                      width: '0.25em',
                      animation: `letterFadeIn 350ms cubic-bezier(0.2, 0, 0, 1) ${String(100 + index * 40)}ms both`,
                    }
                  : {
                      display: 'inline-block',
                      fontWeight: index <= 5 ? 700 : 400,
                      animation: `letterFadeIn 350ms cubic-bezier(0.2, 0, 0, 1) ${String(100 + index * 40)}ms both`,
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
            fontSize: '0.875rem',
            color: '#6B6D82',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            mt: 2,
            animation: 'contentFadeIn 500ms cubic-bezier(0.2, 0, 0, 1) 750ms both',
          }}
        >
          Legal template management
        </Typography>

        {/* Hairline separator */}
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: '1px',
            backgroundColor: '#E4E5ED',
            mx: 'auto',
            my: 4.5,
            animation: 'contentFadeIn 500ms cubic-bezier(0.2, 0, 0, 1) 850ms both',
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
            minWidth: 260,
            backgroundColor: '#8027FF',
            color: '#fff',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9375rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(128,39,255,0.25)',
            animation: 'contentFadeIn 500ms cubic-bezier(0.2, 0, 0, 1) 950ms both',
            '&:hover': {
              backgroundColor: '#6B1FDB',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 16px rgba(128,39,255,0.30)',
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
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: '6px',
              backgroundColor: '#fff',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
          </Box>
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
          animation: 'contentFadeIn 500ms cubic-bezier(0.2, 0, 0, 1) 1050ms both',
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
          <LockOutlined sx={{ fontSize: 13 }} />
          Secured with Google OAuth
        </Typography>
        <Typography
          sx={{
            fontSize: '11px',
            color: '#9B9DB0',
            mt: 1,
          }}
        >
          © 2026 Acasus
        </Typography>
      </Box>
    </Box>
  );
}
