import { useState, useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Card, CardContent, Alert, Tooltip, Dialog, DialogTitle, DialogContentText, DialogContent, DialogActions, Button, IconButton, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams, GridRowClassNameParams, GridRowParams } from '@mui/x-data-grid';

import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import LoadingOverlay from './LoadingOverlay';



// --- Interfaces (Restauradas y completas) ---
interface ApiReincidenciaData {
  recurso: string;
  total_finalizadas: string;
  total_reincidencias: string;
  porcentaje_reincidencia: string;
}
interface ReincidenciaData {
  recurso: string;
  total_finalizadas: number;
  total_reincidencias: number;
  porcentaje_reincidencia: number;
}
interface DetalleVisitaData {
  "Empresa": string;
  "Cod_Servicio": string;
  "Recurso": string;
  "Fecha Agendamiento": string;
  "Tipo de actividad": string;
  "Observación": string;
  "Acción realizada": string;
  "Nombre Cliente": string;
  "Dirección": string;
  "Comuna": string;
  "orden_visita": string;
  "ID de recurso": string;
  "ID externo": string;
}
interface ApiEvolucionData {
  fecha_periodo: string;
  porcentaje_reincidencia: string;
}
interface EvolucionData {
  fecha_periodo: string;
  porcentaje_reincidencia: number;
}

