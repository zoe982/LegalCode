import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Box, TextField, Chip, Typography, CircularProgress, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { TemplateStatus } from '@legalcode/shared';
import { useTemplates } from '../hooks/useTemplates.js';
import { StatusChip } from '../components/StatusChip.js';

type StatusFilter = TemplateStatus | 'all';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

export function TemplateListPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const filters = {
    ...(debouncedSearch !== '' ? { search: debouncedSearch } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { data, isLoading } = useTemplates(filters);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const templates = data?.data ?? [];

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      <TextField
        fullWidth
        label="Search templates"
        value={searchInput}
        onChange={handleSearchChange}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {STATUS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            variant={statusFilter === option.value ? 'filled' : 'outlined'}
            color={statusFilter === option.value ? 'primary' : 'default'}
            onClick={() => {
              setStatusFilter(option.value);
            }}
            clickable
          />
        ))}
      </Box>

      {templates.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <Typography>No templates yet</Typography>
        </Box>
      ) : (
        <Box>
          {templates.map((template) => (
            <Box
              key={template.id}
              data-testid={`template-row-${template.id}`}
              onClick={() => {
                void navigate(`/templates/${template.id}`);
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                cursor: 'pointer',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: '#E6D9C6',
                },
              }}
            >
              <Typography
                sx={{
                  fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: '#451F61',
                  flexShrink: 0,
                  mr: 2,
                }}
              >
                {template.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StatusChip status={template.status} />
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: '#6B5A7A',
                  }}
                >
                  {`v${String(template.currentVersion)}`}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: '#6B5A7A',
                  }}
                >
                  {template.country ?? '\u2014'}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
