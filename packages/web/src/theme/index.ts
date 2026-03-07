import { createTheme } from '@mui/material/styles';

const serifStack = '"Source Serif 4", Georgia, "Times New Roman", serif';
const sansStack = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif';
const dmSansStack = '"DM Sans", "Helvetica Neue", Arial, sans-serif';
const monoStack = '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace';

export { serifStack, sansStack, dmSansStack, monoStack };

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#8027FF' },
        secondary: { main: '#451F61' },
        error: { main: '#DC2626' },
        warning: { main: '#D97706' },
        success: { main: '#059669' },
        background: {
          default: '#FFFFFF',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#12111A',
          secondary: '#6B6D82',
        },
      },
    },
  },
  typography: {
    fontFamily: dmSansStack,
    h1: { fontFamily: serifStack, fontWeight: 600 },
    h2: { fontFamily: serifStack, fontWeight: 600 },
    h3: { fontFamily: serifStack, fontWeight: 600 },
    h4: { fontFamily: serifStack, fontWeight: 600 },
    h5: { fontFamily: serifStack, fontWeight: 600 },
    h6: { fontFamily: serifStack, fontWeight: 600 },
    subtitle1: { fontFamily: dmSansStack, fontSize: '0.875rem', fontWeight: 600 },
    subtitle2: { fontFamily: dmSansStack, fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontFamily: dmSansStack, fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontFamily: dmSansStack, fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.38 },
    caption: { fontFamily: dmSansStack, fontSize: '0.75rem', fontWeight: 400 },
    overline: {
      fontFamily: dmSansStack,
      fontSize: '0.6875rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 12,
  },
});
