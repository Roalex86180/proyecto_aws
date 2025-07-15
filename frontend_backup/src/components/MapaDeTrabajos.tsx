// src/components/MapaDeTrabajos.tsx (VERSIÓN FINAL, COMPLETA Y CORREGIDA)

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, CircularProgress } from '@mui/material';
import type { Layer } from 'leaflet';
import axios from 'axios';
import type { Feature, FeatureCollection } from 'geojson';
import L from 'leaflet';

import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';

// --- Interfaces ---
interface TrabajoPorComuna { comuna: string; total: string; }
interface DatosAgregados { reparaciones: number; instalaciones: number; }
interface ComunaConBarras extends DatosAgregados { nombre: string; posicion: [number, number]; }

// --- Funciones de Fetching ---
const fetchGeoJson = async (): Promise<FeatureCollection> => {
    const { data } = await axios.get('/comunas-rm.json'); // Pide un archivo estático local
    return data;
};

const fetchProduccionGeografica = async (propietarioRed: string | null, fechaInicio: string, fechaFin: string) => {
    const apiParams = { propietario_red: propietarioRed, fecha_inicio: fechaInicio, fecha_fin: fechaFin };
    
    // LA CORRECCIÓN CLAVE: Usamos rutas relativas para que el proxy de Vite funcione.
    const reparacionesPromise = axios.get<TrabajoPorComuna[]>(`/api/produccion/reparaciones-por-comuna`, { params: apiParams });
    const instalacionesPromise = axios.get<TrabajoPorComuna[]>(`/api/produccion/instalaciones-por-comuna`, { params: apiParams });
    
    const [resReparaciones, resInstalaciones] = await Promise.all([reparacionesPromise, instalacionesPromise]);
    
    return { reparaciones: resReparaciones.data, instalaciones: resInstalaciones.data };
};

// --- Funciones Auxiliares ---
const limpiarNombreComuna = (nombre: string): string => {
    if (!nombre) return '';
    return nombre.toLowerCase().replace(/\s+/g, '');
};

const calcularCentroide = (feature: Feature): [number, number] => {
    if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        let x = 0, y = 0;
        for (const coord of coords) { x += coord[0]; y += coord[1]; }
        return [y / coords.length, x / coords.length];
    } else if (feature.geometry.type === 'MultiPolygon') {
        const coords = feature.geometry.coordinates[0][0];
        let x = 0, y = 0;
        for (const coord of coords) { x += coord[0]; y += coord[1]; }
        return [y / coords.length, x / coords.length];
    }
    return [-33.45, -70.66];
};

