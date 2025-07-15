// frontend/src/components/KpiProvision.tsx (REFACTORIZADO CON ZUSTAND Y TANSTACK QUERY)

import React from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress } from '@mui/material';
import { DataGrid} from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import { Dayjs } from 'dayjs';



// --- Interfaces (sin cambios) ---
interface ProvisionData {
  empresa: string;
  total_asignadas: string;
  total_finalizadas: string;
  pct_efectividad: string | null;
}

// 2. LA FUNCIÓN DE FETCHING AHORA ES INDEPENDIENTE
const fetchKpiProvision = async (
  empresa: string | null,
  propietarioRed: string | null,
  fechaInicio: Dayjs | null,
  fechaFin: Dayjs | null
) => {
  // Construimos los parámetros para la API, formateando las fechas si existen
  const params = {
    empresa: empresa,
    propietario_red: propietarioRed,
    fecha_inicio: fechaInicio ? fechaInicio.format('YYYY-MM-DD') : undefined,
    fecha_fin: fechaFin ? fechaFin.format('YYYY-MM-DD') : undefined,
  };
  const { data } = await axios.get<ProvisionData[]>(`/api/kpi/provision`, { params });
  return data;
};

// --- Componente de Gráfico (sin cambios) ---
const ProvisionChart = ({ data }: { data: ProvisionData[] }): React.ReactElement => {
  const chartData = data.map(item => ({
    ...item,
    pct_efectividad_num: item.pct_efectividad ? parseFloat(item.pct_efectividad) : 0,
  })).sort((a, b) => (b.pct_efectividad_num ?? 0) - (a.pct_efectividad_num ?? 0));
  return <ResponsiveContainer width="100%" height={400}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="empresa" tick={{ fontSize: 12 }} /><YAxis domain={[0, 105]} tickFormatter={(tick) => `${tick}%`} /><Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Efectividad"]} /><Bar dataKey="pct_efectividad_num" >{chartData.map((entry) => (<Cell key={`cell-${entry.empresa}`} fill={(entry.pct_efectividad_num ?? 0) >= 90 ? '#388E3C' : '#D32F2F'} />))}<LabelList dataKey="pct_efectividad_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} /></Bar></BarChart></ResponsiveContainer>
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiProvision() {
  
  // 4. OBTIENE LOS FILTROS DIRECTAMENTE DE ZUSTAND
  const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // 5. REEMPLAZA useEffect y useState CON UN ÚNICO HOOK useQuery
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['kpiProvision', { empresa, propietarioRed, fechaInicio, fechaFin }],
    queryFn: () => fetchKpiProvision(empresa, propietarioRed, fechaInicio, fechaFin),
    enabled: !!empresa, // La consulta solo se ejecutará si hay una empresa seleccionada
  });

  const columns: GridColDef[] = [
    // ... tu definición de columnas no cambia ...
    { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
    { field: 'total_asignadas', headerName: 'Asignadas', width: 130, type: 'number' },
    { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number' },
    { field: 'pct_efectividad', headerName: '% Efectividad', flex: 1, minWidth: 150, type: 'number', valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A', cellClassName: (params) => (params.value ? parseFloat(params.value) : 0) >= 90 ? 'kpi-positive' : 'kpi-negative' },
  ];

  // 6. LA LÓGICA DE RENDERIZADO USA LOS ESTADOS DE useQuery
  if (!empresa) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>Efectividad de Provisión</Typography>
        <Typography sx={{ mt: 2 }}>Por favor, selecciona una empresa para ver los datos.</Typography>
      </Box>
    );
  }
  
  if (isLoading) return <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column' }}><Typography variant="h5" gutterBottom>Efectividad de Provisión</Typography><CircularProgress sx={{ mt: 4 }} /></Box>;
  if (isError) return <Typography color="error">Error al cargar datos de provisión: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  if (!data || data.length === 0) return <Box sx={{ mt: 4 }}><Typography variant="h5" gutterBottom>Efectividad de Provisión</Typography><Typography sx={{ mt: 2 }}>No hay datos para los filtros seleccionados.</Typography></Box>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Efectividad de Provisión</Typography>
      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Tabla de Efectividad por Empresa</Typography>
      <Box sx={{ height: 'auto', width: '100%', mb: 4, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeaders': { backgroundColor: '#1D66A5 !important', color: '#FFFFFF !important', '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5 !important', }, '& .MuiDataGrid-columnHeaderTitle': { color: '#FFFFFF !important', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { color: '#FFFFFF !important' } }, '& .MuiDataGrid-cell': { borderBottom: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }}>
        <DataGrid
          rows={data.map((row, index) => ({ id: index, ...row }))}
          columns={columns}
          pageSizeOptions={[5, 10, 20]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          disableRowSelectionOnClick
          autoHeight
          sx={{ border: 0 }}
        />
      </Box>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Efectividad</Typography>
      <ProvisionChart data={data} />
    </Box>
  );
}

// // frontend/src/components/KpiProvision.tsx

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef } from '@mui/x-data-grid';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
// 

// // --- Interfaces y Props ---
// interface ProvisionData {
//   empresa: string;
//   total_asignadas: string;
//   total_finalizadas: string;
//   pct_efectividad: string | null;
// }
// interface KpiProvisionProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Componente de Gráfico ---
// const ProvisionChart = ({ data }: { data: ProvisionData[] }): React.ReactElement => {
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
// export default function KpiProvision({ propietario_red, fecha_inicio, fecha_fin }: KpiProvisionProps) {
//   const [data, setData] = useState<ProvisionData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<ProvisionData[]>(`/api/kpi/provision`, {
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
//       const currentScrollY = window.scrollY;
//       fetchData().then(() => {
//         setTimeout(() => {
//           window.scrollTo(0, currentScrollY);
//         }, 100);
//       });
//     }
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const columns: GridColDef[] = [
//     { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
//     { field: 'total_asignadas', headerName: 'Asignadas', width: 130, type: 'number' },
//     { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number' },
//     {
//       field: 'pct_efectividad',
//       headerName: '% Efectividad',
//       flex: 1, minWidth: 150, type: 'number',
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
//       <Typography variant="h5" gutterBottom>Efectividad de Provisión</Typography>
      
//       <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Tabla de Efectividad por Empresa</Typography>
      
//       {/* AQUÍ ESTÁ EL BLOQUE DE ESTILOS COMPLETO Y CORREGIDO */}
//       <Box sx={{
//         height: 'auto',
//         width: '100%',
//         mb: 4,
//         '& .kpi-positive': { color: '#388E3C', fontWeight: '600' },
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
//         <DataGrid
//           rows={data.map((row, index) => ({ id: index, ...row }))}
//           columns={columns}
//           pageSizeOptions={[5, 10, 20]}
//           initialState={{
//             pagination: { paginationModel: { pageSize: 20 } }
//           }}
//           disableRowSelectionOnClick
//           autoHeight
//           sx={{ border: 0 }}
//         />
//       </Box>

//       <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Efectividad</Typography>
//       <ProvisionChart data={data} />
//     </Box>
//   );
// }