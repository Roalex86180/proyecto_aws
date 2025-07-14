// frontend/src/components/ProduccionMantencionDetails.tsx (REFACTORIZADO)

import { useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Card, CardContent, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import LoadingOverlay from './LoadingOverlay';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces (sin cambios) ---
interface TecnicoData {
  recurso: string;
  total_asignadas: string;
  total_finalizadas: string;
  pct_efectividad: string | null;
}
interface ParsedTecnicoData {
  recurso: string;
  total_asignadas: number;
  total_finalizadas: number;
  pct_efectividad: number;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchProduccionMantencionDetails = async (
    empresa: string,
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = { empresa, propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<TecnicoData[]>(`${API_URL}/api/produccion/mantenimiento-tecnico`, { params });
    return data;
};

// --- Gráfico de Cuadrantes (sin cambios en su lógica interna) ---
const QuadrantChart = ({ data }: { data: ParsedTecnicoData[] }) => {
    if (data.length === 0) return null;
    const avgFinalizadas = data.reduce((sum, item) => sum + item.total_finalizadas, 0) / data.length;
    const umbralEfectividad = 90;
    const getQuadrantColor = (item: ParsedTecnicoData) => {
        const esProductivo = item.total_finalizadas >= avgFinalizadas;
        const esEfectivo = item.pct_efectividad >= umbralEfectividad;
        if (esProductivo && esEfectivo) return '#388E3C';
        if (!esProductivo && esEfectivo) return '#0275d8';
        if (esProductivo && !esEfectivo) return '#f0ad4e';
        return '#D32F2F';
    };
    return (
        <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
                <CartesianGrid />
                <XAxis type="number" dataKey="total_finalizadas" name="Trabajos Finalizados" unit=" trabajos" />
                <YAxis type="number" dataKey="pct_efectividad" name="Efectividad" unit="%" domain={[0, 110]} />
                <ZAxis dataKey="recurso" name="Técnico" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: any, name: any) => (name === 'Efectividad' ? `${value.toFixed(1)}%` : value)} />
                <Legend verticalAlign="top" height={36}/>
                <ReferenceLine y={umbralEfectividad} label={{ value: `Meta ${umbralEfectividad}%`, position: 'insideTopRight' }} stroke="black" strokeDasharray="3 3" />
                <ReferenceLine x={avgFinalizadas} label={{ value: "Promedio Trabajos", angle: -90, position: 'insideBottomLeft' }} stroke="black" strokeDasharray="3 3" />
                <Scatter name="Técnicos" data={data}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getQuadrantColor(entry)} />
                    ))}
                </Scatter>
            </ScatterChart>
        </ResponsiveContainer>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function ProduccionMantencionDetails() {
  
  // 4. OBTIENE LOS FILTROS DE ZUSTAND
  const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  // Lógica declarativa para las fechas por defecto
  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  // 5. OBTENEMOS LOS DATOS CRUDOS CON useQuery
  const { data: rawData, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['produccionMantencionDetails', { empresa, propietarioRed, startDate, endDate }],
    queryFn: () => fetchProduccionMantencionDetails(empresa!, propietarioRed, startDate, endDate),
    enabled: !!empresa, // Solo se ejecuta si hay una empresa seleccionada
  });

  // 6. TRANSFORMAMOS Y CALCULAMOS ESTADOS DERIVADOS CON useMemo
  const parsedData = useMemo<ParsedTecnicoData[]>(() => {
    if (!rawData) return [];
    return rawData.map(d => ({
        ...d,
        total_asignadas: parseInt(d.total_asignadas, 10) || 0,
        total_finalizadas: parseInt(d.total_finalizadas, 10) || 0,
        pct_efectividad: d.pct_efectividad ? parseFloat(d.pct_efectividad) : 0
    }));
  }, [rawData]);

  const summary = useMemo(() => {
    if (!parsedData.length) return { asignadas: 0, finalizadas: 0, efectividad: 0 };
    const totalAsignadas = parsedData.reduce((sum, row) => sum + row.total_asignadas, 0);
    const totalFinalizadas = parsedData.reduce((sum, row) => sum + row.total_finalizadas, 0);
    const pctGeneral = totalAsignadas > 0 ? (totalFinalizadas / totalAsignadas * 100) : 0;
    return { asignadas: totalAsignadas, finalizadas: totalFinalizadas, efectividad: pctGeneral };
  }, [parsedData]);

  const kpiSummaryText = useMemo(() => {
    const total = parsedData.length;
    if (total === 0) return '';
    const compliant = parsedData.filter(t => t.pct_efectividad >= 90).length;
    const percentage = total > 0 ? ((compliant / total) * 100).toFixed(0) : "0";
    return `En este periodo seleccionado de ${total} técnicos evaluados, el ${percentage}% está cumpliendo con la meta de 90%, equivalente a ${compliant} técnicos.`;
  }, [parsedData]);

  // Definición de columnas (sin cambios)
  const columns: GridColDef[] = [
    { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false, renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1, },
    { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
    { field: 'total_asignadas', headerName: 'Asignadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'pct_efectividad', headerName: '% Efectividad', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
        valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
        cellClassName: (params) => { const efectividad = params.value ?? 0; return efectividad >= 90 ? 'kpi-positive' : 'kpi-negative'; },
    },
  ];

  // 7. RENDERIZADO CONDICIONAL CON LOS NUEVOS ESTADOS
  if (!empresa) return <Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una Empresa para comenzar el análisis.</Alert>;
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Typography color="error" sx={{ mt: 4 }}>{error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  
  return (
    <Box>
        <LoadingOverlay isLoading={isFetching && !isLoading} />
        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Efectividad de Mantenimiento: {empresa}</Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, mb: 3, mt: 2 }}>
            <Card sx={{ flex: '1 1 0', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Asignadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.asignadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
            <Card sx={{ flex: '1 1 0', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Finalizadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.finalizadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
            <Card sx={{ flex: '1 1 0', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa de Efectividad</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.efectividad >= 90 ? '#388E3C' : '#D32F2F' }}>{summary.efectividad.toFixed(2)}%</Typography></CardContent></Card>
        </Box>
        
        <Typography variant="h6" gutterBottom>Desglose por Técnico</Typography>
        <Box sx={{ height: 600, width: '100%', mb: 4 }}>
            {parsedData.length > 0 ? (
                <DataGrid rows={parsedData} getRowId={(row) => row.recurso} columns={columns} sx={{ border: 1, borderColor: 'divider', '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }} />
            ) : ( <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No se encontraron datos para los filtros seleccionados.</Typography> )}
        </Box>

        {parsedData.length > 0 && (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>Cuadrante de Rendimiento por Técnico</Typography>
                <QuadrantChart data={parsedData} />
                <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', fontWeight: 'bold' }}>
                    {kpiSummaryText}
                </Typography>
            </Box>
        )}
    </Box>
  );
}

// import { useState, useEffect, useMemo } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress, Card, CardContent, Alert} from '@mui/material';
// import { DataGrid} from '@mui/x-data-grid';
// import type { GridColDef, GridRenderCellParams  } from '@mui/x-data-grid';
// import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from 'recharts';
// import LoadingOverlay from './LoadingOverlay';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// // --- Interfaces ---
// interface TecnicoData {
//   recurso: string;
//   total_asignadas: string;
//   total_finalizadas: string;
//   pct_efectividad: string | null;
// }
// interface ParsedTecnicoData {
//     recurso: string;
//     total_asignadas: number;
//     total_finalizadas: number;
//     pct_efectividad: number;
// }
// interface DetailsProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Gráfico de Cuadrantes ---
// const QuadrantChart = ({ data }: { data: ParsedTecnicoData[] }) => {
//   if (data.length === 0) return null;
//   const avgFinalizadas = data.reduce((sum, item) => sum + item.total_finalizadas, 0) / data.length;
//   const umbralEfectividad = 90;

//   const getQuadrantColor = (item: ParsedTecnicoData) => {
//     const esProductivo = item.total_finalizadas >= avgFinalizadas;
//     const esEfectivo = item.pct_efectividad >= umbralEfectividad;
//     if (esProductivo && esEfectivo) return '#388E3C'; // Verde (Top Performers)
//     if (!esProductivo && esEfectivo) return '#0275d8'; // Azul (Efectivos, baja producción)
//     if (esProductivo && !esEfectivo) return '#f0ad4e'; // Naranja (Productivos, baja efectividad)
//     return '#D32F2F'; // Rojo (Área de mejora)
//   };
  
//   return (
//     <ResponsiveContainer width="100%" height={500}>
//       <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
//         <CartesianGrid />
//         <XAxis type="number" dataKey="total_finalizadas" name="Trabajos Finalizados" unit=" trabajos" />
//         <YAxis type="number" dataKey="pct_efectividad" name="Efectividad" unit="%" domain={[0, 110]} />
//         <ZAxis dataKey="recurso" name="Técnico" />
//         <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value: any, name: any) => (name === 'Efectividad' ? `${value}%` : value)} />
//         <Legend verticalAlign="top" height={36}/>
//         <ReferenceLine y={umbralEfectividad} label={{ value: `Meta ${umbralEfectividad}%`, position: 'insideTopRight' }} stroke="black" strokeDasharray="3 3" />
//         <ReferenceLine x={avgFinalizadas} label={{ value: "Promedio Trabajos", angle: -90, position: 'insideBottomLeft' }} stroke="black" strokeDasharray="3 3" />
//         <Scatter name="Técnicos" data={data}>
//             {data.map((entry, index) => (
//                 <Cell key={`cell-${index}`} fill={getQuadrantColor(entry)} />
//             ))}
//         </Scatter>
//       </ScatterChart>
//     </ResponsiveContainer>
//   );
// };

// // --- Componente Principal ---
// export default function ProduccionMantencionDetails({ empresa, propietario_red, fecha_inicio, fecha_fin }: DetailsProps) {
//   const [data, setData] = useState<ParsedTecnicoData[]>([]);
//   const [summary, setSummary] = useState({ asignadas: 0, finalizadas: 0, efectividad: 0 });
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     if (!empresa) {
//         setData([]);
//         setLoading(false);
//         return;
//     }
//     const fetchData = async () => {
//       let startDate = fecha_inicio;
//       let endDate = fecha_fin;
//       if (!startDate || !endDate) {
//         const today = new Date();
//         const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
//         endDate = today.toISOString().split('T')[0];
//         startDate = thirtyDaysAgo.toISOString().split('T')[0];
//       }
//       setLoading(true); setError(null);
//       try {
//         const response = await axios.get<TecnicoData[]>(`${API_URL}/api/produccion/mantenimiento-tecnico`, {
//           params: { empresa, propietario_red, fecha_inicio: startDate, fecha_fin: endDate }
//         });
        
//         const parsedData: ParsedTecnicoData[] = response.data.map(d => ({
//             ...d,
//             total_asignadas: parseInt(d.total_asignadas, 10) || 0,
//             total_finalizadas: parseInt(d.total_finalizadas, 10) || 0,
//             pct_efectividad: d.pct_efectividad ? parseFloat(d.pct_efectividad) : 0
//         }));
//         setData(parsedData);

//         const totalAsignadas = parsedData.reduce((sum, row) => sum + row.total_asignadas, 0);
//         const totalFinalizadas = parsedData.reduce((sum, row) => sum + row.total_finalizadas, 0);
//         const pctGeneral = totalAsignadas > 0 ? (totalFinalizadas / totalAsignadas * 100) : 0;
//         setSummary({ asignadas: totalAsignadas, finalizadas: totalFinalizadas, efectividad: pctGeneral });

//       } catch (err) { if (err instanceof Error) setError(err); else setError(new Error('Ocurrió un error desconocido'));
//       } finally { setLoading(false); }
//     };
//     fetchData();
//   }, [empresa, propietario_red, fecha_inicio, fecha_fin]);

//   const kpiSummaryText = useMemo(() => {
//     const total = data.length;
//     if (total === 0) return '';
//     const compliant = data.filter(t => t.pct_efectividad >= 90).length;
//     const percentage = ((compliant / total) * 100).toFixed(0);
//     return `En este periodo seleccionado de ${total} técnicos evaluados, el ${percentage}% está cumpliendo con la meta de 90%, equivalente a ${compliant} técnicos.`;
//   }, [data]);

//   const columns: GridColDef[] = [
//     { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false, renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1, },
//     { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
//     { field: 'total_asignadas', headerName: 'Asignadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     { field: 'total_finalizadas', headerName: 'Finalizadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     {
//       field: 'pct_efectividad', headerName: '% Efectividad', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
//       valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
//       cellClassName: (params) => { const efectividad = params.value ?? 0; return efectividad >= 90 ? 'kpi-positive' : 'kpi-negative'; },
//     },
//   ];

//   if (!empresa) { return (<Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una Empresa para comenzar el análisis.</Alert>); }
//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error" sx={{ mt: 4 }}>Error: {error.message}</Typography>;
  
//   return (
//     <Box>
//         <LoadingOverlay isLoading={loading} />
//         <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Efectividad de Mantenimiento: {empresa}</Typography>
        
//         {/* CAMBIO 1: Se ajusta el layout del Box para que las tarjetas estén siempre en una fila */}
//         <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, mb: 3, mt: 2 }}>
//             <Card sx={{ flex: '1 1 0', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Asignadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.asignadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
//             <Card sx={{ flex: '1 1 0', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Finalizadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.finalizadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
//             <Card sx={{ flex: '1 1 0', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa de Efectividad</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.efectividad >= 90 ? '#388E3C' : '#D32F2F' }}>{summary.efectividad.toFixed(2)}%</Typography></CardContent></Card>
//         </Box>
        
//         <Typography variant="h6" gutterBottom>Desglose por Técnico</Typography>
//         <Box sx={{ height: 600, width: '100%', mb: 4 }}>
//             {data.length > 0 ? (
//                 <DataGrid rows={data} getRowId={(row) => row.recurso} columns={columns} sx={{ border: 1, borderColor: 'divider', '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }} />
//             ) : ( <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No se encontraron datos para los filtros seleccionados.</Typography> )}
//         </Box>

//         {data.length > 0 && (
//             <Box sx={{ mt: 4 }}>
//                 <Typography variant="h6" gutterBottom>Cuadrante de Rendimiento por Técnico</Typography>
//                 <QuadrantChart data={data} />
//                 {/* CAMBIO 2: Se ajustan los estilos del KPI de texto */}
//                 <Typography variant="body1" sx={{ mt: 2, textAlign: 'center', fontWeight: 'bold' }}>
//                   {kpiSummaryText}
//                 </Typography>
//             </Box>
//         )}
//     </Box>
//   );
// }