// frontend/src/components/HistoricoFallasTempranasChart.tsx (REFACTORIZADO)

import { useState, useMemo } from 'react'; // useEffect ya no es necesario para fetching
import axios from 'axios';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

// 1. IMPORTAMOS LAS HERRAMIENTAS NUEVAS
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';



// --- Interfaces (sin cambios) ---
interface ApiData {
  mes_visita: string;
  empresa: string;
  porcentaje_falla: string;
}

// --- Constantes (sin cambios) ---
const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78'];

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchHistoricoFallas = async (propietarioRed: string | null) => {
    const params = { propietario_red: propietarioRed };
    const { data } = await axios.get<ApiData[]>(`/api/kpi/fallas-tempranas-historico`, { params });
    return data;
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function HistoricoFallasTempranasChart() {
  
  // 4. MANTENEMOS EL ESTADO LOCAL DE LA UI
  const [highlightedCompany, setHighlightedCompany] = useState<string | null>(null);

  // 5. OBTENEMOS EL FILTRO NECESARIO DE ZUSTAND
  const { propietarioRed } = useFilterStore();

  // 6. OBTENEMOS LOS DATOS CRUDOS CON useQuery
  const { data: rawData, isLoading, isError, error } = useQuery({
    // La queryKey solo depende del filtro que este componente usa
    queryKey: ['historicoFallasTempranas', { propietarioRed }],
    queryFn: () => fetchHistoricoFallas(propietarioRed),
  });

  // 7. TRANSFORMAMOS (PIVOTAMOS) LOS DATOS CON useMemo PARA EFICIENCIA
  const pivotedData = useMemo(() => {
    if (!rawData) return [];
    
    const pivot = rawData.reduce((acc, { mes_visita, empresa, porcentaje_falla }) => {
        let monthEntry = acc.find(item => item.mes_visita === mes_visita);
        if (!monthEntry) {
            monthEntry = { mes_visita };
            acc.push(monthEntry);
        }
        monthEntry[empresa] = parseFloat(porcentaje_falla);
        return acc;
    }, [] as any[]);

    return pivot.sort((a, b) => a.mes_visita.localeCompare(b.mes_visita));
  }, [rawData]); // Solo se re-ejecuta si los datos crudos cambian

  // El segundo useMemo ahora depende de los datos ya pivotados
  const companies = useMemo(() => {
    const companySet = new Set<string>();
    pivotedData.forEach(month => {
      Object.keys(month).forEach(key => {
        if (key !== 'mes_visita') {
          companySet.add(key);
        }
      });
    });
    return Array.from(companySet);
  }, [pivotedData]);


  // Los manejadores de eventos de la UI se mantienen igual
  const handleMouseEnter = (o: any) => { setHighlightedCompany(o.dataKey); };
  const handleMouseLeave = () => { setHighlightedCompany(null); };
  
  // 8. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress />;
  if (isError) return <Typography color="error">{error instanceof Error ? error.message : 'Error al cargar datos'}</Typography>;

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>Evolución Tasa de Falla Temprana por Empresa (Últimos 6 meses)</Typography>
        <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pivotedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes_visita" />
                    <YAxis tickFormatter={(tick) => `${tick}%`} />
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name.toUpperCase()]} />
                    <Legend onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
                    <ReferenceLine y={3} label="Meta 3%" stroke="#1E8449" strokeDasharray="4 4" />
                    {companies.map((company, index) => (
                        <Line
                            key={company}
                            type="monotone"
                            dataKey={company}
                            name={company.toUpperCase()}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={highlightedCompany === company ? 4 : 2}
                            activeDot={{ r: 8 }}
                            connectNulls
                            strokeOpacity={highlightedCompany ? (highlightedCompany === company ? 1 : 0.2) : 1}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </Box>
    </Paper>
  );
}

// import { useState, useEffect, useMemo } from 'react';
// import axios from 'axios';
// import { Box, Typography, CircularProgress, Paper } from '@mui/material';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
// 

// interface HistoricoProps {
//   propietario_red: string;
// }
// interface ApiData {
//   mes_visita: string;
//   empresa: string;
//   porcentaje_falla: string;
// }

// // CAMBIO 1: Paleta de colores de alto contraste y más distinguible
// const COLORS = [
//   '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', 
//   '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78'
// ];

// export default function HistoricoFallasTempranasChart({ propietario_red }: HistoricoProps) {
//   const [data, setData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [highlightedCompany, setHighlightedCompany] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         // CAMBIO 2: Llama al nuevo endpoint
//         const response = await axios.get<ApiData[]>(`/api/kpi/fallas-tempranas-historico`, {
//           params: { propietario_red }
//         });

//         // Pivoteamos los datos para Recharts
//         const pivotData = response.data.reduce((acc, { mes_visita, empresa, porcentaje_falla }) => {
//           let monthEntry = acc.find(item => item.mes_visita === mes_visita);
//           if (!monthEntry) {
//             monthEntry = { mes_visita };
//             acc.push(monthEntry);
//           }
//           monthEntry[empresa] = parseFloat(porcentaje_falla);
//           return acc;
//         }, [] as any[]);
        
//         pivotData.sort((a, b) => a.mes_visita.localeCompare(b.mes_visita));
//         setData(pivotData);
//       } catch (err) {
//         setError('No se pudieron cargar los datos históricos de fallas.');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [propietario_red]);

//   const companies = useMemo(() => {
//     const companySet = new Set<string>();
//     data.forEach(month => {
//       Object.keys(month).forEach(key => {
//         if (key !== 'mes_visita') {
//           companySet.add(key);
//         }
//       });
//     });
//     return Array.from(companySet);
//   }, [data]);

//   const handleMouseEnter = (o: any) => { setHighlightedCompany(o.dataKey); };
//   const handleMouseLeave = () => { setHighlightedCompany(null); };

//   if (loading) return <CircularProgress />;
//   if (error) return <Typography color="error">{error}</Typography>;

//   return (
//     <Paper sx={{ p: 3, mt: 4 }}>
//         <Typography variant="h6" gutterBottom>Evolución Tasa de Falla Temprana por Empresa (Últimos 6 meses)</Typography>
//         <Box sx={{ height: 400 }}>
//             <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="mes_visita" />
//                     <YAxis tickFormatter={(tick) => `${tick}%`} />
//                     <Tooltip formatter={(value: number, name: string) => [`${value}%`, name.toUpperCase()]} />
//                     <Legend onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
//                     {/* La meta para fallas tempranas, por ejemplo, es 3% */}
//                     <ReferenceLine y={3} label="Meta 3%" stroke="#1E8449" strokeDasharray="4 4" />
//                     {companies.map((company, index) => (
//                         <Line
//                             key={company}
//                             type="monotone"
//                             dataKey={company}
//                             name={company.toUpperCase()}
//                             stroke={COLORS[index % COLORS.length]}
//                             strokeWidth={highlightedCompany === company ? 3 : 2}
//                             activeDot={{ r: 8 }}
//                             connectNulls
//                             strokeOpacity={highlightedCompany ? (highlightedCompany === company ? 1 : 0.2) : 1}
//                         />
//                     ))}
//                 </LineChart>
//             </ResponsiveContainer>
//         </Box>
//     </Paper>
//   );
// }