// --- Componente Principal ---
export default function MapaDeTrabajos() {
    const { propietarioRed, fechaInicio, fechaFin } = useFilterStore();
    const today = new Date();
    const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
    const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

    const geoJsonQuery = useQuery({ queryKey: ['geoJsonComunasRM'], queryFn: fetchGeoJson, staleTime: Infinity });
    const trabajosQuery = useQuery({ queryKey: ['produccionGeografica', { propietarioRed, startDate, endDate }], queryFn: () => fetchProduccionGeografica(propietarioRed, startDate, endDate) });

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `.comuna-bars{pointer-events:none;font-family:Arial,sans-serif;font-size:10px;font-weight:bold}.bar-container{display:flex;flex-direction:column;align-items:center;gap:1px}.bar{border-radius:2px;min-width:2px;height:8px;box-shadow:0 1px 2px rgba(0,0,0,.3)}.bar-instalaciones{background-color:#2E7D32}.bar-reparaciones{background-color:#C62828}.bar-label{color:#333;text-shadow:1px 1px 1px hsla(0,0%,100%,.8);margin-top:2px;font-size:9px}`;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    const trabajosDataMap = useMemo(() => {
        const datosAgregados = new Map<string, DatosAgregados>();
        const instalacionesData = Array.isArray(trabajosQuery.data?.instalaciones) ? trabajosQuery.data.instalaciones : [];
        const reparacionesData = Array.isArray(trabajosQuery.data?.reparaciones) ? trabajosQuery.data.reparaciones : [];

        instalacionesData.forEach(item => {
            const comunaLimpia = limpiarNombreComuna(item.comuna);
            if (!datosAgregados.has(comunaLimpia)) datosAgregados.set(comunaLimpia, { instalaciones: 0, reparaciones: 0 });
            datosAgregados.get(comunaLimpia)!.instalaciones = parseInt(item.total, 10) || 0;
        });
        reparacionesData.forEach(item => {
            const comunaLimpia = limpiarNombreComuna(item.comuna);
            if (!datosAgregados.has(comunaLimpia)) datosAgregados.set(comunaLimpia, { instalaciones: 0, reparaciones: 0 });
            datosAgregados.get(comunaLimpia)!.reparaciones = parseInt(item.total, 10) || 0;
        });
        return datosAgregados;
    }, [trabajosQuery.data]);

    const comunasConBarras = useMemo<ComunaConBarras[]>(() => {
        if (!geoJsonQuery.data || trabajosDataMap.size === 0) return [];
        const comunasConBarrasTemp: ComunaConBarras[] = [];
        geoJsonQuery.data.features.forEach(feature => {
            if (feature.properties) {
                const comunaNombre = feature.properties.NOM_COM;
                const datos = trabajosDataMap.get(limpiarNombreComuna(comunaNombre));
                if (datos && (datos.instalaciones > 0 || datos.reparaciones > 0)) {
                    comunasConBarrasTemp.push({ nombre: comunaNombre, posicion: calcularCentroide(feature), ...datos });
                }
            }
        });
        return comunasConBarrasTemp;
    }, [geoJsonQuery.data, trabajosDataMap]);

    const getColor = (total: number) => {
        if (total > 8000) return '#08519c'; if (total > 5000) return '#3182bd';
        if (total > 2000) return '#6baed6'; if (total > 500)  return '#9ecae1';
        if (total > 0)    return '#c6dbef'; return '#E0E0E0';
    };

    const styleFeature = (feature?: Feature) => {
        if (!feature?.properties) return {};
        const datos = trabajosDataMap.get(limpiarNombreComuna(feature.properties.NOM_COM));
        const totalTrabajos = (datos?.instalaciones || 0) + (datos?.reparaciones || 0);
        return { fillColor: getColor(totalTrabajos), weight: 1, opacity: 1, color: 'white', fillOpacity: 0.6 };
    };
    
    const crearIconoBarras = (comuna: ComunaConBarras): L.DivIcon => {
        let maxInstalaciones = 0, maxReparaciones = 0;
        comunasConBarras.forEach(c => {
            maxInstalaciones = Math.max(maxInstalaciones, c.instalaciones);
            maxReparaciones = Math.max(maxReparaciones, c.reparaciones);
        });
        const calcularAnchoBarra = (valor: number, maxValor: number): number => {
            if (maxValor === 0) return 2; const minAncho = 2; const maxAncho = 40;
            return Math.max(minAncho, (valor / maxValor) * maxAncho);
        };
        const anchoInstalaciones = calcularAnchoBarra(comuna.instalaciones, maxInstalaciones);
        const anchoReparaciones = calcularAnchoBarra(comuna.reparaciones, maxReparaciones);
        const barrasHTML = `<div class="bar-container"><div class="bar bar-instalaciones" style="width: ${anchoInstalaciones}px;" title="Instalaciones: ${comuna.instalaciones.toLocaleString('es-CL')}"></div><div class="bar bar-reparaciones" style="width: ${anchoReparaciones}px;" title="Reparaciones: ${comuna.reparaciones.toLocaleString('es-CL')}"></div><div class="bar-label">${comuna.nombre}</div></div>`;
        return L.divIcon({ html: barrasHTML, className: 'comuna-bars', iconSize: [50, 30], iconAnchor: [25, 15] });
    };

    const onEachFeature = (feature: Feature, layer: Layer) => {
        if (!feature?.properties) return;
        const datos = trabajosDataMap.get(limpiarNombreComuna(feature.properties.NOM_COM));
        if (datos && (datos.instalaciones > 0 || datos.reparaciones > 0)) {
            const tooltipContent = `<b>${feature.properties.NOM_COM}</b><br>Instalaciones: ${datos.instalaciones.toLocaleString('es-CL')}<br>Reparaciones: ${datos.reparaciones.toLocaleString('es-CL')}<br>Total: ${(datos.instalaciones + datos.reparaciones).toLocaleString('es-CL')}`;
            layer.bindTooltip(tooltipContent, { direction: 'top', className: 'comuna-tooltip' });
        }
    };

    if (geoJsonQuery.isLoading || trabajosQuery.isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}><CircularProgress /></Box>;
    }
    
    const position: [number, number] = [-33.45, -70.66];

    return (
        <Box sx={{ height: '600px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', position: 'relative' }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'rgba(255,255,255,0.9)', padding: '10px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Leyenda</div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}><div style={{ width: '15px', height: '8px', backgroundColor: '#2E7D32', marginRight: '5px', borderRadius: '2px' }}></div><span style={{ fontSize: '11px' }}>Instalaciones</span></div>
                <div style={{ display: 'flex', alignItems: 'center' }}><div style={{ width: '15px', height: '8px', backgroundColor: '#C62828', marginRight: '5px', borderRadius: '2px' }}></div><span style={{ fontSize: '11px' }}>Reparaciones</span></div>
            </Box>
            <MapContainer center={position} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
                {geoJsonQuery.data && (
                    <GeoJSON data={geoJsonQuery.data} style={styleFeature} onEachFeature={onEachFeature} />
                )}
                {comunasConBarras.map((comuna, index) => (
                    <Marker key={`${comuna.nombre}-${index}`} position={comuna.posicion} icon={crearIconoBarras(comuna)} />
                ))}
            </MapContainer>
        </Box>
    );
}

