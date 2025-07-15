// frontend/src/components/FallasTempranasResumen.tsx (REFACTORIZADO)

import React from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces (sin cambios) ---
interface FallaTempranaData {
  empresa: string;
  total_instalaciones: string;
  fallas_tempranas: string;
  porcentaje_falla: string;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE Y LIMPIA
const fetchFallasTempranasResumen = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
    };
    const { data } = await axios.get<FallaTempranaData[]>(`${API_URL}/api/kpi/fallas-tempranas`, { params });
    return data;
};

// --- Componente de Gráfico (sin cambios) ---
const FallasTempranasChart = ({ data }: { data: FallaTempranaData[] }): React.ReactElement => {
    const chartData = data
      .map(item => ({
        ...item,
        porcentaje_falla_num: item.porcentaje_falla ? parseFloat(item.porcentaje_falla) : 0,
      }))
      .sort((a, b) => (b.porcentaje_falla_num ?? 0) - (a.porcentaje_falla_num ?? 0));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="empresa" tick={{fontSize: 12}} />
          <YAxis domain={[0, 'dataMax + 2']} tickFormatter={(tick) => `${tick}%`} />
          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "% Falla Temprana"]} />
          <Legend />
          <Bar dataKey="porcentaje_falla_num" name="% Falla Temprana">
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.empresa}`} fill={(entry.porcentaje_falla_num ?? 0) > 3 ? '#D32F2F' : '#388E3C'} />
            ))}
            <LabelList dataKey="porcentaje_falla_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function FallasTempranasResumen() {

  // 4. OBTIENE LOS FILTROS NECESARIOS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // 5. LÓGICA DECLARATIVA PARA LAS FECHAS
  const today = new Date();
  const yesterday = new Date(new Date().setDate(today.getDate() - 1));
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 31));
  
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : yesterday.toISOString().split('T')[0];

  // 6. OBTENEMOS LOS DATOS CON useQuery
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['fallasTempranasResumen', { propietarioRed, startDate, endDate }],
    queryFn: () => fetchFallasTempranasResumen(propietarioRed, startDate, endDate),
  });

  const columns: GridColDef[] = [
    // ... tu definición de columnas no cambia ...
    { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false },
    { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 180 },
    { field: 'total_instalaciones', headerName: 'Total Instalaciones', width: 180, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'fallas_tempranas', headerName: 'Fallas Tempranas', width: 180, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'porcentaje_falla', headerName: '% Falla Temprana', flex: 1, minWidth: 180, type: 'number', align: 'center', headerAlign: 'center',
        valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
        cellClassName: (params) => (params.value ? parseFloat(params.value) : 0) > 3 ? 'kpi-negative' : 'kpi-positive' },
  ];

  // 7. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4, display: 'block', mx: 'auto' }} />;
  if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? `Error: ${error.message}` : 'No se pudieron cargar los datos.'}</Alert>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Resumen de Fallas Tempranas
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {/* Usamos las variables directamente, ya no necesitamos 'displayDateRange' */}
        Período mostrado: {startDate} al {endDate}
      </Typography>
      <Box sx={{ height: 600, width: '100%', mt: 2 }}>
        {data && data.length > 0 ? (
          <DataGrid
            rows={data.map((row, index) => ({ ...row, id: row.empresa, posicion: index + 1 }))}
            columns={columns}
            sx={{ border: 1, borderColor: 'divider', '& .MuiDataGrid-row:hover': { cursor: 'pointer' }, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }}
          />
        ) : (
          <Typography sx={{ mt: 2, fontStyle: 'italic' }}>
            No se encontraron datos para los filtros seleccionados.
          </Typography>
        )}
      </Box>

      {data && data.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Fallas Tempranas</Typography>
          <FallasTempranasChart data={data} />
        </Box>
      )}
    </Box>
  );
}


// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress, Alert } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef } from '@mui/x-data-grid';
// // CAMBIO 1: Se importan los componentes necesarios de Recharts
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';


// // --- Interfaces para los datos y las props ---
// interface FallaTempranaData {
//   empresa: string;
//   total_instalaciones: string;
//   fallas_tempranas: string;
//   porcentaje_falla: string;
// }

// interface ResumenProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }


// // CAMBIO 2: Se define el nuevo componente para el gráfico de barras, adaptado para Fallas Tempranas
// const FallasTempranasChart = ({ data }: { data: FallaTempranaData[] }): React.ReactElement => {
//   const chartData = data
//     .map(item => ({
//       ...item,
//       porcentaje_falla_num: item.porcentaje_falla ? parseFloat(item.porcentaje_falla) : 0,
//     }))
//     .sort((a, b) => (b.porcentaje_falla_num ?? 0) - (a.porcentaje_falla_num ?? 0)); // Orden descendente

//   return (
//     <ResponsiveContainer width="100%" height={400}>
//       <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="empresa" tick={{fontSize: 12}} />
//         <YAxis domain={[0, 'dataMax + 2']} tickFormatter={(tick) => `${tick}%`} />
//         <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "% Falla Temprana"]} />
//         <Legend />
//         <Bar dataKey="porcentaje_falla_num" name="% Falla Temprana">
//           {chartData.map((entry) => (
//             // Usamos el umbral de 3% que definimos
//             <Cell key={`cell-${entry.empresa}`} fill={(entry.porcentaje_falla_num ?? 0) > 3 ? '#D32F2F' : '#388E3C'} />
//           ))}
//           <LabelList dataKey="porcentaje_falla_num" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} />
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// };


// // --- Componente Principal del Resumen ---
// export default function FallasTempranasResumen({ propietario_red, fecha_inicio, fecha_fin }: ResumenProps) {
//   const [data, setData] = useState<FallaTempranaData[]>([]);
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
//         const response = await axios.get<FallaTempranaData[]>(`${API_URL}/api/kpi/fallas-tempranas`, {
//           params: { propietario_red, fecha_inicio: startDate, fecha_fin: endDate }
//         });
//         setData(response.data);
//       } catch (err) {
//         setError('No se pudieron cargar los datos de fallas tempranas.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const columns: GridColDef[] = [
//     { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false },
//     { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 180 },
//     {
//       field: 'total_instalaciones', headerName: 'Total Instalaciones', width: 180, type: 'number', align: 'center', headerAlign: 'center',
//     },
//     {
//       field: 'fallas_tempranas', headerName: 'Fallas Tempranas', width: 180, type: 'number', align: 'center', headerAlign: 'center',
//     },
//     {
//       field: 'porcentaje_falla', headerName: '% Falla Temprana', flex: 1, minWidth: 180, type: 'number', align: 'center', headerAlign: 'center',
//       valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
//       cellClassName: (params) => {
//         const porcentaje = params.value ? parseFloat(params.value) : 0;
//         return porcentaje > 3 ? 'kpi-negative' : 'kpi-positive';
//       },
//     },
//   ];

//   if (loading) return <CircularProgress sx={{ mt: 4, display: 'block', mx: 'auto' }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

//   return (
//     <Box sx={{ mt: 4 }}>
//       <Typography variant="h6" gutterBottom>
//         Resumen de Fallas Tempranas
//       </Typography>
//       <Typography variant="caption" color="text.secondary">
//         Período mostrado: {displayDateRange.start} al {displayDateRange.end}
//       </Typography>
//       <Box sx={{ height: 600, width: '100%', mt: 2 }}>
//         {data.length > 0 ? (
//             <DataGrid
//                 rows={data.map((row, index) => ({ ...row, id: row.empresa, posicion: index + 1 }))}
//                 columns={columns}
//                 sx={{
//                     border: 1, borderColor: 'divider',
//                     '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
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

//       {/* CAMBIO 3: Se añade el gráfico al final del componente */}
//       {data.length > 0 && (
//         <Box sx={{ mt: 4 }}>
//             <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo de Fallas Tempranas</Typography>
//             <FallasTempranasChart data={data} />
//         </Box>
//       )}
//     </Box>
//   );
// }