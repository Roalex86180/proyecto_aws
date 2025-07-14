// frontend/src/components/KpiCertificacionResumen.tsx (REFACTORIZADO)

import axios from 'axios';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import React from 'react'; // Importamos React para usarlo

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces (sin cambios) ---
interface CertificacionData {
  empresa: string;
  total_finalizadas: string;
  certificadas: string;
  porcentaje_certificacion: string;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE Y LIMPIA
const fetchKpiCertificacion = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
    };
    const { data } = await axios.get<CertificacionData[]>(`${API_URL}/api/kpi/certificacion`, { params });
    return data;
};

// --- Componente de Gráfico (sin cambios) ---
const CertificacionChart = ({ data }: { data: CertificacionData[] }): React.ReactElement => {
    const chartData = data
      .map(item => ({
        ...item,
        porcentaje_num: item.porcentaje_certificacion ? parseFloat(item.porcentaje_certificacion) : 0,
      }))
      .sort((a, b) => (b.porcentaje_num ?? 0) - (a.porcentaje_num ?? 0));
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="empresa" tick={{fontSize: 12}} />
          <YAxis domain={[0, 'dataMax + 10']} tickFormatter={(tick) => `${tick}%`} />
          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "% Certificación"]} />
          <Legend />
          <Bar dataKey="porcentaje_num" name="% Certificación">
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.empresa}`} fill={(entry.porcentaje_num ?? 0) >= 95 ? '#388E3C' : '#0275d8'} />
            ))}
            <LabelList dataKey="porcentaje_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiCertificacionResumen() {

  // 4. OBTIENE LOS FILTROS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
  
  // 5. LÓGICA DECLARATIVA PARA LAS FECHAS
  // Ya no necesitamos un useState para 'displayDateRange', lo calculamos directamente.
  const today = new Date();
  const yesterday = new Date(new Date().setDate(today.getDate() - 1));
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 31));
  
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : yesterday.toISOString().split('T')[0];


  // 6. OBTENEMOS LOS DATOS CON useQuery
  const { data, isLoading, isError, error } = useQuery({
    // La queryKey usa los filtros finales que se envían a la API
    queryKey: ['kpiCertificacionResumen', { propietarioRed, startDate, endDate }],
    queryFn: () => fetchKpiCertificacion(propietarioRed, startDate, endDate),
  });

  const columns: GridColDef[] = [
    // ... tu definición de columnas no cambia ...
    { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false, renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1, },
    { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 180 },
    { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 180, type: 'number', align: 'center', headerAlign: 'center', },
    { field: 'certificadas', headerName: 'Certificadas', width: 180, type: 'number', align: 'center', headerAlign: 'center', },
    {
     field: 'porcentaje_certificacion', headerName: '% Certificación', flex: 1, minWidth: 180, type: 'number', align: 'center', headerAlign: 'center',
     valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
     cellClassName: (params) => { const porcentaje = params.value ? parseFloat(params.value) : 0; return porcentaje >= 95 ? 'kpi-positive' : 'kpi-negative'; },
    },
  ];

  // 7. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4, display: 'block', mx: 'auto' }} />;
  if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? `Error: ${error.message}` : 'No se pudieron cargar los datos de certificación.'}</Alert>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        KPI de Certificación de Trabajos
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {/* Usamos las variables directamente, ya no necesitamos 'displayDateRange' */}
        Período mostrado: {startDate} al {endDate}
      </Typography>
      <Box sx={{ height: 400, width: '100%', mt: 2 }}>
        {data && data.length > 0 ? (
            <DataGrid
                rows={data.map((row) => ({ ...row, id: row.empresa }))}
                columns={columns}
                sx={{ border: 1, borderColor: 'divider', '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }}
            />
        ) : (
            <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
                No se encontraron datos para los filtros seleccionados.
            </Typography>
        )}
      </Box>

      {data && data.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>Gráfico Comparativo de Certificación</Typography>
          <CertificacionChart data={data} />
        </Box>
      )}
    </Box>
  );
}
// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress, Alert } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
// // CAMBIO 1: Se importan los componentes de Recharts para el gráfico.
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// // --- Interfaces ---
// interface CertificacionData {
//   empresa: string;
//   total_finalizadas: string;
//   certificadas: string;
//   porcentaje_certificacion: string;
// }
// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // CAMBIO 2: Se define el nuevo componente para el gráfico de barras.
// const CertificacionChart = ({ data }: { data: CertificacionData[] }): React.ReactElement => {
//     const chartData = data
//       .map(item => ({
//         ...item,
//         porcentaje_num: item.porcentaje_certificacion ? parseFloat(item.porcentaje_certificacion) : 0,
//       }))
//       .sort((a, b) => (b.porcentaje_num ?? 0) - (a.porcentaje_num ?? 0)); // Orden descendente
  
//     return (
//       <ResponsiveContainer width="100%" height={400}>
//         <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis dataKey="empresa" tick={{fontSize: 12}} />
//           <YAxis domain={[0, 'dataMax + 10']} tickFormatter={(tick) => `${tick}%`} />
//           <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "% Certificación"]} />
//           <Legend />
//           <Bar dataKey="porcentaje_num" name="% Certificación">
//             {chartData.map((entry) => (
//               // Umbral de ejemplo: >= 95% es bueno
//               <Cell key={`cell-${entry.empresa}`} fill={(entry.porcentaje_num ?? 0) >= 95 ? '#388E3C' : '#0275d8'} />
//             ))}
//             <LabelList dataKey="porcentaje_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
//           </Bar>
//         </BarChart>
//       </ResponsiveContainer>
//     );
//   };

// // --- Componente Principal ---
// export default function KpiCertificacionResumen({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
//   const [data, setData] = useState<CertificacionData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [displayDateRange, setDisplayDateRange] = useState({ start: '', end: '' });

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
//     setDisplayDateRange({ start: startDate, end: endDate });

//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<CertificacionData[]>(`${API_URL}/api/kpi/certificacion`, {
//           params: { propietario_red, fecha_inicio: startDate, fecha_fin: endDate }
//         });
//         setData(response.data);
//       } catch (err) {
//         setError('No se pudieron cargar los datos de certificación.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const columns: GridColDef[] = [
//     { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false, renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1, },
//     { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 180 },
//     { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 180, type: 'number', align: 'center', headerAlign: 'center', },
//     { field: 'certificadas', headerName: 'Certificadas', width: 180, type: 'number', align: 'center', headerAlign: 'center', },
//     {
//       field: 'porcentaje_certificacion',
//       headerName: '% Certificación',
//       flex: 1,
//       minWidth: 180,
//       type: 'number',
//       align: 'center',
//       headerAlign: 'center',
//       valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
//       cellClassName: (params) => {
//         const porcentaje = params.value ? parseFloat(params.value) : 0;
//         return porcentaje >= 95 ? 'kpi-positive' : 'kpi-negative';
//       },
//     },
//   ];

//   if (loading) return <CircularProgress sx={{ mt: 4, display: 'block', mx: 'auto' }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

//   return (
//     <Box sx={{ mt: 4 }}>
//       <Typography variant="h6" gutterBottom>
//         KPI de Certificación de Trabajos
//       </Typography>
//       <Typography variant="caption" color="text.secondary">
//         Período mostrado: {displayDateRange.start} al {displayDateRange.end}
//       </Typography>
//       <Box sx={{ height: 400, width: '100%', mt: 2 }}>
//         {data.length > 0 ? (
//             <DataGrid
//                 rows={data.map((row) => ({ ...row, id: row.empresa }))}
//                 columns={columns}
//                 sx={{
//                     border: 1,
//                     borderColor: 'divider',
//                     '& .kpi-positive': { color: '#388E3C', fontWeight: '600' },
//                     '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' },
//                     '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
//                     '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' },
//                     '& .MuiDataGrid-columnSeparator': { display: 'none' },
//                     '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
//                 }}
//             />
//         ) : (
//             <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
//                 No se encontraron datos para los filtros seleccionados.
//             </Typography>
//         )}
//       </Box>

//       {/* CAMBIO 3: Se añade el gráfico al final del componente, sobre el "lienzo" directo */}
//       {data.length > 0 && (
//         <Box sx={{ mt: 4 }}>
//           <Typography variant="h6" gutterBottom>Gráfico Comparativo de Certificación</Typography>
//           <CertificacionChart data={data} />
//         </Box>
//       )}
//     </Box>
//   );
// }