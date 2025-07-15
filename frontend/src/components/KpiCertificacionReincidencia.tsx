// frontend/src/components/KpiCertificacionReincidencia.tsx (REFACTORIZADO)


import axios from 'axios';
import { Typography, Box, Paper, CircularProgress, Alert, Divider } from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import LoadingOverlay from './LoadingOverlay';



// --- Interfaces (sin cambios) ---
interface KpiData {
  empresa: string;
  total_actividades: string;
  total_certificadas: string;
  trabajos_no_certificados: string;
  reincidencias_de_no_certificadas: string;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchCertificacionReincidencia = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
    };
    const { data } = await axios.get<KpiData[]>(`/api/kpi/certificacion-vs-reincidencia`, { params });
    return data;
};

// --- Componente Auxiliar (sin cambios) ---
const formatNumber = (numStr: string) => new Intl.NumberFormat('es-CL').format(parseInt(numStr, 10));

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiCertificacionReincidencia() {
  
  // 4. OBTIENE LOS FILTROS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
  
  // Lógica declarativa para las fechas por defecto
  const today = new Date();
  const yesterday = new Date(new Date().setDate(today.getDate() - 1));
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 31));
  
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : yesterday.toISOString().split('T')[0];

  // 5. OBTENEMOS LOS DATOS CON useQuery
  const { data, isLoading, isError, error, isFetching } = useQuery({
    // La queryKey es específica para esta petición
    queryKey: ['certificacionVsReincidencia', { propietarioRed, startDate, endDate }],
    queryFn: () => fetchCertificacionReincidencia(propietarioRed, startDate, endDate),
  });

  // 6. LÓGICA DE RENDERIZADO CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? `Error: ${error.message}` : 'No se pudo cargar el KPI.'}</Alert>;

  return (
    <Paper sx={{ p: 3, mt: 4, borderRadius: 2, position: 'relative' }}>
      {/* Usamos isFetching para mostrar el overlay en recargas de fondo */}
      <LoadingOverlay isLoading={isFetching && !isLoading} />
      <Typography variant="h6" gutterBottom>Impacto de Certificación en Reincidencias</Typography>
      <Box sx={{ opacity: isFetching && !isLoading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <Box key={item.empresa}>
              <Typography variant="body1" sx={{ mt: 2 }} dangerouslySetInnerHTML={{ __html: 
                `• La empresa <strong>${item.empresa.toUpperCase()}</strong> en el período seleccionado realizó <strong>${formatNumber(item.total_actividades)}</strong> actividades, certificó <strong>${formatNumber(item.total_certificadas)}</strong>, no certificadas <strong>${formatNumber(item.trabajos_no_certificados)}</strong> y de estas últimas, <strong>${formatNumber(item.reincidencias_de_no_certificadas)}</strong> se convirtieron en reincidencias.`
              }}/>
              {index < data.length - 1 && <Divider sx={{ my: 1, opacity: 0.5 }} />}
            </Box>
          ))
        ) : (
          <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No hay datos para mostrar.</Typography>
        )}
      </Box>
    </Paper>
  );
}

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, Paper, CircularProgress, Alert, Divider } from '@mui/material';
// import LoadingOverlay from './LoadingOverlay';
// 

// // CAMBIO 1: Se ajusta la interfaz a los datos que ahora envía el backend
// interface KpiData {
//   empresa: string;
//   total_actividades: string;
//   total_certificadas: string;
//   trabajos_no_certificados: string; // <-- El campo que faltaba
//   reincidencias_de_no_certificadas: string;
// }
// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function KpiCertificacionReincidencia({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
//   const [data, setData] = useState<KpiData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     let startDate = fecha_inicio;
//     let endDate = fecha_fin;
//     if (!startDate || !endDate) {
//       const today = new Date();
//       const yesterday = new Date(new Date().setDate(today.getDate() - 1));
//       const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 31));
//       endDate = yesterday.toISOString().split('T')[0];
//       startDate = thirtyDaysAgo.toISOString().split('T')[0];
//     }

//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<KpiData[]>(`/api/kpi/certificacion-vs-reincidencia`, {
//           params: { propietario_red, fecha_inicio: startDate, fecha_fin: endDate }
//         });
//         setData(response.data);
//       } catch (err) {
//         setError('No se pudo cargar el KPI de Certificación vs. Reincidencia.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const formatNumber = (numStr: string) => new Intl.NumberFormat('es-CL').format(parseInt(numStr, 10));

//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

//   return (
//     <Paper sx={{ p: 3, mt: 4, borderRadius: 2 }}>
//       <LoadingOverlay isLoading={loading} />
//       <Typography variant="h6" gutterBottom>Impacto de Certificación en Reincidencias</Typography>
//       <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
//         {data.map((item, index) => (
//           <Box key={item.empresa}>
//             {/* CAMBIO 2: Se construye la frase con el nuevo campo */}
//             <Typography variant="body1" sx={{ mt: 2 }}>
//               • La empresa <strong>{item.empresa.toUpperCase()}</strong> en el período seleccionado realizó <strong>{formatNumber(item.total_actividades)}</strong> actividades, certificó <strong>{formatNumber(item.total_certificadas)}</strong>, no certificadas <strong>{formatNumber(item.trabajos_no_certificados)}</strong> y de estas últimas, <strong>{formatNumber(item.reincidencias_de_no_certificadas)}</strong> se convirtieron en reincidencias.
//             </Typography>
//             {index < data.length -1 && <Divider sx={{ my: 1, opacity: 0.5 }} />}
//           </Box>
//         ))}
//       </Box>
//     </Paper>
//   );
// }