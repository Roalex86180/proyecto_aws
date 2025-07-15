// frontend/src/components/KpiDistribucionReincidencias.tsx (REFACTORIZADO)


import axios from 'axios';
import { Typography, Box, Paper, CircularProgress } from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import { Dayjs } from 'dayjs';
import LoadingOverlay from './LoadingOverlay';



// --- Interfaces (sin cambios) ---
interface Desglose {
  tipo_actividad: string;
  casos: number;
  porcentaje: number;
}
interface NetworkData {
  total_actividades: number;
  desglose_reincidencias: Desglose[];
}
interface ApiResponse {
  entel: NetworkData;
  onnet: NetworkData;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE Y LIMPIA
const fetchDistribucionReincidencias = async (
    fechaInicio: Dayjs | null,
    fechaFin: Dayjs | null
) => {
    const params = {
        fecha_inicio: fechaInicio ? fechaInicio.format('YYYY-MM-DD') : undefined,
        fecha_fin: fechaFin ? fechaFin.format('YYYY-MM-DD') : undefined,
    };
    const { data } = await axios.get<ApiResponse>(`/api/kpi/distribucion-reincidencias`, { params });
    return data;
};

// --- Componente Auxiliar (sin cambios) ---
const NetworkSummary = ({ name, data }: { name: string, data: NetworkData }) => {
    const formatNumber = (num: number) => new Intl.NumberFormat('es-CL').format(num);
    return (
        <Box sx={{ mb: 3 }}>
            <Typography dangerouslySetInnerHTML={{ __html: `• En este periodo se tienen <strong>${formatNumber(data.total_actividades)}</strong> actividades en <strong>Red ${name}</strong>` }} />
            {data.desglose_reincidencias.sort((a,b) => b.casos - a.casos).map(item => (
                <Typography key={item.tipo_actividad} sx={{ ml: 2 }} dangerouslySetInnerHTML={{ __html: `- El <strong>${item.porcentaje.toFixed(1)}%</strong> de las reincidencias pertenece a <strong>'${item.tipo_actividad}'</strong> (${formatNumber(item.casos)} casos).` }} />
            ))}
        </Box>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiDistribucionReincidencias() {
  
  // 4. OBTIENE SOLO LOS FILTROS QUE NECESITA DE ZUSTAND
  const { fechaInicio, fechaFin } = useFilterStore();

  // 5. REEMPLAZA useEffect y useState CON useQuery
  const { data, isLoading, isError, error, isFetching } = useQuery({
    // ¡Nota que la queryKey solo depende de las fechas!
    queryKey: ['distribucionReincidencias', { fechaInicio, fechaFin }],
    queryFn: () => fetchDistribucionReincidencias(fechaInicio, fechaFin),
  });
  
  // 6. LÓGICA DE RENDERIZADO CON LOS ESTADOS DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Typography color="error">Error: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  if (!data) return <Typography sx={{ mt: 4 }}>No hay datos para los filtros seleccionados.</Typography>;

  return (
    <Paper sx={{ p: 2, mt: 4, borderRadius: 2, position: 'relative', border: '1px solid', borderColor: 'divider' }}>
      <LoadingOverlay isLoading={isFetching && !isLoading} />
      <Box sx={{ opacity: isFetching && !isLoading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        <Typography variant="h5" gutterBottom>Distribución de Reincidencias</Typography>
        {/* Usamos optional chaining (?) para acceder a los datos de forma segura */}
        {data.entel && <NetworkSummary name="Entel" data={data.entel} />}
        {data.onnet && <NetworkSummary name="Onnet" data={data.onnet} />}
      </Box>
    </Paper>
  );
}

// //frontend/src/components/KpiDistribucionReincidencias.tsx

// import  { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, Paper, CircularProgress } from '@mui/material';
// import LoadingOverlay from './LoadingOverlay';
// 
// // --- Interfaces para la nueva estructura de datos ---
// interface Desglose {
//   tipo_actividad: string;
//   casos: number;
//   porcentaje: number;
// }
// interface NetworkData {
//   total_actividades: number;
//   desglose_reincidencias: Desglose[];
// }
// interface ApiResponse {
//   entel: NetworkData;
//   onnet: NetworkData;
// }
// interface KpiProps {
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // Pequeño componente para renderizar la sección de una red
// const NetworkSummary = ({ name, data }: { name: string, data: NetworkData }) => {
//   const formatNumber = (num: number) => new Intl.NumberFormat('es-CL').format(num);

//   return (
//     <Box sx={{ mb: 3 }}>
//       <Typography>
//         • En este periodo se tienen <strong>{formatNumber(data.total_actividades)}</strong> actividades en <strong>Red {name}</strong>
//       </Typography>
//       {data.desglose_reincidencias.sort((a,b) => b.casos - a.casos).map(item => (
//         <Typography key={item.tipo_actividad} sx={{ ml: 2 }}>
//           - El <strong>{item.porcentaje.toFixed(1)}%</strong> de las reincidencias pertenece a <strong>'{item.tipo_actividad}'</strong> ({formatNumber(item.casos)} casos).
//         </Typography>
//       ))}
//     </Box>
//   );
// };


// export default function KpiDistribucionReincidencias({ fecha_inicio, fecha_fin }: KpiProps) {
//   const [data, setData] = useState<ApiResponse | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<ApiResponse>(`/api/kpi/distribucion-reincidencias`, {
//           params: { fecha_inicio, fecha_fin }
//         });
//         setData(response.data);
//       } catch (err) {
//         if (err instanceof Error) setError(err);
//         else setError(new Error('Ocurrió un error desconocido'));
//       } finally {
//         setLoading(false);
//       }
//     };
//     if ((fecha_inicio && fecha_fin) || (!fecha_inicio && !fecha_fin)) {
//       const currentScrollY = window.scrollY;
//       fetchData().then(() => {
//         setTimeout(() => { window.scrollTo(0, currentScrollY); }, 100);
//       });
//     }
//   }, [fecha_inicio, fecha_fin]);

//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error">Error: {error.message}</Typography>;
//   if (!data) return <Typography sx={{ mt: 4 }}>No hay datos.</Typography>;

//   return (
//     <Paper sx={{ p: 2, mt: 4, borderRadius: 2, position: 'relative', border: '1px solid', borderColor: 'divider' }}>
//       <LoadingOverlay isLoading={loading} />
//       <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
//         <Typography variant="h5" gutterBottom>Distribución de Reincidencias</Typography>
//         <NetworkSummary name="Entel" data={data.entel} />
//         <NetworkSummary name="Onnet" data={data.onnet} />
//       </Box>
//     </Paper>
//   );
// }