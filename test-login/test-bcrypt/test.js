var bcrypt = require("bcrypt");
const saltRounds = 10;
const myPlaintextPassword = '***REMOVED***';
const someOtherPlaintextPassword = 'not_bacon';
var salt = bcrypt.genSaltSync(saltRounds);
var hash = bcrypt.hashSync(myPlaintextPassword, salt);

var bcrypt2 = require("bcrypt");

bcrypt2.compare(someOtherPlaintextPassword, hash, function(err, res) {
    console.log(res);
});