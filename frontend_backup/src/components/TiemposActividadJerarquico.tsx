// src/components/TiemposActividadJerarquico.tsx (VERSIÓN FINAL, COMPLETA Y CORREGIDA)

import { useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from "d3";
import { Typography, Box, CircularProgress, Alert } from "@mui/material";

import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// --- Interfaces ---
interface HierarchyData {
  name: string;
  children?: HierarchyData[];
  value?: number;
}
type D3Node = d3.HierarchyNode<HierarchyData>;

// --- Función de Fetching ---
const fetchDatosJerarquicos = async (
    propietario_red: "entel" | "onnet",
    fecha_inicio: string,
    fecha_fin: string
) => {
    const params = { fecha_inicio, fecha_fin, propietario_red };
    const { data } = await axios.get<HierarchyData>(`${API_URL}/api/tiempos/datos-jerarquicos`, { params });
    return data.children?.length ? data : null;
};

// --- Componente Principal ---
export default function TiemposActividadJerarquico() {
  
  const d3ContainerEntel = useRef<SVGSVGElement>(null);
  const d3ContainerOnnet = useRef<SVGSVGElement>(null);

  const { fechaInicio, fechaFin } = useFilterStore();

  const today = new Date();
  const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
  const startDate = fechaInicio ? fechaInicio.format('YYYY-MM-DD') : thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = fechaFin ? fechaFin.format('YYYY-MM-DD') : today.toISOString().split('T')[0];

  const entelQuery = useQuery({
    queryKey: ['tiemposJerarquicos', { propietario_red: 'entel', startDate, endDate }],
    queryFn: () => fetchDatosJerarquicos('entel', startDate, endDate),
  });

  const onnetQuery = useQuery({
    queryKey: ['tiemposJerarquicos', { propietario_red: 'onnet', startDate, endDate }],
    queryFn: () => fetchDatosJerarquicos('onnet', startDate, endDate),
  });

  // --- Lógica de D3 (Restaurada y Completa) ---
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  };

  const renderChart = (svgElement: SVGSVGElement | null, hierarchyData: HierarchyData | null) => {
    if (!svgElement || !hierarchyData) {
        const svg = d3.select(svgElement);
        svg.selectAll("*").remove();
        return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    const width = 1152;
    const barStep = 27;
    const marginTop = 30;
    const marginBottom = 10;
    const marginLeft = 250;
    const duration = 750;

    const root: D3Node = d3.hierarchy(hierarchyData).sort((a, b) => (b.data.value ?? 0) - (a.data.value ?? 0));
    let currentView: D3Node = root;

    const x = d3.scaleLinear().range([marginLeft, width - 30]);

    const updateChart = (d: D3Node) => {
      currentView = d;
      const children = d.children ?? [];
      const newHeight = Math.max(children.length * barStep + marginTop + marginBottom, 150);

      svg.transition().duration(duration)
        .attr("height", newHeight)
        .attr("viewBox", `0 0 ${width} ${newHeight}`);

      x.domain([0, d3.max(children, (c) => c.data.value ?? 0) ?? 0]);

      updateBackButton(d);

      const bar = svg.selectAll<SVGGElement, D3Node>("g.bar")
        .data(children, (d) => d.data.name)
        .join(
          (enter) => {
            const g = enter.append("g").attr("class", "bar").attr("transform", `translate(0, ${marginTop})`);
            g.attr("cursor", (d) => (d.children ? "pointer" : null)).on("click", (_, d) => d.children && updateChart(d));

            g.append("text").attr("x", marginLeft - 10).attr("y", barStep / 2).attr("dy", ".35em")
              .attr("text-anchor", "end").style("font-size", (d) => d.depth === 1 ? "13px" : "11px")
              .style("font-weight", (d) => d.depth === 1 ? "bold" : "normal").text((d) => d.data.name);

            g.append("rect").attr("x", x(0)).attr("width", 0).attr("height", barStep - 1)
              .attr("fill", (d) => (d.children ? "steelblue" : "#aaa"));

            g.append("text").attr("class", "label").attr("x", 0).attr("y", barStep / 2).attr("dy", ".35em")
              .attr("fill", "#000").style("font-size", (d) => d.depth === 1 ? "13px" : "11px")
              .style("font-weight", (d) => d.depth === 1 ? "bold" : "normal").attr("text-anchor", "start")
              .text((d) => formatTime(d.data.value ?? 0));

            return g;
          },
          (update) => update,
          (exit) => exit.transition().duration(duration).remove().select("rect").attr("width", 0)
        );

      bar.transition().duration(duration)
        .attr("transform", (_, i) => `translate(0,${marginTop + barStep * i})`);
      
      bar.select("rect").transition().duration(duration).delay(200)
        .attr("width", (d) => x(d.data.value ?? 0) - x(0));
        
      bar.select("text.label").transition().duration(duration).delay(200)
        .attr("x", (d) => x(d.data.value ?? 0) + 5);
    };

    const backButton = svg.append("g").append("text").attr("x", marginLeft - 15).attr("y", 15)
      .attr("cursor", "pointer").attr("text-anchor", "end").style("fill", "steelblue").style("font-weight", "bold")
      .text("\u2190 Volver").on("click", () => {
        if (currentView.parent) {
          currentView = currentView.parent as D3Node;
          updateChart(currentView);
        }
      });

    const updateBackButton = (d: D3Node) => {
      backButton.style("display", d.parent ? "block" : "none");
    };

    svg.attr("width", width)
       .attr("height", (hierarchyData.children?.length ?? 1) * barStep + marginTop + marginBottom)
       .attr("viewBox", `0 0 ${width} ${(hierarchyData.children?.length ?? 1) * barStep + marginTop + marginBottom}`)
       .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");
    
    x.domain([0, d3.max(root.children ?? [], (c) => c.data.value ?? 0) ?? 0]);
    updateChart(root);
  };

  useEffect(() => {
    renderChart(d3ContainerEntel.current, entelQuery.data || null);
  }, [entelQuery.data]);

  useEffect(() => {
    renderChart(d3ContainerOnnet.current, onnetQuery.data || null);
  }, [onnetQuery.data]);

  const isLoading = entelQuery.isLoading || onnetQuery.isLoading;
  const error = entelQuery.error || onnetQuery.error;
  
  if (isLoading) return <CircularProgress sx={{ display: "block", margin: "2rem auto" }} />;
  if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error instanceof Error ? error.message : 'No se pudo calcular el análisis de tiempos.'}</Alert>;

  return (
    <Box sx={{ mt: 4, p: 3, border: "1px solid #e0e0e0", borderRadius: "8px" }}>
      <Typography variant="h4" gutterBottom>Tiempos Promedio por Actividad - Entel</Typography>
      {!isLoading && !error && !entelQuery.data && (
        <Typography sx={{ mt: 2, textAlign: "center" }}>No se encontraron datos para los filtros seleccionados para Entel.</Typography>
      )}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <svg ref={d3ContainerEntel}></svg>
      </Box>

      <Typography variant="h4" gutterBottom sx={{ mt: 6 }}>Tiempos Promedio por Actividad - Onnet</Typography>
      {!isLoading && !error && !onnetQuery.data && (
        <Typography sx={{ mt: 2, textAlign: "center" }}>No se encontraron datos para los filtros seleccionados para Onnet.</Typography>
      )}
      <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <svg ref={d3ContainerOnnet}></svg>
      </Box>
    </Box>
  );
}

