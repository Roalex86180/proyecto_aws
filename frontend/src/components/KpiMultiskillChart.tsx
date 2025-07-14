// frontend/src/components/KpiMultiskillChart.tsx (REFACTORIZADO)

import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Typography, Box, CircularProgress } from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import { Dayjs } from 'dayjs';
import { useMemo } from 'react'; // Importamos useMemo

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces ---
interface KpiChartData {
  "Empresa": string;
  pct_efectividad: string | null;
  // Esta propiedad la añadiremos nosotros, por eso es opcional
  pct_efectividad_num?: number;
}

// 2. LA FUNCIÓN DE FETCHING. Es la misma que en KpiMultiskillMetrics.
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
  // Apuntamos al mismo endpoint que el componente anterior
  const { data } = await axios.get<KpiChartData[]>(`${API_URL}/api/kpi/multiskill`, { params });
  return data;
};

// --- Componentes Auxiliares (sin cambios) ---
const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
//Componente para mostrar la etiqueta de datos encima de cada barra
const CustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (width < 20) return null; // No mostrar etiqueta si la barra es muy pequeña
  return (
    <text x={x + width / 2} y={y - 6} fill="#1A2027" textAnchor="middle" fontSize={12} fontWeight="bold">
      {formatPercentage(value)}
    </text>
  );
};

// Componente para personalizar el estilo del Tooltip (al pasar el ratón)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Box sx={{ backgroundColor: 'white', p: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: 3 }}>
        <Typography sx={{ fontWeight: 'bold' }}>{label}</Typography>
        <Typography sx={{ color: 'primary.main' }}>
          Efectividad: {formatPercentage(payload[0].value)}
        </Typography>
      </Box>
    );
  }
  return null;
};


