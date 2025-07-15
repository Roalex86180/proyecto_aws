import { Typography } from '@mui/material';
import ReincidenciasTecnicoDetails from '../components/ReincidenciasTecnicoDetails';

export default function ReincidenciasPage() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Análisis de Reincidencias
      </Typography>
      <ReincidenciasTecnicoDetails />
    </>
  );
}

// import { Typography, Box } from '@mui/material';
// import ReincidenciasTecnicoDetails from '../components/ReincidenciasTecnicoDetails';

// // Interfaz para las props que esta página recibe desde App.tsx
// interface ReincidenciasPageProps {
//   empresa: string | null;
//   fecha_inicio?: string;
//   fecha_fin?: string;
//   propietario_red: string;
// }

// export default function ReincidenciasPage({ empresa, propietario_red, fecha_inicio, fecha_fin }: ReincidenciasPageProps) {
//   return (
//     <Box>
//       <Typography variant="h4" gutterBottom>
//         Análisis de Reincidencias
//       </Typography>
      
//       {/* Esta página simplemente renderiza el componente principal de detalles, pasándole los filtros */}
//       <ReincidenciasTecnicoDetails
//         empresa={empresa}
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//     </Box>
//   );
// }