// src/stores/filterStore.ts (CORREGIDO)
import { create } from 'zustand';
import { Dayjs } from 'dayjs'; // <-- 1. IMPORTA EL TIPO `Dayjs`

// Definimos la forma de nuestros filtros y las acciones para cambiarlos
interface FilterState {
  empresa: string | null;
  propietarioRed: string | null;
  fechaInicio: Dayjs | null; // <-- 2. CAMBIA `Date` POR `Dayjs`
  fechaFin: Dayjs | null;    // <-- 3. CAMBIA `Date` POR `Dayjs`
  setEmpresa: (empresa: string | null) => void;
  setPropietarioRed: (propietario: string | null) => void;
  // 4. ACTUALIZA LA FIRMA DE LA FUNCIÓN TAMBIÉN
  setFechas: (fechas: { fechaInicio: Dayjs | null; fechaFin: Dayjs | null }) => void;
  resetFilters: () => void;
}

// Los valores iniciales siguen siendo null, así que no hay problema
const initialState = {
  empresa: null,
  propietarioRed: null,
  fechaInicio: null,
  fechaFin: null,
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  setEmpresa: (empresa) => set({ empresa }),
  setPropietarioRed: (propietario) => set({ propietarioRed: propietario }),
  setFechas: ({ fechaInicio, fechaFin }) => set({ fechaInicio, fechaFin }),
  resetFilters: () => set(initialState),
}));