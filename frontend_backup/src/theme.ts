// frontend/src/theme.ts

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    
    // Azul principal (brillante) -> #4DB2F2
    primary: {
      main: '#4DB2F2',
    },
    
    // Azul oscuro (texto/barra) -> #1D66A5
    secondary: {
      main: '#1D66A5',
    },
    
    // Blanco puro -> #FFFFFF (fondo principal)
    // Azul claro de fondo -> #E7F5FD (fondo de tarjetas/paneles)
    background: {
      default: '#FFFFFF',
      paper: '#E7F5FD',
    },
    
    // Negro suave -> #333333 (texto general)
    text: {
      primary: '#333333',
      secondary: '#5A636E',
    },
    
    // Gris claro -> #D3E2EF (líneas divisorias)
    divider: '#D3E2EF',
  },
  typography: {
    fontFamily: 'sans-serif',
  },
});

export default theme;