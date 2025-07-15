import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import type { Theme, CSSObject } from '@mui/material';
import { AppBar, Toolbar, Typography, Box, Drawer as MuiDrawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon, IconButton, CssBaseline, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; // Importación necesaria

// Iconos
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BuildIcon from '@mui/icons-material/Build';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import FindInPageIcon from '@mui/icons-material/FindInPage';

// Páginas y Componentes
import HomePage from './pages/HomePage';
import ReincidenciasPage from './pages/ReincidenciasPage';
import FallasTempranasPage from './pages/FallasTempranasPage';
import ProduccionMantencionPage from './pages/ProduccionMantencionPage';
import ProduccionProvisionPage from './pages/ProduccionProvisionPage';
import CertificacionPage from './pages/CertificacionPage';
import RankingTecnicosEmpresasPage from './pages/RankingTecnicosEmpresasPage';
import TiemposPromediosPage from './pages/TiemposPromediosPage';
import BusquedaInformacionPage from './pages/BusquedaInformacionPage';
import DateRangeFilter from './components/DateRangeFilter';
import EmpresaSelector from './components/EmpresaSelector';

// Herramientas de estado global
import { useFilterStore } from './store/filterStore';

const queryClient = new QueryClient();
const drawerWidth = 280;

// Estilos del Drawer
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && { ...openedMixin(theme), '& .MuiDrawer-paper': openedMixin(theme) }),
    ...(!open && { ...closedMixin(theme), '& .MuiDrawer-paper': closedMixin(theme) }),
  }),
);

