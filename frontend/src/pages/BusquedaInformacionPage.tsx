// src/pages/BusquedaInformacionPage.tsx (REFACTORIZADO)

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Alert, TextField, Paper, Tooltip } from '@mui/material';
import { DataGrid} from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaz (sin cambios) ---
interface Actividad {
  id: string; // ID único que añadiremos
  "Fecha Agendamiento": string; "Empresa": string; "Recurso": string;
  "Estado de actividad": string; "Tipo de actividad": string; "Cod_Servicio": number;
  "Rut Cliente": string; "Nombre Cliente": string; "ID externo": string;
  "Observación": string; "Acción realizada": string; "Dirección": string;
  "Comuna": string; "Propietario de Red": string;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchActividades = async (termino_busqueda: string) => {
    const { data } = await axios.get<Actividad[]>(`${API_URL}/api/buscar/actividades`, {
        params: { termino_busqueda }
    });
    return data;
};

// --- Componente Auxiliar y Columnas (sin cambios) ---
const renderCellWithTooltip = (params: GridRenderCellParams<any, string>) => (
    <Tooltip title={params.value || ''} placement="bottom-start">
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{params.value}</span>
    </Tooltip>
);

const columns: GridColDef[] = [
    { field: 'Fecha Agendamiento', headerName: 'Fecha', width: 160 }, { field: 'Empresa', headerName: 'Empresa', width: 120 },
    { field: 'Recurso', headerName: 'Técnico', width: 220, renderCell: renderCellWithTooltip }, { field: 'Estado de actividad', headerName: 'Estado', width: 130 },
    { field: 'Tipo de actividad', headerName: 'Actividad', width: 200, renderCell: renderCellWithTooltip }, { field: 'Cod_Servicio', headerName: 'Código Servicio', width: 140 },
    { field: 'Rut Cliente', headerName: 'RUT Cliente', width: 120 }, { field: 'Nombre Cliente', headerName: 'Cliente', width: 220, renderCell: renderCellWithTooltip },
    { field: 'ID externo', headerName: 'ID Externo', width: 120 }, { field: 'Dirección', headerName: 'Dirección', width: 250, renderCell: renderCellWithTooltip },
    { field: 'Comuna', headerName: 'Comuna', width: 150 }, { field: 'Propietario de Red', headerName: 'Red', width: 80 },
    { field: 'Observación', headerName: 'Observación', flex: 1, minWidth: 250, renderCell: renderCellWithTooltip }, { field: 'Acción realizada', headerName: 'Acción Realizada', flex: 1, minWidth: 250, renderCell: renderCellWithTooltip },
];

// --- Componente Principal (REFACTORIZADO) ---
export default function BusquedaInformacionPage() {
    
    // 3. ESTADOS LOCALES: uno para la entrada en tiempo real, otro para el valor "debounced"
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
    
    // 4. useEffect para el "DEBOUNCING"
    // Este efecto escucha los cambios en el input y actualiza el término "debounced" tras 500ms de inactividad.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 5. useQuery REACCIONA AL TÉRMINO "DEBOUNCED", NO AL DE TIEMPO REAL
    const { data: rawResults, isLoading, isError, error, isSuccess } = useQuery({
        // La queryKey depende del término "debounced"
        queryKey: ['busquedaActividades', { termino: debouncedSearchTerm }],
        queryFn: () => fetchActividades(debouncedSearchTerm),
        // La consulta solo se activa si el término "debounced" tiene más de 2 caracteres
        enabled: debouncedSearchTerm.length > 2,
    });

    // 6. useMemo para procesar los resultados (añadir el ID)
    const results = useMemo<Actividad[]>(() => {
        if (!rawResults) return [];
        return rawResults.map((row, index) => ({
            ...row,
            id: `${row["ID externo"] || 'ID'}-${row["Fecha Agendamiento"] || 'FECHA'}-${index}`
        }));
    }, [rawResults]);

    return (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
            <Typography variant="h4" gutterBottom>Búsqueda de Información</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
                Ingrese un Rut, Nombre de Cliente, Código de Servicio, ID Externo o Nombre de Técnico para buscar.
            </Typography>
            
            <TextField
                fullWidth
                variant="outlined"
                label="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 3 }}
            />
            
            {/* 7. RENDERIZADO CONDICIONAL CON LOS ESTADOS DE useQuery */}
            {isLoading && <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />}
            {isError && <Alert severity="error">{error instanceof Error ? error.message : 'Ocurrió un error al buscar.'}</Alert>}
            
            {/* Mensaje de "no resultados" ahora es más preciso */}
            {isSuccess && debouncedSearchTerm.length > 2 && results.length === 0 && (
                <Alert severity="info">No se encontraron resultados para "{debouncedSearchTerm}".</Alert>
            )}

            {results.length > 0 && (
                <Paper sx={{ height: 700, width: '100%' }}>
                    <DataGrid
                        rows={results}
                        columns={columns}
                        getRowId={(row) => row.id}
                        pageSizeOptions={[25, 50, 100]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 25 } },
                        }}
                        sx={{
                            '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white' },
                            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
                        }}
                    />
                </Paper>
            )}
        </Box>
    );
}

