const { Pool, Client } = require('pg');
const connectionString = 'postgresql://ubuntu:***REMOVED***@localhost:5432/dubswap';

const pool = new Pool({
  connectionString: connectionString,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});


module.exports = {
  query: (text, params, callback) => {
    return pool.query(text, params, callback);
  }
};



