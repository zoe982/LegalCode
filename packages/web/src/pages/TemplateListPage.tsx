import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  TextField,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  CircularProgress,
  Fab,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import type { Template, TemplateStatus } from '@legalcode/shared';
import { useTemplates } from '../hooks/useTemplates.js';
import { useAuth } from '../hooks/useAuth.js';
import { StatusChip } from '../components/StatusChip.js';

type StatusFilter = TemplateStatus | 'all';

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

function groupByCategory(templates: Template[]): Record<string, Template[]> {
  return templates.reduce<Record<string, Template[]>>((groups, template) => {
    const category = template.category;
    const existing = groups[category];
    if (existing) {
      existing.push(template);
    } else {
      groups[category] = [template];
    }
    return groups;
  }, {});
}

export function TemplateListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const grouped = groupByCategory(templates);
  const categories = Object.keys(grouped);

  return (
    <Box sx={{ p: 3 }}>
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
        categories.map((category) => {
          const categoryTemplates = grouped[category];
          if (!categoryTemplates) return null;
          return (
            <Accordion key={category} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{category}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Country</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryTemplates.map((template) => (
                      <TableRow
                        key={template.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          void navigate(`/templates/${template.id}`);
                        }}
                      >
                        <TableCell>{template.title}</TableCell>
                        <TableCell>{`v${String(template.currentVersion)}`}</TableCell>
                        <TableCell>{template.country ?? '\u2014'}</TableCell>
                        <TableCell>
                          <StatusChip status={template.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      {user?.role !== 'viewer' && (
        <Fab
          color="primary"
          aria-label="Add template"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => {
            void navigate('/templates/new');
          }}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}