// import { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import * as d3 from "d3";
// import { Typography, Box, CircularProgress, Alert } from "@mui/material";
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// interface HierarchyData {
//   name: string;
//   children?: HierarchyData[];
//   value?: number;
// }

// interface KpiProps {
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// type D3Node = d3.HierarchyNode<HierarchyData>;

// export default function TiemposActividadJerarquico({ fecha_inicio, fecha_fin }: KpiProps) {
//   const [hierarchyDataEntel, setHierarchyDataEntel] = useState<HierarchyData | null>(null);
//   const [hierarchyDataOnnet, setHierarchyDataOnnet] = useState<HierarchyData | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [error, setError] = useState<string | null>(null);
//   const d3ContainerEntel = useRef<SVGSVGElement>(null);
//   const d3ContainerOnnet = useRef<SVGSVGElement>(null);

//   // Función para formatear minutos en "Xh Ym"
//   const formatTime = (minutes: number) => {
//     const h = Math.floor(minutes / 60);
//     const m = Math.round(minutes % 60);
//     return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
//   };

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       setError(null);
//       setHierarchyDataEntel(null);
//       setHierarchyDataOnnet(null);

//       try {
//         // Entel
//         const responseEntel = await axios.get<HierarchyData>(`${API_URL}/api/tiempos/datos-jerarquicos`, {
//           params: { fecha_inicio, fecha_fin, propietario_red: "entel" },
//         });

