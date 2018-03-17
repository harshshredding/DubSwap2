var pool = require("../../db/db-module.js");

var howdi = 'hola';

pool.query("SELECT * from verificationtable",[],function(err, result){
  if(err){
    console.log(err);
  }
 console.log(howdi);
 pool.query("SELECT * from verificationtable",[],function(err, result){
    console.log(howdi);
 });
    
});

hash = '$2a$10$cazkhkge8fMXdrgtqOprku4.WO.YpyFwiTyS7WhZAS4Pl1ezcDnkW';

pool.query("update users set type='true' where password=$1", [hash], function(err, result) {
               
               if (err) {
                   console.log(err);
               }
               
           });

