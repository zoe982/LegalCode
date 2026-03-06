import { Box, Typography, Chip, Button } from '@mui/material';
import { StatusChip } from './StatusChip.js';

interface MetadataTabProps {
  category: string;
  country: string;
  tags: string[];
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  readOnly?: boolean | undefined;
  onPublish?: (() => void) | undefined;
  onArchive?: (() => void) | undefined;
}

const labelStyle = {
  fontSize: '0.6875rem',
  color: '#9A8DA6',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
  letterSpacing: '0.06em',
  mb: 0.5,
};

const valueStyle = {
  fontSize: '0.875rem',
  color: '#451F61',
};

export function MetadataTab({
  category,
  country,
  tags,
  status,
  createdAt,
  updatedAt,
  readOnly,
  onPublish,
  onArchive,
}: MetadataTabProps) {
  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography sx={labelStyle}>Category</Typography>
        <Typography sx={valueStyle}>{category}</Typography>
      </Box>

      <Box>
        <Typography sx={labelStyle}>Country</Typography>
        <Typography sx={valueStyle}>{country}</Typography>
      </Box>

      <Box>
        <Typography sx={labelStyle}>Tags</Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography sx={labelStyle}>Status</Typography>
        <StatusChip status={status} />
      </Box>

      <Box>
        <Typography sx={labelStyle}>Created</Typography>
        <Typography sx={valueStyle}>{new Date(createdAt).toLocaleDateString()}</Typography>
      </Box>

      <Box>
        <Typography sx={labelStyle}>Last Modified</Typography>
        <Typography sx={valueStyle}>{new Date(updatedAt).toLocaleDateString()}</Typography>
      </Box>

      {readOnly !== true && status === 'draft' && onPublish != null && (
        <Button
          variant="contained"
          onClick={onPublish}
          sx={{
            backgroundColor: '#8027FF',
            '&:hover': { backgroundColor: '#6B1FD6' },
          }}
        >
          Publish
        </Button>
      )}

      {readOnly !== true && status === 'active' && onArchive != null && (
        <Button
          variant="outlined"
          onClick={onArchive}
          sx={{ color: '#6B5A7A', borderColor: '#6B5A7A' }}
        >
          Archive
        </Button>
      )}
    </Box>
  );
}
