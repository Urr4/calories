import { createTheme } from '@mui/material/styles';

// Mobile-first theme: comfortable touch targets, rounded corners, green accent.
const theme = createTheme({
  palette: {
    primary: { main: '#2e7d32' },
    secondary: { main: '#ef6c00' },
    background: { default: '#f7f7f5' },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          minHeight: 44,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          width: 64,
          height: 64,
        },
      },
    },
  },
});

export default theme;
