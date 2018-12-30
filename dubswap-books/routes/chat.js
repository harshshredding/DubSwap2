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
        console.log('----------------- \n', req.user, '--------------------');
        res.render("message", {username : req.user.username, user_id : req.user.id});
    });
    
    console.log("just about to listen");
    
    // Handle all events related to messaging
    io.on('connection', async function(socket) {
        
        //console.log("connecting at " + date.getTime());
        var sessionId = socket.client.request.sessionID;
        var client_user_id;
        
        store.get(sessionId, async function(err, session) {
             if(!err) {
                client_user_id = session.passport.user;
                console.log('user with client_id : ' + client_user_id + ' and socket_id ' 
                + socket.id + ' connected');
                updateOnlineStatus(io, client_user_id, false, socket);
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
                var qResultSender = await pool.query("SELECT username FROM users WHERE id = $1;", [fromId]);
                var qResultRecipient = await pool.query("SELECT username, socket_id, online FROM users WHERE id = $1;", [toId]);
                if (qResultSender.rowCount != 1 || qResultRecipient.rowCount != 1) {
                    console.log("[HIGH PRIORITY] An unregistered user was able "
                    + "to connect to the server.");
                } else {
                    pool.query("INSERT INTO messages VALUES ($1, $2, $3);", [fromId, toId, message]);
                    data.fromUsername = qResultSender.rows[0].username;
                    data.toUsername = qResultRecipient.rows[0].username;
                    data.fromId = client_user_id;
                    if (qResultRecipient.rows[0].online == true) {
                        console.log("recipient is online. Recipient's socket id is " + qResultRecipient.rows[0].socket_id);
                        io.to(qResultRecipient.rows[0].socket_id).emit('new-chat-message', data);
                    }
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
        
        socket.on('get-conversation', async function(toId, messagesHandler) {
            var id1 = client_user_id;
            var id2 = toId;
            try {
                var qResult = await pool.query("SELECT * FROM messages WHERE (from_id = $1 AND to_id = $2) OR (from_id = $2 AND to_id = $1);", [id1, id2]);
                messagesHandler(qResult.rows);
            } catch (err) {
                console.log("error while getting a conversation of two users ." , err);  
            }
        });
       
        socket.on('disconnect', async function() {
            try {
                console.log("user disconected");
                updateOnlineStatus(io, client_user_id, true, socket);
            }
            catch (err) {
                console.log('There was some error while updating online status of the user', err);
            }
        });
    
    });
};

var updateOnlineStatus = async function(io, client_user_id, isDisconnecting, socket) {
    var date = new Date();
    var time = date.getTime();

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query('LOCK TABLE users;');
        if (isDisconnecting) {
            await client.query('UPDATE users SET online=FALSE WHERE id' +
            '  = $1 AND online_status_updated < $2;', [client_user_id, time]);
        } else {
            await client.query('UPDATE users SET online=TRUE, socket_id = $1 WHERE id' +
            '  = $2 AND online_status_updated < $3;', [socket.id, client_user_id, time]);
        }
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }

    var qResult;
    try {
        qResult = await pool.query('SELECT id, username, online from users;');
        io.emit('user-list', { rows: qResult.rows, online_status_updated: time });
    }
    catch (err) {
        console.log("There was an error while getting user-list" +
            " information from the database", err);
    }
}

// a middleware which checks whether a user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect("/login");
}