//         // Onnet
//         const responseOnnet = await axios.get<HierarchyData>(`${API_URL}/api/tiempos/datos-jerarquicos`, {
//           params: { fecha_inicio, fecha_fin, propietario_red: "onnet" },
//         });

//         setHierarchyDataEntel(responseEntel.data.children?.length ? responseEntel.data : null);
//         setHierarchyDataOnnet(responseOnnet.data.children?.length ? responseOnnet.data : null);

//       } catch (err) {
//         console.error("Error al buscar datos jerárquicos:", err);
//         setError("No se pudo calcular el análisis de tiempos.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if ((fecha_inicio && fecha_fin) || (!fecha_inicio && !fecha_fin)) {
//       fetchData();
//     } else {
//       setLoading(false);
//     }
//   }, [fecha_inicio, fecha_fin]);

//   // Función para renderizar la gráfica en un contenedor SVG dado
//   const renderChart = (svgElement: SVGSVGElement | null, hierarchyData: HierarchyData | null) => {
//     if (!svgElement || !hierarchyData) {
//       return;
//     }

//     const svg = d3.select(svgElement);
//     svg.selectAll("*").remove();

//     const width = 1152;
//     const barStep = 27;
//     const marginTop = 30;
//     const marginBottom = 10;
//     const marginLeft = 250;
//     const duration = 750;

//     const root: D3Node = d3
//       .hierarchy(hierarchyData)
//       .sort((a, b) => (b.data.value ?? 0) - (a.data.value ?? 0));

//     let currentView: D3Node = root;

//     const x = d3.scaleLinear().range([marginLeft, width - 30]); // margen derecho fijo 30 px

//     // No se muestra el eje X (ocultamos la escala)
//     // Pero usamos la escala para el tamaño de las barras y las etiquetas

//     const updateChart = (d: D3Node) => {
//       currentView = d;
//       const children = d.children ?? [];
//       const newHeight = Math.max(children.length * barStep + marginTop + marginBottom, 150);

//       svg.transition().duration(duration)
//         .attr("height", newHeight)
//         .attr("viewBox", `0 0 ${width} ${newHeight}`);

//       x.domain([0, d3.max(children, (c) => c.data.value ?? 0) ?? 0]);

//       // No llamamos al eje X porque no queremos mostrarlo

//       updateBackButton(d);

//       const bar = svg.selectAll<SVGGElement, D3Node>("g.bar")
//         .data(children, (d) => d.data.name)
//         .join(
//           (enter) => {
//             const g = enter.append("g").attr("class", "bar").attr("transform", `translate(0, ${marginTop})`);
//             g.attr("cursor", (d) => (d.children ? "pointer" : null)).on("click", (_, d) => updateChart(d));

//             g.append("text")
//               .attr("x", marginLeft - 10)
//               .attr("y", barStep / 2)
//               .attr("dy", ".35em")
//               .attr("text-anchor", "end")
//               .style("font-size", (d) => d.depth === 1 ? "13px" : "11px")
//               .style("font-weight", (d) => d.depth === 1 ? "bold" : "normal")
//               .text((d) => d.data.name);