// --- Funciones de Fetching (Independientes y limpias) ---
const fetchMainData = async (empresa: string, propietarioRed: string | null, fechaInicio: string, fechaFin: string) => {
    const params = { empresa, propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<ApiReincidenciaData[]>(`/api/reincidencias/por-tecnico`, { params });
    return data;
};

const fetchAllDetails = async (empresa: string, tecnico: string, fechaInicio: string, fechaFin: string) => {
    const detailPromise = axios.get<DetalleVisitaData[]>(`/api/reincidencias/detalle-tecnico`, {
        params: { empresa, recurso: tecnico, fecha_inicio: fechaInicio, fecha_fin: fechaFin }
    });
    const evolutionPromise = axios.get<ApiEvolucionData[]>(`/api/reincidencias/evolucion-tecnico`, {
        params: { empresa, recurso: tecnico }
    });
    const [detailResponse, evolutionResponse] = await Promise.all([detailPromise, evolutionPromise]);
    return { details: detailResponse.data, evolution: evolutionResponse.data };
};

// --- Componente Principal (Refactorizado y Completo) ---
export default function ReincidenciasTecnicoDetails() {
    
    // Estados locales para controlar la UI (modales, selecciones)
    const [selectedTechnician, setSelectedTechnician] = useState<string>('');
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isTextDialogOpen, setTextDialogOpen] = useState(false);
    const [textDialogContent, setTextDialogContent] = useState({ title: '', content: '' });

    // Estado global para los filtros
    const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

    // Lógica para fechas por defecto
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

    // Query para los datos principales de la tabla
    const mainQuery = useQuery({
        queryKey: ['reincidenciasPorTecnico', { empresa, propietarioRed, startDate, endDate }],
        queryFn: () => fetchMainData(empresa!, propietarioRed, startDate, endDate),
        enabled: !!empresa,
    });

    // Query para los datos del modal (deshabilitada por defecto)
    const detailQuery = useQuery({
        queryKey: ['reincidenciaDetalle', { empresa, tecnico: selectedTechnician, startDate, endDate }],
        queryFn: () => fetchAllDetails(empresa!, selectedTechnician, startDate, endDate),
        enabled: isDetailModalOpen && !!selectedTechnician,
    });

    // --- Estados Derivados con useMemo ---
    const parsedMainData = useMemo<ReincidenciaData[]>(() => {
        if (!mainQuery.data) return [];
        return mainQuery.data.map(row => ({
            recurso: row.recurso,
            total_finalizadas: parseInt(row.total_finalizadas, 10) || 0,
            total_reincidencias: parseInt(row.total_reincidencias, 10) || 0,
            porcentaje_reincidencia: parseFloat(row.porcentaje_reincidencia) || 0,
        }));
    }, [mainQuery.data]);

    const summary = useMemo(() => {
        if (!parsedMainData.length) return { finalizadas: 0, reincidencias: 0, tasaGlobal: 0 };
        const totalFinalizadas = parsedMainData.reduce((sum, row) => sum + row.total_finalizadas, 0);
        const totalReincidencias = parsedMainData.reduce((sum, row) => sum + row.total_reincidencias, 0);
        const tasaGlobal = totalFinalizadas > 0 ? (totalReincidencias / totalFinalizadas * 100) : 0;
        return { finalizadas: totalFinalizadas, reincidencias: totalReincidencias, tasaGlobal };
    }, [parsedMainData]);

    const reincidenceCasesCount = useMemo(() => {
        if (!detailQuery.data?.details) return 0;
        return new Set(detailQuery.data.details.map(row => row['Cod_Servicio'])).size;
    }, [detailQuery.data?.details]);
    
    const parsedEvolutionData = useMemo<EvolucionData[]>(() => {
        if (!detailQuery.data?.evolution) return [];
        return detailQuery.data.evolution.map(row => ({
            ...row,
            porcentaje_reincidencia: parseFloat(row.porcentaje_reincidencia) || 0
        }));
    }, [detailQuery.data?.evolution]);

    // --- Manejadores de Eventos ---
    const handleRowClick = (params: GridRowParams) => {
        if (params.row.total_reincidencias > 0) {
            setSelectedTechnician(params.row.recurso);
            setDetailModalOpen(true);
        }
    };
    const handleCloseDetailModal = () => setDetailModalOpen(false);
    const handleOpenTextDialog = (title: string, content: string) => { setTextDialogContent({ title, content }); setTextDialogOpen(true); };
    const handleCloseTextDialog = () => setTextDialogOpen(false);

    const REINCIDENCIA_MALA = 4;

    const renderClickableCell = (params: GridRenderCellParams) => {
        const text = params.value as string;
        if (!text) return null;
        return (
            <Tooltip title="Haz clic para ver el texto completo">
                <Box onClick={() => handleOpenTextDialog(params.colDef.headerName || '', text)} sx={{ cursor: 'pointer', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {text}
                </Box>
            </Tooltip>
        );
    };

    const mainColumns: GridColDef[] = [
        { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false },
        { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
        { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
        { field: 'total_reincidencias', headerName: 'Total Reincidencias', width: 160, type: 'number', align: 'center', headerAlign: 'center' },
        {
            field: 'porcentaje_reincidencia', headerName: '% Reincidencia', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
            valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
            cellClassName: (params) => { const reincidencia = params.value ?? 0; return reincidencia > REINCIDENCIA_MALA ? 'kpi-negative' : 'kpi-positive'; },
        },
    ];

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

    const getDetailRowClassName = (params: GridRowClassNameParams) => (params.row.orden_visita === '1' ? 'reincidence-highlight' : '');
    
    if (!empresa) return <Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una empresa en la barra superior para comenzar el análisis.</Alert>;
    if (mainQuery.isLoading) return <CircularProgress sx={{ mt: 4 }} />;
    if (mainQuery.isError) return <Typography color="error" sx={{ mt: 4 }}>Error: {mainQuery.error.message}</Typography>;
    
    return (
        <Box sx={{ mt: 4 }}>
            <LoadingOverlay isLoading={mainQuery.isFetching && !mainQuery.isLoading} />
            <Box sx={{ opacity: mainQuery.isFetching ? 0.5 : 1, transition: 'opacity 0.3s ease' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Act. Finalizadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.finalizadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
                    <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Reincidencias</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.reincidencias.toLocaleString('es-CL')}</Typography></CardContent></Card>
                    <Card sx={{ minWidth: 270, flexGrow: 1, textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa Global de Reincidencia</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.tasaGlobal > REINCIDENCIA_MALA ? '#D32F2F' : '#388E3C' }}>{summary.tasaGlobal.toFixed(2)}%</Typography></CardContent></Card>
                </Box>
                <Typography variant="h6" gutterBottom>Desglose por Técnico</Typography>
                <Alert severity="info" sx={{ mb: 2 }}>Haz clic en la fila de un técnico con reincidencias para ver el detalle de sus casos.</Alert>
                <Box sx={{ height: 600, width: '100%', mb: 4 }}>
                    {parsedMainData.length > 0 ? (
                        <DataGrid
                            rows={parsedMainData.map((row, index) => ({ id: row.recurso, posicion: index + 1, ...row }))}
                            columns={mainColumns}
                            onRowClick={handleRowClick}
                            sx={{ border: 1, borderColor: 'divider', '& .MuiDataGrid-row:hover': { cursor: 'pointer' }, '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
                        />
                    ) : (
                        <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No se encontraron datos.</Typography>
                    )}
                </Box>
            </Box>

            <Dialog open={isDetailModalOpen} onClose={handleCloseDetailModal} fullWidth maxWidth="xl">
                <DialogTitle>
                    Detalle de Reincidencias para: {selectedTechnician}
                    <IconButton aria-label="close" onClick={handleCloseDetailModal} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {detailQuery.isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
                    {detailQuery.isError && <Alert severity="error">{detailQuery.error.message}</Alert>}
                    {!detailQuery.isLoading && !detailQuery.isError && detailQuery.data && (
                        <Box>
                            {reincidenceCasesCount > 0 ? (
                                <>
                                    <Alert severity="success" icon="✅" sx={{ mb: 2 }}>
                                        Para <strong>{selectedTechnician}</strong> se han encontrado <strong>{reincidenceCasesCount}</strong> casos de reincidencia en el período seleccionado.
                                    </Alert>
                                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Detalle de Visitas (período seleccionado)</Typography>
                                    <Box sx={{ height: 400, width: '100%' }}>
                                        <DataGrid
                                            rows={detailQuery.data.details}
                                            columns={detailColumns}
                                            getRowId={(row) => row['ID externo'] || `${row['Cod_Servicio']}-${row['Fecha Agendamiento']}-${row['Recurso']}`}
                                            getRowClassName={getDetailRowClassName}
                                            slots={{ toolbar: GridToolbar }}
                                            slotProps={{ toolbar: { showQuickFilter: true } }}
                                            sx={{ '& .reincidence-highlight': { bgcolor: '#FFC7CE', color: '#9C0006', '&:hover': { bgcolor: '#FFB3BD' } } }}
                                        />
                                    </Box>
                                    <Divider sx={{ my: 4 }} />
                                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Evolución de Tasa de Reincidencia (Últimos 6 meses)</Typography>
                                    <Box sx={{ height: 300, width: '100%' }}>
                                        <ResponsiveContainer>
                                            <LineChart data={parsedEvolutionData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="fecha_periodo" />
                                                <YAxis allowDecimals={false} domain={[0, 'dataMax + 2']} tickFormatter={(tick) => `${tick}%`}/>
                                                <RechartsTooltip formatter={(value) => [`${value}%`, "Tasa Reinc."]} />
                                                <Legend />
                                                <ReferenceLine y={4} label="Meta 4%" stroke="green" strokeDasharray="3 3" />
                                                <Line type="monotone" dataKey="porcentaje_reincidencia" name="Tasa de Reincidencia (%)" stroke="#d9534f" strokeWidth={2} activeDot={{ r: 8 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </>
                            ) : (
                                <Alert severity="info">No se encontraron visitas de reincidencia para este técnico en el período seleccionado.</Alert>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetailModal}>Cerrar</Button>
                </DialogActions>
            </Dialog>
            
            <Dialog open={isTextDialogOpen} onClose={handleCloseTextDialog} fullWidth maxWidth="md">
                <DialogTitle>{textDialogContent.title}<IconButton aria-label="close" onClick={handleCloseTextDialog} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton></DialogTitle>
                <DialogContent dividers>
                    <DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>{textDialogContent.content}</DialogContentText>
                </DialogContent>
                <DialogActions><Button onClick={handleCloseTextDialog}>Cerrar</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
