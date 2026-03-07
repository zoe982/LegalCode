import { Box, Skeleton } from '@mui/material';

export function SkeletonCard() {
  return (
    <Box
      data-testid="skeleton-card"
      sx={{
        minHeight: '140px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E4E5ED',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top row: category + status */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={80} height={16} />
        <Skeleton variant="rounded" width={56} height={22} sx={{ borderRadius: '6px' }} />
      </Box>
      {/* Title (2 lines) */}
      <Skeleton variant="text" width="90%" height={24} sx={{ mt: 1 }} />
      <Skeleton variant="text" width="60%" height={24} />
      {/* Spacer */}
      <Box sx={{ flex: 1 }} />
      {/* Bottom row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
        <Skeleton variant="text" width={60} height={14} />
        <Skeleton variant="text" width={30} height={14} />
      </Box>
    </Box>
  );
}
