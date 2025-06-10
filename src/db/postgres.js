const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
  database: process.env.PG_DB,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillie: 30000, // Close idle clients after 30 seconds
});

module.exports = pool;
