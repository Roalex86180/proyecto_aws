// frontend/src/components/KpiReincidencias.tsx (REFACTORIZADO)

import React from 'react'; // Eliminamos useState y useEffect
import axios from 'axios';
import { Typography, Box, CircularProgress } from '@mui/material';
import { DataGrid} from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import { Dayjs } from 'dayjs';
import LoadingOverlay from './LoadingOverlay';



// --- Interfaces (sin cambios) ---
interface ReincidenciaData {
  empresa: string;
  reincidencias: string;
  total_finalizadas: string;
  porcentaje_reincidencia: string | null;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE Y LIMPIA
const fetchKpiReincidencias = async (
    propietarioRed: string | null,
    fechaInicio: Dayjs | null,
    fechaFin: Dayjs | null
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio ? fechaInicio.format('YYYY-MM-DD') : undefined,
        fecha_fin: fechaFin ? fechaFin.format('YYYY-MM-DD') : undefined,
    };
    const { data } = await axios.get<ReincidenciaData[]>(`/api/kpi/reincidencias`, { params });
    return data;
};

// --- Componente de Gráfico (sin cambios) ---
const ReincidenciasChart = ({ data }: { data: ReincidenciaData[] }): React.ReactElement => {
    const chartData = data
      .map(item => ({
        ...item,
        porcentaje_num: item.porcentaje_reincidencia ? parseFloat(item.porcentaje_reincidencia) : 0,
      }))
      .sort((a, b) => (b.porcentaje_num ?? 0) - (a.porcentaje_num ?? 0));
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="empresa" tick={{fontSize: 12}} />
          <YAxis domain={[0, 'dataMax + 2']} tickFormatter={(tick) => `${tick}%`} />
          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Reincidencia"]} />
          <Bar dataKey="porcentaje_num">
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.empresa}`} fill={(entry.porcentaje_num ?? 0) > 4 ? '#D32F2F' : '#388E3C'} />
            ))}
            <LabelList dataKey="porcentaje_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiReincidencias() {
    
  // 4. OBTIENE LOS FILTROS NECESARIOS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // 5. REEMPLAZA useEffect y useState CON useQuery
  // Usamos 'isFetching' para los indicadores de recarga (overlay)
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['kpiReincidencias', { propietarioRed, fechaInicio, fechaFin }],
    queryFn: () => fetchKpiReincidencias(propietarioRed, fechaInicio, fechaFin),
  });

  const columns: GridColDef[] = [
    // ... tu definición de columnas no cambia ...
    { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
    { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'reincidencias', headerName: 'Reincidencias', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'porcentaje_reincidencia', headerName: '% Reincidencia', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
        valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
        cellClassName: (params) => {
            const reincidencia = params.value ? parseFloat(params.value) : 0;
            return reincidencia > 4 ? 'kpi-negative' : 'kpi-positive';
        },
    },
  ];

  // 6. LÓGICA DE RENDERIZADO CON LOS ESTADOS DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Typography color="error">Error: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  
  // Mensaje si no hay datos después de cargar
  if (!data || data.length === 0) {
    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>Reincidencias por Empresa</Typography>
            <Typography sx={{ mt: 4 }}>No hay datos para los filtros seleccionados.</Typography>
        </Box>
    );
  }

  return (
    <Box sx={{ mt: 4, position: 'relative' }}>
      {/* Usamos 'isFetching' para el overlay para que se muestre también en las recargas de fondo */}
      <LoadingOverlay isLoading={isFetching} />
      <Box sx={{ opacity: isFetching ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
        <Typography variant="h5" gutterBottom>Reincidencias por Empresa</Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Tabla de Reincidencias por Empresa</Typography>
        
        <Box sx={{ height: 'auto', width: '100%', mb: 4, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeaders': { backgroundColor: '#1D66A5 !important', color: '#FFFFFF !important', '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5 !important', }, '& .MuiDataGrid-columnHeaderTitle': { color: '#FFFFFF !important', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { color: '#FFFFFF !important' } }, '& .MuiDataGrid-cell': { borderBottom: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }}>
          <DataGrid
            rows={data.map((row) => ({ id: row.empresa, ...row }))}
            columns={columns}
            pageSizeOptions={[5, 10, 20]}
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            disableRowSelectionOnClick
            autoHeight
            sx={{ border: 0 }}
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Reincidencia</Typography>
        <ReincidenciasChart data={data} />
      </Box>
    </Box>
  );
}

// // frontend/src/components/KpiReincidencias.tsx

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress} from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef } from '@mui/x-data-grid';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
// import LoadingOverlay from './LoadingOverlay';
// 
// // --- Interfaces y Props ---
// interface ReincidenciaData {
//   empresa: string;
//   reincidencias: string;
//   total_finalizadas: string;
//   porcentaje_reincidencia: string | null;
// }

// // Ahora recibe todos los filtros globales
// interface KpiReincidenciasProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Componente de Gráfico ---
// const ReincidenciasChart = ({ data }: { data: ReincidenciaData[] }): React.ReactElement => {
//   const chartData = data
//     .map(item => ({
//       ...item,
//       porcentaje_num: item.porcentaje_reincidencia ? parseFloat(item.porcentaje_reincidencia) : 0,
//     }))
//     .sort((a, b) => (b.porcentaje_num ?? 0) - (a.porcentaje_num ?? 0)); // Orden descendente

//   return (
//     <ResponsiveContainer width="100%" height={400}>
//       <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="empresa" tick={{fontSize: 12}} />
//         <YAxis domain={[0, 'dataMax + 2']} tickFormatter={(tick) => `${tick}%`} />
//         <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Reincidencia"]} />
//         <Bar dataKey="porcentaje_num">
//           {chartData.map((entry) => (
//             <Cell key={`cell-${entry.empresa}`} fill={(entry.porcentaje_num ?? 0) > 4 ? '#D32F2F' : '#388E3C'} />
//           ))}
//           <LabelList dataKey="porcentaje_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// };


// // --- Componente Principal ---
// export default function KpiReincidencias({ propietario_red, fecha_inicio, fecha_fin }: KpiReincidenciasProps) {
//   const [data, setData] = useState<ReincidenciaData[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         // Ahora pasamos todos los filtros al backend
//         const response = await axios.get<ReincidenciaData[]>(`/api/kpi/reincidencias`, {
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
//       // Usamos tu solución para evitar el salto de página
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
//     { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
//     { field: 'reincidencias', headerName: 'Reincidencias', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     {
//       field: 'porcentaje_reincidencia',
//       headerName: '% Reincidencia',
//       flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
//       valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
//       cellClassName: (params) => {
//         const reincidencia = params.value ? parseFloat(params.value) : 0;
//         return reincidencia > 4 ? 'kpi-negative' : 'kpi-positive';
//       },
//     },
//   ];

//   if (loading && data.length === 0) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error">Error: {error.message}</Typography>;
//   if (!loading && data.length === 0) return <Typography sx={{ mt: 4 }}>No hay datos para los filtros seleccionados.</Typography>;

//   return (
//     <Box sx={{ mt: 4 }}>
//       <LoadingOverlay isLoading={loading} />
//       <Box sx={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
//         <Typography variant="h5" gutterBottom>Reincidencias por Empresa</Typography>
        
//         <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Tabla de Reincidencias por Empresa</Typography>
        
//         {/* Contenedor de la tabla con los estilos que te gustan */}
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
//             rows={data.map((row) => ({ id: row.empresa, ...row }))}
//             columns={columns}
//             pageSizeOptions={[5, 10, 20]}
//             initialState={{
//               pagination: { paginationModel: { pageSize: 10 } }
//             }}
//             disableRowSelectionOnClick
//             autoHeight
//             sx={{ border: 0 }}
//           />
//         </Box>

//         <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Reincidencia</Typography>
//         <ReincidenciasChart data={data} />
//       </Box>
//     </Box>
//   );
// }