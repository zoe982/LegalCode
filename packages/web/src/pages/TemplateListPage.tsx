import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Box, Typography, InputAdornment, InputBase, Button, Menu, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useTemplates, useDeleteTemplate } from '../hooks/useTemplates.js';
import { useCategories } from '../hooks/useCategories.js';
import { useCountries } from '../hooks/useCountries.js';
import { TemplateCard } from '../components/TemplateCard.js';
import { DeleteTemplateDialog } from '../components/DeleteTemplateDialog.js';
import { SkeletonCard } from '../components/SkeletonCard.js';

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

export function TemplateListPage() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [sortAnchorEl, setSortAnchorEl] = useState<HTMLElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deleteMutation = useDeleteTemplate();

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
    ...(categoryFilter !== null ? { category: categoryFilter } : {}),
    ...(countryFilter !== null ? { country: countryFilter } : {}),
    sort: sortBy,
  };

  const { data, isLoading } = useTemplates(filters);

  const templates = data?.data ?? [];

  const { data: categoriesData } = useCategories();
  const categoryNames = categoriesData?.categories.map((c) => c.name) ?? [];

  const { data: countriesData } = useCountries();
  const countryList = countriesData?.countries ?? [];

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Recently edited';

  const hasActiveFilters =
    debouncedSearch !== '' || categoryFilter !== null || countryFilter !== null;

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
            <Box
              data-testid="category-divider"
              sx={{
                width: '1px',
                height: '20px',
                backgroundColor: '#E4E5ED',
                alignSelf: 'center',
                mx: 1,
              }}
            />
            <Box
              data-testid="category-chip-all"
              component="button"
              type="button"
              role="button"
              onClick={() => {
                setCategoryFilter(null);
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
                border: categoryFilter === null ? 'none' : '1px solid #E4E5ED',
                backgroundColor: categoryFilter === null ? '#8027FF' : '#F9F9FB',
                color: categoryFilter === null ? '#FFFFFF' : '#6B6D82',
                '&:hover': {
                  backgroundColor: categoryFilter === null ? '#6B1FDB' : '#F3F3F7',
                },
              }}
            >
              All
            </Box>
            {categoryNames.map((cat) => {
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
            {countryList.length > 0 && (
              <>
                <Box
                  data-testid="country-divider"
                  sx={{
                    width: '1px',
                    height: '20px',
                    backgroundColor: '#E4E5ED',
                    alignSelf: 'center',
                    mx: 1,
                  }}
                />
                <Box
                  data-testid="country-chip-all"
                  component="button"
                  type="button"
                  role="button"
                  onClick={() => {
                    setCountryFilter(null);
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
                    border: countryFilter === null ? 'none' : '1px solid #E4E5ED',
                    backgroundColor: countryFilter === null ? '#8027FF' : '#F9F9FB',
                    color: countryFilter === null ? '#FFFFFF' : '#6B6D82',
                    '&:hover': {
                      backgroundColor: countryFilter === null ? '#6B1FDB' : '#F3F3F7',
                    },
                  }}
                >
                  All
                </Box>
                {countryList.map((country) => {
                  const isActive = countryFilter === country.code;
                  return (
                    <Box
                      key={`country-${country.code}`}
                      component="button"
                      type="button"
                      role="button"
                      onClick={() => {
                        setCountryFilter(countryFilter === country.code ? null : country.code);
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
                      {country.name}
                    </Box>
                  );
                })}
              </>
            )}
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
                setCategoryFilter(null);
                setCountryFilter(null);
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
              onDelete={(templateId) => {
                const t = templates.find((tpl) => tpl.id === templateId);
                setDeleteTarget({ id: templateId, title: t?.title ?? 'this template' });
              }}
            />
          ))}
        </Box>
      )}

      {/* Delete confirmation dialog */}
      <DeleteTemplateDialog
        open={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSuccess: () => {
                setDeleteTarget(null);
              },
            });
          }
        }}
        templateTitle={deleteTarget?.title ?? ''}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