// src/pages/BusquedaInformacionPage.tsx (Versión Final con Estilos y Tooltips)

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// // CAMBIO: Añadimos Tooltip a las importaciones
// import { Typography, Box, CircularProgress, Alert, TextField, Paper, Tooltip } from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
// // --- Interfaz ---
// interface Actividad {
//     id: string; // ID único para la fila
//     "Fecha Agendamiento": string;
//     "Empresa": string;
//     "Recurso": string;
//     "Estado de actividad": string;
//     "Tipo de actividad": string;
//     "Cod_Servicio": number;
//     "Rut Cliente": string;
//     "Nombre Cliente": string;
//     "ID externo": string;
//     "Observación": string;
//     "Acción realizada": string;
//     "Dirección": string;
//     "Comuna": string;
//     "Propietario de Red": string;
// }

// // --- CAMBIO: Creamos una función para renderizar celdas con Tooltip ---
// const renderCellWithTooltip = (params: GridRenderCellParams<any, string>) => (
//   <Tooltip title={params.value || ''} placement="bottom-start">
//     <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//         {params.value}
//     </span>
//   </Tooltip>
// );

// // --- Definición de las columnas para la tabla ---
// const columns: GridColDef[] = [
//     { field: 'Fecha Agendamiento', headerName: 'Fecha', width: 160 },
//     { field: 'Empresa', headerName: 'Empresa', width: 120 },
//     { field: 'Recurso', headerName: 'Técnico', width: 220, renderCell: renderCellWithTooltip },
//     { field: 'Estado de actividad', headerName: 'Estado', width: 130 },
//     { field: 'Tipo de actividad', headerName: 'Actividad', width: 200, renderCell: renderCellWithTooltip },
//     { field: 'Cod_Servicio', headerName: 'Código Servicio', width: 140 },
//     { field: 'Rut Cliente', headerName: 'RUT Cliente', width: 120 },
//     { field: 'Nombre Cliente', headerName: 'Cliente', width: 220, renderCell: renderCellWithTooltip },
//     { field: 'ID externo', headerName: 'ID Externo', width: 120 },
//     { field: 'Dirección', headerName: 'Dirección', width: 250, renderCell: renderCellWithTooltip },
//     { field: 'Comuna', headerName: 'Comuna', width: 150 },
//     { field: 'Propietario de Red', headerName: 'Red', width: 80 },
//     // CAMBIO: Aplicamos la función renderCell a las columnas con texto largo
//     { field: 'Observación', headerName: 'Observación', flex: 1, minWidth: 250, renderCell: renderCellWithTooltip },
//     { field: 'Acción realizada', headerName: 'Acción Realizada', flex: 1, minWidth: 250, renderCell: renderCellWithTooltip },
// ];

// export default function BusquedaInformacionPage() {
//     const [searchTerm, setSearchTerm] = useState<string>('');
//     const [results, setResults] = useState<Actividad[]>([]);
//     const [loading, setLoading] = useState<boolean>(false);
//     const [error, setError] = useState<string | null>(null);
//     const [hasSearched, setHasSearched] = useState<boolean>(false);

//     useEffect(() => {
//         if (searchTerm.length > 2) {
//             setLoading(true);
//             setHasSearched(true);
            
//             const delayDebounceFn = setTimeout(() => {
//                 axios.get<Actividad[]>(`${API_URL}/api/buscar/actividades`, {
//                     params: { termino_busqueda: searchTerm }
//                 })
//                 .then(response => {
//                     const dataWithId = response.data.map((row, index) => ({
//                         ...row,
//                         id: `${row["ID externo"] || 'ID'}-${row["Fecha Agendamiento"] || 'FECHA'}-${index}`
//                     }));
//                     setResults(dataWithId);
//                     setError(null);
//                 })
//                 .catch(err => {
//                     console.error("Error en la búsqueda:", err);
//                     setError("Ocurrió un error al realizar la búsqueda.");
//                     setResults([]);
//                 })
//                 .finally(() => {
//                     setLoading(false);
//                 });
//             }, 500);

//             return () => clearTimeout(delayDebounceFn);
//         } else {
//             setResults([]);
//             setHasSearched(false);
//         }
//     }, [searchTerm]);

//     return (
//         <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
//             <Typography variant="h4" gutterBottom>Búsqueda de Información</Typography>
//             <Typography color="text.secondary" sx={{ mb: 2 }}>
//                 Ingrese un Rut, Nombre de Cliente, Código de Servicio, ID Externo o Nombre de Técnico para buscar.
//             </Typography>
            
//             <TextField
//                 fullWidth
//                 variant="outlined"
//                 label="Buscar..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 sx={{ mb: 3 }}
//             />

//             {loading && <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />}
//             {error && <Alert severity="error">{error}</Alert>}
            
//             {!loading && hasSearched && results.length === 0 && (
//                 <Alert severity="info">No se encontraron resultados para "{searchTerm}".</Alert>
//             )}

//             {results.length > 0 && (
//                 <Paper sx={{ height: 700, width: '100%' }}>
//                     <DataGrid
//                         rows={results}
//                         columns={columns}
//                         getRowId={(row) => row.id}
//                         pageSizeOptions={[25, 50, 100]}
//                         initialState={{
//                             pagination: { paginationModel: { pageSize: 25 } },
//                         }}
//                         // --- CAMBIO: Estilos de encabezado más específicos y robustos ---
//                         sx={{
//                             '& .MuiDataGrid-columnHeader': {
//                                 backgroundColor: '#1D66A5',
//                                 color: 'white',
//                             },
//                             '& .MuiDataGrid-columnHeaderTitle': {
//                                 fontWeight: 'bold',
//                             },
//                         }}
//                     />
//                 </Paper>
//             )}
//         </Box>
//     );
// }