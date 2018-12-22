// Dependencies
// ***********************************

var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    pool = require('./db/db-module.js'),
    user = require('./test/test-email-verification/sendEmail.js'),
    passport = require('./config/passport.js'),
    session = require('express-session'),
    bcrypt = require("bcrypt"),
    emailer = require('./test/test-email-verification/sendEmail.js'),
    helper = require('./helper.js'),
    passportSocketIo = require("passport.socketio"),
    pgsession = require("connect-pg-simple")(session),
    store = new pgsession({pool : pool}); 
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var elasticClient = require("./elasticsearch/connection.js");
var http = require('http').Server(app);


console.log(process.env.PORT);
console.log(process.env.IP);
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    key: 'express.sid',
    store: store
}));

app.use(passport.initialize());

app.use(passport.session());

app.use('/public', express.static(__dirname + '/public'));
app.use('/users', express.static(__dirname + '/users'));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.locals = {
    username: null
};

// Set the timezone of the database to MST because most of the users will be
// in Seattle.
pool.query("ALTER DATABASE dubswap SET TIME ZONE 'MST';", function(err, result) {
   if (err) {
       console.log(err);
       throw new Error("Error while setting timezone of database.");
   } else {
       console.log("We set the timezone successfully!!");
   }
});

// Check whether the 'offerings' index exists in elasticsearch.
// The 'offerings' index is essential for the search bar.
elasticClient.indices.exists({index : "offerings"}, function (err, res, status){
    if (err) {
         throw new Error("Error while setting timezone of database." + err);
    } else {
        // If the index does not exists
        if (res != true) {
            throw new Error("The offerings index does not exist :(." +
            "We have to stop the service.");
        }
    }
});


// All routes
//***************************************

require('./routes/authentication')(app);
require('./routes/homepage')(app);
require('./routes/offering')(app);
require('./routes/search')(app);

// Boiler plate again, 
// this starts the server
var server = app.listen(process.env.PORT, process.env.IP, function() {
    console.log("The server has started my dear hoho");
});

var io = require('socket.io').listen(server);

//With Socket.io >= 1.0
io.use(passportSocketIo.authorize({
  cookieParser: require('cookie-parser'),
  passport:      passport,
  key:          'express.sid',       // the name of the cookie where express/connect stores its session_id
  secret:       'keyboard cat',    // the session_secret to parse the cookie
  store:         store,       // we NEED to use a sessionstore. no memorystore please
  success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
  fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));

function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');

  // The accept-callback still allows us to decide whether to
  // accept the connection or not.
  accept(null, true);

  // OR

  // If you use socket.io@1.X the callback looks different
  accept();
}

function onAuthorizeFail(data, message, error, accept){
  if(error)
    throw new Error(message);
  console.log('failed connection to socket.io:', message);

  // We use this callback to log all of our failed connections.
  accept(null, false);

  // OR

  // If you use socket.io@1.X the callback looks different
  // If you don't want to accept the connection
  if(error)
    accept(new Error(message));
  // this error will be sent to the user as a special error-package
  // see: http://socket.io/docs/client-api/#socket > error-object
}