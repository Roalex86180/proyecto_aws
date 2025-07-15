// frontend/src/pages/ProduccionMantencionPage.tsx (SIMPLIFICADO)

import { Typography, Box } from '@mui/material';
import ProduccionMantencionDetails from '../components/ProduccionMantencionDetails';

// 1. ELIMINAMOS LA INTERFAZ DE PROPS.
// interface MantenimientoPageProps { ... } // <= SE FUE

// 2. ELIMINAMOS LAS PROPS DE LA FUNCIÓN.
export default function ProduccionMantencionPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🔧 Producción de Mantenimiento
      </Typography>
      
      {/* 3. ELIMINAMOS LA LÓGICA CONDICIONAL Y LAS PROPS.
        Simplemente renderizamos el componente de detalles. Él se encargará de
        mostrar el mensaje para seleccionar empresa si es necesario.
      */}
      <ProduccionMantencionDetails />
    </Box>
  );
}

// // frontend/src/pages/ProduccionMantencionPage.tsx

// import { Typography, Box } from '@mui/material';
// // Nota: Es raro que se importen dos componentes de detalle. Asegúrate de que esto sea intencional.
// import ProduccionMantencionDetails from '../components/ProduccionMantencionDetails';


// // Define las props que recibe de App.tsx
// interface MantenimientoPageProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function ProduccionMantencionPage({ empresa, propietario_red, fecha_inicio, fecha_fin }: MantenimientoPageProps) {
//   return (
//     <Box sx={{ p: 3 }}> {/* Es buena práctica añadir algo de padding a las páginas */}
//       <Typography variant="h4" gutterBottom>
//         🔧 Producción de Mantenimiento
//       </Typography>
      
//       {empresa ? (
//         // CAMBIO: Se envuelven los dos componentes en un Fragmento <> ... </>
//         <>
//           {/* Posiblemente uno de estos dos componentes es una versión antigua y deba ser eliminado */}
//           <ProduccionMantencionDetails
//             empresa={empresa}
//             propietario_red={propietario_red}
//             fecha_inicio={fecha_inicio}
//             fecha_fin={fecha_fin}
//           />
        
//         </>
//       ) : (
//         <Typography color="text.secondary" sx={{ mt: 2 }}>
//           Por favor, selecciona una empresa en la barra superior para ver los datos.
//         </Typography>
//       )}
//     </Box>
//   );
// }