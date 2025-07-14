// db.js
const { Pool } = require('pg');

const config = {};

if (process.env.DATABASE_URL) {
  // Producción (RDS en EB): conexión via URL + SSL
  console.log("Producción: Usando DATABASE_URL con SSL.");
  config.connectionString = process.env.DATABASE_URL;
  config.ssl = { rejectUnauthorized: false };
} else {
  // Desarrollo local: variables separadas
  console.log("Entorno local: variables separadas para conexión.");
  console.log("DEBUG: PGPASSWORD =", process.env.PGPASSWORD, "tipo:", typeof process.env.PGPASSWORD);

  config.host = process.env.PGHOST;
  config.user = process.env.PGUSER;
  config.password = process.env.PGPASSWORD;
  config.database = process.env.PGDATABASE;
  config.port = parseInt(process.env.PGPORT, 10) || 5432;

  // Hacer que el cliente use SSL incluso en local
  config.ssl = { rejectUnauthorized: false };  // fuerza sslmode=require
}

const pool = new Pool(config);

module.exports = {
  query: (text, params) => pool.query(text, params),
};
