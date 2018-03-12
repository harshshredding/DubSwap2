const { Pool, Client } = require('pg');
const connectionString = 'postgresql://ubuntu:***REMOVED***@localhost:5432/dubswap';

const pool = new Pool({
  connectionString: connectionString,
});

pool.query('SELECT * FROM distributors', (err, res) => {
  console.log(res.rows);
  pool.end();
});

const client = new Client({
  connectionString: connectionString,
});
client.connect();

client.query('SELECT * FROM distributors', (err, res) => {
  client.end();
});

