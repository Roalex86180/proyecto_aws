// frontend/src/components/ResumenReincidencias.tsx (REFACTORIZADO)

import React, { useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, Paper, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces (se mantienen para tipado) ---
interface ApiReincidenciaData {
  recurso: string;
  total_finalizadas: string;
  total_reincidencias: string;
  pct_efectividad: string | null; // Cambiado para reflejar el nombre correcto
}
interface ReincidenciaData {
  recurso: string;
  total_finalizadas: number;
  total_reincidencias: number;
  pct_efectividad: number;
}


// 2. LA FUNCIÓN DE FETCHING (idéntica a la de ReincidenciasTecnicoDetails)
const fetchReincidenciasPorTecnico = async (
    empresa: string,
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = { empresa, propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<ApiReincidenciaData[]>(`${API_URL}/api/reincidencias/por-tecnico`, { params });
    return data;
};

// --- Componente de Gráfico (sin cambios en su lógica interna) ---
const ResumenChart = ({ data }: { data: ReincidenciaData[] }): React.ReactElement => {
    const chartData = data
      .filter(item => item.pct_efectividad !== null && item.pct_efectividad > 0)
      .sort((a, b) => a.pct_efectividad - b.pct_efectividad);

    return (
      <ResponsiveContainer width="100%" height={chartData.length * 35 + 60}>
        <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 50, left: 120, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 'dataMax + 5']} tickFormatter={(tick) => `${tick}%`} />
            <YAxis type="category" dataKey="recurso" width={120} tick={{ fontSize: 11 }} interval={0} reversed={true} />
            <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "% Reincidencia"]} />
            <Bar dataKey="pct_efectividad" layout="vertical">
                {chartData.map((entry) => (
                    <Cell key={`cell-${entry.recurso}`} fill={entry.pct_efectividad > 4 ? '#D32F2F' : '#388E3C'} />
                ))}
                <LabelList dataKey="pct_efectividad" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: '12px' }}/>
            </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function ResumenReincidencias() {
    
  // 4. OBTIENE LOS FILTROS DE ZUSTAND
  const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // Lógica de fechas por defecto para consistencia
  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  // 5. OBTENEMOS LOS DATOS CON useQuery
  const { data: rawData, isLoading, isError, error } = useQuery({
    // ¡LA MAGIA! Usamos la misma queryKey que en ReincidenciasTecnicoDetails
    queryKey: ['reincidenciasPorTecnico', { empresa, propietarioRed, startDate, endDate }],
    queryFn: () => fetchReincidenciasPorTecnico(empresa!, propietarioRed, startDate, endDate),
    // Se ejecuta solo si todos los filtros requeridos están presentes
    enabled: !!empresa && !!startDate && !!endDate,
  });

  // 6. TRANSFORMAMOS LOS DATOS CON useMemo PARA EFICIENCIA
  const parsedData = useMemo<ReincidenciaData[]>(() => {
    if (!rawData) return [];
    return rawData.map(d => ({
        recurso: d.recurso,
        total_finalizadas: parseInt(d.total_finalizadas, 10) || 0,
        total_reincidencias: parseInt(d.total_reincidencias, 10) || 0,
        pct_efectividad: d.pct_efectividad ? parseFloat(d.pct_efectividad) : 0
    }));
  }, [rawData]);

  const columns: GridColDef[] = [
    // ... tu definición de columnas no cambia ...
    { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
    { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'total_reincidencias', headerName: 'Reincidencias', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'pct_efectividad', headerName: '% Reincidencia', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
        valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
        cellClassName: (params) => (params.value ?? 0) > 4 ? 'kpi-negative' : 'kpi-positive' },
  ];
  
  // 7. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (!empresa) return <Typography sx={{ mt: 4, fontStyle: 'italic' }}>Selecciona una empresa para ver el resumen de reincidencias.</Typography>;
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Typography color="error">Error: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  if (!parsedData || parsedData.length === 0) return <Typography sx={{ mt: 4 }}>No hay datos para esta empresa con los filtros seleccionados.</Typography>;

  return (
    <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>Desglose de Reincidencia por Técnico</Typography>
      <Box sx={{ height: 500, width: '100%', '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeaders': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' } }}>
        <DataGrid
          rows={parsedData}
          getRowId={(row) => row.recurso}
          columns={columns}
          sx={{ border: 0 }}
        />
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo</Typography>
      <ResumenChart data={parsedData} />
    </Paper>
  );
}

// // frontend/src/components/ResumenReincidencias.tsx

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, Paper, CircularProgress } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef } from '@mui/x-data-grid';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
// // CAMBIO: Se eliminó la importación de ReincidenciasTecnicoDetails

// // --- Interfaces y Props ---
// interface ResumenData {
//   recurso: string;
//   total_finalizadas: string;
//   total_reincidencias: string;
//   pct_efectividad: string | null;
// }
// interface ResumenProps {
//   empresa: string;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Componente de Gráfico ---
// const ResumenChart = ({ data }: { data: ResumenData[] }): React.ReactElement => {
//   const chartData = data
//     .filter(item => item.pct_efectividad !== null && parseFloat(item.pct_efectividad) > 0)
//     .map(item => ({
//       ...item,
//       pct_efectividad_num: parseFloat(item.pct_efectividad!),
//     }))
//     .sort((a, b) => (a.pct_efectividad_num ?? 0) - (b.pct_efectividad_num ?? 0));

//   return (
//     <ResponsiveContainer width="100%" height={chartData.length * 35 + 60}>
//       <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 50, left: 120, bottom: 20 }}>
//         <CartesianGrid strokeDasharray="3 3" horizontal={false} />
//         <XAxis type="number" domain={[0, 'dataMax + 5']} tickFormatter={(tick) => `${tick}%`} />
//         <YAxis type="category" dataKey="recurso" width={120} tick={{ fontSize: 11 }} interval={0} reversed={true} />
//         <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "% Reincidencia"]} />
//         <Bar dataKey="pct_efectividad_num" layout="vertical">
//           {chartData.map((entry) => (
//             <Cell key={`cell-${entry.recurso}`} fill={(entry.pct_efectividad_num ?? 0) > 4 ? '#D32F2F' : '#388E3C'} />
//           ))}
//           <LabelList dataKey="pct_efectividad_num" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fontSize: '12px' }}/>
//         </Bar>
//       </BarChart>
//     </ResponsiveContainer>
//   );
// };

// // --- Componente Principal ---
// export default function ResumenReincidencias({ empresa, propietario_red, fecha_inicio, fecha_fin }: ResumenProps) {
//   const [data, setData] = useState<ResumenData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<Error | null>(null);
  
//   // CAMBIO: Se eliminó el estado 'selectedTecnico'

//   useEffect(() => {
//     const fetchData = async () => {
//       if (!empresa || !fecha_inicio || !fecha_fin) return;
      
//       setLoading(true);
//       setError(null);
      
//       try {
//         const response = await axios.get<ResumenData[]>(`${API_URL}/api/reincidencias/por-tecnico`, {
//           params: { empresa, propietario_red, fecha_inicio, fecha_fin }
//         });
//         setData(response.data);
//       } catch (err) {
//         if (err instanceof Error) setError(err);
//         else setError(new Error('Ocurrió un error desconocido'));
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     fetchData();
//   }, [empresa, propietario_red, fecha_inicio, fecha_fin]);

//   // CAMBIO: Se eliminó la función 'handleRowClick'

//   const columns: GridColDef[] = [
//     { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
//     { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     { field: 'total_reincidencias', headerName: 'Reincidencias', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     {
//       field: 'pct_efectividad',
//       headerName: '% Reincidencia',
//       flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
//       valueFormatter: (value: string | null) => value ? `${parseFloat(value).toFixed(2)}%` : 'N/A',
//       cellClassName: (params) => {
//         const reincidencia = params.value ? parseFloat(params.value) : 0;
//         return reincidencia > 4 ? 'kpi-negative' : 'kpi-positive';
//       },
//     },
//   ];

//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error">Error: {error.message}</Typography>;
//   if (!loading && data.length === 0) return <Typography sx={{ mt: 4 }}>No hay datos para esta empresa con los filtros seleccionados.</Typography>;

//   return (
//     <Paper sx={{ p: 2, mt: 2, borderRadius: 2 }}>
//       <Typography variant="h6" gutterBottom>Desglose de Reincidencia por Técnico</Typography>
//       <Box sx={{
//         height: 500,
//         width: '100%',
//         '& .kpi-positive': { color: '#388E3C', fontWeight: '600' },
//         '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' },
//         // Ya no necesitamos el cursor de puntero aquí, porque el clic ya no hace nada en esta tabla
//         '& .MuiDataGrid-columnHeaders': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
//       }}>
//         <DataGrid
//           rows={data}
//           getRowId={(row) => row.recurso}
//           columns={columns}
//           // CAMBIO: Se eliminó 'onRowClick'
//           sx={{ border: 0 }}
//         />
//       </Box>

//       <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Gráfico Comparativo</Typography>
//       <ResumenChart data={data} />

//       {/* CAMBIO: Se eliminó por completo el bloque que renderizaba ReincidenciasTecnicoDetails */}
//     </Paper>
//   );
// }