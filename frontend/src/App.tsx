import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { PersonProvider } from './context/PersonContext';
import TodayPage from './pages/TodayPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PersonProvider>
        <TodayPage />
      </PersonProvider>
    </ThemeProvider>
  );
}
