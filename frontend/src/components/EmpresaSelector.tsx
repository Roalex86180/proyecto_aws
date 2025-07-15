// frontend/src/components/EmpresaSelector.tsx (REFACTORIZADO)

import axios from 'axios';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';

// 1. IMPORTAMOS LAS HERRAMIENTAS DE ESTADO
import { useQuery } from '@tanstack/react-query';
import { useFilterStore } from '../store/filterStore';



// 2. SACAMOS LA LÓGICA DE FETCHING A UNA FUNCIÓN ASÍNCRONA INDEPENDIENTE
// Esto hace el código más limpio y reutilizable.
const fetchEmpresas = async (): Promise<string[]> => {
  const { data } = await axios.get(`/api/empresas`);
  return data;
};

// 3. EL COMPONENTE YA NO RECIBE PROPS
export default function EmpresaSelector() {
  
  // 4. CONECTAMOS CON NUESTROS HOOKS DE ESTADO
  // Obtenemos la empresa seleccionada y la función para cambiarla desde ZUSTAND.
  // Usamos un alias para mantener los nombres de variables existentes y minimizar cambios en el JSX.
  const { empresa: selectedEmpresa, setEmpresa: setSelectedEmpresa } = useFilterStore();

  // Obtenemos la lista de empresas y el estado de carga desde TANSTACK QUERY.
  // Esto reemplaza el useEffect y los dos useState (empresas, loading).
  const { data: empresas, isLoading: loading, isError } = useQuery({
    queryKey: ['listaDeEmpresas'], // Clave única para que TanStack Query cachee esta lista.
    queryFn: fetchEmpresas,       // La función que se ejecutará.
  });

  // Si hay un error al cargar las empresas, lo mostramos.
  if (isError) {
    return <TextField error label="Error al cargar empresas" size="small" sx={{ width: 300 }} disabled />;
  }

  return (
    <Autocomplete
      // 5. El resto del componente funciona casi igual, pero ahora está conectado
      // a un estado global y a un caché de datos inteligente.
      value={selectedEmpresa || null} // Leemos el valor del store
      onChange={(_event, newValue) => {
        setSelectedEmpresa(newValue); // Escribimos en el store
      }}
      options={empresas || []} // Usamos los datos de useQuery (con un fallback por si acaso)
      loading={loading} // Usamos el estado de carga de useQuery
      sx={{ width: 300 }}
      size="small"
      renderInput={(params) => (
        <TextField
          {...params}
          label="Empresa"
          sx={{
            '.MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
            '.MuiInputBase-input': { color: 'white' },
            '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
            '.MuiSvgIcon-root': { color: 'white' }
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}


