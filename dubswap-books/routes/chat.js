// Dependencies
// ***********************************
var express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    pool = require('../db/db-module.js'),
    user = require('../test/test-email-verification/sendEmail.js'),
    passport = require('../config/passport.js'),
    session = require('express-session'),
    bcrypt = require("bcrypt"),
    emailer = require('../test/test-email-verification/sendEmail.js'),
    helper = require('../helper.js');
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var elasticClient = require("../elasticsearch/connection.js");


module.exports = function(app, io, pool){
    // renders registration page
    app.get("/message", isLoggedIn, function(req, res) {
        res.render("message");
    });
    
    io.on('connection', async function(socket) {
        // Tell the client that he is connected
        socket.emit('acknowledgement', 'you are being acknowledged!');
        // Handle a new chat message from a client
        socket.on('new-chat-message', function(data) {
            console.log("message-recieved :" + data);
            var fromId = data.fromId;
            var toId = data.toId;
            var message = data.message;
            pool.query("INSERT INTO messages VALUES ($1, $2, $3);", [fromId, toId, message]);
            // Send this message to all the users
            io.emit('new-chat-message', data);
        });
        // Send all chat messages to the client after he asks for them
        socket.on('all-messages', function() {
            pool.query("SELECT * from messages;", function(err, result) {
               if (err) {
                   console.log("There was some error while getting all messages");
                   console.log(err);
               } else {
                   socket.emit('all-messages', result.rows);
               }
            });
        })
    });
};

// a middleware which checks whether a user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect("/login");
}