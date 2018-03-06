const { Pool, Client } = require('pg');
const connectionString = 'postgresql://ubuntu:***REMOVED***@localhost:5432/hersheys';

const pool = new Pool({
  connectionString: connectionString,
});

pool.query('SELECT * FROM distributors', (err, res) => {
  console.log(err);
  console.log("you just selected something");
  pool.end();
});

const client = new Client({
  connectionString: connectionString,
});
client.connect();

client.query('SELECT * FROM distributors', (err, res) => {
  console.log(err);
  client.end();
})