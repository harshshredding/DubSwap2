var bcrypt = require('bcrypt');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
var db = require('../db/db-module.js');

passport.use(new LocalStrategy((username, password, cb) => {
  db.query('SELECT id, username, password, type FROM users WHERE username=$1', [username], (err, result) => {
    if(err) {
      console.log('Error when selecting user on login :' +  err);
      return cb(err);
    
    }

    if(result.rowCount > 0) {
      const first = result.rows[0];
      bcrypt.compare(password, first.password, function(err, res) {
        if(err){
          console.log("problem in bcrypting : " + err);
        }
        if(res && first.type =='true') {
          cb(null, {username: first.username, type: first.type , id: first.id});
         } else {
          cb(null, false);
         }
       });
     } else {
       cb(null, false);
     }
  });
}));




passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, cb) => {
  db.query('SELECT id, username, type FROM users WHERE id = $1', [parseInt(id, 10)], (err, results) => {
    if(err) {
      console.log('Error when selecting user on session deserialize: ' + err);
      return cb(err);
    }

    cb(null, results.rows[0]);
  });
});

module.exports = passport;