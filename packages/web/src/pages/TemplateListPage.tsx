import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  TextField,
  Chip,
  Typography,
  CircularProgress,
  InputAdornment,
  Button,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { TemplateStatus } from '@legalcode/shared';
import { useTemplates } from '../hooks/useTemplates.js';
import { StatusChip } from '../components/StatusChip.js';
import { relativeTime } from '../utils/relativeTime.js';

type StatusFilter = TemplateStatus | 'all';
type SortBy = 'name' | 'updated' | 'status';

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
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('updated');
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
    ...(categoryFilter !== null ? { category: categoryFilter } : {}),
    sort: sortBy,
  };

  const { data, isLoading } = useTemplates(filters);

  const templates = data?.data ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of templates) {
      if (t.category) {
        cats.add(t.category);
      }
    }
    return [...cats].sort();
  }, [templates]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', p: 3 }}>
      <Box
        data-testid="filter-bar"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'background.paper',
          pb: 2,
          boxShadow: '0 2px 4px -1px rgba(69,31,97,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
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
          />
          <TextField
            select
            size="small"
            label="Sort"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortBy);
            }}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="updated">Date Modified</MenuItem>
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
          {categories.map((cat) => (
            <Chip
              key={`cat-${cat}`}
              label={cat}
              variant={categoryFilter === cat ? 'filled' : 'outlined'}
              color={categoryFilter === cat ? 'secondary' : 'default'}
              onClick={() => {
                setCategoryFilter(categoryFilter === cat ? null : cat);
              }}
              clickable
            />
          ))}
        </Box>
      </Box>

      {templates.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            mt: 8,
            gap: 2,
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 48, color: '#9A8DA6' }} />
          <Typography
            sx={{
              fontFamily: '"Source Serif 4", Georgia, serif',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: '#451F61',
            }}
          >
            No templates yet
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              void navigate('/templates/new');
            }}
            sx={{
              backgroundColor: '#8027FF',
              '&:hover': { backgroundColor: '#6B1FDB' },
            }}
          >
            Create your first template
          </Button>
        </Box>
      ) : (
        <Box>
          {templates.map((template, index) => (
            <Box
              key={template.id}
              className="template-row"
              data-testid={`template-row-${template.id}`}
              tabIndex={0}
              role="button"
              onClick={() => {
                void navigate(`/templates/${template.id}`);
              }}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  void navigate(`/templates/${template.id}`);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                minHeight: 72,
                cursor: 'pointer',
                borderBottom: '1px solid',
                borderColor: 'divider',
                animation: 'fadeSlideIn 200ms cubic-bezier(0.2, 0, 0, 1) both',
                animationDelay: `${String(index * 40)}ms`,
                '@keyframes fadeSlideIn': {
                  from: {
                    opacity: 0,
                    transform: 'translateY(8px)',
                  },
                  to: {
                    opacity: 1,
                    transform: 'translateY(0)',
                  },
                },
                '&:hover': {
                  backgroundColor: '#DDD0BC',
                  boxShadow: '0 1px 3px rgba(69,31,97,0.06)',
                },
                '&:focus-visible': {
                  borderLeft: '3px solid #8027FF',
                  backgroundColor: '#8027FF1A',
                  outline: 'none',
                },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mr: 2 }}>
                <Typography
                  sx={{
                    fontFamily: '"Source Serif 4", Georgia, "Times New Roman", serif',
                    fontWeight: 600,
                    fontSize: '1rem',
                    color: '#451F61',
                    flexShrink: 0,
                  }}
                >
                  {template.title}
                </Typography>
                <Box
                  data-testid="hover-metadata"
                  sx={{
                    opacity: 0,
                    transition: 'opacity cubic-bezier(0.2, 0, 0, 1) 150ms',
                    '.template-row:hover &, .template-row:focus-visible &': { opacity: 1 },
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.6875rem',
                      color: '#9A8DA6',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {template.category}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#9A8DA6' }}>
                    {relativeTime(template.updatedAt)}
                  </Typography>
                </Box>
              </Box>
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
