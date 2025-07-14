// frontend/src/pages/HomePage.tsx (SIMPLIFICADO)

import KpiMultiskillMetrics from '../components/KpiMultiskillMetrics';
import KpiMultiskillChart from '../components/KpiMultiskillChart';
import KpiMantencion from '../components/KpiMantencion';
import KpiProvision from '../components/KpiProvision';
import { Box, Divider } from '@mui/material';
import KpiReincidencias from '../components/KpiReincidencias';
import KpiDistribucionReincidencias from '../components/KpiDistribucionReincidencias';
import HistoricoEmpresasChart from '../components/HistoricoEmpresasChart';
import FallasTempranasResumen from '../components/FallasTempranasResumen';
import KpiDistribucionFallasTempranas from '../components/KpiDistribucionFallasTempranas';
import HistoricoFallasTempranasChart from '../components/HistoricoFallasTempranasChart';
import KpiCertificacionResumen from '../components/KpiCertificacionResumen';
import KpiCertificacionReincidencia from '../components/KpiCertificacionReincidencia';
import KpiRankingEmpresas from '../components/KpiRankingEmpresas';
import KpiRankingTecnicos from '../components/KpiRankingTecnicos';
import ProduccionGeografica from '../components/ProduccionGeografica';
import CalidadPorComuna from '../components/CalidadPorComuna';
import TiemposActividadJerarquico from '../components/TiemposActividadJerarquico';
import CausasFalla from '../components/CausasFalla';


// 1. ELIMINAMOS LA INTERFAZ DE PROPS. Ya no las necesita.
// interface HomePageProps { ... } // <= SE FUE

// 2. ELIMINAMOS LAS PROPS DE LA FIRMA DE LA FUNCIÓN.
export default function HomePage() {
  
  // ¡Este componente ahora es increíblemente simple!
  return (
    <Box>
      {/* 3. ¡ELIMINAMOS TODAS LAS PROPS PASADAS A LOS HIJOS! */}
      {/* Cada componente será responsable de obtener los filtros que necesite. */}
      
      <KpiMultiskillMetrics />
      <KpiMultiskillChart />
      <Divider sx={{ my: 4 }} />
      <KpiMantencion />
      <Divider sx={{ my: 4 }} />
      <KpiProvision />
      <Divider sx={{ my: 4 }} />
      <KpiReincidencias />
      <KpiDistribucionReincidencias />
      <HistoricoEmpresasChart />
      <FallasTempranasResumen />
      <KpiDistribucionFallasTempranas />
      <HistoricoFallasTempranasChart />
      <KpiCertificacionResumen />
      <KpiCertificacionReincidencia />
      <KpiRankingEmpresas />
      <KpiRankingTecnicos />
      <ProduccionGeografica />
      <CalidadPorComuna />
      <TiemposActividadJerarquico />
      <CausasFalla />
    </Box>
  );
}

// // frontend/src/pages/HomePage.tsx

// import KpiMultiskillMetrics from '../components/KpiMultiskillMetrics';
// import KpiMultiskillChart from '../components/KpiMultiskillChart';
// import KpiMantencion from '../components/KpiMantencion';
// import KpiProvision from '../components/KpiProvision';
// import { Box, Divider } from '@mui/material';
// import KpiReincidencias from '../components/KpiReincidencias';
// import KpiDistribucionReincidencias from '../components/KpiDistribucionReincidencias';
// import HistoricoEmpresasChart from '../components/HistoricoEmpresasChart';
// import FallasTempranasResumen from '../components/FallasTempranasResumen';
// import KpiDistribucionFallasTempranas from '../components/KpiDistribucionFallasTempranas';
// import HistoricoFallasTempranasChart from '../components/HistoricoFallasTempranasChart';
// import KpiCertificacionResumen from '../components/KpiCertificacionResumen';
// import KpiCertificacionReincidencia from '../components/KpiCertificacionReincidencia';
// import KpiRankingEmpresas from '../components/KpiRankingEmpresas';
// import KpiRankingTecnicos from '../components/KpiRankingTecnicos';
// import ProduccionGeografica from '../components/ProduccionGeografica';
// import CalidadPorComuna from '../components/CalidadPorComuna';
// import TiemposActividadJerarquico from '../components/TiemposActividadJerarquico';
// import CausasFalla from '../components/CausasFalla'; //


// // Volvemos a definir las props que recibe de App.tsx
// interface HomePageProps {
//   propietario_red: string;
//   fecha_inicio?: string;
//   fecha_fin?: string;
// }

// export default function HomePage({ propietario_red, fecha_inicio, fecha_fin }: HomePageProps) {
//   // ¡YA NO HAY ESTADO NI FILTROS AQUÍ!
//   return (
//     <Box>
//       {/* Pasamos las props a los componentes hijos */}
//       <KpiMultiskillMetrics
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//       <KpiMultiskillChart 
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//       <Divider sx={{ my: 4 }} />
//       <KpiMantencion
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//       <Divider sx={{ my: 4 }} />
//       <KpiProvision
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//       <Divider sx={{ my: 4 }} />

//       {/* 2. AÑADIMOS EL NUEVO KPI DE REINCIDENCIAS */}
//       <KpiReincidencias
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       {/* 2. AÑADIMOS EL NUEVO KPI DE TEXTO */}
//       <KpiDistribucionReincidencias
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//       {/* AÑADE ESTE NUEVO COMPONENTE AL FINAL */}
//       <HistoricoEmpresasChart propietario_red={propietario_red} />


//       {/* 2. AÑADE ESTE COMPONENTE DONDE QUIERAS QUE APAREZCA LA NUEVA TABLA */}
//       <FallasTempranasResumen
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       {/* AÑADE ESTE NUEVO COMPONENTE */}
//       <KpiDistribucionFallasTempranas
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />
//       {/* AÑADE EL NUEVO GRÁFICO DE FALLAS TEMPRANAS */}
//       <HistoricoFallasTempranasChart propietario_red={propietario_red} />
//       <KpiCertificacionResumen
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       <KpiCertificacionReincidencia
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       <KpiRankingEmpresas
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       <KpiRankingTecnicos
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       <ProduccionGeografica
//         propietario_red={propietario_red}
//         fecha_inicio={fecha_inicio}
//         fecha_fin={fecha_fin}
//       />

//       <CalidadPorComuna
//             propietario_red={propietario_red}
//             fecha_inicio={fecha_inicio}
//             fecha_fin={fecha_fin}
//         />

//       <TiemposActividadJerarquico
          
//           fecha_inicio={fecha_inicio}
//           fecha_fin={fecha_fin}
//       />

//       <CausasFalla
//             propietario_red={propietario_red}
//             fecha_inicio={fecha_inicio}
//             fecha_fin={fecha_fin}
//         />
//     </Box>
//   );
// }