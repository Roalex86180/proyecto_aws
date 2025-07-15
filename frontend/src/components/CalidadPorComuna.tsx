// src/components/CalidadPorComuna.tsx (VERSIÓN FINAL CORREGIDA)

import { useState, useMemo } from 'react';
import axios from 'axios';
import {
    Typography, Box, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails,
    Paper, TextField, Table, TableBody, TableCell, TableRow
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ReactECharts from 'echarts-for-react';

import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';



// --- Interfaces ---
interface StatsData {
  comuna: string;
  empresa: string;
  total_reincidencias: number;
  total_fallas_tempranas: number;
}
interface RankingComuna {
  comuna: string;
  problemas_totales: number;
}

// --- Función de Fetching ---
const fetchCalidadPorComuna = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    const params = { propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const { data } = await axios.get<StatsData[]>(`/api/calidad/por-comuna`, { params });
    return data.map(item => ({
        ...item,
        total_reincidencias: Number(item.total_reincidencias) || 0,
        total_fallas_tempranas: Number(item.total_fallas_tempranas) || 0,
    }));
};

// --- Componente Auxiliar ---
const QualityDataCard = ({ data, dataKey, nameKey, title }: { data: StatsData[], dataKey: 'total_reincidencias' | 'total_fallas_tempranas', nameKey: 'empresa', title: string }) => {
  const processedData = data
    .filter(item => Number(item[dataKey]) > 0)
    .map(d => ({
      value: Number(d[dataKey]),
      name: String(d[nameKey]),
    }))
    .sort((a, b) => b.value - a.value);

  // LA LÍNEA PROBLEMÁTICA 'const total = ...' HA SIDO ELIMINADA.

  if (processedData.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography>Sin incidencias de {title.toLowerCase()}.</Typography>
      </Paper>
    );
  }

  const chartOption = {
    title: { text: `Distribución de ${title}`, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: `{b} : {c} ({d}%)` }, // No necesita la variable 'total'
    legend: { type: 'scroll', orient: 'horizontal', bottom: 0, left: 'center' },
    series: [ { name: title, type: 'pie', radius: '50%', data: processedData, emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }, label: { show: false } } ]
  };

  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Typography variant="h6" align="center">{title}</Typography>
      <Table size="small">
        <TableBody>
          {processedData.slice(0, 5).map((row) => (
            <TableRow key={row.name}>
              <TableCell>{row.name}</TableCell>
              {/* Mostramos el valor directo, que es más informativo que el porcentaje del total */}
              <TableCell align="right">{row.value.toLocaleString('es-CL')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ mt: 2 }}>
        <ReactECharts option={chartOption} style={{ height: '300px' }} />
      </Box>
    </Paper>
  );
};

