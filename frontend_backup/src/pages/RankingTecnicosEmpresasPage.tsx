// src/pages/RankingTecnicosPage.tsx (REFACTORIZADO Y OPTIMIZADO)

import { useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Alert } from '@mui/material';
import { DataGrid} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces ---
interface RankingData {
    Recurso: string;
    Empresa: string;
    puntaje_final: number;
    total_instalaciones?: number;
    total_reparaciones?: number;
    pct_reincidencia?: number;
    pct_falla_temprana?: number;
    pct_certificacion?: number;
    ranking_original?: number; // Propiedad que añadimos
}

// 2. LA FUNCIÓN DE FETCHING, AHORA CON EL FILTRO DE EMPRESA
const fetchRankingTecnicos = async (
    empresa: string | null,
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    // La optimización clave: pasamos la empresa como parámetro a la API
    const params = {
        empresa, // Asumiendo que tu backend puede recibir y usar este filtro
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
    };
    const { data } = await axios.get<RankingData[]>(`${API_URL}/api/ranking/tecnicos`, { params });
    return data;
};

// --- Componente Principal ---
// 3. YA NO RECIBE PROPS
export default function RankingTecnicosPage() {
    
    // 4. OBTENEMOS TODOS LOS FILTROS DE ZUSTAND
    const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

    // Lógica declarativa para las fechas
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];
    
    // 5. OBTENEMOS LOS DATOS CON useQuery
    const { data: rawData, isLoading, isError, error } = useQuery({
        // La queryKey ahora incluye la empresa, ya que la petición depende de ella
        queryKey: ['rankingTecnicosPage', { empresa, propietarioRed, startDate, endDate }],
        queryFn: () => fetchRankingTecnicos(empresa, propietarioRed, startDate, endDate),
        // La consulta solo se activa si se ha seleccionado una empresa
        enabled: !!empresa,
    });

    // 6. ENRIQUECEMOS LOS DATOS CON useMemo
    const dataWithRanking = useMemo(() => {
        if (!rawData) return [];
        return rawData.map((item, index) => ({
            ...item,
            ranking_original: index + 1,
        }));
    }, [rawData]);

    // --- Renderers y Columnas (sin cambios) ---
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
        { field: 'Empresa', headerName: 'Empresa', width: 150 },
        { field: 'puntaje_final', headerName: 'Puntaje Final', width: 130, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => value ? value.toFixed(1) + ' pts' : 'N/A' },
        ...(dataWithRanking.length > 0 && dataWithRanking[0].total_instalaciones !== undefined ? [
            { field: 'total_instalaciones', headerName: 'Instalaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
            { field: 'total_reparaciones', headerName: 'Reparaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
            { field: 'pct_falla_temprana', headerName: '% Falla T.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value?.toFixed(2) || 0}%`},
            { field: 'pct_reincidencia', headerName: '% Reinc.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value?.toFixed(2) || 0}%`},
            { field: 'pct_certificacion', headerName: '% Cert.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value?.toFixed(2) || 0}%`},
        ] as GridColDef[] : [])
    ];

    // 7. RENDERIZADO CONDICIONAL SIMPLIFICADO
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Ranking de Técnicos por Empresa</Typography>
            
            {!empresa ? (
                <Alert severity="info" sx={{mt:2}}>Por favor, selecciona una Empresa en la barra superior para ver el ranking.</Alert>
            ) : isLoading ? (
                <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />
            ) : isError ? (
                <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? error.message : 'No se pudo calcular el ranking.'}</Alert>
            ) : dataWithRanking.length === 0 ? (
                <Alert severity="warning" sx={{ mt: 4 }}>No se encontraron técnicos para la empresa "{empresa}" en el período seleccionado.</Alert>
            ) : (
                <Box sx={{ height: 700, width: '100%', mt: 2 }}>
                    <Typography variant="h6" sx={{mb: 2}}>
                        Ranking para: <strong>{empresa}</strong> ({dataWithRanking.length} técnicos)
                    </Typography>
                    <DataGrid
                        rows={dataWithRanking}
                        getRowId={(row) => row.Recurso}
                        columns={columns}
                        hideFooterPagination
                        rowHeight={52}
                        sx={{
                            border: 1, borderColor: 'divider',
                            '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
                            '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' },
                            '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                        }}
                    />
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
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// // --- Interfaces ---
// interface RankingData {
//     Recurso: string;
//     Empresa: string;
//     puntaje_final: number;
//     total_instalaciones?: number;
//     total_reparaciones?: number;
//     pct_reincidencia?: number;
//     pct_falla_temprana?: number;
//     pct_certificacion?: number;
// }
// interface PageProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function RankingTecnicosPage({ empresa, propietario_red, fecha_inicio, fecha_fin }: PageProps) {
//   const [data, setData] = useState<RankingData[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     // Si no hay empresa seleccionada, no hacemos nada
//     if (!empresa) {
//       setData([]);
//       setLoading(false);
//       return;
//     }

//     // Lógica para usar fechas por defecto si no se seleccionan desde los props
//     let startDate = fecha_inicio;
//     let endDate = fecha_fin;
//     if (!startDate || !endDate) {
//       const today = new Date();
//       const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
//       endDate = today.toISOString().split('T')[0];
//       startDate = thirtyDaysAgo.toISOString().split('T')[0];
//     }

//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         // CAMBIO: Usar el endpoint existente
//         const response = await axios.get<RankingData[]>(`${API_URL}/api/ranking/tecnicos`, {
//           params: { 
//             propietario_red,
//             fecha_inicio: startDate,
//             fecha_fin: endDate
//           }
//         });
        
//         // CAMBIO: Filtrar por empresa en el cliente
//         const filteredData = response.data.filter(item => 
//           item.Empresa && item.Empresa.toLowerCase() === empresa.toLowerCase()
//         );
        
//         setData(filteredData);
//       } catch (err) {
//         setError('No se pudo calcular el ranking para la empresa seleccionada.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     fetchData();
//   }, [empresa, propietario_red, fecha_inicio, fecha_fin]);

//   const renderRankingCell = (params: GridRenderCellParams) => {
//     const rank = params.api.getRowIndexRelativeToVisibleRows(params.id) + 1;
//     if (rank === 1) return "🥇";
//     if (rank === 2) return "🥈";
//     if (rank === 3) return "🥉";
//     return `#${rank}`;
//   };

//   const columns: GridColDef[] = [
//     { field: 'ranking', headerName: 'Ranking', width: 90, align: 'center', headerAlign: 'center', renderCell: renderRankingCell, sortable: false },
//     { field: 'Recurso', headerName: 'Técnico', flex: 1, minWidth: 220 },
//     { field: 'puntaje_final', headerName: 'Puntaje Final', width: 130, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => value ? value.toFixed(1) + ' pts' : 'N/A' },
//     // Columnas opcionales (solo si los datos las incluyen)
//     ...(data.length > 0 && data[0].total_instalaciones !== undefined ? [
//       { field: 'total_instalaciones', headerName: 'Instalaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//       { field: 'total_reparaciones', headerName: 'Reparaciones', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//       { field: 'pct_falla_temprana', headerName: '% Falla T.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value?.toFixed(2) || 0}%`},
//       { field: 'pct_reincidencia', headerName: '% Reinc.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value?.toFixed(2) || 0}%`},
//       { field: 'pct_certificacion', headerName: '% Cert.', width: 120, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => `${value?.toFixed(2) || 0}%`},
//     ] as GridColDef[] : [])
//   ];

//   return (
//     <Box sx={{ p: 3 }}>
//       <Typography variant="h4" gutterBottom>Ranking de Técnicos por Empresa</Typography>
      
//       {!empresa ? (
//         <Alert severity="info" sx={{mt:2}}>Por favor, selecciona una Empresa en la barra superior para ver el ranking.</Alert>
//       ) : loading ? (
//         <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />
//       ) : error ? (
//         <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
//       ) : data.length === 0 ? (
//         <Alert severity="warning" sx={{ mt: 4 }}>No se encontraron técnicos para la empresa "{empresa}" en el período seleccionado.</Alert>
//       ) : (
//         <Box sx={{ height: 700, width: '100%', mt: 2 }}>
//             <Typography variant="h6" sx={{mb: 2}}>
//               Ranking para: <strong>{empresa}</strong> ({data.length} técnicos)
//             </Typography>
//             <DataGrid
//                 rows={data}
//                 getRowId={(row) => row.Recurso}
//                 columns={columns}
//                 initialState={{
//                   pagination: {
//                     paginationModel: { pageSize: -1 },
//                   },
//                 }}
//                 pageSizeOptions={[]}
//                 hideFooterPagination={true}
//                 rowHeight={52}
//                 sx={{
//                     border: 1, borderColor: 'divider',
//                     '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
//                     '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' },
//                     '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' },
//                     '& .MuiDataGrid-virtualScroller': {
//                       '&::-webkit-scrollbar': {
//                         width: '8px',
//                       },
//                       '&::-webkit-scrollbar-track': {
//                         backgroundColor: '#f1f1f1',
//                       },
//                       '&::-webkit-scrollbar-thumb': {
//                         backgroundColor: '#888',
//                         borderRadius: '4px',
//                       },
//                       '&::-webkit-scrollbar-thumb:hover': {
//                         backgroundColor: '#555',
//                       },
//                     },
//                 }}
//             />
//         </Box>
//       )}
//     </Box>
//   );
// }