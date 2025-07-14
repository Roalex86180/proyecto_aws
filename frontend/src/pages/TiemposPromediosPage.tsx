// src/pages/TiemposPromediosPage.tsx (SIMPLIFICADO)

import { Typography, Box } from '@mui/material';
import TiemposPromediosTecnicos from '../components/TiemposPromediosTecnicos';

// 1. ELIMINAMOS LA INTERFAZ DE PROPS.
// interface TiemposPromediosPageProps { ... } // <= SE FUE

// 2. ELIMINAMOS LAS PROPS DE LA FUNCIÓN.
export default function TiemposPromediosPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Análisis de Tiempos por Técnico
      </Typography>
      
      {/* 3. LLAMAMOS AL COMPONENTE HIJO SIN NINGUNA PROP. */}
      <TiemposPromediosTecnicos />
    </Box>
  );
}

// // src/pages/TiemposPromediosPage.tsx

// import { Typography, Box } from '@mui/material';
// import TiemposPromediosTecnicos from '../components/TiemposPromediosTecnicos'; // Importamos el componente de lógica

// // Interfaz para las props que esta página recibe desde App.tsx
// interface TiemposPromediosPageProps {
//   empresa: string | null;
//   fecha_inicio?: string;
//   fecha_fin?: string;
//   propietario_red: string;
// }

// export default function TiemposPromediosPage({ empresa, propietario_red, fecha_inicio, fecha_fin }: TiemposPromediosPageProps) {
//   return (
//     <Box>
//       <Typography variant="h4" gutterBottom>
//         Análisis de Tiempos por Técnico
//       </Typography>
      
//       {/* Esta página simplemente renderiza el componente principal, pasándole los filtros */}
//       <TiemposPromediosTecnicos
//         empresa={empresa}
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//     </Box>
//   );
// }