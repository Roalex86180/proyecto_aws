// frontend/src/components/KpiRankingTecnicos.tsx (REFACTORIZADO)

import { useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';



// --- Interfaces (sin cambios) ---
interface RankingData {
  Empresa: string;
  Recurso: string;
  puntaje_final: number;
  ranking_original?: number;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchRankingTecnicos = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
    };
    const { data } = await axios.get<RankingData[]>(`/api/ranking/tecnicos`, { params });
    return data;
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function KpiRankingTecnicos() {
  
  // 4. OBTIENE LOS FILTROS DE ZUSTAND
  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
  
  // Lógica declarativa para las fechas por defecto
  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  // 5. OBTENEMOS LOS DATOS CRUDOS CON useQuery
  const { data: rawData, isLoading, isError, error } = useQuery({
    queryKey: ['rankingTecnicos', { propietarioRed, startDate, endDate }],
    queryFn: () => fetchRankingTecnicos(propietarioRed, startDate, endDate),
  });
  
  // 6. TRANSFORMAMOS LOS DATOS Y AÑADIMOS EL RANKING CON useMemo
  const dataWithRanking = useMemo<RankingData[]>(() => {
    if (!rawData) return [];
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
    { field: 'ranking', headerName: 'Ranking', width: 90, align: 'center', headerAlign: 'center', renderCell: renderRankingCell, sortable: false, filterable: false },
    { field: 'Recurso', headerName: 'Técnico', flex: 1, minWidth: 220 },
    { field: 'Empresa', headerName: 'Empresa', width: 150, valueGetter: (_value, row) => row.Empresa },
    { field: 'puntaje_final', headerName: 'Puntaje Final', width: 130, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => value ? value.toFixed(1) + ' pts' : 'N/A' },
  ];

  // 7. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? `Error: ${error.message}` : 'No se pudo calcular el ranking.'}</Alert>;

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>🏆 Ranking General de Técnicos</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
        Puntuación para el período del {startDate} al {endDate}. 
        Total de técnicos: {dataWithRanking.length}
      </Typography>
      
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
            rows={dataWithRanking}
            getRowId={(row) => row.Recurso}
            columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: -1 } } }}
            pageSizeOptions={[]}
            hideFooterPagination={true}
            rowHeight={52}
            sx={{
              border: 1, borderColor: 'divider',
              '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
              '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' },
              '& .MuiDataGrid-columnSeparator': { display: 'none' },
              '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
              '& .MuiDataGrid-virtualScroller': {
                '&::-webkit-scrollbar': { width: '8px' },
                '&::-webkit-scrollbar-track': { backgroundColor: '#f1f1f1' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#888', borderRadius: '4px' },
                '&::-webkit-scrollbar-thumb:hover': { backgroundColor: '#555' },
              },
            }}
        />
      </Box>
    </Box>
  );
}
// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress, Alert } from '@mui/material';
// import { DataGrid} from '@mui/x-data-grid';
// import type { GridColDef, GridRenderCellParams  } from '@mui/x-data-grid';
// 
// // --- Interfaces ---
// interface RankingData {
//     Empresa: string;
//     Recurso: string;
//     puntaje_final: number;
//     ranking_original?: number; // Añadimos el ranking original
// }
// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function KpiRankingTecnicos({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
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
//         const response = await axios.get<RankingData[]>(`/api/ranking/tecnicos`, {
//           params: { 
//             fecha_inicio: startDate, 
//             fecha_fin: endDate,
//             propietario_red: propietario_red
//           }
//         });
        
//         const dataWithRanking = response.data.map((item, index) => ({
//           ...item,
//           ranking_original: index + 1
//         }));
        
//         setData(dataWithRanking);
//       } catch (err) {
//         setError('No se pudo calcular el ranking de técnicos.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     // --- INICIO DE LA MODIFICACIÓN ---
//     // La llamada directa a fetchData() se reemplaza por tu patrón.
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
//     const rank = params.row.ranking_original;
//     if (rank === 1) return "🥇";
//     if (rank === 2) return "🥈";
//     if (rank === 3) return "🥉";
//     return `#${rank}`;
//   };

//   const columns: GridColDef[] = [
//     { 
//       field: 'ranking', 
//       headerName: 'Ranking', 
//       width: 90, 
//       align: 'center', 
//       headerAlign: 'center', 
//       renderCell: renderRankingCell, 
//       sortable: false,
//       filterable: false
//     },
//     { field: 'Recurso', headerName: 'Técnico', flex: 1, minWidth: 220 },
//     {
//       field: 'Empresa',
//       headerName: 'Empresa',
//       width: 150,
//       valueGetter: (_value, row) => row.Empresa || row.empresa,
//     },
//     {
//       field: 'puntaje_final',
//       headerName: 'Puntaje Final',
//       width: 130,
//       type: 'number',
//       align: 'center',
//       headerAlign: 'center',
//       valueFormatter: (value: number) => value ? value.toFixed(1) + ' pts' : 'N/A',
//     },
//   ];

//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

//   return (
//     <Box sx={{ mt: 4 }}>
//       <Typography variant="h6" gutterBottom>🏆 Ranking General de Técnicos</Typography>
//       <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
//         Puntuación para el período del {displayDateRange.start} al {displayDateRange.end}. 
//         Total de técnicos: {data.length}
//       </Typography>
      
//       <Box sx={{ height: 600, width: '100%' }}>
//           <DataGrid
//               rows={data}
//               getRowId={(row) => row.Recurso || row.recurso}
//               columns={columns}
//               initialState={{
//                 pagination: {
//                   paginationModel: { pageSize: -1 },
//                 },
//               }}
//               pageSizeOptions={[]}
//               hideFooterPagination={true}
//               rowHeight={52}
//               sx={{
//                   border: 1,
//                   borderColor: 'divider',
//                   '& .MuiDataGrid-columnHeader': { 
//                     backgroundColor: '#1D66A5', 
//                     color: 'white', 
//                     fontWeight: 'bold' 
//                   },
//                   '& .MuiDataGrid-columnHeaderTitle': { 
//                     color: 'white', 
//                     fontWeight: 'bold' 
//                   },
//                   '& .MuiDataGrid-columnSeparator': { 
//                     display: 'none' 
//                   },
//                   '& .MuiDataGrid-row:nth-of-type(odd)': { 
//                     backgroundColor: 'action.hover' 
//                   },
//                   '& .MuiDataGrid-virtualScroller': {
//                     '&::-webkit-scrollbar': {
//                       width: '8px',
//                     },
//                     '&::-webkit-scrollbar-track': {
//                       backgroundColor: '#f1f1f1',
//                     },
//                     '&::-webkit-scrollbar-thumb': {
//                       backgroundColor: '#888',
//                       borderRadius: '4px',
//                     },
//                     '&::-webkit-scrollbar-thumb:hover': {
//                       backgroundColor: '#555',
//                     },
//                   },
//               }}
//           />
//       </Box>
//     </Box>
//   );
// }