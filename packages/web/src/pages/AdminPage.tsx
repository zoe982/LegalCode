import { Box, Typography, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

interface ClientError {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
}

interface ErrorMetadata {
  message?: string;
  stack?: string;
  url?: string;
  timestamp?: string;
}

async function fetchErrors(): Promise<ClientError[]> {
  const res = await fetch('/admin/errors', { credentials: 'include' });
  if (!res.ok) return [];
  const data = (await res.json()) as { errors: ClientError[] };
  return data.errors;
}

export function AdminPage() {
  const { data: errors, isLoading: errorsLoading } = useQuery({
    queryKey: ['admin', 'errors'],
    queryFn: fetchErrors,
    staleTime: 30_000,
  });

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
      <Typography sx={{ color: '#6B5A7A', fontSize: '0.875rem', mb: 4 }}>
        User management and system configuration
      </Typography>

      {/* Error Log Section */}
      <Typography
        variant="h6"
        component="h2"
        sx={{
          fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
          fontWeight: 600,
          color: '#451F61',
          mb: 2,
        }}
      >
        Error Log
      </Typography>

      {errorsLoading ? (
        <CircularProgress size={24} />
      ) : !errors || errors.length === 0 ? (
        <Typography sx={{ color: '#6B5A7A', fontSize: '0.875rem' }}>No errors reported</Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {errors.map((err) => {
            const meta: ErrorMetadata = err.metadata
              ? (JSON.parse(err.metadata) as ErrorMetadata)
              : {};
            return (
              <Box
                component="li"
                key={err.id}
                sx={{
                  p: 2,
                  mb: 1,
                  backgroundColor: '#F7F0E6',
                  borderRadius: '8px',
                  border: '1px solid rgba(69,31,97,0.1)',
                }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#451F61' }}>
                  {meta.message ?? 'Unknown error'}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#6B5A7A', mt: 0.5 }}>
                  {err.createdAt} — {meta.url ?? 'unknown page'}
                </Typography>
                {meta.stack ? (
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.7rem',
                      color: '#6B5A7A',
                      mt: 1,
                      p: 1,
                      backgroundColor: '#EFE3D3',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: 120,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {meta.stack}
                  </Box>
                ) : null}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