//             g.append("rect")
//               .attr("x", x(0))
//               .attr("width", 0)
//               .attr("height", barStep - 1)
//               .attr("fill", (d) => (d.children ? "steelblue" : "#aaa"));

//             // Etiqueta con tiempo (al final de la barra)
//             g.append("text")
//               .attr("class", "label")
//               .attr("x", 0) // se actualizará en transición
//               .attr("y", barStep / 2)
//               .attr("dy", ".35em")
//               .attr("fill", "#000")
//               .style("font-size", (d) => d.depth === 1 ? "13px" : "11px")
//               .style("font-weight", (d) => d.depth === 1 ? "bold" : "normal")
//               .attr("text-anchor", "start")
//               .text((d) => formatTime(d.data.value ?? 0));

//             return g;
//           },
//           (update) => update,
//           (exit) => exit.transition().duration(duration).remove().select("rect").attr("width", 0)
//         );

//       bar.transition().duration(duration)
//         .attr("transform", (_, i) => `translate(0,${marginTop + barStep * i})`);

//       bar.select("rect")
//         .transition()
//         .duration(duration)
//         .delay(200)
//         .attr("width", (d) => x(d.data.value ?? 0) - x(0));

//       bar.select("text.label")
//         .transition()
//         .duration(duration)
//         .delay(200)
//         .attr("x", (d) => x(d.data.value ?? 0) + 5);
//     };

//     const backButton = svg.append("g").append("text")
//       .attr("x", marginLeft - 15)
//       .attr("y", 15)
//       .attr("cursor", "pointer")
//       .attr("text-anchor", "end")
//       .style("fill", "steelblue")
//       .style("font-weight", "bold")
//       .text("\u2190 Volver")
//       .on("click", () => {
//         if (currentView.parent) {
//           currentView = currentView.parent as D3Node;
//           updateChart(currentView);
//         }
//       });

//     const updateBackButton = (d: D3Node) => {
//       backButton.style("display", d.parent ? "block" : "none");
//     };

//     svg
//       .attr("width", width)
//       .attr("height", (hierarchyData.children?.length ?? 1) * barStep + marginTop + marginBottom)
//       .attr("viewBox", `0 0 ${width} ${(hierarchyData.children?.length ?? 1) * barStep + marginTop + marginBottom}`)
//       .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");

//     x.domain([0, d3.max(root.children ?? [], (c) => c.data.value ?? 0) ?? 0]);
//     updateChart(root);
//   };

//   useEffect(() => {
//     renderChart(d3ContainerEntel.current, hierarchyDataEntel);
//   }, [hierarchyDataEntel]);

//   useEffect(() => {
//     renderChart(d3ContainerOnnet.current, hierarchyDataOnnet);
//   }, [hierarchyDataOnnet]);

//   return (
//     <Box sx={{ mt: 4, p: 3, border: "1px solid #e0e0e0", borderRadius: "8px" }}>
//       <Typography variant="h4" gutterBottom>Tiempos Promedio por Actividad - Entel</Typography>

//       {loading && <CircularProgress sx={{ display: "block", margin: "2rem auto" }} />}
//       {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

//       {!loading && !error && !hierarchyDataEntel && (
//         <Typography sx={{ mt: 2, textAlign: "center" }}>
//           No se encontraron datos para los filtros seleccionados para Entel.
//         </Typography>
//       )}

//       <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
//         <svg ref={d3ContainerEntel}></svg>
//       </Box>

//       <Typography variant="h4" gutterBottom sx={{ mt: 6 }}>Tiempos Promedio por Actividad - Onnet</Typography>

//       {!loading && !error && !hierarchyDataOnnet && (
//         <Typography sx={{ mt: 2, textAlign: "center" }}>
//           No se encontraron datos para los filtros seleccionados para Onnet.
//         </Typography>
//       )}

//       <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
//         <svg ref={d3ContainerOnnet}></svg>
//       </Box>
//     </Box>
//   );
// }
