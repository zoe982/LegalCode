import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  OutlinedInput,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  FormHelperText,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useNavigate } from 'react-router';
import { useCreateTemplate } from '../hooks/useTemplates.js';
import { useCategories } from '../hooks/useCategories.js';
import { useCountries } from '../hooks/useCountries.js';

interface CreateTemplateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTemplateDialog({ open, onClose }: CreateTemplateDialogProps) {
  const navigate = useNavigate();
  const createMutation = useCreateTemplate();
  const { data: categoriesData } = useCategories();
  const { data: countriesData } = useCountries();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [country, setCountry] = useState('');
  const [titleError, setTitleError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [showCharCount, setShowCharCount] = useState(false);

  const resetForm = useCallback(() => {
    setTitle('');
    setCategory('');
    setCountry('');
    setTitleError('');
    setCategoryError('');
    setTitleTouched(false);
    setCategoryTouched(false);
    setShowCharCount(false);
    createMutation.reset();
  }, [createMutation]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const isFormValid = title.trim().length > 0 && category.length > 0;
  const isPending = createMutation.isPending;

  const handleTitleBlur = () => {
    setTitleTouched(true);
    if (title.trim() === '') {
      setTitleError('Title is required');
    }
  };

  const handleCategoryBlur = () => {
    setCategoryTouched(true);
    if (category === '') {
      setCategoryError('Category is required');
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleTouched && value.trim().length > 0) {
      setTitleError('');
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    if (categoryTouched && value.length > 0) {
      setCategoryError('');
    }
  };

  const handleClose = () => {
    if (isPending) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!isFormValid || isPending) return;

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        category,
        country: country || null,
        content: ' ',
      });
      void navigate(`/templates/${result.template.id}`);
    } catch {
      // Error is handled by mutation state
    }
  };

  const categories = categoriesData?.categories ?? [];
  const countries = countriesData?.countries ?? [];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      disableEscapeKeyDown={isPending}
      transitionDuration={{ enter: 200, exit: 150 }}
      slotProps={{
        paper: {
          sx: {
            maxWidth: '520px',
            width: '100%',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            p: 0,
          },
        },
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Icon */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: '#F3F3F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            '@keyframes iconEntrance': {
              from: { opacity: 0, transform: 'translateY(4px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
            animation: 'iconEntrance 200ms ease-out 100ms both',
          }}
        >
          <DescriptionOutlinedIcon sx={{ color: '#8027FF', fontSize: 24 }} />
        </Box>

        {/* Title & Subtitle */}
        <Typography
          sx={{
            fontFamily: '"Source Serif 4", serif',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#12111A',
            mb: 0.5,
          }}
        >
          New Template
        </Typography>
        <Typography
          sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '0.875rem',
            color: '#6B6D82',
            mb: 3,
          }}
        >
          Start with a title and classification.
        </Typography>

        {/* Error Alert */}
        {createMutation.isError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {createMutation.error.message}
          </Alert>
        )}

        {/* Title Field */}
        <FormControl fullWidth sx={{ mb: 2.5 }} error={titleError !== ''}>
          <Typography
            component="label"
            htmlFor="create-template-title"
            sx={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#12111A',
              mb: 0.75,
            }}
          >
            Title
          </Typography>
          <Box sx={{ position: 'relative' }}>
            <OutlinedInput
              id="create-template-title"
              autoFocus
              fullWidth
              placeholder="e.g. Employment Agreement"
              value={title}
              disabled={isPending}
              onChange={(e) => {
                handleTitleChange(e.target.value);
              }}
              onFocus={() => {
                setShowCharCount(true);
              }}
              onBlur={handleTitleBlur}
              inputProps={{ maxLength: 200 }}
              sx={{
                borderRadius: '12px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: titleError ? undefined : '#D1D2DE',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: titleError ? undefined : '#8027FF',
                  boxShadow: titleError ? undefined : '0 0 0 3px rgba(128, 39, 255, 0.2)',
                },
              }}
            />
            {showCharCount && (
              <Typography
                sx={{
                  position: 'absolute',
                  bottom: -20,
                  right: 0,
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.75rem',
                  color: title.length >= 190 ? '#E53E3E' : '#9B9DB0',
                }}
              >
                {title.length} / 200
              </Typography>
            )}
          </Box>
          {titleError && <FormHelperText>{titleError}</FormHelperText>}
        </FormControl>

        {/* Category & Country Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: showCharCount ? 1.5 : 0 }}>
          {/* Category */}
          <FormControl sx={{ flex: 1 }} error={categoryError !== ''}>
            <Typography
              component="label"
              id="create-template-category-label"
              htmlFor="create-template-category"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#12111A',
                mb: 0.75,
              }}
            >
              Category
            </Typography>
            <Select
              id="create-template-category"
              labelId="create-template-category-label"
              value={category}
              displayEmpty
              disabled={isPending}
              onChange={(e) => {
                handleCategoryChange(e.target.value);
              }}
              onBlur={handleCategoryBlur}
              input={
                <OutlinedInput
                  sx={{
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: categoryError ? undefined : '#D1D2DE',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: categoryError ? undefined : '#8027FF',
                      boxShadow: categoryError ? undefined : '0 0 0 3px rgba(128, 39, 255, 0.2)',
                    },
                  }}
                />
              }
              renderValue={(selected: string) => {
                if (selected === '') {
                  return (
                    <Typography sx={{ color: '#9B9DB0', fontSize: '0.875rem' }}>
                      Select...
                    </Typography>
                  );
                }
                return selected;
              }}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.name}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
            {categoryError && <FormHelperText>{categoryError}</FormHelperText>}
          </FormControl>

          {/* Country */}
          <FormControl sx={{ flex: 1 }}>
            <Typography
              component="label"
              id="create-template-country-label"
              htmlFor="create-template-country"
              sx={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#12111A',
                mb: 0.75,
              }}
            >
              Country
            </Typography>
            <Select
              id="create-template-country"
              labelId="create-template-country-label"
              value={country}
              displayEmpty
              disabled={isPending}
              onChange={(e) => {
                setCountry(e.target.value);
              }}
              input={
                <OutlinedInput
                  sx={{
                    borderRadius: '12px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#D1D2DE',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#8027FF',
                      boxShadow: '0 0 0 3px rgba(128, 39, 255, 0.2)',
                    },
                  }}
                />
              }
              renderValue={(selected: string) => {
                if (selected === '') {
                  return (
                    <Typography sx={{ color: '#9B9DB0', fontSize: '0.875rem' }}>
                      Select...
                    </Typography>
                  );
                }
                const found = countries.find((c) => c.code === selected);
                return found?.name ?? selected;
              }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {countries.map((c) => (
                <MenuItem key={c.id} value={c.code}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          px: 3,
          pb: 3,
          pt: 1,
        }}
      >
        <Button onClick={handleClose} disabled={isPending} sx={{ color: '#12111A' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!isFormValid || isPending}
          onClick={() => {
            void handleSubmit();
          }}
          sx={{
            backgroundColor: '#8027FF',
            color: '#FFFFFF',
            borderRadius: '12px',
            minWidth: 100,
            '&:hover': {
              backgroundColor: '#6B1FDB',
            },
          }}
        >
          {isPending ? (
            <>
              <CircularProgress size={16} sx={{ color: '#FFFFFF', mr: 1 }} />
              Creating...
            </>
          ) : (
            'Create'
          )}
        </Button>
      </Box>
    </Dialog>
  );
}
