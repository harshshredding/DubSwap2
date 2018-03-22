// will be used to delete record of user he/she hasn't verified after registration for a long time.
var async = require('async');
async.parallel([
    function(callback) { setTimeout(function(){ console.log("Hello"); }, 3000);},
    function(callback) { console.log("hello1") },
    function(callback) { console.log("hello2") }
]);
console.log("hoihoi");

