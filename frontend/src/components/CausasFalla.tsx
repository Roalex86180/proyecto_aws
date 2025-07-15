// src/components/CausasFalla.tsx (REFACTORIZADO)

import { useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import {
    Typography, Box, CircularProgress, Alert, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';



// --- Interfaces (sin cambios) ---
interface FallaData {
  comuna: string;
  causa: string;
  total: number;
}

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE Y LIMPIA
const fetchCausasFalla = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = {
        propietario_red: propietarioRed,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
    };
    const response = await axios.get<FallaData[]>(`/api/calidad/causas-falla`, { params });
    // Hacemos el parseo aquí para que los datos de la query ya estén limpios
    return response.data.map(item => ({...item, total: Number(item.total)}));
};


// --- Componente D3 Treemap (sin cambios en su lógica interna) ---
const TreemapChart = ({ data }: { data: { name: string, value: number }[] }) => {
    const ref = useRef<SVGSVGElement>(null);
    const width = 600;
    const height = 400;
 
    useEffect(() => {
        if (!data || data.length === 0 || !ref.current) return;
        
        const root = d3.hierarchy({ name: "root", children: data }).sum((d: any) => d.value || 0);
        const treemap = d3.treemap<any>().size([width, height]).padding(2).round(true);
        treemap(root);
 
        const svg = d3.select(ref.current);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`)
           .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
 
        const color = d3.scaleOrdinal(d3.schemeTableau10);
        
        const leaf = svg.selectAll("g").data(root.leaves()).join("g").attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);
        leaf.append("rect").attr("fill", (d: any) => color(d.data.name)).attr("width", (d: any) => d.x1 - d.x0).attr("height", (d: any) => d.y1 - d.y0);
        leaf.append("clipPath").attr("id", (_d: any, i: number) => `clip-treemap-${i}`).append("rect").attr("width", (d: any) => d.x1 - d.x0).attr("height", (d: any) => d.y1 - d.y0);
        leaf.append("text").attr("clip-path", (_d: any, i: number) => `url(#clip-treemap-${i})`)
          .selectAll("tspan").data((d: any) => {
              const nameParts = d.data.name.split(/(?=[A-Z][a-z])|\s+/g);
              nameParts.push(`(${d.value.toLocaleString('es-CL')})`);
              return nameParts;
          })
          .join("tspan").attr("x", 4).attr("y", (_d, i) => 13 + i * 12).attr("fill", "white").style("font-weight", "bold").text((d: any) => d);
    }, [data]);
 
    return <svg ref={ref}></svg>;
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function CausasFalla() {
    
    // 4. OBTENEMOS LOS FILTROS DE ZUSTAND
    const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
    
    // Lógica declarativa para las fechas
    const today = new Date();
    const defaultEndDate = today.toISOString().split('T')[0];
    today.setDate(today.getDate() - 89);
    const defaultStartDate = today.toISOString().split('T')[0];
    
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : defaultStartDate;
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : defaultEndDate;

    // 5. OBTENEMOS LOS DATOS CON useQuery
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['causasFalla', { propietarioRed, startDate, endDate }],
        queryFn: () => fetchCausasFalla(propietarioRed, startDate, endDate),
    });

    // 6. CALCULAMOS LOS ESTADOS DERIVADOS CON useMemo, DEPENDIENDO DE LA DATA DE useQuery
    const tablaCausaMasComun = useMemo(() => {
        if (!data || data.length === 0) return [];
        const groupedByComuna = d3.group(data, d => d.comuna);
        return Array.from(groupedByComuna.entries()).map(([comuna, fallas]) => {
            const causaMasComun = fallas.sort((a, b) => b.total - a.total)[0];
            return { comuna, causa: causaMasComun.causa, total: causaMasComun.total };
        }).sort((a, b) => b.total - a.total);
    }, [data]);

    const treemapData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const groupedByCausa = d3.group(data, d => d.causa);
        return Array.from(groupedByCausa.entries())
            .map(([causa, values]) => ({ name: causa, value: d3.sum(values, d => d.total) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 12);
    }, [data]);

    // 7. RENDERIZADO CONDICIONAL CON LOS ESTADOS DE useQuery
    if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
    if (isError) return <Alert severity="error" sx={{ mt: 2 }}>{error instanceof Error ? error.message : 'No se pudo cargar el análisis.'}</Alert>;

    return (
        <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <Typography variant="h4" gutterBottom>Análisis de Causa de Falla</Typography>
            
            <Box sx={{ mt: 2, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Causa Más Común por Comuna</Typography>
                <TableContainer component={Paper} sx={{maxHeight: 400}}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Comuna</TableCell>
                                <TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Causa Principal</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tablaCausaMasComun.map(row => (
                                <TableRow key={row.comuna}>
                                    <TableCell sx={{textTransform: 'capitalize'}}>{row.comuna}</TableCell>
                                    <TableCell sx={{textTransform: 'capitalize'}}>{row.causa}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            <Box>
                <Typography variant="h6" gutterBottom>Top 12 Causas de Falla (General)</Typography>
                <Paper sx={{p: 1, display: 'flex', justifyContent: 'center'}}>
                    {treemapData.length > 0 ? (
                        <TreemapChart data={treemapData} />
                    ) : (
                        <Typography sx={{textAlign: 'center', p: 4}}>No hay suficientes datos para generar el gráfico.</Typography>
                    )}
                </Paper>
            </Box>
        </Box>
    );
}



// // src/components/CausasFalla.tsx (Layout vertical corregido)

// import { useState, useEffect, useMemo, useRef } from 'react';
// import axios from 'axios';
// import * as d3 from 'd3';
// import {
//     Typography, Box, CircularProgress, Alert, Paper, Table, TableBody,
//     TableCell, TableContainer, TableHead, TableRow
// } from '@mui/material';
// 
// // --- Interfaces ---
// interface FallaData {
//   comuna: string;
//   causa: string;
//   total: number;
// }
// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// // --- Componente D3 Treemap ---
// const TreemapChart = ({ data }: { data: { name: string, value: number }[] }) => {
//     const ref = useRef<SVGSVGElement>(null);
//     const width = 600;
//     const height = 400;
  
//     useEffect(() => {
//       if (!data || data.length === 0 || !ref.current) return;
  
//       const root = d3.hierarchy({ name: "root", children: data }).sum((d: any) => d.value || 0);
  
//       const treemap = d3.treemap<any>().size([width, height]).padding(2).round(true);
//       treemap(root);
  
//       const svg = d3.select(ref.current);
//       svg.selectAll("*").remove();
//       svg.attr("viewBox", `0 0 ${width} ${height}`)
//          .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");
  
//       const color = d3.scaleOrdinal(d3.schemeTableau10);
      
//       const leaf = svg.selectAll("g")
//         .data(root.leaves())
//         .join("g")
//         .attr("transform", (d: any) => `translate(${d.x0},${d.y0})`);
  
//       leaf.append("rect")
//         .attr("fill", (d: any) => color(d.data.name))
//         .attr("width", (d: any) => d.x1 - d.x0)
//         .attr("height", (d: any) => d.y1 - d.y0);
  
//       leaf.append("clipPath")
//         .attr("id", (_d: any, i: number) => `clip-treemap-${i}`)
//         .append("rect")
//         .attr("width", (d: any) => d.x1 - d.x0)
//         .attr("height", (d: any) => d.y1 - d.y0);

//       leaf.append("text")
//         .attr("clip-path", (_d: any, i: number) => `url(#clip-treemap-${i})`)
//         .selectAll("tspan")
//         .data((d: any) => {
//             const nameParts = d.data.name.split(/(?=[A-Z][a-z])|\s+/g);
//             nameParts.push(`(${d.value.toLocaleString('es-CL')})`);
//             return nameParts;
//         })
//         .join("tspan")
//           .attr("x", 4)
//           .attr("y", (_d, i) => 13 + i * 12)
//           .attr("fill", "white")
//           .style("font-weight", "bold")
//           .text((d: any) => d);
  
//     }, [data]);
  
//     return <svg ref={ref}></svg>;
// };

// // --- Componente Principal del Widget ---
// export default function CausasFalla({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
//   const [rawData, setRawData] = useState<FallaData[]>([]);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const today = new Date();
//         const defaultEndDate = today.toISOString().split('T')[0];
//         today.setDate(today.getDate() - 89);
//         const defaultStartDate = today.toISOString().split('T')[0];
        
//         const params = { 
//             propietario_red, 
//             fecha_inicio: fecha_inicio || defaultStartDate, 
//             fecha_fin: fecha_fin || defaultEndDate
//         };

//         const response = await axios.get<FallaData[]>(`/api/calidad/causas-falla`, { params });
//         const parsedData = response.data.map(item => ({...item, total: Number(item.total)}));
//         setRawData(parsedData);
//       } catch (err) {
//         setError('No se pudo cargar el análisis de causas de falla.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
    
//     const currentScrollY = window.scrollY;
//     fetchData().then(() => { setTimeout(() => { window.scrollTo(0, currentScrollY); }, 100); });
    
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   const tablaCausaMasComun = useMemo(() => {
//     if (rawData.length === 0) return [];
//     const groupedByComuna = d3.group(rawData, d => d.comuna);
//     return Array.from(groupedByComuna.entries()).map(([comuna, fallas]) => {
//         const causaMasComun = fallas.sort((a, b) => b.total - a.total)[0];
//         return { comuna, causa: causaMasComun.causa, total: causaMasComun.total };
//     }).sort((a, b) => b.total - a.total);
//   }, [rawData]);

//   const treemapData = useMemo(() => {
//     if (rawData.length === 0) return [];
//     const groupedByCausa = d3.group(rawData, d => d.causa);
//     return Array.from(groupedByCausa.entries())
//         .map(([causa, values]) => ({
//             name: causa,
//             value: d3.sum(values, d => d.total)
//         }))
//         .sort((a, b) => b.value - a.value)
//         .slice(0, 12);
//   }, [rawData]);


//   if (loading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

//   return (
//     <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
//       <Typography variant="h4" gutterBottom>Análisis de Causa de Falla</Typography>
      
//       {/* --- INICIO DEL LAYOUT VERTICAL CORREGIDO --- */}

//       {/* 1. Tabla de Causa más común */}
//       <Box sx={{ mt: 2, mb: 4 }}>
//         <Typography variant="h6" gutterBottom>Causa Más Común por Comuna</Typography>
//         <TableContainer component={Paper} sx={{maxHeight: 400}}>
//             <Table stickyHeader size="small">
//                 <TableHead>
//                     <TableRow>
//                         <TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Comuna</TableCell>
//                         <TableCell sx={{backgroundColor:'#1D66A5',color:'white', fontWeight: 'bold'}}>Causa Principal</TableCell>
//                     </TableRow>
//                 </TableHead>
//                 <TableBody>
//                     {tablaCausaMasComun.map(row => (
//                         <TableRow key={row.comuna}>
//                             <TableCell sx={{textTransform: 'capitalize'}}>{row.comuna}</TableCell>
//                             <TableCell sx={{textTransform: 'capitalize'}}>{row.causa}</TableCell>
//                         </TableRow>
//                     ))}
//                 </TableBody>
//             </Table>
//         </TableContainer>
//       </Box>

//       {/* 2. Gráfico Treemap */}
//       <Box>
//         <Typography variant="h6" gutterBottom>Top 12 Causas de Falla (General)</Typography>
//         <Paper sx={{p: 1, display: 'flex', justifyContent: 'center'}}>
//             {treemapData.length > 0 ? (
//                 <TreemapChart data={treemapData} />
//             ) : (
//                 <Typography sx={{textAlign: 'center', p: 4}}>No hay suficientes datos para generar el gráfico.</Typography>
//             )}
//         </Paper>
//       </Box>
      
//       {/* --- FIN DEL LAYOUT VERTICAL CORREGIDO --- */}
//     </Box>
//   );
// }