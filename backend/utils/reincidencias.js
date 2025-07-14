function procesarDistribucionReincidencias(rows) {
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

  resultado.entel.desglose_reincidencias.forEach(d => d.porcentaje = (d.casos * 100 / totalReincidenciasEntel) || 0);
  resultado.onnet.desglose_reincidencias.forEach(d => d.porcentaje = (d.casos * 100 / totalReincidenciasOnnet) || 0);

  return resultado;
}

module.exports = { procesarDistribucionReincidencias };
