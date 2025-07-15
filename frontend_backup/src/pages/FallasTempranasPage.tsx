// frontend/src/pages/FallasTempranasPage.tsx (SIMPLIFICADO)

import { Typography, Box } from '@mui/material';
import FallasTempranasDetails from '../components/FallasTempranasDetails';

// 1. ELIMINAMOS LA INTERFAZ DE PROPS.
// interface PageProps { ... } // <= SE FUE

// 2. ELIMINAMOS LAS PROPS DE LA FUNCIÓN.
export default function FallasTempranasPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Análisis de Fallas Tempranas
      </Typography>

      {/* 3. LLAMAMOS AL COMPONENTE HIJO SIN NINGUNA PROP. */}
      {/* FallasTempranasDetails ahora obtiene todo lo que necesita por sí mismo. */}
      <FallasTempranasDetails />
    </Box>
  );
}

// import { Typography, Box } from '@mui/material';
// import FallasTempranasDetails from '../components/FallasTempranasDetails';

// interface PageProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function FallasTempranasPage({ empresa, propietario_red, fecha_inicio, fecha_fin }: PageProps) {
//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" gutterBottom>
//         Análisis de Fallas Tempranas
//       </Typography>

//       <FallasTempranasDetails
//         empresa={empresa}
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//     </Box>
//   );
// }