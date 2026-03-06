export const springStandard = { type: 'spring' as const, stiffness: 500, damping: 35, mass: 1 };
export const springStandardFast = {
  type: 'spring' as const,
  stiffness: 700,
  damping: 40,
  mass: 0.8,
};
export const springStandardSlow = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 1.2,
};
export const springExpressive = { type: 'spring' as const, stiffness: 400, damping: 20, mass: 1 };

const CSS_SPRINGS = {
  standard: 'cubic-bezier(0.2, 0, 0, 1) 200ms',
  'standard-fast': 'cubic-bezier(0.2, 0, 0, 1) 150ms',
  'standard-slow': 'cubic-bezier(0.2, 0, 0, 1) 350ms',
  expressive: 'cubic-bezier(0.34, 1.56, 0.64, 1) 400ms',
} as const;

export type SpringName = keyof typeof CSS_SPRINGS;

export function cssTransition(name: SpringName): string {
  return CSS_SPRINGS[name];
}
