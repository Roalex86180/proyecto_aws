// frontend/src/pages/CertificacionPage.tsx (SIMPLIFICADO)

import { Typography, Box } from '@mui/material';
import CertificacionDetails from '../components/CertificacionDetails';

// 1. ELIMINAMOS LA INTERFAZ DE PROPS. Ya no se necesita.
// interface PageProps { ... } // <= SE FUE

// 2. ELIMINAMOS LAS PROPS DE LA FUNCIÓN.
export default function CertificacionPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Análisis de Certificación
      </Typography>
      
      {/* 3. LLAMAMOS AL COMPONENTE HIJO SIN NINGUNA PROP. */}
      {/* CertificacionDetails ahora es autónomo y obtiene todo lo que necesita por sí mismo. */}
      <CertificacionDetails />
    </Box>
  );
}