function App() {
  const [open, setOpen] = useState(true);
  const { propietarioRed, setPropietarioRed } = useFilterStore();
  const location = useLocation();
  const handleDrawerToggle = () => { setOpen(!open); };
   
  // Array de items del menú
  const menuItems = [
    { text: 'Vista General', path: '/', icon: <HomeIcon /> },
    { text: 'Reincidencias', path: '/reincidencias', icon: <ReplayIcon /> },
    { text: 'Fallas Tempranas', path: '/fallas-tempranas', icon: <ErrorOutlineIcon /> },
    { text: 'Producción Mantención', path: '/prod-mantencion', icon: <BuildIcon /> },
    { text: 'Producción Provisión', path: '/prod-provision', icon: <EngineeringIcon /> },
    { text: 'Certificación', path: '/certificacion', icon: <FactCheckIcon /> },
    { text: 'Ranking Técnicos', path: '/ranking', icon: <LeaderboardIcon /> },
    { text: 'Tiempos Promedios', path: '/tiempos', icon: <QueryStatsIcon /> },
    { text: 'Búsqueda de Información', path: '/busqueda', icon: <FindInPageIcon /> },
  ];

  // Definir las rutas donde el `EmpresaSelector` debe ser visible
  const showEmpresaSelectorRoutes = [
    '/prod-mantencion',
    '/prod-provision',
    '/reincidencias',
    '/fallas-tempranas',
    '/certificacion',
    '/ranking',
    '/tiempos'
  ];

  // Definir las rutas donde el `FormControl` de Propietario de Red debe ser visible
  const showPropietarioRedFormControlRoutes = [
    '/',
    '/prod-mantencion',
    '/prod-provision',
    '/reincidencias',
    '/fallas-tempranas',
    '/ranking',
    '/tiempos'
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: 'secondary.main' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton color="inherit" aria-label="open drawer" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div" sx={{ color: 'white' }}>
                Dashboard Operaciones
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Se usa includes() para evitar errores de tipado o indexación en las comparaciones de ruta */}
              {showEmpresaSelectorRoutes.includes(location.pathname) && (
                <EmpresaSelector />
              )}
              {showPropietarioRedFormControlRoutes.includes(location.pathname) && (
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel sx={{color: 'white'}}>Propietario de Red</InputLabel>
                  <Select 
                    value={propietarioRed || 'todos'} 
                    label="Propietario de Red" 
                    onChange={(e) => setPropietarioRed(e.target.value as string)}
                    sx={{color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' }, '& .MuiSvgIcon-root': { color: 'white' }}}
                  >
                    <MenuItem value="todos">Todos</MenuItem>
                    <MenuItem value="onnet">Onnet</MenuItem>
                    <MenuItem value="entel">Entel</MenuItem>
                  </Select>
                </FormControl>
              )}
              <DateRangeFilter />
            </Box>
          </Toolbar>
        </AppBar>
        
        {/* Contenido completo del Drawer restaurado */}
        <Drawer variant="permanent" open={open}>
          <DrawerHeader>
            <IconButton onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          </DrawerHeader>
          <Divider />
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton component={Link} to={item.path} sx={{ minHeight: 48, justifyContent: open ? 'initial' : 'center', px: 2.5, }}>
                  <ListItemIcon sx={{ minWidth: 0, mr: open ? 3 : 'auto', justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Box sx={{ 
              width: '100%', 
              maxWidth: '1600px',
              margin: '0 auto'
          }}> 
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/reincidencias" element={<ReincidenciasPage />} />
            <Route path="/fallas-tempranas" element={<FallasTempranasPage />} />
            <Route path="/prod-mantencion" element={<ProduccionMantencionPage />} />
            <Route path="/prod-provision" element={<ProduccionProvisionPage />} />
            <Route path="/certificacion" element={<CertificacionPage />} />
            <Route path="/ranking" element={<RankingTecnicosEmpresasPage />} />
            <Route path="/tiempos" element={<TiemposPromediosPage />} />
            <Route path="/busqueda" element={<BusquedaInformacionPage />} />
          </Routes>
          </Box>
        </Box>
      </Box>
      {/* MODIFICACIÓN AQUÍ: Renderiza ReactQueryDevtools solo en desarrollo */}
      {!import.meta.env.PROD && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;

// // frontend/src/App.tsx

// import { useState, useEffect } from 'react';
// import { Dayjs } from 'dayjs';
// import { Routes, Route, Link, useLocation } from 'react-router-dom';
// import { styled } from '@mui/material/styles';
// import type { Theme, CSSObject, SelectChangeEvent } from '@mui/material';
// import { AppBar, Toolbar, Typography, Box, Drawer as MuiDrawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon, IconButton, CssBaseline, Divider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

// // Iconos
// import MenuIcon from '@mui/icons-material/Menu';
// import HomeIcon from '@mui/icons-material/Home';
// import ReplayIcon from '@mui/icons-material/Replay';
// import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
// import EngineeringIcon from '@mui/icons-material/Engineering';
// import BuildIcon from '@mui/icons-material/Build';
// import FactCheckIcon from '@mui/icons-material/FactCheck';
// import LeaderboardIcon from '@mui/icons-material/Leaderboard';
// import QueryStatsIcon from '@mui/icons-material/QueryStats';
// import FindInPageIcon from '@mui/icons-material/FindInPage';

// import './App.css';

// // Páginas y Componentes
// import HomePage from './pages/HomePage';
// import ReincidenciasPage from './pages/ReincidenciasPage';
// import FallasTempranasPage from './pages/FallasTempranasPage';
// import ProduccionMantencionPage from './pages/ProduccionMantencionPage';
// import ProduccionProvisionPage from './pages/ProduccionProvisionPage';
// import CertificacionPage from './pages/CertificacionPage';
// import RankingTecnicosEmpresasPage from './pages/RankingTecnicosEmpresasPage';
// import TiemposPromediosPage from './pages/TiemposPromediosPage';
// import BusquedaInformacionPage from './pages/BusquedaInformacionPage';
// import DateRangeFilter from './components/DateRangeFilter';
// import EmpresaSelector from './components/EmpresaSelector';

// const drawerWidth = 280;

// // --- Estilos para la animación del Drawer ---
// const openedMixin = (theme: Theme): CSSObject => ({
//   width: drawerWidth,
//   transition: theme.transitions.create('width', {
//     easing: theme.transitions.easing.sharp,
//     duration: theme.transitions.duration.enteringScreen,
//   }),
//   overflowX: 'hidden',
// });

// const closedMixin = (theme: Theme): CSSObject => ({
//   transition: theme.transitions.create('width', {
//     easing: theme.transitions.easing.sharp,
//     duration: theme.transitions.duration.leavingScreen,
//   }),
//   overflowX: 'hidden',
//   width: `calc(${theme.spacing(7)} + 1px)`,
//   [theme.breakpoints.up('sm')]: {
//     width: `calc(${theme.spacing(8)} + 1px)`,
//   },
// });

// const DrawerHeader = styled('div')(({ theme }) => ({
//   display: 'flex',
//   alignItems: 'center',
//   justifyContent: 'flex-end',
//   padding: theme.spacing(0, 1),
//   ...theme.mixins.toolbar,
// }));

// const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(
//   ({ theme, open }) => ({
//     width: drawerWidth,
//     flexShrink: 0,
//     whiteSpace: 'nowrap',
//     boxSizing: 'border-box',
//     ...(open && { ...openedMixin(theme), '& .MuiDrawer-paper': openedMixin(theme) }),
//     ...(!open && { ...closedMixin(theme), '& .MuiDrawer-paper': closedMixin(theme) }),
//   }),
// );

// function App() {
//   // --- TODO EL ESTADO DE LOS FILTROS VIVE AQUÍ ---
//   const [open, setOpen] = useState(true);
//   const [fechaInicio, setFechaInicio] = useState<Dayjs | null>(null);
//   const [fechaFin, setFechaFin] = useState<Dayjs | null>(null);
//   const [filtroRed, setFiltroRed] = useState('todos');
//   const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);

//   // --- MANEJADORES DE ESTADO ---
//   const handleDrawerToggle = () => { setOpen(!open); };
//   const handleFiltroRedChange = (event: SelectChangeEvent) => { setFiltroRed(event.target.value as string); };
  
//   const location = useLocation();

//   // --- CAMBIO 2: AÑADIMOS EL useEffect PARA LIMPIAR LOS FILTROS ---
//   useEffect(() => {
//     // Esta función se ejecutará CADA VEZ que cambies de página (de ruta)
//     setFechaInicio(null);
//     setFechaFin(null);
//     setSelectedEmpresa(null);
//     setFiltroRed('todos');
//   }, [location.pathname]);

//   const menuItems = [
//     { text: 'Vista General', path: '/', icon: <HomeIcon /> },
//     { text: 'Reincidencias', path: '/reincidencias', icon: <ReplayIcon /> },
//     { text: 'Fallas Tempranas', path: '/fallas-tempranas', icon: <ErrorOutlineIcon /> },
//     { text: 'Producción Mantención', path: '/prod-mantencion', icon: <BuildIcon /> },
//     { text: 'Producción Provisión', path: '/prod-provision', icon: <EngineeringIcon /> },
//     { text: 'Certificación', path: '/certificacion', icon: <FactCheckIcon /> },
//     { text: 'Ranking Técnicos', path: '/ranking', icon: <LeaderboardIcon /> },
//     { text: 'Tiempos Promedios', path: '/tiempos', icon: <QueryStatsIcon /> },
//     { text: 'Búsqueda de Información', path: '/busqueda', icon: <FindInPageIcon /> },
//   ];

//   return (
//     <Box sx={{ display: 'flex' }}>
//       <CssBaseline />
//       <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: 'secondary.main' }}>
//         <Toolbar sx={{ justifyContent: 'space-between' }}>
//           <Box sx={{ display: 'flex', alignItems: 'center' }}>
//             <IconButton color="inherit" aria-label="open drawer" onClick={handleDrawerToggle} edge="start" sx={{ mr: 2 }}>
//               <MenuIcon />
//             </IconButton>
//             <Typography variant="h6" noWrap component="div" sx={{ color: 'white' }}>
//               Dashboard Operaciones
//             </Typography>
//           </Box>
          
//           <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
//             {/* Filtros para la página de Mantenimiento */}
//             {(location.pathname === '/prod-mantencion' || location.pathname === '/prod-provision'|| location.pathname === '/reincidencias'|| location.pathname === '/fallas-tempranas'
//             || location.pathname === '/certificacion'|| location.pathname ==="/ranking" || location.pathname ==='/tiempos') && (
//               <EmpresaSelector selectedEmpresa={selectedEmpresa} setSelectedEmpresa={setSelectedEmpresa} />
//             )}

//             {/* Filtros para la Vista General Y Mantenimiento (y otras que lo necesiten) */}
//             {(location.pathname === '/' || location.pathname === '/prod-mantencion' || location.pathname === '/prod-provision'|| location.pathname === '/reincidencias'
//             || location.pathname === '/fallas-tempranas'|| location.pathname ==="/ranking" || location.pathname ==='/tiempos') && (
//               <FormControl sx={{ minWidth: 200 }} size="small">
//                 <InputLabel sx={{color: 'white'}}>Propietario de Red</InputLabel>
//                 <Select value={filtroRed} label="Propietario de Red" onChange={handleFiltroRedChange} sx={{color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' }, '& .MuiSvgIcon-root': { color: 'white' }}}>
//                   <MenuItem value="todos">Todos</MenuItem>
//                   <MenuItem value="onnet">Onnet</MenuItem>
//                   <MenuItem value="entel">Entel</MenuItem>
//                 </Select>
//               </FormControl>
//             )}

//             {/* Los filtros de fecha siempre son visibles */}
//             <DateRangeFilter
//               fechaInicio={fechaInicio}
//               setFechaInicio={setFechaInicio}
//               fechaFin={fechaFin}
//               setFechaFin={setFechaFin}
//             />
//           </Box>
//         </Toolbar>
//       </AppBar>
      
//       <Drawer variant="permanent" open={open}>
//         <DrawerHeader>
//           <IconButton onClick={handleDrawerToggle}>
//             <MenuIcon />
//           </IconButton>
//         </DrawerHeader>
//         <Divider />
//         <List>
//           {menuItems.map((item) => (
//             <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
//               <ListItemButton component={Link} to={item.path} sx={{ minHeight: 48, justifyContent: open ? 'initial' : 'center', px: 2.5, }}>
//                 <ListItemIcon sx={{ minWidth: 0, mr: open ? 3 : 'auto', justifyContent: 'center' }}>
//                   {item.icon}
//                 </ListItemIcon>
//                 <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
//               </ListItemButton>
//             </ListItem>
//           ))}
//         </List>
//       </Drawer>

//       <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
//         <Toolbar />
//         <Routes>
//           <Route path="/" element={<HomePage propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/prod-mantencion" element={<ProduccionMantencionPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/prod-provision" element={<ProduccionProvisionPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/reincidencias" element={<ReincidenciasPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/fallas-tempranas" element={<FallasTempranasPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/certificacion" element={<CertificacionPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/ranking" element={<RankingTecnicosEmpresasPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//           <Route path="/tiempos" element={<TiemposPromediosPage empresa={selectedEmpresa} propietario_red={filtroRed} fecha_inicio={fechaInicio?.format('YYYY-MM-DD')} fecha_fin={fechaFin?.format('YYYY-MM-DD')} />} />
//            <Route path="/busqueda" element={<BusquedaInformacionPage />} />
//           {/* Rutas para las páginas de plantilla */}
          
//         </Routes>
//       </Box>
//     </Box>
//   );
// }

// export default App;