


// frontend/src/components/HistoricoEmpresasChart.tsx (REFACTORIZADO)

import { useState, useMemo } from 'react';
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
  porcentaje_reincidencia: string;
}

// --- Constantes de Colores (sin cambios) ---
const COMPANY_COLORS: { [key: string]: string } = {
  'rielecom': '#8884d8', 'zener': '#82ca9d', 'bio': '#ffc658', 'sice': '#ff7300',
  'hometelcom': '#00C49F', 'prointel': '#0088FE', 'telsycab': '#FF8042', 'famer': '#FF00FF',
  'rex': '#A4DE6C', 'soportevision': '#d0ed57',
};
const FALLBACK_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#7C4DFF'];

// 2. LA FUNCIÓN DE FETCHING, INDEPENDIENTE
const fetchHistoricoReincidencias = async (propietarioRed: string | null) => {
    const params = { propietario_red: propietarioRed };
    const { data } = await axios.get<ApiData[]>(`/api/kpi/reincidencias-historico`, { params });
    return data;
};

// --- Componente Principal (REFACTORIZADO) ---
// 3. YA NO RECIBE PROPS
export default function HistoricoEmpresasChart() {
    
  // 4. MANTENEMOS EL ESTADO LOCAL DE LA UI
  const [highlightedCompany, setHighlightedCompany] = useState<string | null>(null);

  // 5. OBTENEMOS EL FILTRO NECESARIO DE ZUSTAND
  const { propietarioRed } = useFilterStore();

  // 6. OBTENEMOS LOS DATOS CRUDOS CON useQuery
  const { data: rawData, isLoading, isError, error } = useQuery({
    queryKey: ['historicoReincidencias', { propietarioRed }],
    queryFn: () => fetchHistoricoReincidencias(propietarioRed),
  });

  // 7. TRANSFORMAMOS (PIVOTAMOS) Y EXTRAEMOS EMPRESAS CON useMemo
  const pivotedData = useMemo(() => {
    if (!rawData) return [];
    const pivot = rawData.reduce((acc, { mes_visita, empresa, porcentaje_reincidencia }) => {
        let monthEntry = acc.find(item => item.mes_visita === mes_visita);
        if (!monthEntry) {
            monthEntry = { mes_visita };
            acc.push(monthEntry);
        }
        monthEntry[empresa] = parseFloat(porcentaje_reincidencia);
        return acc;
    }, [] as any[]);
    return pivot.sort((a, b) => a.mes_visita.localeCompare(b.mes_visita));
  }, [rawData]);

  const companies = useMemo(() => {
    const companySet = new Set<string>();
    pivotedData.forEach(month => {
      Object.keys(month).forEach(key => {
        if (key !== 'mes_visita') companySet.add(key);
      });
    });
    return Array.from(companySet);
  }, [pivotedData]);

  // Manejadores de eventos de la UI (sin cambios)
  const handleMouseEnter = (o: any) => setHighlightedCompany(o.dataKey);
  const handleMouseLeave = () => setHighlightedCompany(null);
  
  // 8. RENDERIZADO CONDICIONAL CON LOS VALORES DE useQuery
  if (isLoading) return <CircularProgress />;
  if (isError) return <Typography color="error">{error instanceof Error ? error.message : 'No se pudieron cargar los datos'}</Typography>;

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom>Evolución Tasa de Reincidencia por Empresa (Últimos 6 meses)</Typography>
        <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pivotedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes_visita" />
                    <YAxis tickFormatter={(tick) => `${tick}%`} />
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name.toUpperCase()]} />
                    <Legend onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
                    <ReferenceLine y={4} label="Meta 4%" stroke="#1E8449" strokeDasharray="4 4" />
                    {companies.map((company, index) => (
                        <Line
                            key={company}
                            type="monotone"
                            dataKey={company}
                            name={company.toUpperCase()}
                            stroke={COMPANY_COLORS[company] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
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
//   porcentaje_reincidencia: string;
// }

// // CAMBIO 1: Se añade una paleta de colores más amplia y profesional.
// const COMPANY_COLORS: { [key: string]: string } = {
//   'rielecom': '#8884d8',
//   'zener': '#82ca9d',
//   'bio': '#ffc658',
//   'sice': '#ff7300',
//   'hometelcom': '#00C49F',
//   'prointel': '#0088FE',
//   'telsycab': '#FF8042',
//   'famer': '#FF00FF',
//   'rex': '#A4DE6C',
//   'soportevision': '#d0ed57',
//   // Se pueden añadir más empresas con colores fijos aquí
// };
// const FALLBACK_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766', '#7C4DFF'];

// export default function HistoricoEmpresasChart({ propietario_red }: HistoricoProps) {
//   const [data, setData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // CAMBIO 2: Nuevo estado para controlar qué línea está resaltada
//   const [highlightedCompany, setHighlightedCompany] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const response = await axios.get<ApiData[]>(`/api/kpi/reincidencias-historico`, {
//           params: { propietario_red }
//         });

//         const pivotData = response.data.reduce((acc, { mes_visita, empresa, porcentaje_reincidencia }) => {
//           let monthEntry = acc.find(item => item.mes_visita === mes_visita);
//           if (!monthEntry) {
//             monthEntry = { mes_visita };
//             acc.push(monthEntry);
//           }
//           monthEntry[empresa] = parseFloat(porcentaje_reincidencia);
//           return acc;
//         }, [] as any[]);
        
//         pivotData.sort((a, b) => a.mes_visita.localeCompare(b.mes_visita));
//         setData(pivotData);

//       } catch (err) {
//         setError('No se pudieron cargar los datos históricos.');
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

//   // CAMBIO 3: Funciones para manejar los eventos del mouse en la leyenda
//   const handleMouseEnter = (o: any) => {
//     const { dataKey } = o;
//     setHighlightedCompany(dataKey);
//   };

//   const handleMouseLeave = () => {
//     setHighlightedCompany(null);
//   };


//   if (loading) return <CircularProgress />;
//   if (error) return <Typography color="error">{error}</Typography>;

//   return (
//     <Paper sx={{ p: 3, mt: 4 }}>
//         <Typography variant="h6" gutterBottom>Evolución Tasa de Reincidencia por Empresa (Últimos 6 meses)</Typography>
//         <Box sx={{ height: 400 }}>
//             <ResponsiveContainer width="100%" height="100%">
//                 <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="mes_visita" />
//                     <YAxis tickFormatter={(tick) => `${tick}%`} />
//                     <Tooltip formatter={(value: number, name: string) => [`${value}%`, name.toUpperCase()]} />
//                     {/* CAMBIO 4: Se pasan las nuevas funciones a la Leyenda */}
//                     <Legend onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
//                     <ReferenceLine y={4} label="Meta 4%" stroke="#1E8449" strokeDasharray="4 4" />
//                     {companies.map((company, index) => (
//                         <Line
//                             key={company}
//                             type="monotone"
//                             dataKey={company}
//                             name={company.toUpperCase()}
//                             stroke={COMPANY_COLORS[company] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
//                             strokeWidth={2}
//                             activeDot={{ r: 8 }}
//                             connectNulls
//                             // CAMBIO 5: Se aplica la opacidad dinámica a cada Línea
//                             strokeOpacity={highlightedCompany ? (highlightedCompany === company ? 1 : 0.2) : 1}
//                         />
//                     ))}
//                 </LineChart>
//             </ResponsiveContainer>
//         </Box>
//     </Paper>
//   );
// }