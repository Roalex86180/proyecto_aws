// src/components/TiemposPromediosTecnicos.tsx (REFACTORIZADO)

import { useState, useMemo } from 'react';
import axios from 'axios';
import { Typography, Box, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';



// --- Interfaces (sin cambios) ---
interface ResumenData {
    tecnicoMasRapido: { nombre: string; promedio_minutos: number };
    tecnicoMasLento: { nombre: string; promedio_minutos: number };
    promedioPorActividad: { actividad: string; promedio_minutos: number }[];
    tecnicos: { nombre: string }[];
}
interface DetalleTecnico {
    "Recurso": string;
    "Tipo de actividad": string;
    "tiempo_promedio": number;
}

// --- Función de Formato (sin cambios) ---
const formatMinutes = (totalMinutes: number): string => {
    if (typeof totalMinutes !== 'number' || isNaN(totalMinutes) || totalMinutes === 0) return "N/A";
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes} min` : `${hours}h`;
    return `${minutes} min`;
};

// 2. FUNCIONES DE FETCHING INDEPENDIENTES
const fetchResumenTiempos = async (empresa: string, propietarioRed: string | null, fechaInicio: string, fechaFin: string) => {
    const params = { empresa, propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<ResumenData>(`/api/tiempos/por-empresa`, { params });
    return data;
};

const fetchDetalleTecnico = async (empresa: string, tecnico: string, fechaInicio: string, fechaFin: string) => {
    const params = { empresa, tecnico, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<DetalleTecnico[]>(`/api/tiempos/detalle-por-tecnico`, { params });
    return data;
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function TiemposPromediosTecnicos() {
    
    // 4. MANTENEMOS SOLO EL ESTADO LOCAL DE LA UI
    const [selectedTecnico, setSelectedTecnico] = useState<string>('');
    
    // 5. OBTENEMOS LOS FILTROS GLOBALES
    const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

    // Lógica declarativa para las fechas por defecto
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const toISO = (date: Date) => date.toISOString().split('T')[0];
    
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : toISO(oneYearAgo);
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : toISO(today);

    // 6. QUERY PARA EL RESUMEN INICIAL
    const resumenQuery = useQuery({
        queryKey: ['tiemposResumen', { empresa, propietarioRed, startDate, endDate }],
        queryFn: () => fetchResumenTiempos(empresa!, propietarioRed, startDate, endDate),
        enabled: !!empresa,
    });

    // 7. QUERY 'LAZY' PARA EL DETALLE DEL TÉCNICO
    const detalleQuery = useQuery({
        queryKey: ['tiemposDetalleTecnico', { empresa, tecnico: selectedTecnico, startDate, endDate }],
        queryFn: () => fetchDetalleTecnico(empresa!, selectedTecnico, startDate, endDate),
        enabled: !!empresa && !!selectedTecnico, // Solo se activa cuando hay empresa Y técnico seleccionado
    });

    // 8. PROCESAMOS LOS DATOS CON useMemo PARA EFICIENCIA
    const parsedResumen = useMemo<ResumenData | null>(() => {
        const data = resumenQuery.data;
        if (!data) return null;
        if (data.promedioPorActividad) {
            data.promedioPorActividad.forEach(item => item.promedio_minutos = parseFloat(item.promedio_minutos as any));
        }
        if (data.tecnicoMasRapido) data.tecnicoMasRapido.promedio_minutos = parseFloat(data.tecnicoMasRapido.promedio_minutos as any);
        if (data.tecnicoMasLento) data.tecnicoMasLento.promedio_minutos = parseFloat(data.tecnicoMasLento.promedio_minutos as any);
        return data;
    }, [resumenQuery.data]);

    const parsedDetalle = useMemo<DetalleTecnico[]>(() => {
        if (!detalleQuery.data) return [];
        return detalleQuery.data.map(item => ({ ...item, tiempo_promedio: parseFloat(item.tiempo_promedio as any) }));
    }, [detalleQuery.data]);


    // 9. LÓGICA DE RENDERIZADO
    if (!empresa) return <Alert severity="info" sx={{ mt: 2 }}>Por favor, seleccione una empresa para ver el análisis.</Alert>;
    if (resumenQuery.isLoading) return <CircularProgress sx={{ display: 'block', margin: '4rem auto' }} />;
    if (resumenQuery.isError) return <Alert severity="warning" sx={{ mt: 4 }}>{resumenQuery.error.message}</Alert>;
    if (!parsedResumen) return <Typography sx={{mt:4, textAlign:'center'}}>No hay datos de resumen para la empresa seleccionada.</Typography>;

    return (
        <Box>
            <Typography variant="h5" sx={{mb: 2}} gutterBottom>Tiempos Promedios para: <b>{empresa}</b></Typography>
            
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6">🏆 Resumen de Rendimiento</Typography>
                <Typography>Técnico más rápido: <b>{parsedResumen.tecnicoMasRapido?.nombre || 'N/A'}</b> ({formatMinutes(parsedResumen.tecnicoMasRapido?.promedio_minutos)})</Typography>
                <Typography>Técnico más lento: <b>{parsedResumen.tecnicoMasLento?.nombre || 'N/A'}</b> ({formatMinutes(parsedResumen.tecnicoMasLento?.promedio_minutos)})</Typography>
            </Paper>

            <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                    <TableHead><TableRow><TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Tipo de Actividad</TableCell><TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}} align="right">Tiempo Promedio</TableCell></TableRow></TableHead>
                    <TableBody>
                        {parsedResumen.promedioPorActividad?.map(row => (
                            <TableRow key={row.actividad}><TableCell>{row.actividad}</TableCell><TableCell align="right">{formatMinutes(row.promedio_minutos)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Análisis Detallado por Técnico</Typography>
                <FormControl fullWidth sx={{mb: 2}}>
                    <InputLabel>Seleccionar Técnico</InputLabel>
                    <Select value={selectedTecnico} label="Seleccionar Técnico" onChange={(e) => setSelectedTecnico(e.target.value)}>
                        <MenuItem value=""><em>Ninguno</em></MenuItem>
                        {parsedResumen.tecnicos?.map(t => <MenuItem key={t.nombre} value={t.nombre}>{t.nombre}</MenuItem>)}
                    </Select>
                </FormControl>

                {detalleQuery.isFetching && <CircularProgress size={24} />}
                {detalleQuery.isError && <Alert severity="error">{detalleQuery.error.message}</Alert>}
                
                {parsedDetalle.length > 0 && !detalleQuery.isFetching && (
                    <TableContainer>
                        <Table>
                            <TableHead><TableRow><TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Recurso</TableCell><TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Tipo de Actividad</TableCell><TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}} align="right">Tiempo Promedio</TableCell></TableRow></TableHead>
                            <TableBody>
                                {parsedDetalle.map((row, index) => (
                                    <TableRow key={`${row["Recurso"]}-${index}`}><TableCell>{row["Recurso"]}</TableCell><TableCell>{row["Tipo de actividad"]}</TableCell><TableCell align="right">{formatMinutes(row.tiempo_promedio)}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Box>
    );
}

