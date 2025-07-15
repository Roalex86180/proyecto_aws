// frontend/src/components/FallasTempranasDetails.tsx (CON RESALTADO DE FILA RESTAURADO)

import { useState, useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Card, CardContent, Alert, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, IconButton, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRowClassNameParams, GridRowParams, GridRenderCellParams } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import LoadingOverlay from './LoadingOverlay';

// --- Interfaces ---
interface ApiFallaTempranaTecnicoData {
  recurso: string;
  total_instalaciones: string;
  fallas_tempranas: string;
  porcentaje_falla: string;
}
interface FallaTempranaTecnicoData {
  recurso: string;
  total_instalaciones: number;
  fallas_tempranas: number;
  porcentaje_falla: number;
}
interface DetalleFallaData {
  "Empresa": string; "Cod_Servicio": string; "Recurso": string; "Fecha Agendamiento": string;
  "Tipo de actividad": string; "Observación": string; "Acción realizada": string; "Nombre Cliente": string;
  "Dirección": string; "Comuna": string; "orden_visita": string; "ID de recurso": string; "ID externo": string;
}
interface ApiEvolucionFallaData {
  fecha_periodo: string;
  porcentaje_falla: string;
}
interface EvolucionFallaData {
  fecha_periodo: string;
  porcentaje_falla: number;
}


