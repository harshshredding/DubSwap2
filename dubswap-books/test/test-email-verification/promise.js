// test file testing promises in javascript
// They are more than just syntactic sugar :D 

var pool = require("../../db/db-module.js");
var value;
pool.query('SELECT NOW() as now')
  .then(res => value = res.rows[0])
  .catch(e => console.error(e.stack));