// Asumo que el nombre del archivo es CertificacionDetails.tsx, aunque el componente se llame CertificacionDetails

import axios from 'axios';
import { Typography, Box, CircularProgress, Card, CardContent, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import * as d3 from 'd3';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { useRef, useEffect, useMemo } from 'react'; // <-- Añadimos useMemo

// Herramientas de estado
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';
import LoadingOverlay from './LoadingOverlay';



// --- Interfaces ---
interface TecnicoData {
  recurso: string;
  total_finalizadas: string;
  certificadas: string;
  porcentaje_certificacion: string | null;
}
interface ParsedTecnicoData {
    recurso: string;
    total_finalizadas: number;
    certificadas: number;
    porcentaje_certificacion: number;
}

// --- Función de Fetching ---
const fetchCertificacionDetails = async (
  empresa: string | null,
  propietarioRed: string | null,
  fechaInicio: string,
  fechaFin: string
) => {
  const params = {
    empresa: empresa,
    propietario_red: propietarioRed,
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  };
  const { data } = await axios.get<TecnicoData[]>(`/api/certificacion/por-tecnico`, { params });
  return data;
};

// --- Componente de Gráfico D3 (CON SU CÓDIGO ORIGINAL RESTAURADO) ---
const CertificacionChart = ({ data }: { data: ParsedTecnicoData[] }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiar el SVG

    const chartData = [...data].sort((a, b) => b.porcentaje_certificacion - a.porcentaje_certificacion);
    const margin = { top: 20, right: 80, left: 200, bottom: 20 };
    const height = chartData.length * 40 + margin.top + margin.bottom;
    const width = 800;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const xScale = d3.scaleLinear().domain([0, 110]).range([0, innerWidth]);
    const yScale = d3.scaleBand().domain(chartData.map(d => d.recurso)).range([0, innerHeight]).padding(0.1);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g").attr("class", "grid").selectAll("line").data(xScale.ticks()).enter().append("line")
      .attr("x1", d => xScale(d)).attr("x2", d => xScale(d)).attr("y1", 0).attr("y2", innerHeight)
      .style("stroke", "#e0e0e0").style("stroke-dasharray", "3,3");

    g.selectAll(".bar").data(chartData).enter().append("rect")
      .attr("class", "bar").attr("x", 0).attr("y", d => yScale(d.recurso) as number)
      .attr("width", d => xScale(d.porcentaje_certificacion)).attr("height", yScale.bandwidth())
      .attr("fill", '#0275d8');

    g.selectAll(".label").data(chartData).enter().append("text")
      .attr("class", "label").attr("x", d => xScale(d.porcentaje_certificacion) + 5)
      .attr("y", d => (yScale(d.recurso) as number) + yScale.bandwidth() / 2)
      .attr("dy", "0.35em").style("font-size", "12px").style("font-weight", "bold")
      .text(d => `${d.porcentaje_certificacion.toFixed(1)}%`);

    g.append("g").attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`)).style("font-size", "11px");

    g.append("g").call(d3.axisLeft(yScale)).selectAll("text").style("font-size", "11px");
  }, [data]);

  const height = data.length * 40 + 60;
  return <div style={{ width: '100%', height: `${height}px`, display: 'flex', justifyContent: 'center' }}><svg ref={svgRef} style={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}/></div>;
};

// --- Componente Principal (Refactorizado) ---
export default function CertificacionDetails() {

  const { empresa, propietarioRed, fechaInicio, fechaFin } = useFilterStore();

  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  const { data: rawData, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ['certificacionDetails', { empresa, propietarioRed, startDate, endDate }],
    queryFn: () => fetchCertificacionDetails(empresa, propietarioRed, startDate, endDate),
    enabled: !!empresa, 
  });

  const parsedData = useMemo<ParsedTecnicoData[]>(() => {
    if (!rawData) return [];
    return rawData.map(d => ({
        ...d,
        total_finalizadas: parseInt(d.total_finalizadas, 10) || 0,
        certificadas: parseInt(d.certificadas, 10) || 0,
        porcentaje_certificacion: d.porcentaje_certificacion ? parseFloat(d.porcentaje_certificacion) : 0
    }));
  }, [rawData]);

  const summary = useMemo(() => {
    if (!parsedData || parsedData.length === 0) {
      return { finalizadas: 0, certificadas: 0, efectividad: 0 };
    }
    const totalFinalizadas = parsedData.reduce((sum, row) => sum + row.total_finalizadas, 0);
    const totalCertificadas = parsedData.reduce((sum, row) => sum + row.certificadas, 0);
    const pctGeneral = totalFinalizadas > 0 ? (totalCertificadas / totalFinalizadas * 100) : 0;
    return { finalizadas: totalFinalizadas, certificadas: totalCertificadas, efectividad: pctGeneral };
  }, [parsedData]);
  
  const columns: GridColDef[] = [
    { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false, renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1, },
    { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
    { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'certificadas', headerName: 'Certificadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
    { field: 'porcentaje_certificacion', headerName: '% Certificación', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center', valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`, cellClassName: (params) => { const efectividad = params.value ?? 0; return efectividad >= 95 ? 'kpi-positive' : 'kpi-negative'; } },
  ];

  if (!empresa) return <Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una Empresa para comenzar el análisis.</Alert>;
  if (isLoading) return <CircularProgress sx={{ mt: 4 }} />;
  if (isError) return <Typography color="error" sx={{ mt: 4 }}>Error: {error instanceof Error ? error.message : 'Error desconocido'}</Typography>;
  
  return (
    <Box>
        <LoadingOverlay isLoading={isFetching} />
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, mb: 3, mt: 2 }}>
            <Card sx={{ flex: '1 1 33%', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Rep. Finalizadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.finalizadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
            <Card sx={{ flex: '1 1 33%', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Certificadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.certificadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
            <Card sx={{ flex: '1 1 33%', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa de Certificación</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.efectividad >= 95 ? '#388E3C' : '#D32F2F' }}>{summary.efectividad.toFixed(2)}%</Typography></CardContent></Card>
        </Box>
        
        <Typography variant="h6" gutterBottom>Desglose de Certificación por Técnico</Typography>
        <Box sx={{ height: 600, width: '100%', mb: 4 }}>
            {parsedData.length > 0 ? (
                <DataGrid rows={parsedData} getRowId={(row) => row.recurso} columns={columns} sx={{ border: 1, borderColor: 'divider', '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }} />
            ) : ( <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No se encontraron datos para los filtros seleccionados.</Typography> )}
        </Box>

        {parsedData.length > 0 && (
            <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>Gráfico Comparativo de Certificación</Typography>
                <CertificacionChart data={parsedData} />
            </Box>
        )}
    </Box>
  );
}
// import { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import { Typography, Box, CircularProgress, Card, CardContent, Alert} from '@mui/material';
// import { DataGrid } from '@mui/x-data-grid';
// import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
// // CAMBIO 1: Se importa D3.js en lugar de Recharts
// import * as d3 from 'd3';
// import LoadingOverlay from './LoadingOverlay';
// 
// // --- Interfaces ---
// interface TecnicoData {
//   recurso: string;
//   total_finalizadas: string;
//   certificadas: string;
//   porcentaje_certificacion: string | null;
// }
// interface ParsedTecnicoData {
//     recurso: string;
//     total_finalizadas: number;
//     certificadas: number;
//     porcentaje_certificacion: number;
// }
// interface DetailsProps {
//   empresa: string | null;
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // CAMBIO 2: Se redefine el componente del gráfico usando D3.js
// const CertificacionChart = ({ data }: { data: ParsedTecnicoData[] }) => {
//   const svgRef = useRef<SVGSVGElement>(null);

//   useEffect(() => {
//     if (!data.length || !svgRef.current) return;

//     const svg = d3.select(svgRef.current);
//     svg.selectAll("*").remove(); // Limpiar el SVG

//     // Preparar los datos ordenados
//     const chartData = [...data].sort((a, b) => b.porcentaje_certificacion - a.porcentaje_certificacion);

//     // Dimensiones
//     const margin = { top: 20, right: 80, left: 200, bottom: 20 };
//     const height = chartData.length * 40 + margin.top + margin.bottom;
//     const width = 800;
//     const innerWidth = width - margin.left - margin.right;
//     const innerHeight = height - margin.top - margin.bottom;

//     // Ajustar el tamaño del SVG
//     svg.attr("width", width).attr("height", height);

//     // Escalas
//     const xScale = d3.scaleLinear()
//       .domain([0, 110])
//       .range([0, innerWidth]);

//     const yScale = d3.scaleBand()
//       .domain(chartData.map(d => d.recurso))
//       .range([0, innerHeight])
//       .padding(0.1);

//     // Contenedor principal
//     const g = svg.append("g")
//       .attr("transform", `translate(${margin.left},${margin.top})`);

//     // Grilla vertical
//     g.append("g")
//       .attr("class", "grid")
//       .selectAll("line")
//       .data(xScale.ticks())
//       .enter().append("line")
//       .attr("x1", d => xScale(d))
//       .attr("x2", d => xScale(d))
//       .attr("y1", 0)
//       .attr("y2", innerHeight)
//       .style("stroke", "#e0e0e0")
//       .style("stroke-dasharray", "3,3");

//     // Barras
//     g.selectAll(".bar")
//       .data(chartData)
//       .enter().append("rect")
//       .attr("class", "bar")
//       .attr("x", 0)
//       .attr("y", d => yScale(d.recurso) as number)
//       .attr("width", d => xScale(d.porcentaje_certificacion))
//       .attr("height", yScale.bandwidth())
//       .attr("fill", '#0275d8');

//     // Etiquetas en las barras
//     g.selectAll(".label")
//       .data(chartData)
//       .enter().append("text")
//       .attr("class", "label")
//       .attr("x", d => xScale(d.porcentaje_certificacion) + 5)
//       .attr("y", d => (yScale(d.recurso) as number) + yScale.bandwidth() / 2)
//       .attr("dy", "0.35em")
//       .style("font-size", "12px")
//       .style("font-weight", "bold")
//       .text(d => `${d.porcentaje_certificacion.toFixed(1)}%`);

//     // Eje X
//     g.append("g")
//       .attr("transform", `translate(0,${innerHeight})`)
//       .call(d3.axisBottom(xScale).tickFormat(d => `${d}%`))
//       .style("font-size", "11px");

//     // Eje Y
//     g.append("g")
//       .call(d3.axisLeft(yScale))
//       .selectAll("text")
//       .style("font-size", "11px");

//   }, [data]);

//   const height = data.length * 40 + 60;

//   return (
//     <div style={{ width: '100%', height: `${height}px`, display: 'flex', justifyContent: 'center' }}>
//       <svg
//         ref={svgRef}
//         style={{ border: '1px solid #e0e0e0', borderRadius: '4px' }}
//       />
//     </div>
//   );
// };

// // --- Componente Principal ---
// export default function CertificacionDetails({ empresa, propietario_red, fecha_inicio, fecha_fin }: DetailsProps) {
//   const [data, setData] = useState<ParsedTecnicoData[]>([]);
//   const [summary, setSummary] = useState({ finalizadas: 0, certificadas: 0, efectividad: 0 });
//   const [loading, setLoading] = useState<boolean>(false);
//   const [error, setError] = useState<Error | null>(null);

//   useEffect(() => {
//     // Si no hay empresa seleccionada, no hacemos nada
//     if (!empresa) {
//         setData([]);
//         setLoading(false);
//         return;
//     }

//     // CAMBIO: Lógica para usar fechas por defecto si no se seleccionan
//     let startDate = fecha_inicio;
//     let endDate = fecha_fin;
//     if (!startDate || !endDate) {
//       const today = new Date();
//       const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
//       endDate = today.toISOString().split('T')[0];
//       startDate = thirtyDaysAgo.toISOString().split('T')[0];
//     }

//     const fetchData = async () => {
//       setLoading(true); setError(null);
//       try {
//         const response = await axios.get<TecnicoData[]>(`/api/certificacion/por-tecnico`, {
//           // La llamada a axios siempre usa las fechas, ya sean las de los props o las de por defecto
//           params: { empresa, propietario_red, fecha_inicio: startDate, fecha_fin: endDate }
//         });
        
//         const parsedData: ParsedTecnicoData[] = response.data.map(d => ({
//             ...d,
//             total_finalizadas: parseInt(d.total_finalizadas, 10) || 0,
//             certificadas: parseInt(d.certificadas, 10) || 0,
//             porcentaje_certificacion: d.porcentaje_certificacion ? parseFloat(d.porcentaje_certificacion) : 0
//         }));
//         setData(parsedData);

//         const totalFinalizadas = parsedData.reduce((sum, row) => sum + row.total_finalizadas, 0);
//         const totalCertificadas = parsedData.reduce((sum, row) => sum + row.certificadas, 0);
//         const pctGeneral = totalFinalizadas > 0 ? (totalCertificadas / totalFinalizadas * 100) : 0;
//         setSummary({ finalizadas: totalFinalizadas, certificadas: totalCertificadas, efectividad: pctGeneral });

//       } catch (err) { if (err instanceof Error) setError(err); else setError(new Error('Ocurrió un error desconocido'));
//       } finally { setLoading(false); }
//     };
    
//     fetchData();
//   }, [empresa, propietario_red, fecha_inicio, fecha_fin]);

//   const columns: GridColDef[] = [
//     { field: 'posicion', headerName: 'Posición', width: 90, align: 'center', headerAlign: 'center', sortable: false, renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1, },
//     { field: 'recurso', headerName: 'Técnico', flex: 1, minWidth: 200 },
//     { field: 'total_finalizadas', headerName: 'Total Finalizadas', width: 150, type: 'number', align: 'center', headerAlign: 'center' },
//     { field: 'certificadas', headerName: 'Certificadas', width: 130, type: 'number', align: 'center', headerAlign: 'center' },
//     {
//       field: 'porcentaje_certificacion', headerName: '% Certificación', flex: 1, minWidth: 150, type: 'number', align: 'center', headerAlign: 'center',
//       valueFormatter: (value: number) => value == null ? 'N/A' : `${value.toFixed(2)}%`,
//       cellClassName: (params) => { const efectividad = params.value ?? 0; return efectividad >= 95 ? 'kpi-positive' : 'kpi-negative'; },
//     },
//   ];

//   if (!empresa) { return (<Alert severity="info" sx={{ mt: 4 }}>Por favor, selecciona una Empresa para comenzar el análisis.</Alert>); }
//   if (loading) return <CircularProgress sx={{ mt: 4 }} />;
//   if (error) return <Typography color="error" sx={{ mt: 4 }}>Error: {error.message}</Typography>;
  
//   return (
//     <Box>
//         <LoadingOverlay isLoading={loading} />
//         <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 2, mb: 3, mt: 2 }}>
//             <Card sx={{ flex: '1 1 33%', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Rep. Finalizadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.finalizadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
//             <Card sx={{ flex: '1 1 33%', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Total Certificadas</Typography><Typography variant="h4" sx={{ fontWeight: 'bold' }}>{summary.certificadas.toLocaleString('es-CL')}</Typography></CardContent></Card>
//             <Card sx={{ flex: '1 1 33%', textAlign: 'center' }}><CardContent><Typography color="text.secondary">Tasa de Certificación</Typography><Typography variant="h4" sx={{ fontWeight: 'bold', color: summary.efectividad >= 95 ? '#388E3C' : '#D32F2F' }}>{summary.efectividad.toFixed(2)}%</Typography></CardContent></Card>
//         </Box>
        
//         <Typography variant="h6" gutterBottom>Desglose de Certificación por Técnico</Typography>
//         <Box sx={{ height: 600, width: '100%', mb: 4 }}>
//             {data.length > 0 ? (
//                 <DataGrid rows={data} getRowId={(row) => row.recurso} columns={columns} sx={{ border: 1, borderColor: 'divider', '& .kpi-positive': { color: '#388E3C', fontWeight: '600' }, '& .kpi-negative': { color: '#D32F2F', fontWeight: '600' }, '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnHeaderTitle': { color: 'white', fontWeight: 'bold' }, '& .MuiDataGrid-columnSeparator': { display: 'none' }, '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: 'action.hover' }, }} />
//             ) : ( <Typography sx={{ mt: 2, fontStyle: 'italic' }}>No se encontraron datos para los filtros seleccionados.</Typography> )}
//         </Box>

//         {/* CAMBIO 3: El gráfico ahora usa D3.js en lugar de Recharts */}
//         {data.length > 0 && (
//             <Box sx={{ mt: 4 }}>
//                 <Typography variant="h6" gutterBottom>Gráfico Comparativo de Certificación</Typography>
//                 <CertificacionChart data={data} />
//             </Box>
//         )}
//     </Box>
//   );
// }