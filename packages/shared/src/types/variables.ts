export type VariableType =
  | 'text'
  | 'date'
  | 'signature'
  | 'address'
  | 'number'
  | 'currency'
  | 'custom';

export interface VariableDefinition {
  id: string;
  name: string;
  type: VariableType;
  customType?: string | undefined;
}
