// random test file
var pool = require('../../db/db-module.js');
pool.query('select * from users where username=$1', ['harshv'])
.then((results)=>{
    console.log(results);
    return pool.query('select * from users where username=$1', ['harshv']);
})
.then((results)=>{
    console.log(results);
});


