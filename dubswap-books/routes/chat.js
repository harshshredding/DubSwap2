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


module.exports = function(app, io, pool, store){
    // renders registration page
    app.get("/message", isLoggedIn, function(req, res) {
        res.render("message");
    });
    
    console.log("just about to listen");
    
    // Handle all events related to messaging
    io.on('connection', async function(socket) {
        console.log('hello');
        var sessionId = socket.client.request.sessionID;
        var client_user_id;
        if (client_user_id == null) {
            console.log("client is null");
        }
        // try {
        //     var session = await store.get(sessionId);
        //     console.log(session.passport.user);
        // } catch (err) {
        //     console.log(err);
        // }
        
        store.get(sessionId, function(err, session) {
             if(!err) {
                 client_user_id = session.passport.user;
                //  console.log(session);
                //  if(session.passport.user) 
                //      console.log('user id %s', session.passport.user);
             } else {
                console.log("could not get details of user from session store");
             }
         });
         
        // Handle a new chat message from the client
        socket.on('new-chat-message', async function(data) {
            try {
                console.log("message-recieved :" + data);
                data.error = false;
                var fromId = client_user_id;
                var toId = data.toId;
                var message = data.message;
                var qResult = await pool.query("SELECT username FROM users WHERE id = $1;", [fromId]);
                if (qResult.rowCount != 1) {
                    console.log("[HIGH PRIORITY] An unregistered user was able "
                    + "to connect to the server.");
                } else {
                    pool.query("INSERT INTO messages VALUES ($1, $2, $3);", [fromId, toId, message]);
                    // Send this message to all the users
                    data.username = qResult.rows[0].username;
                    io.emit('new-chat-message', data);
                }
            } catch (err) {
                console.log("error while handing a new message");
                console.log(err);
            }
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
        });
    });
};

// a middleware which checks whether a user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect("/login");
}