import { createTheme } from '@mui/material/styles';

const serifStack = '"Source Serif 4", Georgia, "Times New Roman", serif';
const sansStack = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif';
const monoStack = '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace';

export { serifStack, sansStack, monoStack };

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#8027FF' },
        secondary: { main: '#451F61' },
        error: { main: '#D32F2F' },
        warning: { main: '#B8860B' },
        success: { main: '#2D6A4F' },
        background: {
          default: '#EFE3D3',
          paper: '#F7F0E6',
        },
        text: {
          primary: '#451F61',
          secondary: '#6B5A7A',
        },
      },
    },
  },
  typography: {
    fontFamily: sansStack,
    h1: { fontFamily: serifStack, fontWeight: 600 },
    h2: { fontFamily: serifStack, fontWeight: 600 },
    h3: { fontFamily: serifStack, fontWeight: 600 },
    h4: { fontFamily: serifStack, fontWeight: 600 },
    h5: { fontFamily: serifStack, fontWeight: 600 },
    h6: { fontFamily: serifStack, fontWeight: 600 },
    subtitle1: { fontFamily: sansStack, fontSize: '1rem', fontWeight: 600 },
    subtitle2: { fontFamily: sansStack, fontSize: '0.875rem', fontWeight: 600 },
    body1: { fontFamily: sansStack, fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontFamily: sansStack, fontSize: '0.8125rem', fontWeight: 500, lineHeight: 1.38 },
    caption: { fontFamily: sansStack, fontSize: '0.75rem', fontWeight: 400 },
    overline: {
      fontFamily: sansStack,
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
