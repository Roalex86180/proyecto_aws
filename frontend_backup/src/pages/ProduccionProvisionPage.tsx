import { Typography } from '@mui/material';
import ProduccionProvisionDetails from '../components/ProduccionProvisionDetails';

export default function ProduccionProvisionPage() {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Producción Provisión
      </Typography>
      <ProduccionProvisionDetails />
    </>
  );
}


// import { Typography, Box } from '@mui/material';
// import ProduccionProvisionDetails from '../components/ProduccionProvisionDetails';

// interface PageProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function ProduccionProvisionPage({ empresa, propietario_red, fecha_inicio, fecha_fin }: PageProps) {
//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" gutterBottom>
//         Producción Provisión
//       </Typography>
      
//       <ProduccionProvisionDetails
//         empresa={empresa}
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//     </Box>
//   );
// }