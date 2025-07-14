// frontend/src/components/LoadingOverlay.tsx

import { Box, CircularProgress } from '@mui/material';

export default function LoadingOverlay({ isLoading }: { isLoading: boolean }) {
  // Si no está cargando, no renderiza nada
  if (!isLoading) {
    return null;
  }

  // Si está cargando, renderiza una capa semitransparente con un spinner
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Fondo blanco semitransparente
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10, // Se asegura de que esté por encima del contenido
        borderRadius: 'inherit', // Hereda los bordes redondeados del contenedor padre
        transition: 'opacity 0.3s ease',
      }}
    >
      <CircularProgress />
    </Box>
  );
}