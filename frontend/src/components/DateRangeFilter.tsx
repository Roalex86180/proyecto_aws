import { Box, IconButton } from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CloseIcon from '@mui/icons-material/Close';

// Se conecta directamente a nuestro store global de filtros
import { useFilterStore } from '../store/filterStore';

// Este componente ya no recibe props
export default function DateRangeFilter() {
  
  // Obtenemos todo lo que necesitamos del store de Zustand
  const { fechaInicio, fechaFin, setFechas } = useFilterStore();

  const datePickerStyles = {
    '.MuiInputLabel-root': { color: 'white' },
    '.MuiInputBase-input': { color: 'white' },
    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
    '.MuiSvgIcon-root': { color: 'white' }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {/* Fecha Inicio con botón de limpiar */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <DatePicker
            label="Fecha Inicio"
            value={fechaInicio}
            onChange={(newValue) => setFechas({ fechaInicio: newValue, fechaFin })}
            slotProps={{
              textField: { 
                size: 'small', 
                sx: datePickerStyles 
              }
            }}
          />
          {fechaInicio && (
            <IconButton
              onClick={() => setFechas({ fechaInicio: null, fechaFin })}
              sx={{
                position: 'absolute',
                right: 35,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '4px',
                '&:hover': {
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Fecha Fin con botón de limpiar */}
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <DatePicker
            label="Fecha Fin"
            value={fechaFin}
            onChange={(newValue) => setFechas({ fechaInicio, fechaFin: newValue })}
            slotProps={{
              textField: { 
                size: 'small', 
                sx: datePickerStyles 
              }
            }}
          />
          {fechaFin && (
            <IconButton
              onClick={() => setFechas({ fechaInicio, fechaFin: null })}
              sx={{
                position: 'absolute',
                right: 35,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 1,
                color: 'rgba(255, 255, 255, 0.7)',
                padding: '4px',
                '&:hover': {
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              size="small"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

// // frontend/src/components/DateRangeFilter.tsx
// import { Box, IconButton } from '@mui/material';
// import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { Dayjs } from 'dayjs';
// import CloseIcon from '@mui/icons-material/Close';

// interface DateRangeFilterProps {
//   fechaInicio: Dayjs | null;
//   setFechaInicio: (date: Dayjs | null) => void;
//   fechaFin: Dayjs | null;
//   setFechaFin: (date: Dayjs | null) => void;
// }

// export default function DateRangeFilter({ 
//   fechaInicio, 
//   setFechaInicio, 
//   fechaFin, 
//   setFechaFin 
// }: DateRangeFilterProps) {
  
//   const datePickerStyles = {
//     '.MuiInputLabel-root': { color: 'white' },
//     '.MuiInputBase-input': { color: 'white' },
//     '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
//     '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
//     '.MuiSvgIcon-root': { color: 'white' }
//   };

//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//         {/* Fecha Inicio con botón de limpiar */}
//         <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//           <DatePicker
//             label="Fecha Inicio"
//             value={fechaInicio}
//             onChange={(newValue) => setFechaInicio(newValue)}
//             slotProps={{
//               textField: { 
//                 size: 'small', 
//                 sx: datePickerStyles 
//               }
//             }}
//           />
//           {fechaInicio && (
//             <IconButton
//               onClick={() => setFechaInicio(null)}
//               sx={{
//                 position: 'absolute',
//                 right: 35, // Posicionado antes del ícono del calendario
//                 top: '50%',
//                 transform: 'translateY(-50%)',
//                 zIndex: 1,
//                 color: 'rgba(255, 255, 255, 0.7)',
//                 padding: '4px',
//                 '&:hover': {
//                   color: 'white',
//                   backgroundColor: 'rgba(255, 255, 255, 0.1)'
//                 }
//               }}
//               size="small"
//             >
//               <CloseIcon fontSize="small" />
//             </IconButton>
//           )}
//         </Box>

//         {/* Fecha Fin con botón de limpiar */}
//         <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
//           <DatePicker
//             label="Fecha Fin"
//             value={fechaFin}
//             onChange={(newValue) => setFechaFin(newValue)}
//             slotProps={{
//               textField: { 
//                 size: 'small', 
//                 sx: datePickerStyles 
//               }
//             }}
//           />
//           {fechaFin && (
//             <IconButton
//               onClick={() => setFechaFin(null)}
//               sx={{
//                 position: 'absolute',
//                 right: 35, // Posicionado antes del ícono del calendario
//                 top: '50%',
//                 transform: 'translateY(-50%)',
//                 zIndex: 1,
//                 color: 'rgba(255, 255, 255, 0.7)',
//                 padding: '4px',
//                 '&:hover': {
//                   color: 'white',
//                   backgroundColor: 'rgba(255, 255, 255, 0.1)'
//                 }
//               }}
//               size="small"
//             >
//               <CloseIcon fontSize="small" />
//             </IconButton>
//           )}
//         </Box>
//       </Box>
//     </LocalizationProvider>
//   );
// }