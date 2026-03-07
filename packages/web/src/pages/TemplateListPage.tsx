import { useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Box, Typography, InputAdornment, InputBase, Button, Menu, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import type { TemplateStatus } from '@legalcode/shared';
import { useTemplates } from '../hooks/useTemplates.js';
import { TemplateCard } from '../components/TemplateCard.js';
import { SkeletonCard } from '../components/SkeletonCard.js';

type StatusFilter = TemplateStatus | 'all';
type SortBy = 'updated' | 'name' | 'oldest';

interface SortOption {
  label: string;
  value: SortBy;
}

const SORT_OPTIONS: SortOption[] = [
  { label: 'Recently edited', value: 'updated' },
  { label: 'Alphabetical', value: 'name' },
  { label: 'Oldest first', value: 'oldest' },
];

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
  const [sortAnchorEl, setSortAnchorEl] = useState<HTMLElement | null>(null);
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

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Recently edited';

  const hasActiveFilters =
    debouncedSearch !== '' || statusFilter !== 'all' || categoryFilter !== null;

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: '1120px', mx: 'auto', px: '32px', pt: '24px' }}>
        <Box
          data-testid="skeleton-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      data-testid="template-list-container"
      sx={{
        maxWidth: '1120px',
        mx: 'auto',
        px: '32px',
        pt: '24px',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Sticky filter bar */}
      <Box
        data-testid="filter-bar"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: '#FFFFFF',
          pb: '16px',
        }}
      >
        {/* Search row: search input + New template button */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'center' }}>
          <InputBase
            fullWidth
            placeholder="Search templates..."
            value={searchInput}
            onChange={handleSearchChange}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: '#9B9DB0', ml: 1 }} />
              </InputAdornment>
            }
            sx={{
              height: 40,
              backgroundColor: '#F9F9FB',
              border: '1px solid #E4E5ED',
              borderRadius: '10px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              color: '#12111A',
              px: 0.5,
              '& .MuiInputBase-input': {
                padding: '8px 8px',
                '&::placeholder': {
                  color: '#9B9DB0',
                  opacity: 1,
                },
              },
              '&.Mui-focused': {
                borderColor: '#8027FF',
                boxShadow: '0 0 0 3px rgba(128, 39, 255, 0.2)',
              },
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              void navigate('/templates/new');
            }}
            sx={{
              height: 40,
              minWidth: 'auto',
              whiteSpace: 'nowrap',
              backgroundColor: '#8027FF',
              borderRadius: '10px',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
              px: 2.5,
              '&:hover': {
                backgroundColor: '#6B1FDB',
              },
            }}
          >
            New template
          </Button>
        </Box>

        {/* Filter row: chips left, sort right */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map((option) => {
              const isActive = statusFilter === option.value;
              return (
                <Box
                  key={option.value}
                  component="button"
                  type="button"
                  role="button"
                  onClick={() => {
                    setStatusFilter(option.value);
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '9999px',
                    padding: '5px 14px',
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    border: isActive ? 'none' : '1px solid #E4E5ED',
                    backgroundColor: isActive ? '#8027FF' : '#F9F9FB',
                    color: isActive ? '#FFFFFF' : '#6B6D82',
                    '&:hover': {
                      backgroundColor: isActive ? '#6B1FDB' : '#F3F3F7',
                    },
                  }}
                >
                  {option.label}
                </Box>
              );
            })}
            {categories.map((cat) => {
              const isActive = categoryFilter === cat;
              return (
                <Box
                  key={`cat-${cat}`}
                  component="button"
                  type="button"
                  role="button"
                  onClick={() => {
                    setCategoryFilter(categoryFilter === cat ? null : cat);
                  }}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '9999px',
                    padding: '5px 14px',
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    border: isActive ? 'none' : '1px solid #E4E5ED',
                    backgroundColor: isActive ? '#8027FF' : '#F9F9FB',
                    color: isActive ? '#FFFFFF' : '#6B6D82',
                    '&:hover': {
                      backgroundColor: isActive ? '#6B1FDB' : '#F3F3F7',
                    },
                  }}
                >
                  {cat}
                </Box>
              );
            })}
          </Box>

          {/* Sort button */}
          <Button
            onClick={(e) => {
              setSortAnchorEl(e.currentTarget);
            }}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#6B6D82',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
          >
            {currentSortLabel}
          </Button>
          <Menu
            anchorEl={sortAnchorEl}
            open={sortAnchorEl !== null}
            onClose={() => {
              setSortAnchorEl(null);
            }}
            slotProps={{
              paper: {
                sx: {
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E4E5ED',
                  borderRadius: '10px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04)',
                },
              },
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setSortAnchorEl(null);
                }}
                sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.875rem',
                  height: 36,
                  '&:hover': {
                    backgroundColor: '#F3F3F7',
                  },
                }}
              >
                {option.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      {/* Content: card grid or empty state */}
      {templates.length === 0 ? (
        hasActiveFilters ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 8,
              gap: 1,
            }}
          >
            <SearchOffIcon sx={{ fontSize: 48, color: '#9B9DB0' }} />
            <Typography
              sx={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontSize: '1.5rem',
                lineHeight: '2rem',
                fontWeight: 600,
                color: '#12111A',
              }}
            >
              No templates match your filters
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
                color: '#6B6D82',
              }}
            >
              Try adjusting your search or filters.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setSearchInput('');
                setDebouncedSearch('');
                setStatusFilter('all');
                setCategoryFilter(null);
              }}
              sx={{
                mt: 1,
                borderColor: '#8027FF',
                color: '#8027FF',
                borderRadius: '10px',
                fontFamily: '"DM Sans", sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#6B1FDB',
                  backgroundColor: 'rgba(128, 39, 255, 0.04)',
                },
              }}
            >
              Clear filters
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 8,
              gap: 1,
            }}
          >
            <DescriptionOutlinedIcon sx={{ fontSize: 48, color: '#9B9DB0' }} />
            <Typography
              sx={{
                fontFamily: '"Source Serif 4", Georgia, serif',
                fontSize: '1.5rem',
                lineHeight: '2rem',
                fontWeight: 600,
                color: '#12111A',
              }}
            >
              No templates yet
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
                color: '#6B6D82',
              }}
            >
              Create your first template to get started.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                void navigate('/templates/new');
              }}
              sx={{
                mt: 1,
                backgroundColor: '#8027FF',
                borderRadius: '10px',
                fontFamily: '"DM Sans", sans-serif',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#6B1FDB' },
              }}
            >
              Create template
            </Button>
          </Box>
        )
      ) : (
        <Box
          data-testid="card-grid"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px',
          }}
        >
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => {
                void navigate(`/templates/${template.id}`);
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
