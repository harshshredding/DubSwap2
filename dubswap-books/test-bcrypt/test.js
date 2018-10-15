// Some random test file
var bcrypt = require("bcrypt");
const saltRounds = 10;
const myPlaintextPassword = '***REMOVED***';
const someOtherPlaintextPassword = 'not_bacon';
var salt = bcrypt.genSaltSync(saltRounds);
for (var i = 0 ; i < 5; i++) {
    console.log("salt : " + bcrypt.genSaltSync(saltRounds));
}
var hash = bcrypt.hashSync(myPlaintextPassword, salt);
console.log(hash);

var bcrypt2 = require("bcrypt");

bcrypt2.compare(someOtherPlaintextPassword, hash, function(err, res) {
    if (err) {
        console.log("Error while comparing hash with password.");
        console.log(err);
    }
    console.log(res);
});