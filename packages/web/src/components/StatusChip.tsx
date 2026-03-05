import { Chip } from '@mui/material';
import type { TemplateStatus } from '@legalcode/shared';

const statusConfig: Record<
  TemplateStatus,
  { label: string; color: 'default' | 'success' | 'warning' }
> = {
  draft: { label: 'Draft', color: 'default' },
  active: { label: 'Active', color: 'success' },
  archived: { label: 'Archived', color: 'warning' },
};

interface StatusChipProps {
  status: TemplateStatus;
}

export function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status];
  return <Chip label={config.label} color={config.color} size="small" />;
}
