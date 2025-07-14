// src/components/BarraMapaIcono.tsx (Versión Robusta con Barras y Etiquetas)


import { Box, Typography } from '@mui/material';

interface BarraMapaIconoProps {
  instalaciones: number;
  reparaciones: number;
}

// Constante para la altura máxima. Puedes ajustar este valor si quieres que las barras sean más altas o más bajas en general.
const MAX_ALTURA_BARRA = 50; // en píxeles

export default function BarraMapaIcono({ instalaciones, reparaciones }: BarraMapaIconoProps) {
  // Encontramos el valor más alto para escalar las barras proporcionalmente.
  // Usamos Math.max(..., 1) para evitar dividir por cero si ambos valores son 0.
  const maxValor = Math.max(instalaciones, reparaciones, 1);

  const alturaInst = (instalaciones / maxValor) * MAX_ALTURA_BARRA;
  const alturaRep = (reparaciones / maxValor) * MAX_ALTURA_BARRA;

  // Estilo para el contenedor de cada grupo (etiqueta + barra)
  const estiloContenedorBarra = {
    display: 'flex',
    flexDirection: 'column', // Apila la etiqueta encima de la barra
    alignItems: 'center',
    width: '45px', // Ancho para cada grupo para que no se peguen los textos
    textAlign: 'center',
  };

  // Estilo para el texto de la etiqueta
  const estiloEtiqueta = {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#1A237E', // Un color oscuro para buen contraste
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: '0 3px',
    borderRadius: '2px',
    marginBottom: '2px', // Pequeño espacio entre la etiqueta y la barra
  };
  
  // Estilo para la barra visual
  const estiloBarra = {
    width: '18px',
    borderRadius: '2px 2px 0 0', // Bordes superiores redondeados
    boxShadow: '1px 1px 2px rgba(0,0,0,0.4)', // Sombra para darle profundidad
    border: '1px solid rgba(0,0,0,0.2)',
  }

  return (
    // Contenedor principal que pone los dos grupos de barras uno al lado del otro
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px' }}>

      {/* Grupo de Instalaciones */}
      <Box sx={estiloContenedorBarra}>
        <Typography sx={estiloEtiqueta}>{instalaciones.toLocaleString('es-CL')}</Typography>
        <Box sx={{...estiloBarra, height: `${alturaInst}px`, backgroundColor: '#5cb85c' /* Verde */ }} />
      </Box>

      {/* Grupo de Reparaciones */}
      <Box sx={estiloContenedorBarra}>
        <Typography sx={estiloEtiqueta}>{reparaciones.toLocaleString('es-CL')}</Typography>
        <Box sx={{...estiloBarra, height: `${alturaRep}px`, backgroundColor: '#d9534f' /* Rojo */ }} />
      </Box>

    </Box>
  );
}