// --- Funciones de Fetching ---
const fetchMainFallasData = async (empresa: string, propietarioRed: string | null, fechaInicio: string, fechaFin: string) => {
    const params = { empresa, propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<ApiFallaTempranaTecnicoData[]>(`/api/fallas-tempranas/por-tecnico`, { params });
    return data;
};

const fetchAllFallaDetails = async (empresa: string, tecnico: string, fechaInicio: string, fechaFin: string) => {
    const detailPromise = axios.get<DetalleFallaData[]>(`/api/fallas-tempranas/detalle-tecnico`, {
        params: { empresa, recurso: tecnico, fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    });
    const evolutionPromise = axios.get<ApiEvolucionFallaData[]>(`/api/fallas-tempranas/evolucion-tecnico`, {
        params: { empresa, recurso: tecnico }
    });
    const [detailResponse, evolutionResponse] = await Promise.all([detailPromise, evolutionPromise]);
    return { details: detailResponse.data, evolution: evolutionResponse.data };
};


// --- Componente Principal ---
export default function FallasTempranasDetails() {

    const [selectedTechnician, setSelectedTechnician] = useState<string>('');
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isTextDialogOpen, setTextDialogOpen] = useState(false);
    const [textDialogContent, setTextDialogContent] = useState({ title: '', content: '' });

    const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

    const mainQuery = useQuery({
        queryKey: ['fallasTempranasPorTecnico', { empresa, propietarioRed, startDate, endDate }],
        queryFn: () => fetchMainFallasData(empresa!, propietarioRed, startDate, endDate),
        enabled: !!empresa,
    });

    const detailQuery = useQuery({
        queryKey: ['fallaTempranaDetalleCompleto', { empresa, tecnico: selectedTechnician }],
        queryFn: () => fetchAllFallaDetails(empresa!, selectedTechnician, startDate, endDate),
        enabled: isDetailModalOpen && !!selectedTechnician,
    });

    const parsedMainData = useMemo<FallaTempranaTecnicoData[]>(() => {
        if (!mainQuery.data) return [];
        return mainQuery.data.map(row => ({
            recurso: row.recurso,
            total_instalaciones: parseInt(row.total_instalaciones, 10) || 0,
            fallas_tempranas: parseInt(row.fallas_tempranas, 10) || 0,
            porcentaje_falla: parseFloat(row.porcentaje_falla) || 0,
        }));
    }, [mainQuery.data]);

    const summary = useMemo(() => {
        if (!parsedMainData.length) return { total_instalaciones: 0, fallas_tempranas: 0, tasa_global: 0 };
        const totalInstalaciones = parsedMainData.reduce((sum, row) => sum + row.total_instalaciones, 0);
        const totalFallas = parsedMainData.reduce((sum, row) => sum + row.fallas_tempranas, 0);
        const tasaGlobal = totalInstalaciones > 0 ? (totalFallas / totalInstalaciones * 100) : 0;
        return { total_instalaciones: totalInstalaciones, fallas_tempranas: totalFallas, tasa_global: tasaGlobal };
    }, [parsedMainData]);

    const parsedEvolutionData = useMemo<EvolucionFallaData[]>(() => {
        if (!detailQuery.data?.evolution) return [];
        return detailQuery.data.evolution.map(row => ({
            ...row,
            porcentaje_falla: parseFloat(row.porcentaje_falla) || 0
        }));
    }, [detailQuery.data?.evolution]);

    const handleRowClick = (params: GridRowParams) => {
        if (params.row.fallas_tempranas > 0) {
            setSelectedTechnician(params.row.recurso);
            setDetailModalOpen(true);
        }
    };
    const handleCloseDetailModal = () => setDetailModalOpen(false);
    const handleOpenTextDialog = (title: string, content: string) => { setTextDialogContent({ title, content }); setTextDialogOpen(true); };
    const handleCloseTextDialog = () => setTextDialogOpen(false);
    
    const FALLA_MALA = 3;
    const renderClickableCell = (params: GridRenderCellParams) => { const text = params.value as string; if (!text) return null; return (<Tooltip title="Haz clic para ver texto completo"><Box onClick={() => handleOpenTextDialog(params.colDef.headerName || '', text)} sx={{ cursor: 'pointer', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</Box></Tooltip>);};
    const mainColumns: GridColDef[] = [
        { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
        { field: 'total_instalaciones', headerName: 'Instalaciones', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
        { field: 'fallas_tempranas', headerName: 'Fallas Tempranas', width: 160, type: 'number', align: 'center', headerAlign: 'center' },
        { field: 'porcentaje_falla', headerName: '% Falla Temprana', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
            valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
            cellClassName: (params) => { const porcentaje = params.value ?? 0; return porcentaje > FALLA_MALA ? 'kpi-negative' : 'kpi-positive'; },
        },
    ];
    // Dentro de FallasTempranasDetails.tsx

    const detailColumns: GridColDef[] = [
        { field: 'ID externo', headerName: 'ID Externo', width: 120, renderCell: renderClickableCell },
        { field: 'Cod_Servicio', headerName: 'Cod. Servicio', width: 130, renderCell: renderClickableCell },
        { field: 'Fecha Agendamiento', headerName: 'Fecha Visita', width: 160, renderCell: renderClickableCell },
        { field: 'Empresa', headerName: 'Empresa', width: 110, renderCell: renderClickableCell },
        { field: 'Recurso', headerName: 'Técnico', width: 220, renderCell: renderClickableCell },
        { field: 'Tipo de actividad', headerName: 'Actividad', width: 180, renderCell: renderClickableCell },
        { field: 'Nombre Cliente', headerName: 'Cliente', width: 220, renderCell: renderClickableCell },
        { field: 'Dirección', headerName: 'Dirección', width: 250, renderCell: renderClickableCell },
        { field: 'Comuna', headerName: 'Comuna', width: 150, renderCell: renderClickableCell },
        { field: 'Observación', headerName: 'Observación', width: 300, renderCell: renderClickableCell },
        { field: 'Acción realizada', headerName: 'Acción Realizada', width: 300, renderCell: renderClickableCell },
    ];

    const getDetailRowClassName = (params: GridRowClassNameParams) => {
    // En una Falla Temprana, la visita original es la instalación (orden 1).
    // Resaltamos esa fila para indicar que fue la que originó la falla posterior.
    if (params.row.orden_visita === '1') {
        return 'failure-highlight';
    }
    return '';
    };

    if (!empresa) return <Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una empresa en la barra superior para ver el análisis.</Alert>;
    if (mainQuery.isLoading) return <CircularProgress sx={{ mt: 4 }} />;
    if (mainQuery.isError) return <Typography color="error" sx={{ mt: 4 }}>{mainQuery.error.message}</Typography>;

    return (
        <Box>
            <LoadingOverlay isLoading={mainQuery.isFetching && !mainQuery.isLoading} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, mt: 2 }}>
                <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Instalaciones</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.total_instalaciones.toLocaleString('es-CL')}</Typography></CardContent></Card>
                <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Fallas Tempranas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.fallas_tempranas.toLocaleString('es-CL')}</Typography></CardContent></Card>
                <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa Global de Falla</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.tasa_global > FALLA_MALA ? '#D32F2F' : '#388E3C' }}>{summary.tasa_global.toFixed(2)}%</Typography></CardContent></Card>
            </Box>
            
            <Typography variant="h6" gutterBottom>Desglose por Técnico</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>Haz clic en la fila de un técnico con fallas para ver el detalle de sus casos.</Alert>
            <Box sx={{ height: 600, width: '100%', mb: 4 }}>
                <DataGrid rows={parsedMainData} getRowId={(row) => row.recurso} columns={mainColumns} onRowClick={handleRowClick} sx={{'& .MuiDataGrid-row:hover': { cursor: 'pointer' }, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }}} />
            </Box>

            <Dialog open={isDetailModalOpen} onClose={handleCloseDetailModal} fullWidth maxWidth="xl">
                <DialogTitle>Detalle de Fallas Tempranas para: {selectedTechnician}<IconButton aria-label="close" onClick={handleCloseDetailModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
                <DialogContent dividers>
                    {detailQuery.isLoading && <CircularProgress sx={{display: 'block', mx: 'auto', my: 4}} />}
                    {detailQuery.isError && <Alert severity="error">{detailQuery.error instanceof Error ? detailQuery.error.message : 'Error desconocido'}</Alert>}
                    {!detailQuery.isLoading && !detailQuery.isError && detailQuery.data && (
                        <Box>
                            {detailQuery.data.details.length > 0 ? (
                                <>
                                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Detalle de Visitas</Typography>
                                    <Box sx={{ height: 400, width: '100%' }}>
                                        <DataGrid
                                            rows={detailQuery.data.details}
                                            getRowId={(row) => row['ID externo'] || `${row['Cod_Servicio']}-${row['Fecha Agendamiento']}`}
                                            columns={detailColumns}
                                            getRowClassName={getDetailRowClassName} // <-- Se llama a la función
                                            slots={{ toolbar: GridToolbar }}
                                            // --- PASO 2: AÑADIMOS LOS ESTILOS A LA DATAGRID DEL MODAL ---
                                            sx={{
                                                '& .failure-highlight': {
                                                    bgcolor: '#FFC7CE',
                                                    color: '#9C0006',
                                                    '&:hover': { bgcolor: '#FFB3BD' }
                                                }
                                            }}
                                        />
                                    </Box>
                                    
                                    <Divider sx={{ my: 4 }} />
                                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Evolución de Tasa de Falla (períodos de 10 días)</Typography>
                                    <Box sx={{ height: 300, width: '100%' }}>
                                        <ResponsiveContainer>
                                            <LineChart data={parsedEvolutionData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="fecha_periodo" />
                                                <YAxis allowDecimals={false} domain={[0, 'dataMax + 2']} tickFormatter={(tick) => `${tick}%`}/>
                                                <RechartsTooltip formatter={(value: number) => [`${value.toFixed(2)}%`, "Tasa Falla"]} />
                                                <Legend />
                                                <ReferenceLine y={3} label="Meta 3%" stroke="green" strokeDasharray="3 3" />
                                                <Line type="monotone" dataKey="porcentaje_falla" name="Tasa de Falla (%)" stroke="#d9534f" strokeWidth={2} activeDot={{ r: 8 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </>
                            ) : (
                                <Alert severity="info">No se encontraron casos de Falla Temprana para este técnico.</Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTextDialogOpen} onClose={handleCloseTextDialog} fullWidth><DialogTitle>{textDialogContent.title}<IconButton aria-label="close" onClick={handleCloseTextDialog} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle><DialogContent dividers><DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>{textDialogContent.content}</DialogContentText></DialogContent></Dialog>
        </Box>
    );
}

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress, Card, CardContent, Alert, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, IconButton } from '@mui/material';
// import CloseIcon from '@mui/icons-material/Close';
// import { DataGrid, GridToolbar } from '@mui/x-data-grid';
// import type { GridColDef, GridRowClassNameParams, GridRenderCellParams, GridRowParams } from '@mui/x-data-grid';
// import LoadingOverlay from './LoadingOverlay';
// 

// // --- Interfaces ---
// interface ApiFallaTempranaTecnicoData {
//   recurso: string;
//   total_instalaciones: string;
//   fallas_tempranas: string;
//   porcentaje_falla: string;
// }
// interface FallaTempranaTecnicoData {
//   recurso: string;
//   total_instalaciones: number;
//   fallas_tempranas: number;
//   porcentaje_falla: number;
// }
// interface DetalleFallaData {
//     "Empresa": string; "Cod_Servicio": string; "Recurso": string; "Fecha Agendamiento": string;
//     "Tipo de actividad": string; "Observación": string; "Acción realizada": string;
//     "Nombre Cliente": string; "Dirección": string; "Comuna": string;
//     "orden_visita": string; "ID de recurso": string; "ID externo": string;
// }
// interface DetailsProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function FallasTempranasDetails({ empresa, propietario_red, fecha_inicio, fecha_fin }: DetailsProps) {
//   const [data, setData] = useState<FallaTempranaTecnicoData[]>([]);
//   const [summary, setSummary] = useState({ total_instalaciones: 0, fallas_tempranas: 0, tasa_global: 0 });
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<Error | null>(null);
//   const [selectedTechnician, setSelectedTechnician] = useState<string>('');
//   const [detailData, setDetailData] = useState<DetalleFallaData[]>([]);
//   const [detailLoading, setDetailLoading] = useState<boolean>(false);
//   const [detailError, setDetailError] = useState<string | null>(null);
//   const [activeDateRange, setActiveDateRange] = useState<{ start: string; end: string } | null>(null);
//   const [isTextDialogOpen, setTextDialogOpen] = useState(false);
//   const [textDialogContent, setTextDialogContent] = useState({ title: '', content: '' });
//   const [isDetailModalOpen, setDetailModalOpen] = useState(false);

//   const handleOpenTextDialog = (title: string, content: string) => { setTextDialogContent({ title, content }); setTextDialogOpen(true); };
//   const handleCloseTextDialog = () => { setTextDialogOpen(false); };
//   const handleRowClick = (params: GridRowParams) => {
//     if (params.row.fallas_tempranas > 0) {
//       setSelectedTechnician(params.row.recurso);
//       setDetailModalOpen(true);
//     }
//   };
//   const handleCloseDetailModal = () => { setDetailModalOpen(false); setDetailData([]); setSelectedTechnician(''); };

//   useEffect(() => {
//     if (!empresa) { setData([]); setLoading(false); return; }
//     let startDate = fecha_inicio;
//     let endDate = fecha_fin;
//     if (!startDate || !endDate) {
//       const today = new Date();
//       const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
//       endDate = today.toISOString().split('T')[0];
//       startDate = thirtyDaysAgo.toISOString().split('T')[0];
//     }
//     setActiveDateRange({ start: startDate, end: endDate });
//     const fetchData = async () => {
//       setLoading(true); setError(null);
//       try {
//         const response = await axios.get<ApiFallaTempranaTecnicoData[]>(`/api/fallas-tempranas/por-tecnico`, {
//           params: { empresa, propietario_red, fecha_inicio: startDate, fecha_fin: endDate }
//         });
//         const parsedData: FallaTempranaTecnicoData[] = response.data.map(row => ({
//           recurso: row.recurso,
//           total_instalaciones: parseInt(row.total_instalaciones, 10) || 0,
//           fallas_tempranas: parseInt(row.fallas_tempranas, 10) || 0,
//           porcentaje_falla: parseFloat(row.porcentaje_falla) || 0,
//         }));
//         setData(parsedData);
//         const totalInstalaciones = parsedData.reduce((sum, row) => sum + row.total_instalaciones, 0);
//         const totalFallas = parsedData.reduce((sum, row) => sum + row.fallas_tempranas, 0);
//         const tasaGlobal = totalInstalaciones > 0 ? (totalFallas / totalInstalaciones * 100) : 0;
//         setSummary({ total_instalaciones: totalInstalaciones, fallas_tempranas: totalFallas, tasa_global: tasaGlobal });
//       } catch (err) { if (err instanceof Error) setError(err); else setError(new Error('Ocurrió un error desconocido.'));
//       } finally { setLoading(false); }
//     };
//     fetchData();
//   }, [empresa, propietario_red, fecha_inicio, fecha_fin]);

//   useEffect(() => {
//     if (!isDetailModalOpen) return;
//     const fetchDetailData = async () => {
//       setDetailLoading(true); setDetailError(null);
//       try {
//         const response = await axios.get<DetalleFallaData[]>(`/api/fallas-tempranas/detalle-tecnico`, {
//           params: { empresa, recurso: selectedTechnician, fecha_inicio: activeDateRange?.start, fecha_fin: activeDateRange?.end }
//         });
//         setDetailData(response.data);
//       } catch (err) {
//         if (axios.isAxiosError(err) && err.response) { setDetailError(`Error ${err.response.status}: ${err.response.data.error || 'No se pudo obtener el detalle.'}`);
//         } else if (err instanceof Error) { setDetailError(err.message);
//         } else { setDetailError('Ocurrió un error desconocido.'); }
//       } finally { setDetailLoading(false); }
//     };
//     fetchDetailData();
//   }, [isDetailModalOpen, selectedTechnician, empresa, activeDateRange]);

//   const FALLA_MALA = 3;
//   const mainColumns: GridColDef[] = [
//     { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
//     { field: 'total_instalaciones', headerName: 'Instalaciones', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
//     { field: 'fallas_tempranas', headerName: 'Fallas Tempranas', width: 160, type: 'number', align: 'center', headerAlign: 'center' },
//     {
//       field: 'porcentaje_falla', headerName: '% Falla Temprana', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
//       valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
//       cellClassName: (params) => { const porcentaje = params.value ?? 0; return porcentaje > FALLA_MALA ? 'kpi-negative' : 'kpi-positive'; },
//     },
//   ];
//   const renderClickableCell = (params: GridRenderCellParams) => { const text = params.value as string; if (!text) return null; return (<Tooltip title="Haz clic para ver texto completo"><Box onClick={() => handleOpenTextDialog(params.colDef.headerName || '', text)} sx={{ cursor: 'pointer', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</Box></Tooltip>);};
//   const detailColumns: GridColDef[] = [ { field: 'ID externo', headerName: 'ID Externo', width: 120, renderCell: renderClickableCell }, { field: 'Cod_Servicio', headerName: 'Cod. Servicio', width: 130, renderCell: renderClickableCell }, { field: 'Fecha Agendamiento', headerName: 'Fecha Visita', width: 160, renderCell: renderClickableCell }, { field: 'Tipo de actividad', headerName: 'Actividad', width: 180, renderCell: renderClickableCell }, { field: 'Recurso', headerName: 'Técnico', width: 220, renderCell: renderClickableCell }, { field: 'Observación', headerName: 'Observación', width: 300, renderCell: renderClickableCell }, ];
//   const getDetailRowClassName = (params: GridRowClassNameParams) => { const tipoActividad = params.row['Tipo de actividad']; if (tipoActividad && tipoActividad.toLowerCase().includes('instalación')) { return 'failure-highlight'; } return ''; };
  
//   if (!empresa) { return (<Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una empresa en la barra superior para ver el análisis.</Alert>); }
//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error" sx={{ mt: 4 }}>{error.message}</Typography>;
  
//   return (
//     <Box>
//         <LoadingOverlay isLoading={loading || detailLoading} />
//         <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, mt: 2 }}>
//             <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Instalaciones</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.total_instalaciones.toLocaleString('es-CL')}</Typography></CardContent></Card>
//             <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Fallas Tempranas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.fallas_tempranas.toLocaleString('es-CL')}</Typography></CardContent></Card>
//             <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa Global de Falla</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.tasa_global > FALLA_MALA ? '#D32F2F' : '#388E3C' }}>{summary.tasa_global.toFixed(2)}%</Typography></CardContent></Card>
//         </Box>
//         <Typography variant="h6" gutterBottom>Desglose por Técnico</Typography>
//         <Alert severity="info" sx={{ mb: 2 }}>Haz clic en la fila de un técnico con fallas para ver el detalle de sus casos.</Alert>
//         <Box sx={{ height: 600, width: '100%', mb: 4 }}>
//             <DataGrid rows={data} getRowId={(row) => row.recurso} columns={mainColumns} onRowClick={handleRowClick} sx={{'& .MuiDataGrid-row:hover': { cursor: 'pointer' }, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }}} />
//         </Box>

//         <Dialog open={isDetailModalOpen} onClose={handleCloseDetailModal} fullWidth maxWidth="lg">
//             <DialogTitle>Detalle de Fallas Tempranas para: {selectedTechnician}<IconButton aria-label="close" onClick={handleCloseDetailModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
//             <DialogContent dividers>
//                 {detailLoading && <CircularProgress />}
//                 {detailError && <Alert severity="error">{detailError}</Alert>}
//                 {!detailLoading && !detailError && (detailData.length > 0 ? (
//                     <Box sx={{ height: 400, width: '100%' }}>
//                         <DataGrid rows={detailData} getRowId={(row) => row['ID externo']} columns={detailColumns} getRowClassName={getDetailRowClassName} slots={{ toolbar: GridToolbar }} sx={{ '& .failure-highlight': { backgroundColor: '#FFC7CE', color: '#9C0006', '&:hover': { backgroundColor: '#FFB3BD' } } }} />
//                     </Box>
//                 ) : <Alert severity="info">No se encontraron casos de Falla Temprana para este técnico.</Alert>)}
//             </DialogContent>
//         </Dialog>
        
//         <Dialog open={isTextDialogOpen} onClose={handleCloseTextDialog} fullWidth><DialogTitle>{textDialogContent.title}<IconButton aria-label="close" onClick={handleCloseTextDialog} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle><DialogContent dividers><DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>{textDialogContent.content}</DialogContentText></DialogContent></Dialog>
//     </Box>
//   );
// }