import type { VariableType } from '@legalcode/shared';
import { TYPE_ICONS, VARIABLE_COLORS } from '../constants/variables.js';

export interface VariableChipProps {
  name: string;
  type: VariableType;
}

export function VariableChip({ name, type }: VariableChipProps) {
  const colors = VARIABLE_COLORS[type];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px 2px 0',
        borderRadius: '4px',
        borderLeft: `3px solid ${colors.color}`,
        backgroundColor: colors.bg,
        fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: '#12111A',
        verticalAlign: 'middle',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '3px',
          backgroundColor: colors.color,
          color: '#FFFFFF',
          fontSize: '0.6875rem',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {TYPE_ICONS[type]}
      </span>
      <span>{name}</span>
    </span>
  );
}