// --- Componente Principal del Gráfico (REFACTORIZADO) ---
// 3. EL COMPONENTE YA NO RECIBE PROPS
export default function KpiMultiskillChart() {

  // 4. OBTENEMOS LOS FILTROS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // 5. USAMOS TANSTACK QUERY PARA OBTENER LOS DATOS
  const { data: rawData, isLoading, isError, error, isFetching } = useQuery({
    // ¡¡LA MAGIA!! Usamos EXACTAMENTE la misma queryKey que en KpiMultiskillMetrics.
    queryKey: ['kpiMultiskill', { propietarioRed, fechaInicio, fechaFin }],
    queryFn: () => fetchKpiMultiskill(propietarioRed, fechaInicio, fechaFin),
  });
  
  // 6. USAMOS useMemo PARA PROCESAR LOS DATOS
  // Esta lógica solo se re-ejecutará cuando rawData cambie, no en cada render.
  const chartData = useMemo(() => {
    if (!rawData) return []; // Si no hay datos, devuelve un array vacío
    return rawData
      .filter(item => item.pct_efectividad !== null)
      .map(item => ({ ...item, pct_efectividad_num: parseFloat(item.pct_efectividad!) }))
      .sort((a, b) => (b.pct_efectividad_num ?? 0) - (a.pct_efectividad_num ?? 0));
  }, [rawData]); // Depende solo de los datos crudos

  // 7. LÓGICA DE RENDERIZADO MEJORADA CON LOS ESTADOS DE useQuery
  if (isError) return <Typography color="error" align="center" sx={{ mt: 4 }}>Error: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  
  // Muestra el spinner grande solo en la carga inicial
  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, height: 400 }}><CircularProgress /></Box>;
  
  if (chartData.length === 0) return <Box sx={{mt: 4, height: 400}}><Typography color="textSecondary" align="center" sx={{ mt: 4 }}>No hay datos para mostrar en el gráfico.</Typography></Box>;

  return (
    <Box sx={{ mt: 4, height: 400, position: 'relative' }}>
      {/* El overlay aparece en las recargas en segundo plano */}
      {isFetching && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 1 }}>
          <CircularProgress />
        </Box>
      )}

      <Typography variant="h5" component="h3" gutterBottom align="center">
        Efectividad por Empresa
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          style={{ opacity: isFetching ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="Empresa" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(227, 242, 253, 0.5)' }} />
          <Bar dataKey="pct_efectividad_num" fill="#4DB2F2" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="pct_efectividad_num" content={<CustomBarLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// // frontend/src/components/KpiMultiskillChart.tsx

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList} from 'recharts';
// import { Typography, Box, CircularProgress } from '@mui/material';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';


// // --- Interfaces (sin cambios) ---
// interface KpiChartData {
//   "Empresa": string;
//   pct_efectividad: string | null;
//   pct_efectividad_num?: number;
// }
// interface KpiChartProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Componentes Auxiliares (AHORA CON SU CÓDIGO COMPLETO) ---

// const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

// // Componente para mostrar la etiqueta de datos encima de cada barra
// const CustomBarLabel = (props: any) => {
//   const { x, y, width, value } = props;
//   if (width < 20) return null; // No mostrar etiqueta si la barra es muy pequeña
//   return (
//     <text x={x + width / 2} y={y - 6} fill="#1A2027" textAnchor="middle" fontSize={12} fontWeight="bold">
//       {formatPercentage(value)}
//     </text>
//   );
// };

// // Componente para personalizar el estilo del Tooltip (al pasar el ratón)
// const CustomTooltip = ({ active, payload, label }: any) => {
//   if (active && payload && payload.length) {
//     return (
//       <Box sx={{ backgroundColor: 'white', p: '10px', border: '1px solid #ccc', borderRadius: '4px', boxShadow: 3 }}>
//         <Typography sx={{ fontWeight: 'bold' }}>{label}</Typography>
//         <Typography sx={{ color: 'primary.main' }}>
//           Efectividad: {formatPercentage(payload[0].value)}
//         </Typography>
//       </Box>
//     );
//   }
//   return null;
// };

// // --- Componente Principal del Gráfico (con lógica de renderizado corregida) ---

// export default function KpiMultiskillChart({ propietario_red, fecha_inicio, fecha_fin }: KpiChartProps) {
//   const [chartData, setChartData] = useState<KpiChartData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     const fetchKpiChartData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<KpiChartData[]>(`${API_URL}/api/kpi/multiskill`, {
//           params: { propietario_red, fecha_inicio, fecha_fin }
//         });
//         const processedData = response.data
//           .filter(item => item.pct_efectividad !== null)
//           .map(item => ({ ...item, pct_efectividad_num: parseFloat(item.pct_efectividad!) }))
//           .sort((a, b) => (b.pct_efectividad_num ?? 0) - (a.pct_efectividad_num ?? 0));
//         setChartData(processedData);
//       } catch (err) {
//         if (err instanceof Error) setError(err);
//         else setError(new Error('Ocurrió un error al cargar los datos del gráfico'));
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchKpiChartData();
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   // Lógica de renderizado mejorada
//   if (error) return <Typography color="error" align="center" sx={{ mt: 4 }}>Error: {error.message}</Typography>;
  
//   // Muestra un indicador de carga grande solo la primera vez (cuando no hay datos)
//   if (loading && chartData.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  
//   // Muestra un mensaje si, después de cargar, no hay datos
//   if (!loading && chartData.length === 0) return <Typography color="textSecondary" align="center" sx={{ mt: 4 }}>No hay datos para mostrar con los filtros seleccionados.</Typography>;

//   return (
//     <Box sx={{ mt: 4, height: 400, position: 'relative' }}>
//       {/* El overlay de carga solo aparece en las recargas, no en la carga inicial */}
//       {loading && chartData.length > 0 && (
//         <Box sx={{
//           position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
//           backgroundColor: 'rgba(255, 255, 255, 0.7)', display: 'flex',
//           justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 1
//         }}>
//           <CircularProgress />
//         </Box>
//       )}

//       <Typography variant="h5" component="h3" gutterBottom align="center">
//         Efectividad por Empresa
//       </Typography>
//       <ResponsiveContainer width="100%" height="100%">
//         <BarChart
//           data={chartData}
//           margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
//           style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}
//         >
//           <CartesianGrid strokeDasharray="3 3" vertical={false} />
//           <XAxis dataKey="Empresa" tick={{ fontSize: 12 }} />
//           <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} tick={{ fontSize: 12 }} />
//           <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(227, 242, 253, 0.5)' }} />
//           {/* Usamos el color Azul intermedio (#6DB9F4) especificado en tu paleta */}
//           <Bar dataKey="pct_efectividad_num" fill="#4DB2F2" radius={[4, 4, 0, 0]}>
//             <LabelList dataKey="pct_efectividad_num" content={<CustomBarLabel />} />
//           </Bar>
//         </BarChart>
//       </ResponsiveContainer>
//     </Box>
//   );
// }