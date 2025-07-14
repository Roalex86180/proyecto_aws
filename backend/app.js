// =================================================================
// 1. IMPORTACIONES Y CARGA DE ENTORNO
// =================================================================
const express = require('express');
require('dotenv').config();
const cors = require('cors'); // <--- Asegúrate que esta línea esté activa
const db = require('./db');

// =================================================================
// 2. INICIALIZACIÓN DE APP
// =================================================================
const app = express();

// =================================================================
// 3. MIDDLEWARES (Configuración que se aplica a TODAS las peticiones)
// =================================================================

// MODIFICACIÓN CLAVE: Simplificamos CORS para que acepte todas las solicitudes.
// Elastic Beanstalk o el Load Balancer pueden manejar las restricciones de origen si es necesario.
app.use(cors());
app.options('*', cors()); // Para manejar peticiones OPTIONS pre-vuelo

app.use(express.json());




// === CONSTANTES DE LÓGICA (de tu archivo analisis.py) ===
const KPI_MULTISKILL = {
  tipos_actividad: ['instalación-hogar-fibra', 'instalación-masivo-fibra', 'incidencia manual', 'postventa-hogar-fibra', 'reparación 3play light', 'postventa-masivo-equipo', 'postventa-masivo-fibra', 'reparación empresa masivo fibra', 'reparación-hogar-fibra'],
  estados_asignados: ['finalizada', 'no realizado'],
  estados_finalizados: ['finalizada'],
  recursos_excluidos_id: ['3826', '3824', '3825', '5286', '3823', '3822'], // Importante: como texto
  recursos_excluidos_nombre: ['bio', 'sice', 'rex', 'rielecom', 'famer', 'hometelcom', 'zener', 'prointel', 'soportevision', 'telsycab']
};


const KPI_MANTENIMIENTO = {
  tipos_actividad: ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light'],
  estados_asignados: ['finalizada', 'no realizado']
};


const KPI_PROVISION = {
  tipos_actividad: ['instalación-hogar-fibra', 'instalación-masivo-fibra', 'postventa-hogar-fibra','postventa-masivo-equipo', 'postventa-masivo-fibra'],
  estados_asignados: ['finalizada', 'no realizado']
};

// AÑADE ESTO DEBAJO DE 'KPI_PROVISION'
const KPI_REINCIDENCIAS = {
  tipos_validos: ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light'],
  // Preparamos los patrones para la búsqueda con ILIKE
  noms_excl_patterns: KPI_MULTISKILL.recursos_excluidos_nombre.map(nom => `%${nom}%`)
};

// En backend/server.js, junto a tus otras constantes KPI_...

// AÑADE ESTO
const KPI_FALLAS_TEMPRANAS = {
    tipos_instalacion: ['instalación-hogar-fibra', 'instalación-masivo-fibra'],
    tipos_reparacion: ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light']
};

// En backend/server.js

// AÑADE ESTO DEBAJO DE 'KPI_REINCIDENCIAS'
const KPI_MANTENIMIENTO_PROD = {
    tipos_mantenimiento: ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light'],
    estados_asignados: ['finalizada', 'no realizado']
};

const KPI_CERTIFICACION = {
    tipos_actividad: ['reparación 3play light', 'reparación-hogar-fibra'],
    mensaje_pattern: 'certificación entregada a schaman%' // El patrón para LIKE
};

const KPI_CERTIFICACION_SEC = {
    tipos_actividad: ['reparación 3play light', 'reparación-hogar-fibra'],
    mensaje_pattern: 'certificación entregada a schaman%'
};
// 2. ENDPOINTS DE LA API

// En tu server.js, reemplaza el app.get('/test-cors',...) existente por este:
app.get('/', (req, res) => {
  res.send('OK');
});

app.get('/test-cors', (req, res) => {
  console.log("--- INICIANDO PRUEBA DE DEBUGGING DE VARIABLES DE ENTORNO ---");
  console.log("Ruta de prueba /test-cors fue alcanzada.");

  // Imprimimos la variable de entorno para ver qué contiene realmente en Render
  console.log("Valor de process.env.DATABASE_URL:", process.env.DATABASE_URL);

  // Comprobamos si la variable está definida y respondemos en consecuencia
  if (process.env.DATABASE_URL) {
    res.json({
      message: '¡La ruta de prueba funciona!',
      database_url_is_set: true,
      // Opcional: enviamos un trozo de la URL para confirmar
      database_url_value_preview: process.env.DATABASE_URL.substring(0, 40) + "..."
    });
  } else {
    // Si la variable no existe, enviamos un error claro
    res.status(500).json({
      message: '¡ERROR DE CONFIGURACIÓN DEL SERVIDOR!',
      database_url_is_set: false,
      error: 'La variable de entorno DATABASE_URL está indefinida (undefined) en el servidor.'
    });
  }
  console.log("--- FIN DE PRUEBA DE DEBUGGING ---");
});


app.get('/api/kpi/multiskill', async (req, res) => {
  // Obtenemos los filtros desde la URL
  const { fecha_inicio, fecha_fin, propietario_red } = req.query;

  // Empezamos con los parámetros que no cambian
  const params = [
    KPI_MULTISKILL.tipos_actividad,
    KPI_MULTISKILL.recursos_excluidos_id,
    KPI_MULTISKILL.recursos_excluidos_nombre,
    KPI_MULTISKILL.estados_asignados,
    KPI_MULTISKILL.estados_finalizados
  ];
  
  // Construimos la consulta SQL base
  let whereClauses = [
    'lower("Tipo de actividad") = ANY($1)',
    'a."ID de recurso"::text <> ALL($2)',
    'lower(a."Recurso") <> ALL($3)'
  ];

  // Añadimos los filtros dinámicos
  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`a."Propietario de Red" = $${params.length}`);
  }

  const query = `
    WITH base_filtrada AS (
      SELECT 
        "Empresa",
        lower("Estado de actividad") as estado
      FROM public.actividades a
      WHERE ${whereClauses.join(' AND ')}
    )
    SELECT
      "Empresa",
      COUNT(*) FILTER (WHERE estado = ANY($4)) AS total_asignadas,
      COUNT(*) FILTER (WHERE estado = ANY($5)) AS total_finalizadas,
      (COUNT(*) FILTER (WHERE estado = ANY($5)) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE estado = ANY($4)), 0)) AS pct_efectividad
    FROM base_filtrada
    GROUP BY "Empresa" -- <-- CAMBIO CLAVE: Agrupamos solo por Empresa
    ORDER BY "pct_efectividad" DESC NULLS LAST;
  `;

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error al calcular KPI Multiskill:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ENDPOINT CORREGIDO CON FILTRO PROPIETARIO_RED
app.get('/api/kpi/mantencion', async (req, res) => {
  const { fecha_inicio, fecha_fin, propietario_red } = req.query;
  
  // Creamos el array de parámetros, reutilizando las constantes que ya existen
  const params = [
    KPI_MANTENIMIENTO.tipos_actividad,
    KPI_MANTENIMIENTO.estados_asignados,
    KPI_MULTISKILL.recursos_excluidos_id,      // <-- Reutilizando
    KPI_MULTISKILL.recursos_excluidos_nombre,   // <-- Reutilizando
  ];
  
  // Construimos las cláusulas WHERE dinámicamente
  let whereClauses = [
    'lower("Tipo de actividad") = ANY($1)',
    'lower("Estado de actividad") = ANY($2)',
    'a."ID de recurso"::text <> ALL($3)',
    'lower(a."Recurso") <> ALL($4)'
  ];

  // Añadimos los filtros dinámicos
  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`a."Propietario de Red" = $${params.length}`);
  }

  // La consulta SQL traducida y optimizada
  const query = `
    WITH base_filtrada AS (
      SELECT 
        "Empresa",
        lower("Estado de actividad") as estado,
        REPLACE(lower("Empresa"), 'data_diaria_', '') as empresa_limpia
      FROM public.actividades a
      WHERE ${whereClauses.join(' AND ')}
    )
    SELECT
      empresa_limpia as empresa,
      COUNT(*) as total_asignadas,
      COUNT(*) FILTER (WHERE estado = 'finalizada') AS total_finalizadas,
      (COUNT(*) FILTER (WHERE estado = 'finalizada') * 100.0 / NULLIF(COUNT(*), 0)) AS pct_efectividad
    FROM base_filtrada
    GROUP BY empresa_limpia
    ORDER BY pct_efectividad DESC NULLS LAST;
  `;

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error al calcular KPI Mantenimiento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// AÑADE ESTE ENDPOINT COMPLETO
app.get('/api/kpi/provision', async (req, res) => {
  const { fecha_inicio, fecha_fin, propietario_red } = req.query;
  
  // Usamos las constantes de PROVISION y las reutilizables de MULTISKILL
  const params = [
    KPI_PROVISION.tipos_actividad,
    KPI_PROVISION.estados_asignados,
    KPI_MULTISKILL.recursos_excluidos_id,
    KPI_MULTISKILL.recursos_excluidos_nombre
  ];
  
  let whereClauses = [
    'lower("Tipo de actividad") = ANY($1)',
    'lower("Estado de actividad") = ANY($2)',
    'a."ID de recurso"::text <> ALL($3)',
    'lower(a."Recurso") <> ALL($4)'
  ];

  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  
  // El filtro de propietario de red no estaba en tu función original de Python, pero lo mantenemos por consistencia
  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`a."Propietario de Red" = $${params.length}`);
  }

  const query = `
    WITH base_filtrada AS (
      SELECT 
        "Empresa",
        lower("Estado de actividad") as estado,
        REPLACE(lower("Empresa"), 'data_diaria_', '') as empresa_limpia
      FROM public.actividades a
      WHERE ${whereClauses.join(' AND ')}
    )
    SELECT
      empresa_limpia as empresa,
      COUNT(*) as total_asignadas,
      COUNT(*) FILTER (WHERE estado = 'finalizada') AS total_finalizadas,
      (COUNT(*) FILTER (WHERE estado = 'finalizada') * 100.0 / NULLIF(COUNT(*), 0)) AS pct_efectividad
    FROM base_filtrada
    GROUP BY empresa_limpia
    ORDER BY pct_efectividad DESC NULLS LAST;
  `;

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error al calcular KPI Provisión:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

//#################seccion de Produccion Mantencion########################

// AÑADE ESTOS DOS ENDPOINTS A TU server.js

