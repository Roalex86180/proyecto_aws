// frontend/src/components/KpiRankingEmpresas.tsx (REFACTORIZADO)

import { useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces (sin cambios) ---
interface RankingData {
    empresa: string;
    puntaje_final: number;
    total_reparaciones: number;
    total_instalaciones: number;
    pct_reincidencia: number;
    pct_falla_temprana: number;
    pct_certificacion: number;
    ranking_original?: number; // Propiedad que añadimos nosotros
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchRankingEmpresas = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
    };
    const { data } = await axios.get<RankingData[]>(`${API_URL}/api/ranking/empresas`, { params });
    return data;
};

// --- Componente de Gráfico (sin cambios) ---
const RankingChart = ({ data }: { data: RankingData[] }) => {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="empresa" tick={{fontSize: 12}} />
          <YAxis domain={[0, 'dataMax + 10']} label={{ value: 'Puntaje', angle: -90, position: 'insideLeft' }}/>
          <Tooltip formatter={(value: number) => [value.toFixed(1), "Puntaje"]} />
          <Legend />
          <Bar dataKey="puntaje_final" name="Puntaje Final" fill="#0275d8">
            <LabelList dataKey="puntaje_final" position="top" formatter={(value: number) => `${value.toFixed(1)} pts`} style={{ fontSize: '12px' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiRankingEmpresas() {

  // 4. OBTIENE LOS FILTROS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
  
  // Lógica declarativa para las fechas por defecto
  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  // 5. OBTENEMOS LOS DATOS CRUDOS CON useQuery
  const { data: rawData, isLoading, isError, error } = useQuery({
    queryKey: ['rankingEmpresas', { propietarioRed, startDate, endDate }],
    queryFn: () => fetchRankingEmpresas(propietarioRed, startDate, endDate),
  });

  // 6. ENRIQUECEMOS LOS DATOS CON useMemo
  const dataWithRanking = useMemo<RankingData[]>(() => {
    if (!rawData) return [];
    // La API ya devuelve los datos ordenados, solo añadimos el número de ranking
    return rawData.map((item, index) => ({
      ...item,
      ranking_original: index + 1
    }));
  }, [rawData]);

  // --- Renderers y Definiciones de Columnas (sin cambios) ---
  const renderRankingCell = (params: GridRenderCellParams) => {
    const rank = params.row.ranking_original;
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const columns: GridColDef[] = [
    { field: 'ranking', headerName: 'Ranking', width: 90, align: 'center', headerAlign: 'center', renderCell: renderRankingCell, sortable: false },
    { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
    { field: 'puntaje_final', headerName: 'Puntaje Final', width: 130, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => value.toFixed(1) + ' pts' },
    { field: 'total_instalaciones', headerName: 'Instalaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'total_reparaciones', headerName: 'Reparaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'pct_falla_temprana', headerName: '% Falla T.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value.toFixed(2)}%` },
    { field: 'pct_reincidencia', headerName: '% Reinc.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value.toFixed(2)}%` },
    { field: 'pct_certificacion', headerName: '% Cert.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value.toFixed(2)}%` },
  ];

  // 7. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? `Error: ${error.message}` : 'No se pudo calcular el ranking.'}</Alert>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>🏆 Ranking General de Empresas</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
        Puntuación balanceada para el período del {startDate} al {endDate}.
      </Typography>
      
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
            rows={dataWithRanking}
            getRowId={(row) => row.empresa}
            columns={columns}
            hideFooter
            sx={{
              border: 1, borderColor: 'divider',
              '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
              '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' },
              '& .MuiDataGrid-columnSeparator': { display: 'none' },
              '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
            }}
        />
      </Box>

      {dataWithRanking.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>Gráfico Comparativo de Puntaje Final</Typography>
          <RankingChart data={dataWithRanking} />
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
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// // --- Interfaces ---
// interface RankingData {
//     empresa: string;
//     puntaje_final: number;
//     total_reparaciones: number;
//     total_instalaciones: number;
//     pct_reincidencia: number;
//     pct_falla_temprana: number;
//     pct_certificacion: number;
// }
// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Gráfico de Barras Corregido ---
// const RankingChart = ({ data }: { data: RankingData[] }) => {
//     return (
//       <ResponsiveContainer width="100%" height={400}>
//         <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//           <CartesianGrid strokeDasharray="3 3" />
//           <XAxis dataKey="empresa" tick={{fontSize: 12}} />
//           <YAxis domain={[0, 'dataMax + 10']} label={{ value: 'Puntaje', angle: -90, position: 'insideLeft' }}/>
//           <Tooltip formatter={(value: number) => [value.toFixed(1), "Puntaje"]} />
//           <Legend />
//           <Bar dataKey="puntaje_final" name="Puntaje Final" fill="#0275d8">
//             <LabelList
//               dataKey="puntaje_final"
//               position="top"
//               formatter={(value: number) => `${value.toFixed(1)} pts`}
//               style={{ fontSize: '12px' }}
//             />
//           </Bar>
//         </BarChart>
//       </ResponsiveContainer>
//     );
// };


// export default function KpiRankingEmpresas({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
//   const [data, setData] = useState<RankingData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const [displayDateRange, setDisplayDateRange] = useState({ start: '', end: '' });

//   useEffect(() => {
//     setLoading(true);
//     setError(null);
    
//     let startDate = fecha_inicio;
//     let endDate = fecha_fin;
//     if (!startDate || !endDate) {
//       const today = new Date();
//       const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
//       endDate = today.toISOString().split('T')[0];
//       startDate = thirtyDaysAgo.toISOString().split('T')[0];
//     }
//     setDisplayDateRange({ start: startDate, end: endDate });

//     const fetchData = async () => {
//       try {
//         const response = await axios.get<RankingData[]>(`${API_URL}/api/ranking/empresas`, {
//           params: { 
//             fecha_inicio: startDate, 
//             fecha_fin: endDate,
//             propietario_red: propietario_red
//           }
//         });
//         setData(response.data);
//       } catch (err) {
//         setError('No se pudo calcular el ranking por empresas.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     // --- INICIO DE LA MODIFICACIÓN ---
//     // Reemplazamos la llamada directa a fetchData() por tu patrón.
//     if ((fecha_inicio && fecha_fin) || (!fecha_inicio && !fecha_fin)) {
//         // 1. Guardar la posición actual del scroll.
//         const currentScrollY = window.scrollY;
        
//         // 2. Llamar a fetchData y, cuando termine, restaurar la posición.
//         fetchData().then(() => {
//             setTimeout(() => {
//                 window.scrollTo(0, currentScrollY);
//             }, 100);
//         });
//     }
//     // --- FIN DE LA MODIFICACIÓN ---

//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const renderRankingCell = (params: GridRenderCellParams) => {
//     const rank = params.api.getRowIndexRelativeToVisibleRows(params.id) + 1;
//     if (rank === 1) return "🥇";
//     if (rank === 2) return "🥈";
//     if (rank === 3) return "🥉";
//     return `#${rank}`;
//   };

//   const columns: GridColDef[] = [
//     { field: 'ranking', headerName: 'Ranking', width: 90, align: 'center', headerAlign: 'center', renderCell: renderRankingCell, sortable: false },
//     { field: 'empresa', headerName: 'Empresa', flex: 1, minWidth: 150 },
//     {
//       field: 'puntaje_final',
//       headerName: 'Puntaje Final',
//       width: 130,
//       type: 'number',
//       align: 'center',
//       headerAlign: 'center',
//       valueFormatter: (value: number) => value.toFixed(1) + ' pts',
//     },
//     { field: 'total_instalaciones', headerName: 'Instalaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     { field: 'total_reparaciones', headerName: 'Reparaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     {
//       field: 'pct_falla_temprana',
//       headerName: '% Falla T.',
//       width: 120,
//       type: 'number',
//       align: 'center',
//       headerAlign: 'center',
//       valueFormatter: (value: number) => `${value.toFixed(2)}%`,
//     },
//     {
//       field: 'pct_reincidencia',
//       headerName: '% Reinc.',
//       width: 120,
//       type: 'number',
//       align: 'center',
//       headerAlign: 'center',
//       valueFormatter: (value: number) => `${value.toFixed(2)}%`,
//     },
//     {
//       field: 'pct_certificacion',
//       headerName: '% Cert.',
//       width: 120,
//       type: 'number',
//       align: 'center',
//       headerAlign: 'center',
//       valueFormatter: (value: number) => `${value.toFixed(2)}%`,
//     },
//   ];

//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

//   return (
//     <Box sx={{ mt: 4 }}>
//       <Typography variant="h6" gutterBottom>🏆 Ranking General de Empresas</Typography>
//       <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
//         Puntuación balanceada para el período del {displayDateRange.start} al {displayDateRange.end}.
//       </Typography>
      
//       <Box sx={{ height: 600, width: '100%' }}>
//           <DataGrid
//               rows={data}
//               getRowId={(row) => row.empresa}
//               columns={columns}
//               hideFooter
//               sx={{
//                   border: 1,
//                   borderColor: 'divider',
//                   '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
//                   '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' },
//                   '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
//               }}
//           />
//       </Box>

//       {data.length > 0 && (
//         <Box sx={{ mt: 4 }}>
//           <Typography variant="h6" gutterBottom>Gráfico Comparativo de Puntaje Final</Typography>
//           <RankingChart data={data} />
//         </Box>
//       )}
//     </Box>
//   );
// }