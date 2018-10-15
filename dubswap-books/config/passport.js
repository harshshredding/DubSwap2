// Handles deserialization and serialization of session.

var bcrypt = require('bcrypt');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
var db = require('../db/db-module.js');

// In this method we verify whether the given password for the given user
// is valid and then take appropriate action. 
passport.use(new LocalStrategy((username, password, cb) => {
  db.query('SELECT id, username, password, type FROM users WHERE username=$1', 
            [username], (err, result) => {
    // if something goes wrong.
    if(err) {
      console.log('Error when selecting user on login :' +  err);
      return cb(err);
    }

    // If we found a user
    if (result.rowCount > 0) {
      const userInfo = result.rows[0]; // 
      bcrypt.compare(password, userInfo.password, function(err, res) {
        if (err) {
          console.log("problem in bcrypting : " + err);
        }
        // Check if user has been verified.
        if (res && userInfo.type =='true') {
          cb(null, {username: userInfo.username, type: userInfo.type , id: userInfo.id});
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