// // src/components/MapaDeTrabajos.tsx (Nueva Versión: Mapa con Barras)

// import { useState, useEffect } from 'react';
// import { MapContainer, TileLayer, GeoJSON, Marker } from 'react-leaflet';
// import 'leaflet/dist/leaflet.css';
// import { Box, CircularProgress } from '@mui/material';
// import type { Layer } from 'leaflet';
// import axios from 'axios';
// import type { Feature, FeatureCollection } from 'geojson';
// import L from 'leaflet';

// // --- Interfaces ---
// interface TrabajoPorComuna {
//   comuna: string;
//   total: string;
// }
// interface DatosAgregados {
//   reparaciones: number;
//   instalaciones: number;
// }
// interface ComunaConBarras extends DatosAgregados {
//   nombre: string;
//   posicion: [number, number];
// }
// interface MapaProps {
//   reparacionesData: TrabajoPorComuna[];
//   instalacionesData: TrabajoPorComuna[];
//   loading: boolean;
// }

// export default function MapaDeTrabajos({ reparacionesData, instalacionesData, loading }: MapaProps) {
//   const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
//   const [trabajosData, setTrabajosData] = useState<Map<string, DatosAgregados>>(new Map());
//   const [comunasConBarras, setComunasConBarras] = useState<ComunaConBarras[]>([]);

//   useEffect(() => {
//     // Carga el archivo con las formas de las comunas
//     axios.get('/comunas-rm.json').then(res => {
//       setGeoJsonData(res.data);
//     });

//     // Añadir estilos CSS para las barras
//     const style = document.createElement('style');
//     style.textContent = `
//       .comuna-bars {
//         pointer-events: none;
//         font-family: Arial, sans-serif;
//         font-size: 10px;
//         font-weight: bold;
//       }
      
//       .bar-container {
//         display: flex;
//         flex-direction: column;
//         align-items: center;
//         gap: 1px;
//       }
      
//       .bar {
//         border-radius: 2px;
//         min-width: 2px;
//         height: 8px;
//         box-shadow: 0 1px 2px rgba(0,0,0,0.3);
//       }
      
//       .bar-instalaciones {
//         background-color: #2E7D32;
//       }
      
//       .bar-reparaciones {
//         background-color: #C62828;
//       }
      
//       .bar-label {
//         color: #333;
//         text-shadow: 1px 1px 1px rgba(255,255,255,0.8);
//         margin-top: 2px;
//         font-size: 9px;
//       }
//     `;
//     document.head.appendChild(style);

//     return () => {
//       document.head.removeChild(style);
//     };
//   }, []);

//   useEffect(() => {
//     // Procesa y combina los datos de trabajos cuando llegan como props
//     if (reparacionesData.length === 0 && instalacionesData.length === 0) return;

//     const datosAgregados = new Map<string, DatosAgregados>();
//     const limpiarNombreComuna = (nombre: string): string => {
//         if (!nombre) return '';
//         return nombre.toLowerCase().replace(/\s+/g, '');
//     };

