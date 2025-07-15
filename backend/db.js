// db.js
require('dotenv').config();
const { Pool } = require('pg');

console.log("Iniciando conexión a la base de datos...");
console.log(`Host: ${process.env.PGHOST}, Usuario: ${process.env.PGUSER}`);

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT, 10),
  // Esta configuración es clave para conectar a AWS RDS
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};