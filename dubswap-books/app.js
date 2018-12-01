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
    helper = require('./helper.js');
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var elasticClient = require("./elasticsearch/connection.js");



app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
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
}

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
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("The server has started my dear hoho");
});