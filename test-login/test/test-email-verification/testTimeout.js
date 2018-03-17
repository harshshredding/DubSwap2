var async = require('async');
async.parallel([
    function(callback) { setTimeout(function(){ console.log("Hello"); }, 3000);},
    function(callback) { console.log("hello1") },
    function(callback) { console.log("hello2") }
]);
console.log("hoihoi");

