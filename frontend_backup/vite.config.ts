// vite.config.ts (CORREGIDO Y COMPLETO)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // --- AÑADE ESTA SECCIÓN COMPLETA ---
  server: {
    proxy: {
      // Cualquier petición que tu frontend haga a una URL que empiece con /api...
      '/api': {
        // ...Vite la redirigirá a tu servidor de backend en el puerto 3001
        target: 'http://localhost:3001',
        // Esto es importante para que el backend acepte la petición correctamente
        changeOrigin: true,
      }
    }
  }
  // --- FIN DE LA SECCIÓN A AÑADIR ---
})

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