//     instalacionesData.forEach(item => {
//         const comunaLimpia = limpiarNombreComuna(item.comuna);
//         if (!datosAgregados.has(comunaLimpia)) datosAgregados.set(comunaLimpia, { instalaciones: 0, reparaciones: 0 });
//         datosAgregados.get(comunaLimpia)!.instalaciones = parseInt(item.total, 10) || 0;
//     });

//     reparacionesData.forEach(item => {
//         const comunaLimpia = limpiarNombreComuna(item.comuna);
//         if (!datosAgregados.has(comunaLimpia)) datosAgregados.set(comunaLimpia, { instalaciones: 0, reparaciones: 0 });
//         datosAgregados.get(comunaLimpia)!.reparaciones = parseInt(item.total, 10) || 0;
//     });

//     setTrabajosData(datosAgregados);

//     // Generar lista de comunas con barras cuando tenemos tanto datos como geoJSON
//     if (geoJsonData && datosAgregados.size > 0) {
//       const comunasConBarrasTemp: ComunaConBarras[] = [];
      
//       geoJsonData.features.forEach(feature => {
//         if (feature.properties) {
//           const comunaNombre = feature.properties.NOM_COM;
//           const comunaLimpia = limpiarNombreComuna(comunaNombre);
//           const datos = datosAgregados.get(comunaLimpia);
          
//           if (datos && (datos.instalaciones > 0 || datos.reparaciones > 0)) {
//             const posicion = calcularCentroide(feature);
//             comunasConBarrasTemp.push({
//               nombre: comunaNombre,
//               posicion,
//               instalaciones: datos.instalaciones,
//               reparaciones: datos.reparaciones
//             });
//           }
//         }
//       });
      
//       setComunasConBarras(comunasConBarrasTemp);
//     }
//   }, [reparacionesData, instalacionesData, geoJsonData]);

//   // Función para obtener el color de la comuna según el total de trabajos
//   const getColor = (total: number) => {
//     if (total > 8000) return '#08519c';
//     if (total > 5000) return '#3182bd';
//     if (total > 2000) return '#6baed6';
//     if (total > 500)  return '#9ecae1';
//     if (total > 0)    return '#c6dbef';
//     return '#E0E0E0'; // Gris si no hay datos
//   };

//   // Función para dar estilo a cada comuna
//   const styleFeature = (feature?: Feature) => {
//     if (!feature?.properties) return {};
//     const comunaLimpia = limpiarNombreComuna(feature.properties.NOM_COM);
//     const datos = trabajosData.get(comunaLimpia);
//     const totalTrabajos = (datos?.instalaciones || 0) + (datos?.reparaciones || 0);

//     return {
//       fillColor: getColor(totalTrabajos),
//       weight: 1,
//       opacity: 1,
//       color: 'white',
//       fillOpacity: 0.6 // Reducimos un poco la opacidad para que las barras se vean mejor
//     };
//   };

//   // Función para calcular el ancho de la barra basado en el valor
//   const calcularAnchoBarra = (valor: number, maxValor: number): number => {
//     if (maxValor === 0) return 0;
//     const minAncho = 2;
//     const maxAncho = 40;
//     return Math.max(minAncho, (valor / maxValor) * maxAncho);
//   };

//   // Función para calcular el centroide de un polígono
//   const calcularCentroide = (feature: Feature): [number, number] => {
//     if (feature.geometry.type === 'Polygon') {
//       const coords = feature.geometry.coordinates[0];
//       let x = 0, y = 0;
//       for (const coord of coords) {
//         x += coord[0];
//         y += coord[1];
//       }
//       return [y / coords.length, x / coords.length];
//     } else if (feature.geometry.type === 'MultiPolygon') {
//       // Para MultiPolygon, tomar el primer polígono
//       const coords = feature.geometry.coordinates[0][0];
//       let x = 0, y = 0;
//       for (const coord of coords) {
//         x += coord[0];
//         y += coord[1];
//       }
//       return [y / coords.length, x / coords.length];
//     }
//     return [-33.45, -70.66]; // Fallback al centro de Santiago
//   };

//   // Función para crear el icono de barras
//   const crearIconoBarras = (comuna: ComunaConBarras): L.DivIcon => {
//     // Encontrar los valores máximos para normalizar las barras
//     let maxInstalaciones = 0;
//     let maxReparaciones = 0;
//     comunasConBarras.forEach(c => {
//         maxInstalaciones = Math.max(maxInstalaciones, c.instalaciones);
//         maxReparaciones = Math.max(maxReparaciones, c.reparaciones);
//     });

