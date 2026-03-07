import { Link } from 'react-router';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface BreadcrumbsProps {
  templateName?: string | undefined;
}

export function Breadcrumbs({ templateName }: BreadcrumbsProps) {
  return (
    <Box
      data-testid="breadcrumbs"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        minWidth: 0,
      }}
    >
      {/* Acasus wordmark — always visible */}
      <Typography
        component={Link}
        to="/templates"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: '#451F61',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          '&:hover': {
            textDecoration: 'none',
          },
        }}
      >
        Acasus
      </Typography>

      {/* Additional breadcrumb levels when templateName is provided */}
      {templateName != null && (
        <>
          <Typography
            component="span"
            sx={{
              color: 'var(--text-tertiary)',
              fontSize: '0.8125rem',
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            /
          </Typography>

          <Typography
            component={Link}
            to="/templates"
            sx={{
              fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                textDecoration: 'none',
                color: 'var(--text-primary)',
              },
            }}
          >
            Templates
          </Typography>

          <Typography
            component="span"
            sx={{
              color: 'var(--text-tertiary)',
              fontSize: '0.8125rem',
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            /
          </Typography>

          <Typography
            component="span"
            sx={{
              fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {templateName}
          </Typography>
        </>
      )}
    </Box>
  );
}
