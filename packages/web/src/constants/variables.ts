import type { VariableType } from '@legalcode/shared';

export const TYPE_ICONS: Record<VariableType, string> = {
  text: 'T',
  date: 'D',
  address: '@',
  currency: '$',
  signature: 'S',
  number: '#',
  custom: '*',
};

export const TYPE_LABELS: Record<VariableType, string> = {
  text: 'Text',
  date: 'Date',
  address: 'Address',
  currency: 'Currency',
  signature: 'Signature',
  number: 'Number',
  custom: 'Custom',
};

export const VARIABLE_COLORS: Record<VariableType, { color: string; bg: string }> = {
  text: { color: '#8027FF', bg: '#8027FF14' },
  date: { color: '#2563EB', bg: '#2563EB14' },
  address: { color: '#D97706', bg: '#D9770614' },
  currency: { color: '#059669', bg: '#05966914' },
  signature: { color: '#DB2777', bg: '#DB277714' },
  number: { color: '#0D9488', bg: '#0D948814' },
  custom: { color: '#6B6D82', bg: '#6B6D8214' },
};

export const ALL_VARIABLE_TYPES: VariableType[] = [
  'text',
  'date',
  'address',
  'currency',
  'signature',
  'number',
  'custom',
];