// Endpoint para obtener una lista única de empresas para el filtro
app.get('/api/empresas', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT DISTINCT "Empresa" FROM public.actividades WHERE "Empresa" IS NOT NULL ORDER BY "Empresa"');
    // Extraemos solo los nombres en un array simple
    res.json(rows.map(row => row.Empresa));
  } catch (err) {
    console.error('Error al obtener lista de empresas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// Endpoint para el KPI de Mantenimiento por Técnico para UNA empresa
app.get('/api/mantencion/por-tecnico', async (req, res) => {
  // Ahora también recibimos 'empresa' como un filtro obligatorio
  const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;



  // Si no se provee una empresa, no podemos continuar.
  if (!empresa) {
    return res.status(400).json({ error: 'Se requiere especificar una empresa.' });
  }

  const params = [
    KPI_MANTENIMIENTO.tipos_actividad,
    KPI_MANTENIMIENTO.estados_asignados,
    KPI_MULTISKILL.recursos_excluidos_id,
    KPI_MULTISKILL.recursos_excluidos_nombre,
    empresa.toLowerCase() // El parámetro para la empresa
  ];
  
  let whereClauses = [
    'lower("Tipo de actividad") = ANY($1)',
    'lower("Estado de actividad") = ANY($2)',
    'a."ID de recurso"::text <> ALL($3)',
    'lower(a."Recurso") <> ALL($4)',
    'lower("Empresa") = $5',
    `"Recurso" IS NOT NULL AND trim("Recurso") <> ''`
  ];

  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  // CAMBIO 2: Añadimos la lógica para el filtro de red, si es que se seleccionó uno
  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`a."Propietario de Red" = $${params.length}`);
  }
  const query = `
    WITH base_filtrada AS (
      SELECT "Recurso", lower("Estado de actividad") as estado
      FROM public.actividades a
      WHERE ${whereClauses.join(' AND ')}
    )
    SELECT
      "Recurso" as recurso,
      COUNT(*) as total_asignadas,
      COUNT(*) FILTER (WHERE estado = 'finalizada') AS total_finalizadas,
      (COUNT(*) FILTER (WHERE estado = 'finalizada') * 100.0 / NULLIF(COUNT(*), 0)) AS pct_efectividad
    FROM base_filtrada
    GROUP BY "Recurso"
    HAVING COUNT(*) > 0
    ORDER BY pct_efectividad DESC NULLS LAST;
  `;

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error al calcular KPI Mant. por Técnico:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// AÑADE ESTE ENDPOINT COMPLETO
app.get('/api/provision/por-tecnico', async (req, res) => {
  const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;

  if (!empresa) {
    return res.status(400).json({ error: 'Se requiere especificar una empresa.' });
  }

  const params = [
    KPI_PROVISION.tipos_actividad,
    KPI_PROVISION.estados_asignados,
    KPI_MULTISKILL.recursos_excluidos_id,
    KPI_MULTISKILL.recursos_excluidos_nombre,
    empresa.toLowerCase()
  ];
  
  let whereClauses = [
    'lower("Tipo de actividad") = ANY($1)',
    'lower("Estado de actividad") = ANY($2)',
    'a."ID de recurso"::text <> ALL($3)',
    'lower(a."Recurso") <> ALL($4)',
    'lower("Empresa") = $5',
    `"Recurso" IS NOT NULL AND trim("Recurso") <> ''`
  ];

  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  
  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`a."Propietario de Red" = $${params.length}`);
  }

  const query = `
    WITH base_filtrada AS (
      SELECT "Recurso", lower("Estado de actividad") as estado
      FROM public.actividades a
      WHERE ${whereClauses.join(' AND ')}
    )
    SELECT
      "Recurso" as recurso,
      COUNT(*) as total_asignadas,
      COUNT(*) FILTER (WHERE estado = 'finalizada') AS total_finalizadas,
      (COUNT(*) FILTER (WHERE estado = 'finalizada') * 100.0 / NULLIF(COUNT(*), 0)) AS pct_efectividad
    FROM base_filtrada
    GROUP BY "Recurso"
    HAVING COUNT(*) > 0
    ORDER BY pct_efectividad DESC NULLS LAST;
  `;

  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error al calcular KPI Provisión por Técnico:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



//#####Reincidencias#########


app.get('/api/kpi/reincidencias', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    const params = [
        KPI_REINCIDENCIAS.tipos_validos,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
        propietario_red || 'todos'
    ];
    
    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($1)`,
        `a."ID de recurso"::text <> ALL($2)`,
        `a."Recurso" NOT ILIKE ANY($3)`
    ];

    if (fecha_inicio && fecha_fin) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }
    
    const finalWhereClause = whereClauses.join(' AND ');

    // LÓGICA HÍBRIDA Y CORRECTA
    const query = `
        WITH visitas_enriquecidas AS (
            SELECT 
                "Empresa", "Cod_Servicio", "Fecha Agendamiento", "Propietario de Red",
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                FIRST_VALUE(lower(a."Propietario de Red")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primer_propietario_red,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        -- DENOMINADOR: Cuenta TODAS las visitas de la empresa en la red filtrada
        totales_por_empresa AS (
            SELECT lower("Empresa") as empresa, COUNT(*) AS total_actividades
            FROM visitas_enriquecidas
            WHERE ($4 = 'todos' OR lower("Propietario de Red") = $4)
            GROUP BY lower("Empresa")
        ),
        -- NUMERADOR: Cuenta las reincidencias atribuidas a la empresa y a la red de la PRIMERA visita
        reincidencias_por_empresa AS (
            SELECT lower(primera_empresa_servicio) AS empresa, COUNT(*) as total_reincidencias
            FROM visitas_enriquecidas
            WHERE orden_visita = 1
                AND fecha_siguiente_visita IS NOT NULL
                AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
                AND ($4 = 'todos' OR primer_propietario_red = $4)
            GROUP BY lower(primera_empresa_servicio)
        )
        SELECT
            tpe.empresa,
            COALESCE(rpe.total_reincidencias, 0)::text AS reincidencias,
            tpe.total_actividades::text AS total_finalizadas,
            ROUND(COALESCE((rpe.total_reincidencias::NUMERIC * 100.0) / NULLIF(tpe.total_actividades, 0), 0.0), 2)::text AS porcentaje_reincidencia
        FROM totales_por_empresa tpe
        LEFT JOIN reincidencias_por_empresa rpe ON tpe.empresa = rpe.empresa
        ORDER BY tpe.empresa;
    `;
    
    const finalParams = [params[0], params[1], params[2], params[3]];
    if (fecha_inicio && fecha_fin) {
        finalParams.push(fecha_inicio, fecha_fin);
    }

    try {
        const { rows } = await db.query(query, finalParams);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular KPI Reincidencias:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// AÑADE ESTE ENDPOINT COMPLETO EN server.js

app.get('/api/kpi/distribucion-reincidencias', async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  // Reutilizamos las constantes que ya tenemos
  const params = [
    KPI_REINCIDENCIAS.tipos_validos,
    KPI_MULTISKILL.recursos_excluidos_id,
    KPI_REINCIDENCIAS.noms_excl_patterns
  ];
  
  let whereClauses = [
    `lower(a."Estado de actividad") = 'finalizada'`,
    `lower(a."Tipo de actividad") = ANY($1)`,
    `a."ID de recurso"::text <> ALL($2)`,
    `a."Recurso" NOT ILIKE ANY($3)`
  ];

  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  const query = `
    WITH visitas_enriquecidas AS (
      SELECT 
        "Cod_Servicio", "Fecha Agendamiento",
        lower("Propietario de Red") as propietario_red,
        lower("Tipo de actividad") as tipo_actividad,
        ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
        LEAD("Fecha Agendamiento", 1) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
      FROM public.actividades a
      WHERE ${whereClauses.join(' AND ')}
    )
    SELECT
      propietario_red,
      tipo_actividad,
      -- Contamos el total de actividades finalizadas por tipo y red
      COUNT(*) as total_finalizadas,
      -- Contamos solo las que son reincidencias
      COUNT(*) FILTER (
        WHERE orden_visita = 1
        AND fecha_siguiente_visita IS NOT NULL
        AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
      ) as total_reincidencias
    FROM visitas_enriquecidas
    GROUP BY propietario_red, tipo_actividad;
  `;

  try {
    const { rows } = await db.query(query, params);
    
    // --- Procesamiento en JavaScript para crear el objeto final ---
    const resultado = {
      entel: { total_actividades: 0, desglose_reincidencias: [] },
      onnet: { total_actividades: 0, desglose_reincidencias: [] }
    };
    
    let totalReincidenciasEntel = 0;
    let totalReincidenciasOnnet = 0;

    rows.forEach(row => {
      const reincidencias = parseInt(row.total_reincidencias, 10);
      const finalizadas = parseInt(row.total_finalizadas, 10);
      
      if (row.propietario_red === 'entel') {
        resultado.entel.total_actividades += finalizadas;
        if (reincidencias > 0) {
          totalReincidenciasEntel += reincidencias;
          resultado.entel.desglose_reincidencias.push({ tipo_actividad: row.tipo_actividad, casos: reincidencias });
        }
      } else if (row.propietario_red === 'onnet') {
        resultado.onnet.total_actividades += finalizadas;
        if (reincidencias > 0) {
          totalReincidenciasOnnet += reincidencias;
          resultado.onnet.desglose_reincidencias.push({ tipo_actividad: row.tipo_actividad, casos: reincidencias });
        }
      }
    });

    // Calculamos los porcentajes
    resultado.entel.desglose_reincidencias.forEach(d => d.porcentaje = (d.casos * 100 / totalReincidenciasEntel) || 0);
    resultado.onnet.desglose_reincidencias.forEach(d => d.porcentaje = (d.casos * 100 / totalReincidenciasOnnet) || 0);

    res.json(resultado);

  } catch (err) {
    console.error('Error al calcular distribución de reincidencias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});




// Archivo: backend/server.js

app.get('/api/reincidencias/por-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;

    if (!empresa) {
        return res.status(400).json({ error: 'El parámetro "empresa" es requerido.' });
    }

    const params = [
        KPI_REINCIDENCIAS.tipos_validos,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
    ];

    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($1)`,
        `a."ID de recurso"::text <> ALL($2)`,
        `a."Recurso" NOT ILIKE ANY($3)`
    ];

    const esFechaValida = (fecha) => fecha && !isNaN(new Date(fecha));
    if (esFechaValida(fecha_inicio) && esFechaValida(fecha_fin)) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    params.push(empresa.toLowerCase());
    const empresaParamIndex = params.length;

    const query = `
        WITH visitas_enriquecidas AS (
            SELECT 
                "Recurso", "Empresa", "Cod_Servicio", "Fecha Agendamiento",
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        -- Este es el denominador que sub-estima el total, pero lo dejamos así por ahora
        total_por_recurso AS (
            SELECT "Recurso", COUNT(*) as total_finalizadas
            FROM visitas_enriquecidas
            WHERE lower(primera_empresa_servicio) = $${empresaParamIndex}
              AND orden_visita = 1
            GROUP BY "Recurso"
        ),
        -- Este es el numerador que SÍ funcionaba
        reincidencias_por_recurso AS (
            SELECT "Recurso", COUNT(*) as total_reincidencias
            FROM visitas_enriquecidas
            WHERE lower(primera_empresa_servicio) = $${empresaParamIndex}
              AND orden_visita = 1
              AND fecha_siguiente_visita IS NOT NULL
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
            GROUP BY "Recurso"
        )
        SELECT
            tpr."Recurso" AS recurso, 
            tpr.total_finalizadas::text,
            COALESCE(rpr.total_reincidencias, 0)::text AS total_reincidencias,
            ROUND((COALESCE(rpr.total_reincidencias, 0)::NUMERIC * 100) / NULLIF(tpr.total_finalizadas, 0)::NUMERIC, 2)::text AS porcentaje_reincidencia
        FROM total_por_recurso tpr
        LEFT JOIN reincidencias_por_recurso rpr ON tpr."Recurso" = rpr."Recurso"
        WHERE tpr.total_finalizadas > 0 OR COALESCE(rpr.total_reincidencias, 0) > 0
        ORDER BY ROUND((COALESCE(rpr.total_reincidencias, 0)::NUMERIC * 100) / NULLIF(tpr.total_finalizadas, 0)::NUMERIC, 2) DESC, tpr."Recurso";
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular reincidencias por técnico:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


app.get('/api/reincidencias/detalle-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, recurso } = req.query;

    if (!empresa || !recurso || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Los parámetros son requeridos.' });
    }

    // El orden de los parámetros es importante para que coincidan con los '$'
    const params = [
        fecha_inicio,
        fecha_fin,
        ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light'],
        ['3826', '3824', '3825', '5286', '3823', '3822'],
        empresa.toLowerCase(),
        recurso // <-- El parámetro para el técnico
    ];

    const query = `
        WITH visitas_enriquecidas AS (
            SELECT 
                "Recurso", "Cod_Servicio", "Empresa", "Fecha Agendamiento", "Tipo de actividad", "Observación", "Acción realizada", 
                "Nombre Cliente", "Dirección", "Comuna", "ID de recurso", "ID externo",
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2
              AND lower("Estado de actividad") = 'finalizada'
              AND lower("Tipo de actividad") = ANY($3)
              AND "ID de recurso"::text <> ALL($4)
        ),
        servicios_fallidos_del_tecnico AS (
            SELECT DISTINCT "Cod_Servicio"
            FROM visitas_enriquecidas
            WHERE orden_visita = 1 
              AND lower(primera_empresa_servicio) = $5 -- Filtra por la empresa
              AND "Recurso" = $6 -- CAMBIO CLAVE: Se restaura el filtro por el técnico seleccionado
              AND fecha_siguiente_visita IS NOT NULL 
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
        ),
        visitas_para_detalle AS (
            SELECT 
                *,
                ROW_NUMBER() OVER(PARTITION BY "ID externo" ORDER BY "Fecha Agendamiento") as rn
            FROM visitas_enriquecidas ve
            WHERE ve."Cod_Servicio" IN (SELECT "Cod_Servicio" FROM servicios_fallidos_del_tecnico)
        )
        SELECT 
            "Empresa"::text, "Cod_Servicio"::text, "Recurso"::text, 
            to_char("Fecha Agendamiento", 'YYYY-MM-DD HH24:MI:SS')::text as "Fecha Agendamiento", 
            "Tipo de actividad"::text, "Observación"::text, "Acción realizada"::text, 
            "Nombre Cliente"::text, "Dirección"::text, "Comuna"::text,
            "orden_visita"::text, "ID de recurso"::text, "ID externo"::text
        FROM visitas_para_detalle
        WHERE rn = 1
        ORDER BY "Cod_Servicio", "Fecha Agendamiento";
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener detalle de reincidencias:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Reemplaza tu endpoint /api/reincidencias/evolucion-tecnico con esta versión final y correcta
app.get('/api/reincidencias/evolucion-tecnico', async (req, res) => {
    const { empresa, recurso } = req.query;

    if (!empresa || !recurso) {
        return res.status(400).json({ error: 'Los parámetros "empresa" y "recurso" son requeridos.' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const fecha_fin_sql = endDate.toISOString().split('T')[0];
    const fecha_inicio_sql = startDate.toISOString().split('T')[0];

    const params = [
        fecha_inicio_sql,
        fecha_fin_sql,
        ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light'],
        ['3826', '3824', '3825', '5286', '3823', '3822'],
        empresa.toLowerCase(),
        recurso
    ];

    // Consulta reestructurada para una lógica correcta
    const query = `
        WITH visitas_totales AS (
            -- 1. Primero obtenemos TODAS las visitas sin filtrar por técnico, para que los cálculos de ventana sean correctos
            SELECT 
                "Recurso", "Cod_Servicio", "Empresa", "Fecha Agendamiento",
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2
              AND lower("Estado de actividad") = 'finalizada'
              AND lower("Tipo de actividad") = ANY($3)
              AND "ID de recurso"::text <> ALL($4)
        ),
        actividades_del_tecnico AS (
            -- 2. Ahora sí, filtramos solo las actividades que realizó el técnico de interés
            SELECT
                "Fecha Agendamiento",
                -- Calculamos para cada visita si es una reincidencia atribuible a la empresa del técnico
                (
                    orden_visita = 1 AND
                    lower(primera_empresa_servicio) = $5 AND
                    fecha_siguiente_visita IS NOT NULL AND
                    fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
                ) as es_reincidencia_atribuida
            FROM visitas_totales
            WHERE "Recurso" = $6
        )
        -- 3. Finalmente, agrupamos por períodos de 10 días y calculamos el porcentaje
        SELECT
            to_char(min("Fecha Agendamiento"), 'DD-Mon-YYYY') as fecha_periodo,
            ROUND(
                (COUNT(*) FILTER (WHERE es_reincidencia_atribuida) * 100.0) / NULLIF(COUNT(*), 0),
                2
            ) as porcentaje_reincidencia
        FROM actividades_del_tecnico
        GROUP BY floor(extract(epoch from "Fecha Agendamiento") / 864000)
        ORDER BY min("Fecha Agendamiento");
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular evolución de reincidencias:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Archivo: backend/server.js

// Reemplaza tu endpoint /api/kpi/reincidencias-historico con esta versión corregida
app.get('/api/kpi/reincidencias-historico', async (req, res) => {
    const { propietario_red } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const fecha_fin_sql = endDate.toISOString().split('T')[0];
    const fecha_inicio_sql = startDate.toISOString().split('T')[0];

    const params = [
        fecha_inicio_sql,
        fecha_fin_sql,
        KPI_REINCIDENCIAS.tipos_validos,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
    ];

    let whereClauses = [
        `a."Fecha Agendamiento" BETWEEN $1 AND $2`,
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($3)`,
        `a."ID de recurso"::text <> ALL($4)`,
        `a."Recurso" NOT ILIKE ANY($5)`
    ];
    
    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    const query = `
        WITH visitas_enriquecidas AS (
            SELECT 
                "Empresa",
                "Cod_Servicio",
                "Fecha Agendamiento",
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        totales_por_mes AS (
            SELECT 
                to_char("Fecha Agendamiento", 'YYYY-MM') as mes_visita, 
                lower("Empresa") as empresa, 
                COUNT(*) AS total_actividades
            FROM visitas_enriquecidas
            -- CAMBIO 1: Se usa la expresión completa en el GROUP BY
            GROUP BY to_char("Fecha Agendamiento", 'YYYY-MM'), lower("Empresa")
        ),
        reincidencias_por_mes AS (
            SELECT 
                to_char("Fecha Agendamiento", 'YYYY-MM') as mes_visita,
                lower(primera_empresa_servicio) AS empresa,
                COUNT(*) as total_reincidencias
            FROM visitas_enriquecidas
            WHERE orden_visita = 1
                AND fecha_siguiente_visita IS NOT NULL
                AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
            -- CAMBIO 2: Se usa la expresión completa en el GROUP BY
            GROUP BY to_char("Fecha Agendamiento", 'YYYY-MM'), lower(primera_empresa_servicio)
        )
        SELECT
            tpm.mes_visita,
            tpm.empresa,
            COALESCE(rpm.total_reincidencias, 0) as reincidencias,
            tpm.total_actividades,
            ROUND(COALESCE((rpm.total_reincidencias::NUMERIC * 100.0) / NULLIF(tpm.total_actividades, 0), 0.0), 2)::text AS porcentaje_reincidencia
        FROM totales_por_mes tpm
        LEFT JOIN reincidencias_por_mes rpm ON tpm.mes_visita = rpm.mes_visita AND tpm.empresa = rpm.empresa
        ORDER BY tpm.mes_visita, tpm.empresa;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular histórico de reincidencias:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


app.get('/api/kpi/fallas-tempranas', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    // Construimos los parámetros para la consulta de forma clara y ordenada
    const params = [
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,    // $1
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,     // $2
        KPI_MULTISKILL.recursos_excluidos_id,      // $3
        KPI_REINCIDENCIAS.noms_excl_patterns,      // $4
    ];

    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        // La actividad debe ser o una instalación o una reparación
        `(lower(a."Tipo de actividad") = ANY($1) OR lower(a."Tipo de actividad") = ANY($2))`,
        `a."ID de recurso"::text <> ALL($3)`,
        `a."Recurso" NOT ILIKE ANY($4)`
    ];

    // Lógica para los filtros opcionales
    const esFechaValida = (fecha) => fecha && !isNaN(new Date(fecha));
    if (esFechaValida(fecha_inicio) && esFechaValida(fecha_fin)) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    } else {
        // Si no hay fechas, la consulta original de Python usaba valores por defecto muy amplios.
        // Aquí podemos optar por no filtrar por fecha, o poner un rango por defecto como en otros casos.
        // Por ahora, no se filtrará si no se proveen.
    }

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    // La consulta SQL es una traducción directa de tu lógica en Python
    const query = `
        WITH base_calidad_falla_temprana AS (
            SELECT 
                "Empresa", "Cod_Servicio", "Fecha Agendamiento",
                lower("Tipo de actividad") as tipo_actividad,
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        kpis_produccion AS (
            -- El denominador: total de instalaciones por empresa
            SELECT lower("Empresa") as empresa, COUNT(*) as total_instalaciones
            FROM base_calidad_falla_temprana
            WHERE tipo_actividad = ANY($1) -- tipo_actividad IN tipos_instalacion
            GROUP BY lower("Empresa")
        ),
        kpis_fallas AS (
            -- El numerador: fallas tempranas atribuidas a la empresa de la instalación
            SELECT lower(primera_empresa_servicio) as empresa, COUNT(*) as total_fallas_tempranas
            FROM base_calidad_falla_temprana
            WHERE tipo_actividad = ANY($1) -- Fue una instalación
              AND orden_visita = 1 
              AND fecha_siguiente_visita IS NOT NULL 
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days' 
              AND tipo_siguiente_visita = ANY($2) -- La siguiente visita fue una reparación
            GROUP BY lower(primera_empresa_servicio)
        )
        -- Unimos los resultados y calculamos el KPI final
        SELECT 
            p.empresa,
            p.total_instalaciones::text,
            COALESCE(f.total_fallas_tempranas, 0)::text as fallas_tempranas,
            ROUND(
                COALESCE((f.total_fallas_tempranas::NUMERIC * 100.0) / NULLIF(p.total_instalaciones, 0), 0.0), 2
            )::text AS porcentaje_falla
        FROM kpis_produccion p
        LEFT JOIN kpis_fallas f ON p.empresa = f.empresa
        WHERE p.total_instalaciones > 0
        ORDER BY porcentaje_falla DESC;
    `;
    
    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular KPI Fallas Tempranas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Archivo: backend/server.js

app.get('/api/kpi/distribucion-fallas-tempranas', async (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;

    // Se usan las mismas constantes que en la otra función de fallas tempranas
    const params = [
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
    ];

    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        `(lower(a."Tipo de actividad") = ANY($1) OR lower(a."Tipo de actividad") = ANY($2))`,
        `a."ID de recurso"::text <> ALL($3)`,
        `a."Recurso" NOT ILIKE ANY($4)`
    ];
    
    // Lógica de fechas (si no vienen, no se filtra por fecha)
    const esFechaValida = (fecha) => fecha && !isNaN(new Date(fecha));
    if (esFechaValida(fecha_inicio) && esFechaValida(fecha_fin)) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    // Consulta 1: Calcula el desglose de fallas por red y tipo de actividad
    const fallasQuery = `
        WITH base_calidad_falla_temprana AS (
            SELECT 
                lower("Tipo de actividad") as tipo_actividad,
                FIRST_VALUE(lower("Propietario de Red")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primer_propietario_red,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                "Fecha Agendamiento",
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        )
        SELECT 
            primer_propietario_red as red,
            tipo_actividad,
            COUNT(*) as casos
        FROM base_calidad_falla_temprana
        WHERE tipo_actividad = ANY($1)
          AND orden_visita = 1
          AND fecha_siguiente_visita IS NOT NULL
          AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
          AND tipo_siguiente_visita = ANY($2)
        GROUP BY red, tipo_actividad;
    `;

    // Consulta 2: Calcula el total de instalaciones por red (el denominador)
    const totalesQuery = `
        SELECT lower("Propietario de Red") as red, COUNT(*) as total
        FROM public.actividades a
        WHERE ${finalWhereClause} AND lower("Tipo de actividad") = ANY($1)
        GROUP BY red;
    `;

    try {
        // Ejecutamos ambas consultas
        const [fallasResult, totalesResult] = await Promise.all([
            db.query(fallasQuery, params),
            db.query(totalesQuery, params)
        ]);

        // Estructura de respuesta inicial
        const response = {
            entel: { total_instalaciones: 0, desglose_fallas: [] },
            onnet: { total_instalaciones: 0, desglose_fallas: [] }
        };

        // Llenamos los totales
        totalesResult.rows.forEach(row => {
            if (response[row.red]) {
                response[row.red].total_instalaciones = parseInt(row.total, 10);
            }
        });

        // Llenamos el desglose de fallas y calculamos porcentajes
        const totalFallasEntel = fallasResult.rows.filter(r => r.red === 'entel').reduce((sum, row) => sum + parseInt(row.casos, 10), 0);
        const totalFallasOnnet = fallasResult.rows.filter(r => r.red === 'onnet').reduce((sum, row) => sum + parseInt(row.casos, 10), 0);

        fallasResult.rows.forEach(row => {
            if (response[row.red]) {
                const totalFallasRed = row.red === 'entel' ? totalFallasEntel : totalFallasOnnet;
                response[row.red].desglose_fallas.push({
                    tipo_actividad: row.tipo_actividad,
                    casos: parseInt(row.casos, 10),
                    porcentaje: totalFallasRed > 0 ? (parseInt(row.casos, 10) / totalFallasRed * 100) : 0
                });
            }
        });
        
        res.json(response);
    } catch (err) {
        console.error('Error al calcular distribución de fallas tempranas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Añade este nuevo endpoint a server.js
app.get('/api/kpi/fallas-tempranas-historico', async (req, res) => {
    const { propietario_red } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const fecha_fin_sql = endDate.toISOString().split('T')[0];
    const fecha_inicio_sql = startDate.toISOString().split('T')[0];

    const params = [
        fecha_inicio_sql,
        fecha_fin_sql,
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
    ];

    let whereClauses = [
        `a."Fecha Agendamiento" BETWEEN $1 AND $2`,
        `lower(a."Estado de actividad") = 'finalizada'`,
        `(lower(a."Tipo de actividad") = ANY($3) OR lower(a."Tipo de actividad") = ANY($4))`,
        `a."ID de recurso"::text <> ALL($5)`,
        `a."Recurso" NOT ILIKE ANY($6)`
    ];
    
    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    const query = `
        WITH base_calidad_falla_temprana AS (
            SELECT 
                "Empresa",
                "Cod_Servicio",
                "Fecha Agendamiento",
                lower("Tipo de actividad") as tipo_actividad,
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        kpis_produccion_por_mes AS (
            SELECT to_char("Fecha Agendamiento", 'YYYY-MM') as mes_visita, lower("Empresa") as empresa, COUNT(*) as total_instalaciones
            FROM base_calidad_falla_temprana
            WHERE tipo_actividad = ANY($3)
            GROUP BY mes_visita, lower("Empresa")
        ),
        kpis_fallas_por_mes AS (
            SELECT to_char("Fecha Agendamiento", 'YYYY-MM') as mes_visita, lower(primera_empresa_servicio) as empresa, COUNT(*) as total_fallas_tempranas
            FROM base_calidad_falla_temprana
            WHERE tipo_actividad = ANY($3)
              AND orden_visita = 1 
              AND fecha_siguiente_visita IS NOT NULL 
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days' 
              AND tipo_siguiente_visita = ANY($4)
            GROUP BY mes_visita, lower(primera_empresa_servicio)
        )
        SELECT 
            p.mes_visita,
            p.empresa,
            COALESCE(f.total_fallas_tempranas, 0) as fallas_tempranas,
            p.total_instalaciones,
            ROUND(
                COALESCE((f.total_fallas_tempranas::NUMERIC * 100.0) / NULLIF(p.total_instalaciones, 0), 0.0), 2
            )::text AS porcentaje_falla
        FROM kpis_produccion_por_mes p
        LEFT JOIN kpis_fallas_por_mes f ON p.mes_visita = f.mes_visita AND p.empresa = f.empresa
        ORDER BY p.mes_visita, p.empresa;
    `;
    
    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular histórico de fallas tempranas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/fallas-tempranas/por-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;

    if (!empresa) {
        return res.status(400).json({ error: 'El parámetro "empresa" es requerido.' });
    }

    // Parámetros para la consulta, incluyendo los tipos de actividad para fallas tempranas
    const params = [
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,    // $1
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,     // $2
        KPI_MULTISKILL.recursos_excluidos_id,      // $3
        KPI_REINCIDENCIAS.noms_excl_patterns,      // $4
    ];

    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        // El universo de datos incluye tanto instalaciones como reparaciones
        `(lower(a."Tipo de actividad") = ANY($1) OR lower(a."Tipo de actividad") = ANY($2))`,
        `a."ID de recurso"::text <> ALL($3)`,
        `a."Recurso" NOT ILIKE ANY($4)`
    ];

    const esFechaValida = (fecha) => fecha && !isNaN(new Date(fecha));
    if (esFechaValida(fecha_inicio) && esFechaValida(fecha_fin)) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    params.push(empresa.toLowerCase());
    const empresaParamIndex = params.length;

    const query = `
        WITH base_calidad_falla_temprana AS (
            SELECT 
                "Recurso", "Empresa", "Cod_Servicio", "Fecha Agendamiento",
                lower("Tipo de actividad") as tipo_actividad,
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        -- DENOMINADOR: Contamos el total de INSTALACIONES por técnico en la empresa seleccionada
        total_instalaciones_por_tecnico AS (
            SELECT "Recurso", COUNT(*) as total_instalaciones
            FROM base_calidad_falla_temprana
            WHERE lower("Empresa") = $${empresaParamIndex}
              AND tipo_actividad = ANY($1) -- tipo_actividad IN tipos_instalacion
            GROUP BY "Recurso"
        ),
        -- NUMERADOR: Contamos las fallas tempranas causadas por cada técnico de la empresa seleccionada
        fallas_tempranas_por_tecnico AS (
            SELECT "Recurso", COUNT(*) as total_fallas_tempranas
            FROM base_calidad_falla_temprana
            WHERE lower(primera_empresa_servicio) = $${empresaParamIndex}
              AND tipo_actividad = ANY($1) -- La primera visita fue una instalación
              AND orden_visita = 1
              AND fecha_siguiente_visita IS NOT NULL
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
              AND tipo_siguiente_visita = ANY($2) -- La siguiente visita fue una reparación
            GROUP BY "Recurso"
        )
        -- Unimos los resultados usando un FULL OUTER JOIN para no perder a ningún técnico
        SELECT
            COALESCE(p."Recurso", f."Recurso") AS recurso,
            COALESCE(p.total_instalaciones, 0)::text as total_instalaciones,
            COALESCE(f.total_fallas_tempranas, 0)::text as fallas_tempranas,
            ROUND(
                COALESCE((f.total_fallas_tempranas::NUMERIC * 100.0) / NULLIF(p.total_instalaciones, 0), 0.0), 2
            )::text AS porcentaje_falla
        FROM total_instalaciones_por_tecnico p
        FULL OUTER JOIN fallas_tempranas_por_tecnico f ON p."Recurso" = f."Recurso"
        ORDER BY porcentaje_falla DESC, recurso;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular Fallas Tempranas por técnico:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Archivo: backend/server.js

app.get('/api/fallas-tempranas/detalle-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, recurso } = req.query;

    if (!empresa || !recurso || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Todos los parámetros son requeridos.' });
    }

    const params = [
        fecha_inicio,
        fecha_fin,
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
        empresa.toLowerCase(),
        recurso
    ];

    const query = `
        WITH base_calidad AS (
            SELECT 
                "Recurso", "Cod_Servicio", "Empresa", "Fecha Agendamiento", "Tipo de actividad", "Observación", "Acción realizada", 
                "Nombre Cliente", "Dirección", "Comuna", "ID de recurso", "ID externo",
                lower("Tipo de actividad") as tipo_actividad_lower,
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2
              AND lower("Estado de actividad") = 'finalizada'
              AND (lower("Tipo de actividad") = ANY($3) OR lower("Tipo de actividad") = ANY($4))
              AND "ID de recurso"::text <> ALL($5)
              AND "Recurso" NOT ILIKE ANY($6)
        ),
        instalaciones_fallidas_del_tecnico AS (
            SELECT DISTINCT "Cod_Servicio"
            FROM base_calidad
            WHERE lower(primera_empresa_servicio) = $7 -- Falla atribuida a la empresa
              AND "Recurso" = $8 -- Y causada por el técnico específico
              AND tipo_actividad_lower = ANY($3) -- La primera visita fue instalación
              AND orden_visita = 1
              AND fecha_siguiente_visita IS NOT NULL 
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
              AND tipo_siguiente_visita = ANY($4) -- La siguiente visita fue reparación
        )
        SELECT 
            "Empresa"::text, "Cod_Servicio"::text, "Recurso"::text, 
            to_char("Fecha Agendamiento", 'YYYY-MM-DD HH24:MI:SS')::text as "Fecha Agendamiento", 
            "Tipo de actividad"::text, "Observación"::text, "Acción realizada"::text, 
            "Nombre Cliente"::text, "Dirección"::text, "Comuna"::text,
            "orden_visita"::text, "ID de recurso"::text, "ID externo"::text
        FROM base_calidad bc
        WHERE bc."Cod_Servicio" IN (SELECT "Cod_Servicio" FROM instalaciones_fallidas_del_tecnico)
        ORDER BY bc."Cod_Servicio", bc."Fecha Agendamiento";
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener detalle de fallas tempranas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Archivo: backend/server.js

app.get('/api/fallas-tempranas/evolucion-tecnico', async (req, res) => {
    const { empresa, recurso } = req.query;

    if (!empresa || !recurso) {
        return res.status(400).json({ error: 'Los parámetros "empresa" y "recurso" son requeridos.' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    const fecha_fin_sql = endDate.toISOString().split('T')[0];
    const fecha_inicio_sql = startDate.toISOString().split('T')[0];

    const params = [
        fecha_inicio_sql,
        fecha_fin_sql,
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
        empresa.toLowerCase(),
        recurso
    ];

    const query = `
        WITH base_calidad AS (
            SELECT 
                "Recurso", "Cod_Servicio", "Empresa", "Fecha Agendamiento",
                lower("Tipo de actividad") as tipo_actividad,
                FIRST_VALUE("Empresa") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2
              AND lower("Estado de actividad") = 'finalizada'
              AND (lower("Tipo de actividad") = ANY($3) OR lower("Tipo de actividad") = ANY($4))
              AND "ID de recurso"::text <> ALL($5)
              AND "Recurso" NOT ILIKE ANY($6)
        ),
        actividades_del_tecnico AS (
            -- Obtenemos todas las instalaciones del técnico para usarlas como denominador
            SELECT
                "Fecha Agendamiento",
                -- Calculamos para cada instalación si fue una falla temprana
                (
                    orden_visita = 1 AND
                    lower(primera_empresa_servicio) = $7 AND
                    fecha_siguiente_visita IS NOT NULL AND
                    fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days' AND
                    tipo_siguiente_visita = ANY($4)
                ) as es_falla_temprana
            FROM base_calidad
            WHERE "Recurso" = $8 AND tipo_actividad = ANY($3) -- Solo instalaciones de este técnico
        )
        SELECT
            to_char(min("Fecha Agendamiento"), 'DD-Mon-YYYY') as fecha_periodo,
            ROUND(
                (COUNT(*) FILTER (WHERE es_falla_temprana) * 100.0) / NULLIF(COUNT(*), 0),
                2
            ) as porcentaje_falla
        FROM actividades_del_tecnico
        GROUP BY floor(extract(epoch from "Fecha Agendamiento") / 864000) -- Agrupamos por períodos de 10 días
        ORDER BY min("Fecha Agendamiento");
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular evolución de fallas tempranas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/produccion/mantenimiento-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;

    if (!empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Los parámetros "empresa", "fecha_inicio" y "fecha_fin" son requeridos.' });
    }

    const params = [
        empresa.toLowerCase(),
        KPI_MANTENIMIENTO_PROD.tipos_mantenimiento,
        KPI_MANTENIMIENTO_PROD.estados_asignados,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
        fecha_inicio,
        fecha_fin
    ];

    let whereClauses = [
        `lower(a."Empresa") = $1`,
        `lower(a."Tipo de actividad") = ANY($2)`,
        `lower(a."Estado de actividad") = ANY($3)`,
        `a."ID de recurso"::text <> ALL($4)`,
        `a."Recurso" NOT ILIKE ANY($5)`,
        `a."Fecha Agendamiento" BETWEEN $6 AND $7`
    ];

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    const query = `
        WITH base_filtrada AS (
            SELECT "Recurso", lower("Estado de actividad") as estado
            FROM public.actividades a
            WHERE ${finalWhereClause}
        )
        SELECT
            "Recurso" as recurso,
            COUNT(*)::text as total_asignadas,
            COUNT(*) FILTER (WHERE estado = 'finalizada')::text AS total_finalizadas,
            ROUND(
                (COUNT(*) FILTER (WHERE estado = 'finalizada')::NUMERIC * 100.0) / NULLIF(COUNT(*), 0),
                2
            )::text as pct_efectividad
        FROM base_filtrada
        WHERE "Recurso" IS NOT NULL AND trim("Recurso") <> ''
        GROUP BY "Recurso"
        HAVING COUNT(*) > 0
        ORDER BY pct_efectividad DESC, total_finalizadas DESC;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular mantención por técnico:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/produccion/provision-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;

    if (!empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Los parámetros "empresa", "fecha_inicio" y "fecha_fin" son requeridos.' });
    }

    const params = [
        empresa.toLowerCase(),
        KPI_PROVISION.tipos_actividad, // <-- Se usan los tipos de instalación
        ['finalizada', 'no realizado'], // Se usan los mismos estados
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
        fecha_inicio,
        fecha_fin
    ];

    let whereClauses = [
        `lower(a."Empresa") = $1`,
        `lower(a."Tipo de actividad") = ANY($2)`,
        `lower(a."Estado de actividad") = ANY($3)`,
        `a."ID de recurso"::text <> ALL($4)`,
        `a."Recurso" NOT ILIKE ANY($5)`,
        `a."Fecha Agendamiento" BETWEEN $6 AND $7`
    ];

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    // La consulta es idéntica a la de mantenimiento, solo cambian los filtros que le pasamos
    const query = `
        WITH base_filtrada AS (
            SELECT "Recurso", lower("Estado de actividad") as estado
            FROM public.actividades a
            WHERE ${finalWhereClause}
        )
        SELECT
            "Recurso" as recurso,
            COUNT(*)::text as total_asignadas,
            COUNT(*) FILTER (WHERE estado = 'finalizada')::text AS total_finalizadas,
            ROUND(
                (COUNT(*) FILTER (WHERE estado = 'finalizada')::NUMERIC * 100.0) / NULLIF(COUNT(*), 0),
                2
            )::text as pct_efectividad
        FROM base_filtrada
        WHERE "Recurso" IS NOT NULL AND trim("Recurso") <> ''
        GROUP BY "Recurso"
        HAVING COUNT(*) > 0
        ORDER BY pct_efectividad DESC, total_finalizadas DESC;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular provisión por técnico:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Archivo: backend/server.js

app.get('/api/kpi/certificacion', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    const params = [
        KPI_CERTIFICACION.tipos_actividad,       // $1
        KPI_CERTIFICACION.mensaje_pattern,     // $2
        KPI_MULTISKILL.recursos_excluidos_id,  // $3
        KPI_REINCIDENCIAS.noms_excl_patterns,    // $4
    ];

    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($1)`,
        `a."ID de recurso"::text <> ALL($3)`,
        // Usamos ILIKE para consistencia con los otros KPIs
        `a."Recurso" NOT ILIKE ANY($4)`
    ];

    const esFechaValida = (fecha) => fecha && !isNaN(new Date(fecha));
    if (esFechaValida(fecha_inicio) && esFechaValida(fecha_fin)) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    const query = `
        WITH base_filtrada AS (
            SELECT 
                lower("Empresa") as empresa, 
                "Mensaje certificación"
            FROM public.actividades a
            WHERE ${finalWhereClause}
        )
        SELECT
            empresa,
            COUNT(*)::text as total_finalizadas,
            COUNT(*) FILTER (WHERE lower(trim("Mensaje certificación")) LIKE $2)::text AS certificadas,
            ROUND(
                (COUNT(*) FILTER (WHERE lower(trim("Mensaje certificación")) LIKE $2) * 100.0) / NULLIF(COUNT(*), 0),
                2
            )::text as porcentaje_certificacion
        FROM
            base_filtrada
        GROUP BY
            empresa
        ORDER BY
            porcentaje_certificacion DESC, total_finalizadas DESC;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular KPI de Certificación:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/certificacion/por-tecnico', async (req, res) => {
    const { fecha_inicio, fecha_fin, empresa, propietario_red } = req.query;

    if (!empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Los parámetros "empresa", "fecha_inicio" y "fecha_fin" son requeridos.' });
    }

    const params = [
        empresa.toLowerCase(),
        KPI_CERTIFICACION_SEC.tipos_actividad,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns, // Usamos la misma lista de exclusión por nombre
        KPI_CERTIFICACION_SEC.mensaje_pattern,
        fecha_inicio,
        fecha_fin
    ];

    let whereClauses = [
        `lower(a."Empresa") = $1`,
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($2)`,
        `a."ID de recurso"::text <> ALL($3)`,
        `a."Recurso" NOT ILIKE ANY($4)`,
        `a."Fecha Agendamiento" BETWEEN $6 AND $7`
    ];

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const finalWhereClause = whereClauses.join(' AND ');

    const query = `
        WITH base_filtrada AS (
            SELECT "Recurso", "Mensaje certificación"
            FROM public.actividades a
            WHERE ${finalWhereClause}
        )
        SELECT
            "Recurso" as recurso,
            COUNT(*)::text as total_finalizadas,
            COUNT(*) FILTER (WHERE lower(trim("Mensaje certificación")) LIKE $5)::text AS certificadas,
            ROUND(
                (COUNT(*) FILTER (WHERE lower(trim("Mensaje certificación")) LIKE $5) * 100.0) / NULLIF(COUNT(*), 0),
                2
            )::text as porcentaje_certificacion
        FROM base_filtrada
        WHERE "Recurso" IS NOT NULL AND trim("Recurso") <> ''
        GROUP BY "Recurso"
        HAVING COUNT(*) > 0
        ORDER BY porcentaje_certificacion DESC, total_finalizadas DESC;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular certificación por técnico:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// Archivo: backend/server.js

app.get('/api/kpi/certificacion-vs-reincidencia', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    const params = [
        // Parámetros en el orden que los espera la consulta:
        ['reparación 3play light', 'reparación-hogar-fibra'],                  // $1: Tipos para certificar
        'certificación entregada a schaman%',                                  // $2: Patrón de mensaje
        // Universo de actividades para la base de datos
        ['reparación 3play light', 'reparación-hogar-fibra', 'reparación empresa masivo fibra'], // $3
    ];

    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($3)`,
        // Se añaden los filtros de exclusión estándar
        `a."ID de recurso"::text NOT IN ('3826', '3824', '3825', '5286', '3823', '3822')`,
        `a."Recurso" NOT ILIKE ANY (ARRAY['%bio%', '%sice%', '%rex%', '%rielecom%', '%famer%', '%hometelcom%', '%zener%', '%prointel%', '%soportevision%', '%telsycab%'])`
    ];
    
    const esFechaValida = (fecha) => fecha && !isNaN(new Date(fecha));
    if (esFechaValida(fecha_inicio) && esFechaValida(fecha_fin)) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`lower(a."Propietario de Red") = $${params.length}`);
    }
    
    const finalWhereClause = whereClauses.join(' AND ');

    // LA CONSULTA MAESTRA (la que tú validaste en pgAdmin)
    const query = `
        WITH base_actividades AS (
            SELECT 
                lower("Empresa") as empresa, "Cod_Servicio", "Fecha Agendamiento", "Propietario de Red",
                "Mensaje certificación", "Tipo de actividad",
                CASE 
                    WHEN lower("Tipo de actividad") = ANY($1) AND lower(trim("Mensaje certificación")) LIKE $2
                    THEN true 
                    ELSE false 
                END as esta_certificada
            FROM public.actividades a
            WHERE ${finalWhereClause}
        ),
        certificacion_por_empresa AS (
            SELECT 
                empresa,
                COUNT(*) as total_trabajos,
                COUNT(*) FILTER (WHERE esta_certificada = true) as trabajos_certificados,
                COUNT(*) FILTER (WHERE esta_certificada = false) as trabajos_no_certificados
            FROM base_actividades
            WHERE lower("Tipo de actividad") = ANY($1)
            GROUP BY empresa
        ),
        visitas_enriquecidas AS (
            SELECT 
                empresa, "Cod_Servicio", "Fecha Agendamiento", "Propietario de Red", esta_certificada,
                FIRST_VALUE(empresa) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                FIRST_VALUE(esta_certificada) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_visita_certificada,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM base_actividades
        ),
        reincidencias_no_certificadas AS (
            SELECT 
                primera_empresa_servicio as empresa,
                COUNT(*) as reincidencias_de_no_certificados
            FROM visitas_enriquecidas
            WHERE orden_visita = 1
              AND fecha_siguiente_visita IS NOT NULL
              AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
              AND primera_visita_certificada = false
            GROUP BY primera_empresa_servicio
        )
        SELECT 
            cpe.empresa,
            COALESCE(cpe.total_trabajos, 0)::text as total_actividades,
            COALESCE(cpe.trabajos_certificados, 0)::text as total_certificadas,
            COALESCE(cpe.trabajos_no_certificados, 0)::text as trabajos_no_certificados,
            COALESCE(rnc.reincidencias_de_no_certificados, 0)::text as reincidencias_de_no_certificadas
        FROM certificacion_por_empresa cpe
        LEFT JOIN reincidencias_no_certificadas rnc ON cpe.empresa = rnc.empresa
        ORDER BY cpe.empresa;
    `;
    
    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular KPI Certificación vs Reincidencia:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



// Función auxiliar para escalar los valores (traducción de tu min_max_scaler)
const scaleValue = (value, min, max, higherIsBetter = true) => {
    if (max === min) return 100.0;
    // Evita la división por cero si solo hay un valor
    if (max - min === 0) return 100.0;
    const scaled = ((value - min) / (max - min)) * 100;
    return higherIsBetter ? scaled : 100 - scaled;
};


app.get('/api/ranking/empresas', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    const f_inicio = (fecha_inicio && !isNaN(new Date(fecha_inicio))) ? fecha_inicio : '1900-01-01';
    const f_fin = (fecha_fin && !isNaN(new Date(fecha_fin))) ? fecha_fin : '2999-12-31';

    const params = [
        f_inicio, // $1
        f_fin,    // $2
        KPI_FALLAS_TEMPRANAS.tipos_instalacion, // $3
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,  // $4
        KPI_CERTIFICACION.tipos_actividad,    // $5
        KPI_CERTIFICACION.mensaje_pattern,      // $6
        KPI_MULTISKILL.recursos_excluidos_id,   // $7
        KPI_REINCIDENCIAS.noms_excl_patterns,   // $8
        propietario_red || 'todos'              // $9
    ];

    const query = `
        WITH base_produccion AS (
            SELECT lower("Empresa") as empresa, lower("Tipo de actividad") as tipo_actividad, lower("Mensaje certificación") as mensaje_cert
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2 AND lower("Estado de actividad") = 'finalizada'
              AND "ID de recurso"::text <> ALL($7) AND "Recurso" NOT ILIKE ANY($8)
              AND ($9 = 'todos' OR lower("Propietario de Red") = $9)
        ),
        base_calidad_reincidencia AS (
            SELECT "Cod_Servicio", "Fecha Agendamiento",
                    FIRST_VALUE(lower("Empresa")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                    ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                    LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2 AND lower("Estado de actividad") = 'finalizada'
              AND lower("Tipo de actividad") = ANY($4) AND "ID de recurso"::text <> ALL($7)
              AND "Recurso" NOT ILIKE ANY($8) AND ($9 = 'todos' OR lower("Propietario de Red") = $9)
        ),
        base_calidad_falla_temprana AS (
            SELECT "Cod_Servicio", "Fecha Agendamiento",
                    lower("Tipo de actividad") as tipo_actividad,
                    FIRST_VALUE(lower("Empresa")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                    LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                    LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita,
                    ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2 AND lower("Estado de actividad") = 'finalizada'
              AND (lower("Tipo de actividad") = ANY($4) OR lower("Tipo de actividad") = ANY($3))
              AND "ID de recurso"::text <> ALL($7) AND "Recurso" NOT ILIKE ANY($8)
              AND ($9 = 'todos' OR lower("Propietario de Red") = $9)
        ),
        kpis_produccion AS (
            SELECT empresa,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($3)) as total_instalaciones,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($4)) as total_reparaciones,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($5)) as total_certificables,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($5) AND trim(mensaje_cert) LIKE $6) as total_certificadas
            FROM base_produccion GROUP BY empresa
        ),
        kpis_reincidencias AS (
            SELECT primera_empresa_servicio as empresa, COUNT(*) as total_reincidencias
            FROM base_calidad_reincidencia
            WHERE orden_visita = 1 AND fecha_siguiente_visita IS NOT NULL AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
            GROUP BY primera_empresa_servicio
        ),
        kpis_fallas AS (
            SELECT primera_empresa_servicio as empresa, COUNT(*) as total_fallas_tempranas
            FROM base_calidad_falla_temprana
            WHERE tipo_actividad = ANY($3) AND orden_visita = 1 AND fecha_siguiente_visita IS NOT NULL AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days' AND tipo_siguiente_visita = ANY($4)
            GROUP BY primera_empresa_servicio
        )
        SELECT 
            p.empresa,
            p.total_instalaciones, p.total_reparaciones, p.total_certificables, p.total_certificadas,
            COALESCE(r.total_reincidencias, 0) as total_reincidencias,
            COALESCE(f.total_fallas_tempranas, 0) as total_fallas_tempranas
        FROM kpis_produccion p
        LEFT JOIN kpis_reincidencias r ON p.empresa = r.empresa
        LEFT JOIN kpis_fallas f ON p.empresa = f.empresa
        WHERE p.total_reparaciones + p.total_instalaciones > 5;
    `;

    try {
        const { rows } = await db.query(query, params);

        if (rows.length === 0) {
            return res.json([]);
        }

        // --- INICIO DE CÁLCULOS EN JAVASCRIPT (traducción de pandas) ---
        
        // 1. Calcular porcentajes
        const dataWithPct = rows.map(row => {
            // Asegurarse de que los datos sean numéricos
            const total_reparaciones = parseInt(row.total_reparaciones, 10) || 0;
            const total_instalaciones = parseInt(row.total_instalaciones, 10) || 0;
            const total_reincidencias = parseInt(row.total_reincidencias, 10) || 0;
            const total_fallas_tempranas = parseInt(row.total_fallas_tempranas, 10) || 0;
            const total_certificables = parseInt(row.total_certificables, 10) || 0;
            const total_certificadas = parseInt(row.total_certificadas, 10) || 0;
            
            return {
                ...row, // Mantenemos los datos originales
                total_reparaciones, total_instalaciones, total_reincidencias,
                total_fallas_tempranas, total_certificables, total_certificadas,
                pct_reincidencia: total_reparaciones > 0 ? (total_reincidencias / total_reparaciones * 100) : 0,
                pct_falla_temprana: total_instalaciones > 0 ? (total_fallas_tempranas / total_instalaciones * 100) : 0,
                pct_certificacion: total_certificables > 0 ? (total_certificadas / total_certificables * 100) : 0,
            };
        });

        // 2. Encontrar los valores mínimos y máximos para normalizar
        const benchmarks = {
            total_reparaciones: { min: Math.min(...dataWithPct.map(r => r.total_reparaciones)), max: Math.max(...dataWithPct.map(r => r.total_reparaciones)) },
            total_instalaciones: { min: Math.min(...dataWithPct.map(r => r.total_instalaciones)), max: Math.max(...dataWithPct.map(r => r.total_instalaciones)) },
            pct_reincidencia: { min: Math.min(...dataWithPct.map(r => r.pct_reincidencia)), max: Math.max(...dataWithPct.map(r => r.pct_reincidencia)) },
            pct_falla_temprana: { min: Math.min(...dataWithPct.map(r => r.pct_falla_temprana)), max: Math.max(...dataWithPct.map(r => r.pct_falla_temprana)) },
            pct_certificacion: { min: Math.min(...dataWithPct.map(r => r.pct_certificacion)), max: Math.max(...dataWithPct.map(r => r.pct_certificacion)) },
        };
        
        // 3. Calcular scores normalizados
        const dataWithScores = dataWithPct.map(row => ({
            ...row,
            score_prod_mantenimiento: scaleValue(row.total_reparaciones, benchmarks.total_reparaciones.min, benchmarks.total_reparaciones.max),
            score_prod_provision: scaleValue(row.total_instalaciones, benchmarks.total_instalaciones.min, benchmarks.total_instalaciones.max),
            score_calidad_reincidencia: scaleValue(row.pct_reincidencia, benchmarks.pct_reincidencia.min, benchmarks.pct_reincidencia.max, false),
            score_calidad_falla: scaleValue(row.pct_falla_temprana, benchmarks.pct_falla_temprana.min, benchmarks.pct_falla_temprana.max, false),
            score_certificacion: scaleValue(row.pct_certificacion, benchmarks.pct_certificacion.min, benchmarks.pct_certificacion.max),
        }));

        // 4. Calcular puntaje final y ordenar
        const peso_produccion = 0.30;
        const peso_calidad = 0.40;
        const peso_certificacion = 0.30;

        const finalData = dataWithScores.map(row => {
            const score_produccion_avg = (row.score_prod_mantenimiento + row.score_prod_provision) / 2;
            const score_calidad_avg = (row.score_calidad_reincidencia + row.score_calidad_falla) / 2;
            const puntaje_final = (score_produccion_avg * peso_produccion) + (score_calidad_avg * peso_calidad) + (row.score_certificacion * peso_certificacion);
            return {
                ...row,
                puntaje_final: puntaje_final
            }
        });

        finalData.sort((a, b) => b.puntaje_final - a.puntaje_final);

        res.json(finalData);

    } catch (err) {
        console.error('Error en el cálculo de Ranking de Empresas:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



app.get('/api/ranking/tecnicos', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red, empresa } = req.query;

    const f_inicio = (fecha_inicio && !isNaN(new Date(fecha_inicio))) ? fecha_inicio : '1900-01-01';
    const f_fin = (fecha_fin && !isNaN(new Date(fecha_fin))) ? fecha_fin : '2999-12-31';

    const valPropietarioRed = propietario_red ? propietario_red.toLowerCase() : 'todos';
    const valEmpresa = empresa ? empresa.toLowerCase() : 'todos';

    // *** CORRECCIÓN CLAVE AQUÍ: globalParams ahora fuerza ambos filtros a 'todos' ***
    const globalParams = [
        f_inicio, f_fin,
        KPI_FALLAS_TEMPRANAS.tipos_instalacion,
        KPI_FALLAS_TEMPRANAS.tipos_reparacion,
        KPI_CERTIFICACION.tipos_actividad,
        KPI_CERTIFICACION.mensaje_pattern,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_REINCIDENCIAS.noms_excl_patterns,
        'todos', // <-- ¡Siempre 'todos' para $9 (propietario_red) en el cálculo GLOBAL!
        'todos'  // <-- ¡Siempre 'todos' para $10 (empresa) en el cálculo GLOBAL!
    ];

    const globalQuery = `
        WITH base_produccion AS (
            SELECT "Recurso", lower("Empresa") as empresa, lower("Tipo de actividad") as tipo_actividad, lower("Mensaje certificación") as mensaje_cert
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2 AND lower("Estado de actividad") = 'finalizada'
              AND "ID de recurso"::text <> ALL($7) AND "Recurso" NOT ILIKE ANY($8)
              AND ($9 = 'todos' OR lower("Propietario de Red") = $9)
              AND ($10 = 'todos' OR lower("Empresa") = $10)
        ),
        base_calidad_reincidencia AS (
            SELECT "Recurso", "Cod_Servicio", "Fecha Agendamiento",
                    FIRST_VALUE(lower("Empresa")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                    ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                    LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2 AND lower("Estado de actividad") = 'finalizada'
              AND lower("Tipo de actividad") = ANY($4) AND "ID de recurso"::text <> ALL($7)
              AND "Recurso" NOT ILIKE ANY($8) AND ($9 = 'todos' OR lower("Propietario de Red") = $9)
              AND ($10 = 'todos' OR lower("Empresa") = $10)
        ),
        base_calidad_falla_temprana AS (
            SELECT "Recurso", "Cod_Servicio", "Fecha Agendamiento",
                    lower("Tipo de actividad") as tipo_actividad,
                    FIRST_VALUE(lower("Empresa")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as primera_empresa_servicio,
                    LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                    LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita,
                    ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita
            FROM public.actividades
            WHERE "Fecha Agendamiento" BETWEEN $1 AND $2 AND lower("Estado de actividad") = 'finalizada'
              AND (lower("Tipo de actividad") = ANY($4) OR lower("Tipo de actividad") = ANY($3))
              AND "ID de recurso"::text <> ALL($7) AND "Recurso" NOT ILIKE ANY($8)
              AND ($9 = 'todos' OR lower("Propietario de Red") = $9)
              AND ($10 = 'todos' OR lower("Empresa") = $10)
        ),
        kpis_produccion AS (
            SELECT "Recurso", empresa,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($3)) as total_instalaciones,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($4)) as total_reparaciones,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($5)) as total_certificables,
                    COUNT(*) FILTER (WHERE tipo_actividad = ANY($5) AND trim(mensaje_cert) LIKE $6) as total_certificadas
            FROM base_produccion WHERE "Recurso" IS NOT NULL AND trim("Recurso") <> '' GROUP BY "Recurso", empresa
        ),
        kpis_reincidencias AS (
            SELECT "Recurso", primera_empresa_servicio as empresa, COUNT(*) as total_reincidencias
            FROM base_calidad_reincidencia
            WHERE orden_visita = 1 AND fecha_siguiente_visita IS NOT NULL AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
            GROUP BY "Recurso", primera_empresa_servicio
        ),
        kpis_fallas AS (
            SELECT "Recurso", primera_empresa_servicio as empresa, COUNT(*) as total_fallas_tempranas
            FROM base_calidad_falla_temprana
            WHERE tipo_actividad = ANY($3) AND orden_visita = 1 AND fecha_siguiente_visita IS NOT NULL AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days' AND tipo_siguiente_visita = ANY($4)
            GROUP BY "Recurso", primera_empresa_servicio
        )
        SELECT 
            p."Recurso", 
            p.empresa,
            p.total_instalaciones, p.total_reparaciones, p.total_certificables, p.total_certificadas,
            COALESCE(r.total_reincidencias, 0) as total_reincidencias,
            COALESCE(f.total_fallas_tempranas, 0) as total_fallas_tempranas
        FROM kpis_produccion p
        LEFT JOIN kpis_reincidencias r ON p."Recurso" = r."Recurso" AND p.empresa = r.empresa
        LEFT JOIN kpis_fallas f ON p."Recurso" = f."Recurso" AND p.empresa = f.empresa
        WHERE p.total_reparaciones + p.total_instalaciones > 5;
    `;

    try {
        const { rows: allTecnicosData } = await db.query(globalQuery, globalParams);

        if (allTecnicosData.length === 0) {
            return res.json([]);
        }

        const allTecnicosDataWithPct = allTecnicosData.map(row => {
            const total_reparaciones = parseInt(row.total_reparaciones, 10) || 0;
            const total_instalaciones = parseInt(row.total_instalaciones, 10) || 0;
            const total_reincidencias = parseInt(row.total_reincidencias, 10) || 0;
            const total_fallas_tempranas = parseInt(row.total_fallas_tempranas, 10) || 0;
            const total_certificables = parseInt(row.total_certificables, 10) || 0;
            const total_certificadas = parseInt(row.total_certificadas, 10) || 0;
            
            return {
                ...row,
                total_reparaciones, total_instalaciones, total_reincidencias,
                total_fallas_tempranas, total_certificables, total_certificadas,
                pct_reincidencia: total_reparaciones > 0 ? (total_reincidencias / total_reparaciones * 100) : 0,
                pct_falla_temprana: total_instalaciones > 0 ? (total_fallas_tempranas / total_instalaciones * 100) : 0,
                pct_certificacion: total_certificables > 0 ? (total_certificadas / total_certificables * 100) : 0,
            };
        });

        const globalBenchmarks = {
            total_reparaciones: { min: Math.min(...allTecnicosDataWithPct.map(r => r.total_reparaciones)), max: Math.max(...allTecnicosDataWithPct.map(r => r.total_reparaciones)) },
            total_instalaciones: { min: Math.min(...allTecnicosDataWithPct.map(r => r.total_instalaciones)), max: Math.max(...allTecnicosDataWithPct.map(r => r.total_instalaciones)) },
            pct_reincidencia: { min: Math.min(...allTecnicosDataWithPct.map(r => r.pct_reincidencia)), max: Math.max(...allTecnicosDataWithPct.map(r => r.pct_reincidencia)) },
            pct_falla_temprana: { min: Math.min(...allTecnicosDataWithPct.map(r => r.pct_falla_temprana)), max: Math.max(...allTecnicosDataWithPct.map(r => r.pct_falla_temprana)) },
            pct_certificacion: { min: Math.min(...allTecnicosDataWithPct.map(r => r.pct_certificacion)), max: Math.max(...allTecnicosDataWithPct.map(r => r.pct_certificacion)) },
        };
        
        const specificParams = [
            f_inicio, f_fin,
            KPI_FALLAS_TEMPRANAS.tipos_instalacion,
            KPI_FALLAS_TEMPRANAS.tipos_reparacion,
            KPI_CERTIFICACION.tipos_actividad,
            KPI_CERTIFICACION.mensaje_pattern,
            KPI_MULTISKILL.recursos_excluidos_id,
            KPI_REINCIDENCIAS.noms_excl_patterns,
            valPropietarioRed, // $9 (filtrar por propietario_red si no es 'todos')
            valEmpresa         // $10 (filtrar por empresa si no es 'todos')
        ];

        const { rows: filteredTecnicosData } = await db.query(globalQuery, specificParams);

        if (filteredTecnicosData.length === 0) {
            return res.json([]);
        }

        const filteredDataWithPct = filteredTecnicosData.map(row => {
            const total_reparaciones = parseInt(row.total_reparaciones, 10) || 0;
            const total_instalaciones = parseInt(row.total_instalaciones, 10) || 0;
            const total_reincidencias = parseInt(row.total_reincidencias, 10) || 0;
            const total_fallas_tempranas = parseInt(row.total_fallas_tempranas, 10) || 0;
            const total_certificables = parseInt(row.total_certificables, 10) || 0;
            const total_certificadas = parseInt(row.total_certificadas, 10) || 0;
            
            return {
                ...row,
                total_reparaciones, total_instalaciones, total_reincidencias,
                total_fallas_tempranas, total_certificables, total_certificadas,
                pct_reincidencia: total_reparaciones > 0 ? (total_reincidencias / total_reparaciones * 100) : 0,
                pct_falla_temprana: total_instalaciones > 0 ? (total_fallas_tempranas / total_instalaciones * 100) : 0,
                pct_certificacion: total_certificables > 0 ? (total_certificadas / total_certificables * 100) : 0,
            };
        });

        const dataWithScores = filteredDataWithPct.map(row => ({
            ...row,
            score_prod_mantenimiento: scaleValue(row.total_reparaciones, globalBenchmarks.total_reparaciones.min, globalBenchmarks.total_reparaciones.max),
            score_prod_provision: scaleValue(row.total_instalaciones, globalBenchmarks.total_instalaciones.min, globalBenchmarks.total_instalaciones.max),
            score_calidad_reincidencia: scaleValue(row.pct_reincidencia, globalBenchmarks.pct_reincidencia.min, globalBenchmarks.pct_reincidencia.max, false),
            score_calidad_falla: scaleValue(row.pct_falla_temprana, globalBenchmarks.pct_falla_temprana.min, globalBenchmarks.pct_falla_temprana.max, false),
            score_certificacion: scaleValue(row.pct_certificacion, globalBenchmarks.pct_certificacion.min, globalBenchmarks.pct_certificacion.max),
        }));

        const peso_produccion = 0.30;
        const peso_calidad = 0.40;
        const peso_certificacion = 0.30;

        const finalData = dataWithScores.map(row => {
            const score_produccion_avg = (row.score_prod_mantenimiento + row.score_prod_provision) / 2;
            const score_calidad_avg = (row.score_calidad_reincidencia + row.score_calidad_falla) / 2;
            const puntaje_final = (score_produccion_avg * peso_produccion) + (score_calidad_avg * peso_calidad) + (row.score_certificacion * peso_certificacion);
            
            return {
                Recurso: row.Recurso,
                Empresa: row.empresa,
                puntaje_final: puntaje_final,
                total_instalaciones: row.total_instalaciones,
                total_reparaciones: row.total_reparaciones,
                pct_reincidencia: row.pct_reincidencia,
                pct_falla_temprana: row.pct_falla_temprana,
                pct_certificacion: row.pct_certificacion,
            }
        });

        finalData.sort((a, b) => b.puntaje_final - a.puntaje_final);

        res.json(finalData);

    } catch (err) {
        console.error('Error en el cálculo de Ranking de Técnicos:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- ENDPOINT DE REPARACIONES (ACTUALIZADO) ---
// --- ENDPOINT DE REPARACIONES (AJUSTADO A LÓGICA PYTHON) ---
app.get('/api/produccion/reparaciones-por-comuna', async (req, res) => {
  const { fecha_inicio, fecha_fin, propietario_red } = req.query;

  const tipos_reparacion = [
    'reparación 3play light',
    'reparación empresa masivo fibra',
    'reparación-hogar-fibra'
  ];

  const params = [
    tipos_reparacion,
    KPI_MULTISKILL.recursos_excluidos_id.map(id => String(id)),
    KPI_MULTISKILL.recursos_excluidos_nombre
  ];

  let whereClauses = [
    'lower(a."Tipo de actividad") = ANY($1)',
    'a."ID de recurso"::text <> ALL($2)',
    'lower(a."Recurso") <> ALL($3)',
    'a."Comuna" IS NOT NULL AND trim(a."Comuna") <> \'\''
  ];

  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`a."Propietario de Red" = $${params.length}`);
  }

  const query = `
    SELECT 
      initcap(trim(a."Comuna")) AS comuna,
      COUNT(*) AS total
    FROM public.actividades a
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY initcap(trim(a."Comuna"))
    ORDER BY COUNT(*) DESC;
  `;

  try {
    const { rows } = await db.query(query, params);
    const results = rows.map(row => ({ ...row, total: String(row.total) }));
    res.json(results);
  } catch (err) {
    console.error('Error en /reparaciones-por-comuna:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// --- ENDPOINT DE INSTALACIONES (VERSIÓN DEFINITIVA) ---
app.get('/api/produccion/instalaciones-por-comuna', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    const tipos_instalacion = [
        'instalación-hogar-fibra',
        'instalación-masivo-fibra',
        'postventa-hogar-fibra',
        'postventa-masivo-equipo',
        'postventa-masivo-fibra'
    ];

    const params = [
        tipos_instalacion,
        KPI_MULTISKILL.recursos_excluidos_id,
        KPI_MULTISKILL.recursos_excluidos_nombre
    ];

    let whereClauses = [
        'lower(a."Tipo de actividad") = ANY($1)',
        'a."ID de recurso"::text <> ALL($2)',
        'lower(a."Recurso") <> ALL($3)',
        'a."Comuna" IS NOT NULL AND trim(a."Comuna") <> \'\''
    ];

    if (fecha_inicio && fecha_fin) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const query = `
        SELECT
            initcap(trim(a."Comuna")) AS comuna,
            COUNT(*) AS total
        FROM
            public.actividades a
        WHERE
            ${whereClauses.join(' AND ')}
        GROUP BY
            initcap(trim(a."Comuna"))
        ORDER BY
            COUNT(*) DESC;
    `;

    try {
        const { rows } = await db.query(query, params);
        const results = rows.map(row => ({ ...row, total: String(row.total) }));
        res.json(results);
    } catch (err) {
        console.error('Error en /instalaciones-por-comuna:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/calidad/por-comuna', async (req, res) => {
    // Obtenemos los filtros que nos envía el frontend
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    // Constantes para los tipos de actividad
    const tipos_reparacion = ['reparación 3play light', 'reparación empresa masivo fibra', 'reparación-hogar-fibra'];
    const tipos_instalacion = ['instalación-hogar-fibra', 'instalación-masivo-fibra'];
    const todos_tipos = [...tipos_reparacion, ...tipos_instalacion];

    // Constantes de exclusión (asumiendo que están en tu kpi-config.js o definidas aquí)
    const ids_excl = ['3826', '3824', '3825', '5286', '3823', '3822'];
    const noms_excl = ['bio', 'sice', 'rex', 'rielecom', 'famer', 'hometelcom', 'zener', 'prointel', 'soportevision', 'telsycab'];
    const noms_excl_patterns = noms_excl.map(nom => `%${nom}%`);

    // --- Construcción de la consulta ---
    const params = [
        tipos_reparacion,
        tipos_instalacion,
        todos_tipos,
        ids_excl,
        noms_excl_patterns
    ];
    
    // Cláusula WHERE base
    let whereClauses = [
        `lower(a."Estado de actividad") = 'finalizada'`,
        `lower(a."Tipo de actividad") = ANY($3)`,
        `a."Comuna" IS NOT NULL`,
        `a."ID de recurso"::text <> ALL($4)`,
        `NOT (a."Recurso" ILIKE ANY($5))`
    ];

    // Filtros dinámicos
    if (fecha_inicio && fecha_fin) {
        params.push(fecha_inicio, fecha_fin);
        whereClauses.push(`a."Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
    }
    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    const query = `
        WITH visitas_enriquecidas AS (
            SELECT 
                "Comuna" as comuna,
                -- Limpiamos el nombre de la empresa directamente en la consulta
                regexp_replace("Empresa", '(?i)data_diaria[_\\\\-]*', '', 'g') as empresa,
                "Cod_Servicio",
                "Fecha Agendamiento",
                lower("Tipo de actividad") as tipo_actividad,
                ROW_NUMBER() OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as orden_visita,
                LEAD(lower("Tipo de actividad")) OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as tipo_siguiente_visita,
                LEAD("Fecha Agendamiento") OVER (PARTITION BY "Cod_Servicio" ORDER BY "Fecha Agendamiento") as fecha_siguiente_visita
            FROM public.actividades a
            WHERE ${whereClauses.join(' AND ')}
        ),
        kpis_calculados AS (
            SELECT
                comuna, empresa,
                CASE WHEN tipo_actividad = ANY($1) AND orden_visita = 1
                    AND fecha_siguiente_visita IS NOT NULL AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
                THEN 1 ELSE 0 END as es_reincidencia,
                CASE WHEN tipo_actividad = ANY($2) AND orden_visita = 1
                    AND fecha_siguiente_visita IS NOT NULL AND fecha_siguiente_visita <= "Fecha Agendamiento" + INTERVAL '10 days'
                    AND tipo_siguiente_visita = ANY($1)
                THEN 1 ELSE 0 END as es_falla_temprana
            FROM visitas_enriquecidas
        )
        SELECT 
            comuna, empresa,
            SUM(es_reincidencia) as total_reincidencias,
            SUM(es_falla_temprana) as total_fallas_tempranas
        FROM kpis_calculados
        GROUP BY comuna, empresa
        HAVING SUM(es_reincidencia) > 0 OR SUM(es_falla_temprana) > 0
        ORDER BY comuna, SUM(es_reincidencia) + SUM(es_falla_temprana) DESC;
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al calcular estadísticas de calidad por comuna:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// En server.js

// En server.js

app.get('/api/tiempos/datos-jerarquicos', async (req, res) => {
  const { fecha_inicio, fecha_fin, propietario_red } = req.query;

  const tipos_a_incluir = [
    'instalación-hogar-fibra', 'instalación-masivo-fibra', 'incidencia manual',
    'postventa-hogar-fibra', 'reparación 3play light', 'postventa-masivo-equipo',
    'postventa-masivo-fibra', 'reparación empresa masivo fibra', 'reparación-hogar-fibra'
  ];
  const ids_excl = ['3826', '3824', '3825', '5286', '3823', '3822'];

  let whereClauses = [
    `lower("Estado de actividad") = 'finalizada'`,
    `"Duración" IS NOT NULL AND "Duración" > INTERVAL '0 seconds'`,
    `"Comuna" IS NOT NULL AND trim("Comuna") <> ''`,
    `lower("Tipo de actividad") = ANY($1)`,
    `trim("ID de recurso"::text) <> ALL($2)`
  ];
  const params = [tipos_a_incluir, ids_excl];

  if (fecha_inicio && fecha_fin) {
    params.push(fecha_inicio, fecha_fin);
    whereClauses.push(`"Fecha Agendamiento" BETWEEN $${params.length - 1} AND $${params.length}`);
  }

  if (propietario_red && propietario_red !== 'todos') {
    params.push(propietario_red);
    whereClauses.push(`"Propietario de Red" = $${params.length}`);
  }

  const query = `
    SELECT 
      "Tipo de actividad" AS tipo,  -- mantén el nombre original, con mayúsculas y guiones
      "Comuna" AS comuna,
      EXTRACT(EPOCH FROM "Duración") / 60.0 AS duracion_minutos
    FROM public.actividades
    WHERE ${whereClauses.join(' AND ')}
  `;

  try {
    const { rows } = await db.query(query, params);

    if (!rows.length) {
      return res.json({ name: 'Actividades', children: [] });
    }

    const agrupado = {};

    for (const row of rows) {
      const tipo = row.tipo;
      const comuna = row.comuna;
      const duracion = parseFloat(row.duracion_minutos);

      if (!agrupado[tipo]) {
        agrupado[tipo] = { total: 0, count: 0, comunas: {} };
      }

      agrupado[tipo].total += duracion;
      agrupado[tipo].count += 1;

      if (!agrupado[tipo].comunas[comuna]) {
        agrupado[tipo].comunas[comuna] = { total: 0, count: 0 };
      }

      agrupado[tipo].comunas[comuna].total += duracion;
      agrupado[tipo].comunas[comuna].count += 1;
    }

    const children = Object.entries(agrupado).map(([tipo, data]) => ({
      name: tipo,
      value: data.count ? data.total / data.count : 0,
      children: Object.entries(data.comunas).map(([comuna, cdata]) => ({
        name: comuna,
        value: cdata.count ? cdata.total / cdata.count : 0
      }))
    }));

    res.json({ name: 'Actividades', children });
  } catch (err) {
    console.error('Error al obtener datos jerárquicos de tiempo:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// En server.js

// Endpoint 1: Para obtener la lista de empresas y poblar el filtro
app.get('/api/empresas', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT DISTINCT "Empresa" FROM public.actividades WHERE "Empresa" IS NOT NULL ORDER BY "Empresa";');
        res.json(rows.map(row => row.Empresa));
    } catch (err) {
        console.error('Error al obtener la lista de empresas:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint 2: Para obtener el resumen general cuando se selecciona una empresa
app.get('/api/tiempos/resumen-por-empresa', async (req, res) => {
    const { empresa, fecha_inicio, fecha_fin } = req.query;
    if (!empresa) return res.status(400).json({ error: 'La empresa es requerida.' });
    
    // Usamos CTEs (Common Table Expressions) para organizar la consulta
    const query = `
        WITH ActividadesBase AS (
            SELECT
                "Recurso",
                "Tipo de actividad",
                EXTRACT(EPOCH FROM "Duración") / 60.0 AS duracion_minutos
            FROM public.actividades
            WHERE 
                lower("Empresa") = lower($1)
                AND "Fecha Agendamiento" BETWEEN $2 AND $3
                AND lower("Estado de actividad") = 'finalizada'
                AND "Duración" IS NOT NULL AND "Duración" > INTERVAL '0 seconds'
        ),
        PromedioPorTecnico AS (
            SELECT "Recurso", AVG(duracion_minutos) as promedio_total
            FROM ActividadesBase
            GROUP BY "Recurso"
        ),
        PromedioPorActividad AS (
            SELECT "Tipo de actividad" as actividad, AVG(duracion_minutos) as promedio_minutos
            FROM ActividadesBase
            GROUP BY "Tipo de actividad"
            ORDER BY promedio_minutos DESC
        )
        SELECT
            (SELECT json_build_object('nombre', "Recurso", 'promedio_minutos', promedio_total) FROM PromedioPorTecnico ORDER BY promedio_total ASC LIMIT 1) as "tecnicoMasRapido",
            (SELECT json_build_object('nombre', "Recurso", 'promedio_minutos', promedio_total) FROM PromedioPorTecnico ORDER BY promedio_total DESC LIMIT 1) as "tecnicoMasLento",
            (SELECT json_agg(to_json(PromedioPorActividad.*)) FROM PromedioPorActividad) as "promedioPorActividad",
            (SELECT json_agg(json_build_object('nombre', "Recurso")) FROM PromedioPorTecnico ORDER BY "Recurso") as "tecnicos"
    `;

    try {
        const { rows } = await db.query(query, [empresa, fecha_inicio, fecha_fin]);
        res.json(rows[0]); // La consulta devuelve una sola fila con todos los datos anidados
    } catch (err) {
        console.error('Error en resumen por empresa:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint 3: Para obtener el detalle de un técnico específico
// En server.js

// Endpoint 1: Para obtener la lista de empresas y llenar el filtro
app.get('/api/empresas', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT DISTINCT "Empresa" FROM public.actividades WHERE "Empresa" IS NOT NULL ORDER BY "Empresa";');
        res.json(rows.map(row => row.Empresa));
    } catch (err) {
        console.error('Error al obtener la lista de empresas:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint 2: Para obtener el resumen general cuando se selecciona una empresa
app.get('/api/tiempos/resumen-por-empresa', async (req, res) => {
    const { empresa, fecha_inicio, fecha_fin } = req.query;
    if (!empresa) return res.status(400).json({ error: 'La empresa es requerida.' });
    
    const query = `
        WITH ActividadesBase AS (
            SELECT
                "Recurso",
                "Tipo de actividad",
                EXTRACT(EPOCH FROM "Duración") / 60.0 AS duracion_minutos
            FROM public.actividades
            WHERE 
                lower("Empresa") = lower($1)
                AND "Fecha Agendamiento" BETWEEN $2 AND $3
                AND lower("Estado de actividad") = 'finalizada'
                AND "Duración" IS NOT NULL AND "Duración" > INTERVAL '0 seconds'
        ),
        PromedioPorTecnico AS (
            SELECT "Recurso", AVG(duracion_minutos) as promedio_total
            FROM ActividadesBase
            WHERE "Recurso" IS NOT NULL AND trim("Recurso") <> ''
            GROUP BY "Recurso"
        ),
        PromedioPorActividad AS (
            SELECT "Tipo de actividad" as actividad, AVG(duracion_minutos) as promedio_minutos
            FROM ActividadesBase
            GROUP BY "Tipo de actividad"
            ORDER BY promedio_minutos DESC
        )
        SELECT
            (SELECT json_build_object('nombre', "Recurso", 'promedio_minutos', promedio_total) FROM PromedioPorTecnico ORDER BY promedio_total ASC LIMIT 1) as "tecnicoMasRapido",
            (SELECT json_build_object('nombre', "Recurso", 'promedio_minutos', promedio_total) FROM PromedioPorTecnico ORDER BY promedio_total DESC LIMIT 1) as "tecnicoMasLento",
            (SELECT json_agg(to_json(PromedioPorActividad.*)) FROM PromedioPorActividad) as "promedioPorActividad",
            (SELECT json_agg(json_build_object('nombre', "Recurso")) FROM PromedioPorTecnico ORDER BY "Recurso") as "tecnicos"
    `;

    try {
        const { rows } = await db.query(query, [empresa, fecha_inicio, fecha_fin]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Error en resumen por empresa:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint 3: Para obtener el detalle de un técnico específico
// En server.js

// Reemplaza el endpoint en tu server.js con este

// En server.js

app.get('/api/empresas', async (req, res) => {
    try {
        // Esta consulta obtiene todos los nombres de empresa únicos, sin nulos ni vacíos, y los ordena alfabéticamente.
        const query = `
            SELECT DISTINCT "Empresa" 
            FROM public.actividades 
            WHERE "Empresa" IS NOT NULL AND trim("Empresa") <> '' 
            ORDER BY "Empresa" ASC;
        `;
        const { rows } = await db.query(query);

        // La respuesta de la API será un array simple, como: ["BIO", "ENTEL", "HOMETELECOM", ...]
        res.json(rows.map(row => row.Empresa));

    } catch (err) {
        console.error('Error al obtener la lista de empresas:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// En server.js

// REEMPLAZA TU ENDPOINT EXISTENTE POR ESTE CÓDIGO CORREGIDO
// En server.js

// REEMPLAZA TU ENDPOINT EXISTENTE POR ESTE CÓDIGO FINAL Y ROBUSTO
app.get('/api/tiempos/por-empresa', async (req, res) => {
    const { empresa, fecha_inicio, fecha_fin, propietario_red } = req.query;
    if (!empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Empresa, fecha de inicio y fecha de fin son requeridos.' });
    }

    const tipos_a_incluir = [
        'instalación-hogar-fibra', 'instalación-masivo-fibra', 'incidencia manual',
        'postventa-hogar-fibra', 'reparación 3play light', 'postventa-masivo-equipo',
        'postventa-masivo-fibra', 'reparación empresa masivo fibra', 'reparación-hogar-fibra'
    ];
    const ids_excl = ['3826', '3824', '3825', '5286', '3823', '3822'];

    let whereClauses = [
        `lower(a."Empresa") = lower($1)`,
        `a."Fecha Agendamiento" BETWEEN $2 AND $3`,
        `lower(a."Estado de actividad") = 'finalizada'`,
        `a."Duración" IS NOT NULL AND a."Duración" > INTERVAL '0 seconds'`,
        `lower(a."Tipo de actividad") = ANY($4)`,
        `trim(a."ID de recurso"::text) <> ALL($5)`
    ];
    const params = [empresa, fecha_inicio, fecha_fin, tipos_a_incluir, ids_excl];

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`a."Propietario de Red" = $${params.length}`);
    }

    // Consulta reescrita para máxima robustez
    const query = `
        WITH ActividadesBase AS (
            SELECT
                "Recurso",
                "Tipo de actividad",
                EXTRACT(EPOCH FROM "Duración") / 60.0 AS duracion_minutos
            FROM public.actividades a
            WHERE ${whereClauses.join(' AND ')}
        ),
        PromedioPorTecnico AS (
            SELECT "Recurso", AVG(duracion_minutos) as promedio_total
            FROM ActividadesBase
            WHERE "Recurso" IS NOT NULL AND trim("Recurso") <> ''
            GROUP BY "Recurso"
        ),
        PromedioPorActividad AS (
            SELECT "Tipo de actividad" as actividad, AVG(duracion_minutos) as promedio_minutos
            FROM ActividadesBase
            GROUP BY "Tipo de actividad"
        ),
        RankedTecnicos AS (
            SELECT "Recurso", promedio_total,
                   ROW_NUMBER() OVER (ORDER BY promedio_total ASC) as rank_asc,
                   ROW_NUMBER() OVER (ORDER BY promedio_total DESC) as rank_desc
            FROM PromedioPorTecnico
        )
        SELECT
            (SELECT json_build_object('nombre', "Recurso", 'promedio_minutos', promedio_total) FROM RankedTecnicos WHERE rank_asc = 1) as "tecnicoMasRapido",
            (SELECT json_build_object('nombre', "Recurso", 'promedio_minutos', promedio_total) FROM RankedTecnicos WHERE rank_desc = 1) as "tecnicoMasLento",
            (SELECT json_agg(to_json(pa.*) ORDER BY pa.promedio_minutos DESC) FROM PromedioPorActividad pa) as "promedioPorActividad",
            (SELECT json_agg(json_build_object('nombre', "Recurso") ORDER BY "Recurso") FROM PromedioPorTecnico) as "tecnicos"
    `;

    try {
        const { rows } = await db.query(query, params);
        // Si no hay datos, rows[0] contendrá nulls, lo cual es manejable, pero es mejor enviar un objeto vacío y limpio
        const result = {
            tecnicoMasRapido: rows[0].tecnicoMasRapido || null,
            tecnicoMasLento: rows[0].tecnicoMasLento || null,
            promedioPorActividad: rows[0].promedioPorActividad || [],
            tecnicos: rows[0].tecnicos || []
        };
        res.json(result);
    } catch (err) {
        console.error('Error en /api/tiempos/por-empresa:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// En server.js
// REEMPLAZA ESTE ENDPOINT COMPLETO TAMBIÉN
app.get('/api/tiempos/detalle-por-tecnico', async (req, res) => {
    const { empresa, fecha_inicio, fecha_fin, tecnico, propietario_red } = req.query;
    if (!empresa || !tecnico) return res.status(400).json({ error: 'Empresa y técnico son requeridos.' });

    const ids_excl = ['3826', '3824', '3825', '5286', '3823', '3822'];
    const tipos_a_incluir = [
        'instalación-hogar-fibra', 'instalación-masivo-fibra', 'incidencia manual', 'postventa-hogar-fibra', 
        'reparación 3play light', 'postventa-masivo-equipo', 'postventa-masivo-fibra', 
        'reparación empresa masivo fibra', 'reparación-hogar-fibra'
    ];

    let whereClauses = [
        `lower("Empresa") = lower($1)`,
        `"Fecha Agendamiento" BETWEEN $2 AND $3`,
        `"Recurso" = $4`,
        `lower("Estado de actividad") = 'finalizada'`,
        `"Duración" IS NOT NULL AND "Duración" > INTERVAL '0 seconds'`,
        `lower("Tipo de actividad") = ANY($5)`,
        `trim("ID de recurso"::text) <> ALL($6)`
    ];
    const params = [empresa, fecha_inicio, fecha_fin, tecnico, tipos_a_incluir, ids_excl];

    // CAMBIO: Añadimos la lógica del filtro de red, si se proporciona
    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`"Propietario de Red" = $${params.length}`);
    }

    const query = `
        SELECT "Recurso", "Tipo de actividad", AVG(EXTRACT(EPOCH FROM "Duración") / 60.0) as "tiempo_promedio"
        FROM public.actividades
        WHERE ${whereClauses.join(' AND ')}
        GROUP BY "Recurso", "Tipo de actividad"
        ORDER BY "tiempo_promedio" DESC;
    `;
    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error en detalle por técnico:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// En server.js

app.get('/api/calidad/causas-falla', async (req, res) => {
    const { fecha_inicio, fecha_fin, propietario_red } = req.query;

    const tipos_reparacion = ['reparación empresa masivo fibra', 'reparación-hogar-fibra', 'reparación 3play light'];

    let whereClauses = [
        `"Fecha Agendamiento" BETWEEN $1 AND $2`,
        `"Causa de la falla" IS NOT NULL AND trim("Causa de la falla") <> ''`,
        `lower("Tipo de actividad") = ANY($3)`
    ];
    const params = [fecha_inicio, fecha_fin, tipos_reparacion];

    if (propietario_red && propietario_red !== 'todos') {
        params.push(propietario_red);
        whereClauses.push(`"Propietario de Red" = $${params.length}`);
    }

    // Esta consulta cuenta cuántas veces aparece cada causa en cada comuna
    const query = `
        SELECT
            TRIM(LOWER("Comuna")) as comuna,
            TRIM(LOWER("Causa de la falla")) as causa,
            COUNT(*) as total
        FROM public.actividades
        WHERE ${whereClauses.join(' AND ')}
        GROUP BY
            TRIM(LOWER("Comuna")),
            TRIM(LOWER("Causa de la falla"));
    `;

    try {
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error al obtener causas de falla:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// En server.js

app.get('/api/buscar/actividades', async (req, res) => {
    const { termino_busqueda } = req.query;

    // Si no hay término de búsqueda, devolvemos un array vacío.
    if (!termino_busqueda || termino_busqueda.trim() === '') {
        return res.json([]);
    }

    // Convertimos el término a minúsculas y añadimos los comodines para la búsqueda LIKE
    const search_pattern = `%${termino_busqueda.toLowerCase()}%`;

    const query = `
        SELECT
            "Fecha Agendamiento", "Empresa", "Recurso", "Estado de actividad",
            "Tipo de actividad", "Cod_Servicio", "Rut Cliente", "Nombre Cliente", 
            "ID externo", "Observación", "Acción realizada", "Dirección", "Comuna", "Propietario de Red"
        FROM public.actividades
        WHERE
            -- Usamos ILIKE para una búsqueda case-insensitive nativa de PostgreSQL, es más eficiente
            "ID externo"::text ILIKE $1
            OR "Recurso" ILIKE $1
            OR "Cod_Servicio"::text ILIKE $1
            OR "Rut Cliente" ILIKE $1
            OR "Nombre Cliente" ILIKE $1
            OR "Observación" ILIKE $1
            OR "Acción realizada" ILIKE $1
        ORDER BY
            "Fecha Agendamiento" DESC
        LIMIT 200; -- Mantenemos un límite para proteger el rendimiento
    `;

    try {
        const { rows } = await db.query(query, [search_pattern]);
        res.json(rows);
    } catch (err) {
        console.error('Error en la búsqueda de actividades:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});



const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Servidor backend corriendo en el puerto ${port}`);
});