// --- Componente Principal ---
export default function CalidadPorComuna() {
    
    const [topN, setTopN] = useState(5);
    const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);
    const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();

    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['calidadPorComuna', { propietarioRed, startDate, endDate }],
        queryFn: () => fetchCalidadPorComuna(propietarioRed, startDate, endDate),
    });

    const rankingComunas = useMemo<RankingComuna[]>(() => {
        if (!data || data.length === 0) return [];
        const problemasPorComuna = new Map<string, number>();
        data.forEach(item => {
            const problemas = item.total_reincidencias + item.total_fallas_tempranas;
            problemasPorComuna.set(item.comuna, (problemasPorComuna.get(item.comuna) || 0) + problemas);
        });
        return Array.from(problemasPorComuna.entries())
            .map(([comuna, problemas_totales]) => ({ comuna, problemas_totales }))
            .sort((a, b) => b.problemas_totales - a.problemas_totales);
    }, [data]);

    if (isLoading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
    if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? error.message : 'No se pudo calcular el análisis de calidad.'}</Alert>;
    
    return (
        <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">Análisis de Calidad por Comuna</Typography>
                <TextField
                    label="Top N Comunas" type="number" value={topN}
                    onChange={(e) => setTopN(Math.max(1, parseInt(e.target.value, 10)) || 5)}
                    size="small" sx={{ width: '150px' }} InputProps={{ inputProps: { min: 1 } }}
                />
            </Box>

            {rankingComunas.length > 0 ? (
                rankingComunas.slice(0, topN).map((item) => {
                    const comunaData = data?.filter(d => d.comuna === item.comuna) || [];
                    const isExpanded = expandedAccordion === item.comuna;
                    return (
                        <Accordion
                            key={item.comuna}
                            expanded={isExpanded}
                            onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? item.comuna : false)}
                        >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight="bold">📍 {item.comuna}</Typography>
                                <Typography sx={{ ml: 2, color: 'text.secondary' }}>
                                    {item.problemas_totales.toLocaleString('es-CL')} Incidencias Totales
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        <QualityDataCard data={comunaData} dataKey="total_reincidencias" nameKey="empresa" title="Reincidencias" />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <QualityDataCard data={comunaData} dataKey="total_fallas_tempranas" nameKey="empresa" title="Fallas Tempranas" />
                                    </Box>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    );
                })
            ) : (
                <Alert severity="info" sx={{mt: 2}}>No se encontraron datos de calidad para los filtros seleccionados.</Alert>
            )}
        </Box>
    );
}
// // src/components/CalidadPorComuna.tsx

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import {
//     Typography, Box, CircularProgress, Alert, Accordion, AccordionSummary, AccordionDetails,
//     Paper, TextField, Table, TableBody, TableCell, TableRow
// } from '@mui/material';
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import ReactECharts from 'echarts-for-react';
// 
// interface StatsData {
//   comuna: string;
//   empresa: string;
//   total_reincidencias: number;
//   total_fallas_tempranas: number;
// }

// interface KpiProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// interface RankingComuna {
//   comuna: string;
//   problemas_totales: number;
// }

// const QualityDataCard = ({ data, dataKey, nameKey, title }: { data: StatsData[], dataKey: keyof StatsData, nameKey: keyof StatsData, title: string }) => {
//   const processedData = data
//     .filter(item => Number(item[dataKey]) > 0)
//     .map(d => ({
//       value: Number(d[dataKey]),
//       name: String(d[nameKey]),
//     }))
//     .sort((a, b) => b.value - a.value);

//   const total = processedData.reduce((acc, cur) => acc + cur.value, 0);

//   if (processedData.length === 0) {
//     return (
//       <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         <Typography>Sin incidencias de {title.toLowerCase()}.</Typography>
//       </Paper>
//     );
//   }

//   const chartOption = {
//   title: {
//     text: `Distribución de ${title}`,
//     left: 'center'
//   },
//   tooltip: {
//     trigger: 'item',
//     formatter: (params: any) => {
//       const percent = total > 0 ? ((params.value / total) * 100).toFixed(1) : '0.0';
//       return `${params.name}: ${percent}%`;
//     }
//   },
//   legend: {
//     type: 'scroll',
//     orient: 'horizontal',
//     bottom: 0,
//     left: 'center'
//   },
//   series: [
//     {
//       name: title,
//       type: 'pie',
//       radius: '50%',
//       data: processedData,
//       emphasis: {
//         itemStyle: {
//           shadowBlur: 10,
//           shadowOffsetX: 0,
//           shadowColor: 'rgba(0, 0, 0, 0.5)'
//         }
//       },
//       label: {
//         formatter: '{b}: {d}%',
//       }
//     }
//   ]
// };

//   return (
//     <Paper elevation={2} sx={{ p: 2 }}>
//       <Typography variant="h6" align="center">{title}</Typography>
//       <Table size="small">
//         <TableBody>
//           {processedData.map((row) => {
//             const porcentaje = total > 0 ? ((row.value / total) * 100).toFixed(1) : '0.0';
//             return (
//               <TableRow key={row.name}>
//                 <TableCell>{row.name}</TableCell>
//                 <TableCell align="right">{porcentaje} %</TableCell>
//               </TableRow>
//             );
//           })}
//         </TableBody>
//       </Table>

//       <Box sx={{ mt: 3 }}>
//         <ReactECharts option={chartOption} style={{ height: '300px' }} />
//       </Box>
//     </Paper>
//   );
// };

// export default function CalidadPorComuna({ propietario_red, fecha_inicio, fecha_fin }: KpiProps) {
//   const [data, setData] = useState<StatsData[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [topN, setTopN] = useState(5);
//   const [rankingComunas, setRankingComunas] = useState<RankingComuna[]>([]);
//   const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<StatsData[]>(`/api/calidad/por-comuna`, {
//         params: { propietario_red, fecha_inicio, fecha_fin }});
//         setData(response.data);
//       } catch (err) {
//         setError('No se pudo calcular el análisis de calidad.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if ((fecha_inicio && fecha_fin) || (!fecha_inicio && !fecha_fin)) {
//       const currentScrollY = window.scrollY;
//       fetchData().then(() => {
//         setTimeout(() => {
//           window.scrollTo(0, currentScrollY);
//         }, 100);
//       });
//     }
//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   useEffect(() => {
//     if (data.length === 0) {
//       setRankingComunas([]);
//       return;
//     }

//     const problemasPorComuna = new Map<string, number>();
//     data.forEach(item => {
//       const problemas = Number(item.total_reincidencias) + Number(item.total_fallas_tempranas);
//       problemasPorComuna.set(item.comuna, (problemasPorComuna.get(item.comuna) || 0) + problemas);
//     });

//     const sortedComunas = Array.from(problemasPorComuna.entries())
//       .map(([comuna, problemas_totales]) => ({ comuna, problemas_totales }))
//       .sort((a, b) => b.problemas_totales - a.problemas_totales);

//     setRankingComunas(sortedComunas);
//   }, [data]);

//   if (loading) return <CircularProgress sx={{ display: 'block', margin: '2rem auto' }} />;
//   if (error) return <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>;

//   return (
//     <Box sx={{ mt: 4, p: 3, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
//         <Typography variant="h4">Análisis de Calidad por Comuna</Typography>
//         <TextField
//           label="Top N Comunas"
//           type="number"
//           value={topN}
//           onChange={(e) => setTopN(Math.max(1, parseInt(e.target.value, 10)) || 5)}
//           size="small"
//           sx={{ width: '150px' }}
//           InputProps={{ inputProps: { min: 1 } }}
//         />
//       </Box>

//       {rankingComunas.slice(0, topN).map((item) => {
//         const comunaData = data.filter(d => d.comuna === item.comuna);
//         const isExpanded = expandedAccordion === item.comuna;

//         return (
//           <Accordion
//             key={item.comuna}
//             expanded={isExpanded}
//             onChange={(_, isExpanded) => setExpandedAccordion(isExpanded ? item.comuna : false)}
//           >
//             <AccordionSummary expandIcon={<ExpandMoreIcon />}>
//               <Typography fontWeight="bold">📍 {item.comuna}</Typography>
//               <Typography sx={{ ml: 2, color: 'text.secondary' }}>
//                 {item.problemas_totales.toLocaleString('es-CL')} Incidencias Totales
//               </Typography>
//             </AccordionSummary>
//             <AccordionDetails>
//               <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
//                 <Box sx={{ flex: 1 }}>
//                   <QualityDataCard data={comunaData} dataKey="total_reincidencias" nameKey="empresa" title="Reincidencias" />
//                 </Box>
//                 <Box sx={{ flex: 1 }}>
//                   <QualityDataCard data={comunaData} dataKey="total_fallas_tempranas" nameKey="empresa" title="Fallas Tempranas" />
//                 </Box>
//               </Box>
//             </AccordionDetails>
//           </Accordion>
//         );
//       })}
//     </Box>
//   );
// }
