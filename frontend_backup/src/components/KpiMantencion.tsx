// frontend/src/components/KpiMantencion.tsx (REFACTORIZADO)

import React from 'react';
import axios from 'axios';
import { Typography, Box} from '@mui/material';
import { DataGrid} from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import { Dayjs } from 'dayjs';
import LoadingOverlay from './LoadingOverlay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces (sin cambios) ---
interface MantencionData {
  empresa: string;
  total_asignadas: string;
  total_finalizadas: string;
  pct_efectividad: string | null;
}

// 2. LA FUNCIÓN DE FETCHING INDEPENDIENTE
// Nota que esta función no necesita el filtro 'empresa', solo los que usa este componente.
const fetchKpiMantencion = async (
  propietarioRed: string | null,
  fechaInicio: Dayjs | null,
  fechaFin: Dayjs | null
) => {
  const params = {
    propietario_red: propietarioRed,
    fecha_inicio: fechaInicio ? fechaInicio.format('YYYY-MM-DD') : undefined,
    fecha_fin: fechaFin ? fechaFin.format('YYYY-MM-DD') : undefined,
  };
  const { data } = await axios.get<MantencionData[]>(`${API_URL}/api/kpi/mantencion`, { params });
  return data;
};

// --- Componente de Gráfico (sin cambios) ---
const MantencionChart = ({ data }: { data: MantencionData[] }): React.ReactElement => {
    const chartData = data.map(item => ({
        ...item,
        pct_efectividad_num: item.pct_efectividad ? parseFloat(item.pct_efectividad) : 0,
    })).sort((a, b) => (b.pct_efectividad_num ?? 0) - (a.pct_efectividad_num ?? 0));
    return <ResponsiveContainer width="100%" height={400}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="empresa" tick={{ fontSize: 12 }} /><YAxis domain={[0, 105]} tickFormatter={(tick) => `${tick}%`} /><Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Efectividad"]} /><Bar dataKey="pct_efectividad_num" >{chartData.map((entry) => (<Cell key={`cell-${entry.empresa}`} fill={(entry.pct_efectividad_num ?? 0) >= 90 ? '#388E3C' : '#D32F2F'} />))}<LabelList dataKey="pct_efectividad_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} /></Bar></BarChart></ResponsiveContainer>
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiMantencion() {
  
  // 4. OBTIENE LOS FILTROS NECESARIOS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // 5. REEMPLAZA useEffect y useState CON useQuery
  const { data, isLoading, isError, error } = useQuery({
    // La queryKey es única para esta petición y depende de los filtros que usa.
    queryKey: ['kpiMantencion', { propietarioRed, fechaInicio, fechaFin }],
    queryFn: () => fetchKpiMantencion(propietarioRed, fechaInicio, fechaFin),
    // No necesita 'enabled: !!empresa' porque este KPI no depende de la empresa.
  });

  const columns: GridColDef[] = [
    // ... tu definición de columnas no cambia ...
    { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
    { field: 'total_asignadas', headerName: 'Asignadas', width: 130, type: 'number' },
    { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number' },
    { field: 'pct_efectividad', headerName: '% Efectividad', flex: 1, minWidth: 150, type: 'number', valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A', cellClassName: (params) => (params.value ? parseFloat(params.value) : 0) >= 90 ? 'kpi-positive' : 'kpi-negative' },
  ];

  // 6. LA LÓGICA DE RENDERIZADO USA LOS ESTADOS DE useQuery
  // Aquí preservamos tu componente LoadingOverlay y la opacidad.
  if (isError) return <Typography color="error">Error al cargar datos de mantención: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  
  // No necesitamos un `if (isLoading)` aquí porque el overlay y la opacidad lo manejan visualmente.

  return (
    <Box sx={{ mt: 4, position: 'relative' }}>
      <LoadingOverlay isLoading={isLoading} />
      <Box sx={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        <Typography variant="h5" gutterBottom>Efectividad de Mantención</Typography>
        
        {/* Mostramos un mensaje si no hay datos, pero solo cuando no está cargando */}
        {!isLoading && (!data || data.length === 0) ? (
          <Typography sx={{ mt: 4 }}>No hay datos para los filtros seleccionados.</Typography>
        ) : (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Tabla de Efectividad por Empresa</Typography>
            <Box sx={{ height: 'auto', width: '100%', mb: 4, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeaders': { backgroundColor: '#1D66A5 !important', color: '#FFFFFF !important', '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5 !important', }, '& .MuiDataGrid-columnHeaderTitle': { color: '#FFFFFF !important', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { color: '#FFFFFF !important' } }, '& .MuiDataGrid-cell': { borderBottom: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }}>
              <DataGrid
                rows={data?.map((row, index) => ({ id: index, ...row })) || []}
                columns={columns}
                pageSizeOptions={[5, 10, 20]}
                initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
                disableRowSelectionOnClick
                autoHeight
                sx={{ border: 0 }}
              />
            </Box>
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Efectividad</Typography>
            <MantencionChart data={data || []} />
          </>
        )}
      </Box>
    </Box>
  );
}


// // frontend/src/components/KpiMantencion.tsx

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef } from '@mui/x-data-grid';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
// import LoadingOverlay from './LoadingOverlay';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// // --- Interfaces y Props ---
// interface MantencionData {
//   empresa: string;
//   total_asignadas: string;
//   total_finalizadas: string;
//   pct_efectividad: string | null;
// }
// interface KpiMantencionProps {
//   propietario_red?: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // CAMBIO 1: Renombramos el componente del gráfico a 'MantencionChart'
// const MantencionChart = ({ data }: { data: MantencionData[] }): React.ReactElement => {
//   const chartData = data.map(item => ({
//     ...item,
//     pct_efectividad_num: item.pct_efectividad ? parseFloat(item.pct_efectividad) : 0,
//   })).sort((a, b) => (b.pct_efectividad_num ?? 0) - (a.pct_efectividad_num ?? 0));

//   return (
//     <ResponsiveContainer width="100%" height={400}>
//       <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="empresa" tick={{ fontSize: 12 }} />
//         <YAxis domain={[0, 105]} tickFormatter={(tick) => `${tick}%`} />
//         <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Efectividad"]} />
//         <Bar dataKey="pct_efectividad_num" >
//           {chartData.map((entry) => (
//             <Cell key={`cell-${entry.empresa}`} fill={(entry.pct_efectividad_num ?? 0) >= 90 ? '#388E3C' : '#D32F2F'} />
//           ))}
//           <LabelList dataKey="pct_efectividad_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// };


// // --- Componente Principal ---
// export default function KpiMantencion({ propietario_red, fecha_inicio, fecha_fin }: KpiMantencionProps) {
//   const [data, setData] = useState<MantencionData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<MantencionData[]>(`${API_URL}/api/kpi/mantencion`, {
//           params: { propietario_red, fecha_inicio, fecha_fin }
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
//         // Guardar la posición actual del scroll
//         const currentScrollY = window.scrollY;
        
//         fetchData().then(() => {
//           // Restaurar la posición del scroll después de que se actualicen los datos
//           setTimeout(() => {
//             window.scrollTo(0, currentScrollY);
//           }, 100);
//         });
//     }
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const columns: GridColDef[] = [
//     { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
//     { field: 'total_asignadas', headerName: 'Asignadas', width: 130, type: 'number' },
//     { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number' },
//     {
//       field: 'pct_efectividad',
//       headerName: '% Efectividad',
//       flex: 1,
//       minWidth: 150,
//       type: 'number',
//       valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
//       cellClassName: (params) => {
//         const efectividad = params.value ? parseFloat(params.value) : 0;
//         return efectividad >= 90 ? 'kpi-positive' : 'kpi-negative';
//       },
//     },
//   ];

//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error">Error: {error.message}</Typography>;
//   if (!loading && data.length === 0) return <Typography sx={{ mt: 4 }}>No hay datos para los filtros seleccionados.</Typography>

//   return (
//     <Box sx={{ mt: 4 }}>
//       <LoadingOverlay isLoading={loading} />
//       <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
//         <Typography variant="h5" gutterBottom>Efectividad de Mantención</Typography>
        
//         <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Tabla de Efectividad por Empresa</Typography>
//         <Box sx={{
//           height: 'auto',
//           width: '100%',
//           mb: 4,
//           '& .kpi-positive': { color: '#388E3C', fontWeight: '600' },
//           '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' },
//           '& .MuiDataGrid-columnHeaders': { 
//             backgroundColor: '#1D66A5 !important', 
//             color: '#FFFFFF !important',
//             '& .MuiDataGrid-columnHeader': {
//               backgroundColor: '#1D66A5 !important',
//             },
//             '& .MuiDataGrid-columnHeaderTitle': {
//               color: '#FFFFFF !important',
//               fontWeight: 'bold'
//             },
//             '& .MuiDataGrid-columnSeparator': {
//               color: '#FFFFFF !important'
//             }
//           },
//           '& .MuiDataGrid-cell': { borderBottom: 'none' },
//           '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
//         }}>
//           <DataGrid
//             rows={data.map((row, index) => ({ id: index, ...row }))}
//             columns={columns}
//             pageSizeOptions={[5, 10, 20]}
//             initialState={{
//               pagination: { paginationModel: { pageSize: 20 } }
//             }}
//             disableRowSelectionOnClick
//             autoHeight
//             sx={{ border: 0 }}
//           />
//         </Box>

//         <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Efectividad</Typography>
//         {/* CAMBIO 2: Usamos el nombre corregido aquí también */}
//         <MantencionChart data={data} />
//       </Box>
//     </Box>
//   );
// }