//     // Calcular anchos de las barras
//     const anchoInstalaciones = calcularAnchoBarra(comuna.instalaciones, maxInstalaciones);
//     const anchoReparaciones = calcularAnchoBarra(comuna.reparaciones, maxReparaciones);

//     // Crear el HTML para las barras
//     const barrasHTML = `
//         <div class="bar-container">
//             <div class="bar bar-instalaciones" style="width: ${anchoInstalaciones}px;" title="Instalaciones: ${comuna.instalaciones.toLocaleString('es-CL')}"></div>
//             <div class="bar bar-reparaciones" style="width: ${anchoReparaciones}px;" title="Reparaciones: ${comuna.reparaciones.toLocaleString('es-CL')}"></div>
//             <div class="bar-label">${comuna.nombre}</div>
//         </div>
//     `;

//     return L.divIcon({
//         html: barrasHTML,
//         className: 'comuna-bars',
//         iconSize: [50, 30],
//         iconAnchor: [25, 15]
//     });
//   };

//   // Función simplificada para el onEachFeature (solo tooltips)
//   const onEachFeature = (feature: Feature, layer: Layer) => {
//     if (!feature?.properties) return;
//     const comunaNombre = feature.properties.NOM_COM;
//     const comunaLimpia = limpiarNombreComuna(comunaNombre);
//     const datos = trabajosData.get(comunaLimpia);
    
//     if (datos && (datos.instalaciones > 0 || datos.reparaciones > 0)) {
//         const tooltipContent = `
//             <b>${comunaNombre}</b><br>
//             Instalaciones: ${datos.instalaciones.toLocaleString('es-CL')}<br>
//             Reparaciones: ${datos.reparaciones.toLocaleString('es-CL')}<br>
//             Total: ${(datos.instalaciones + datos.reparaciones).toLocaleString('es-CL')}
//         `;
        
//         layer.bindTooltip(tooltipContent, {
//             direction: 'top',
//             className: 'comuna-tooltip'
//         });
//     }
//   };

//   if (loading) {
//     return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}><CircularProgress /></Box>;
//   }
  
//   const position: [number, number] = [-33.45, -70.66];

//   return (
//     <Box sx={{ height: '600px', width: '100%', border: '1px solid #ccc', borderRadius: '4px', position: 'relative' }}>
//         {/* Leyenda */}
//         <Box sx={{ 
//             position: 'absolute', 
//             top: 10, 
//             right: 10, 
//             zIndex: 1000, 
//             background: 'rgba(255,255,255,0.9)', 
//             padding: '10px', 
//             borderRadius: '4px',
//             boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
//         }}>
//             <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Leyenda</div>
//             <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
//                 <div style={{ width: '15px', height: '8px', backgroundColor: '#2E7D32', marginRight: '5px', borderRadius: '2px' }}></div>
//                 <span style={{ fontSize: '11px' }}>Instalaciones</span>
//             </div>
//             <div style={{ display: 'flex', alignItems: 'center' }}>
//                 <div style={{ width: '15px', height: '8px', backgroundColor: '#C62828', marginRight: '5px', borderRadius: '2px' }}></div>
//                 <span style={{ fontSize: '11px' }}>Reparaciones</span>
//             </div>
//         </Box>

//         <MapContainer center={position} zoom={10} style={{ height: '100%', width: '100%' }}>
//             {/* Usamos un mapa base minimalista en escala de grises */}
//             <TileLayer
//                 url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
//                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
//             />
//             {geoJsonData && (
//                 <GeoJSON
//                     data={geoJsonData}
//                     style={styleFeature}
//                     onEachFeature={onEachFeature}
//                 />
//             )}
//             {/* Marcadores con barras */}
//             {comunasConBarras.map((comuna, index) => (
//                 <Marker
//                     key={`${comuna.nombre}-${index}`}
//                     position={comuna.posicion}
//                     icon={crearIconoBarras(comuna)}
//                 />
//             ))}
//         </MapContainer>
//     </Box>
//   );
// }

// const limpiarNombreComuna = (nombre: string): string => {
//     if (!nombre) return '';
//     return nombre.toLowerCase().replace(/\s+/g, '');
// };