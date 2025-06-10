const pool = require('./src/db/postgres');

(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', res.rows[0]);
  } catch (err) {
    console.error('Error connecting to the database:', err);
  } finally {
    await pool.end();
  }
})();
