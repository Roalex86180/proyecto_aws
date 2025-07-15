// frontend/src/components/KpiMultiskillMetrics.tsx (REFACTORIZADO)

import axios from 'axios';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS DE ESTADO
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import { Dayjs } from 'dayjs';



// --- Interfaces (sin cambios) ---
interface KpiData {
  "Empresa": string;
  total_asignadas: string;
  total_finalizadas: string;
  pct_efectividad: string | null;
}

// 2. LA FUNCIÓN DE FETCHING INDEPENDIENTE PARA ESTE KPI
const fetchKpiMultiskill = async (
  propietarioRed: string | null,
  fechaInicio: Dayjs | null,
  fechaFin: Dayjs | null
) => {
  const params = {
    propietario_red: propietarioRed,
    fecha_inicio: fechaInicio ? fechaInicio.format('YYYY-MM-DD') : undefined,
    fecha_fin: fechaFin ? fechaFin.format('YYYY-MM-DD') : undefined,
  };
  const { data } = await axios.get<KpiData[]>(`/api/kpi/multiskill`, { params });
  return data;
};

// 3. EL COMPONENTE YA NO RECIBE PROPS
export default function KpiMultiskillMetrics() {

  // 4. OBTIENE LOS FILTROS NECESARIOS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // 5. REEMPLAZA useEffect y useState CON useQuery
  const { data: kpiData, isLoading, isError, error } = useQuery({
    // La queryKey es única y depende solo de los filtros que este componente usa
    queryKey: ['kpiMultiskill', { propietarioRed, fechaInicio, fechaFin }],
    queryFn: () => fetchKpiMultiskill(propietarioRed, fechaInicio, fechaFin),
  });
  
  // 6. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (isError) return <Typography color="error">Error al cargar KPI: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  if (!kpiData || kpiData.length === 0) {
    return (
      <Box>
        <Typography variant="h5" component="h5" gutterBottom>
          Efectividad por Empresa Multiskill
        </Typography>
        <Typography sx={{ mt: 2 }}>No hay datos para los filtros seleccionados.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h5" gutterBottom>
        Efectividad por Empresa Multiskill
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.4, mt: 1.4 }}>
        {kpiData.map((kpi) => (
          <Card
            key={kpi.Empresa}
            sx={{
              minWidth: 250, flexGrow: 1, backgroundColor: 'background.paper',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.4s ease-in-out',
              '&:hover': { transform: 'scale(1.05)', boxShadow: 6, }
            }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                {kpi.Empresa}
              </Typography>
              <Typography variant="h5" component="div" sx={{ color: 'primary.main', fontWeight: 'bold', my: 1 }}>
                {kpi.pct_efectividad ? parseFloat(kpi.pct_efectividad).toFixed(1) + '%' : 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, fontSize: '1.1rem', fontWeight: 'bold' }} color="text.secondary">
                {kpi.total_finalizadas} / {kpi.total_asignadas} 
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

// // frontend/src/components/KpiMultiskillMetrics.tsx

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// // ¡Ya no importamos FormControl, InputLabel, Select, MenuItem!
// import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
// 


// // Interfaces para los datos y las props (esto no cambia)
// interface KpiData {
//   "Empresa": string;
//   total_asignadas: string;
//   total_finalizadas: string;
//   pct_efectividad: string | null;
// }

// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // El componente ahora solo recibe los filtros como props, no tiene filtros propios
// export default function KpiMultiskillMetrics({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
//   const [kpiData, setKpiData] = useState<KpiData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<Error | null>(null);

//   // useEffect ahora depende 100% de las props que vienen de App.tsx
//   useEffect(() => {
//     const fetchKpiData = async () => {
//       setLoading(true);
//       setError(null); // Limpiamos errores anteriores en cada nueva búsqueda
//       try {
//         const response = await axios.get<KpiData[]>(`/api/kpi/multiskill`, {
//           params: {
//             propietario_red,
//             fecha_inicio,
//             fecha_fin,
//           }
//         });
//         setKpiData(response.data);
//       } catch (err) {
//         if (err instanceof Error) setError(err);
//         else setError(new Error('Ocurrió un error desconocido'));
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     if ((fecha_inicio && fecha_fin) || (!fecha_inicio && !fecha_fin)) {
//       fetchKpiData();
//     }
//   }, [propietario_red, fecha_inicio, fecha_fin]); // El array de dependencias es la clave para que se actualice

//   if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
//   if (error) return <Typography color="error">Error al cargar KPI: {error.message}</Typography>;

//   return (
//     <Box>
//       <Typography variant="h5" component="h5" gutterBottom>
//         Efectividad por Empresa Multiskill
//       </Typography>
//       <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.4, mt: 1.4 }}>
//         {kpiData.map((kpi) => (
//           <Card
//             key={kpi.Empresa}
//             sx={{
//               minWidth: 250, flexGrow: 1, backgroundColor: 'background.paper',
//               transition: 'transform 0.2s ease-in-out, box-shadow 0.4s ease-in-out',
//               '&:hover': { transform: 'scale(1.05)', boxShadow: 6, }
//             }}
//           >
//             <CardContent sx={{ textAlign: 'center' }}> {/* Centramos todo el contenido de la tarjeta */}
              
//               {/* 1. HEMOS ELIMINADO la etiqueta <Typography> que decía "Empresa" */}

//               <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
//                 {kpi.Empresa}
//               </Typography>
//               <Typography variant="h5" component="div" sx={{ color: 'primary.main', fontWeight: 'bold', my: 1 }}> {/* 'my' da margen vertical */}
//                 {kpi.pct_efectividad ? parseFloat(kpi.pct_efectividad).toFixed(1) + '%' : 'N/A'}
//               </Typography>
              
//               {/* 2. Aumentamos el tamaño de la fuente en este texto */}
//               <Typography variant="body2" sx={{ mt: 2, fontSize: '1.1rem', fontWeight: 'bold' }} color="text.secondary">
//                 {kpi.total_finalizadas} / {kpi.total_asignadas} 
//               </Typography>
//             </CardContent>
//           </Card>
//         ))}
//       </Box>
//     </Box>
//   );
// }