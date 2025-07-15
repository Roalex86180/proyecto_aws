// src/components/ProduccionGeografica.tsx (VERSIÓN FINAL CORREGIDA)


import axios from 'axios';
import { Typography, Box, Alert, CircularProgress } from '@mui/material';
import ComunaDataTable from './ComunaDataTable';
import MapaDeTrabajos from './MapaDeTrabajos'; // El mapa ahora es autónomo

import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Interfaz para el tipado de los datos de las tablas
interface TrabajoPorComuna {
  comuna: string;
  total: string;
}

// La función de fetching que hace las dos llamadas en paralelo
const fetchProduccionGeografica = async (
    propietarioRed: string | null,
    fechaInicio: string,
    fechaFin: string
) => {
    console.log('API_URL en fetchProduccionGeografica:', API_URL);
    console.log('VITE_API_URL from env:', import.meta.env.VITE_API_URL);
    const apiParams = { propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    const reparacionesPromise = axios.get<TrabajoPorComuna[]>(`${API_URL}/api/produccion/reparaciones-por-comuna`, { params: apiParams });
    const instalacionesPromise = axios.get<TrabajoPorComuna[]>(`${API_URL}/api/produccion/instalaciones-por-comuna`, { params: apiParams });

    const [resReparaciones, resInstalaciones] = await Promise.all([
        reparacionesPromise,
        instalacionesPromise
    ]);

    return {
        reparaciones: resReparaciones.data,
        instalaciones: resInstalaciones.data,
    };
};

// --- Componente Principal ---
export default function ProduccionGeografica() {

  const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
  
  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['produccionGeografica', { propietarioRed, startDate, endDate }],
    queryFn: () => fetchProduccionGeografica(propietarioRed, startDate, endDate),
  });
  
  if (isLoading) return <Box sx={{ p: 3, mt: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (isError) return <Alert severity="error" sx={{ mt: 4 }}>{error instanceof Error ? `Error: ${error.message}` : 'No se pudieron cargar los datos.'}</Alert>;

  return (
    <Box sx={{ p: 3, mt: 4, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      <Typography variant="h4" gutterBottom>
        Producción Geográfica
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
        Mostrando datos para el período del {startDate} al {endDate}.
      </Typography>
      
      {/* Contenedor para las dos tablas */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 1 }}>
        <Box sx={{ flex: '1 1 50%' }}>
          <ComunaDataTable title="Reparaciones por Comuna" data={data?.reparaciones || []} loading={isLoading} />
        </Box>
        <Box sx={{ flex: '1 1 50%' }}>
          <ComunaDataTable title="Instalaciones por Comuna" data={data?.instalaciones || []} loading={isLoading} />
        </Box>
      </Box>

      {/* Contenedor para el mapa */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>Mapa de Trabajos</Typography>
        
        {/* LA CORRECCIÓN FINAL: Llamamos a MapaDeTrabajos sin props */}
        <MapaDeTrabajos />

      </Box>
    </Box>
  );
}

// // src/components/ProduccionGeografica.tsx

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Typography, Box, Alert } from '@mui/material';
// import ComunaDataTable from './ComunaDataTable';
// import MapaDeTrabajos from './MapaDeTrabajos';
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
// // Recibe los filtros desde HomePage
// interface PageProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function ProduccionGeografica({ propietario_red, fecha_inicio, fecha_fin }: PageProps) {
  
//   // El estado y la lógica de carga viven aquí
//   const [reparacionesData, setReparacionesData] = useState([]);
//   const [instalacionesData, setInstalacionesData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [displayDateRange, setDisplayDateRange] = useState({ start: '', end: '' });

//   // Este useEffect se encarga de buscar todos los datos para esta sección
//   useEffect(() => {
//     let startDate = fecha_inicio;
//     let endDate = fecha_fin;
//     if (!startDate || !endDate) {
//       const today = new Date();
//       const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
//       endDate = today.toISOString().split('T')[0];
//       startDate = thirtyDaysAgo.toISOString().split('T')[0];
//     }
//     setDisplayDateRange({ start: startDate, end: endDate });

//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       try {
//         const apiParams = { propietario_red, fecha_inicio: startDate, fecha_fin: endDate };
        
//         const [resReparaciones, resInstalaciones] = await Promise.all([
//         axios.get(`${API_URL}/api/produccion/reparaciones-por-comuna`, { params: apiParams }),
//         axios.get(`${API_URL}/api/produccion/instalaciones-por-comuna`, { params: apiParams })
//       ]);

//         setReparacionesData(resReparaciones.data);
//         setInstalacionesData(resInstalaciones.data);
//       } catch (err) {
//         setError("No se pudieron cargar los datos de producción geográfica.");
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     // Tu patrón de restauración de scroll
//     if ((fecha_inicio && fecha_fin) || (!fecha_inicio && !fecha_fin)) {
//         const currentScrollY = window.scrollY;
//         fetchData().then(() => {
//             setTimeout(() => {
//                 window.scrollTo(0, currentScrollY);
//             }, 100);
//         });
//     }

//   }, [propietario_red, fecha_inicio, fecha_fin]);

//   return (
//     <Box sx={{ p: 3, mt: 4, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
//       <Typography variant="h4" gutterBottom>
//         Producción Geográfica
//       </Typography>
//       <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
//         Mostrando datos para el período del {displayDateRange.start} al {displayDateRange.end}.
//       </Typography>
      
//       {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

//       {/* Contenedor para las dos tablas */}
//       <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, mt: 1 }}>
//         <Box sx={{ flex: '1 1 50%' }}>
//           <ComunaDataTable title="Reparaciones por Comuna" data={reparacionesData} loading={loading} />
//         </Box>
//         <Box sx={{ flex: '1 1 50%' }}>
//           <ComunaDataTable title="Instalaciones por Comuna" data={instalacionesData} loading={loading} />
//         </Box>
//       </Box>

//       {/* Contenedor para el mapa */}
//       <Box sx={{ mt: 4 }}>
//         <Typography variant="h5" gutterBottom>Mapa de Trabajos</Typography>
//         <MapaDeTrabajos 
//             reparacionesData={reparacionesData}
//             instalacionesData={instalacionesData}
//             loading={loading}
//         />
//       </Box>
//     </Box>
//   );
// }