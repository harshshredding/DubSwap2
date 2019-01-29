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

async function sendMesageEmailHelper() {
    
}

module.exports = function(app, io, pool, store){
    // renders registration page
    app.get("/message", isLoggedIn, function(req, res) {
        console.log('----------------- \n', req.user, '--------------------');
        res.render("message", {username : req.user.username, user_id : req.user.id});
    });
    
    // Register a new conversation between two users
    app.get("/start-conversation/:toUserId/:offeringId", isLoggedIn, async function(req, res) {
       var fromId = req.user.id;
       var fromUsername = req.user.username;
       var toId = req.params.toUserId;
       var offeringId = req.params.offeringId;
       try {
           var qResult = await pool.query("SELECT username from users where id = $1;", [toId]);
           if (qResult.rowCount == 1) {
               var toUsername = qResult.rows[0].username;
               
               // Check if the conversation already exists.
               console.log("fromId", fromId);
               console.log("toId", toId);
               console.log("offeringId", offeringId);
               qResult = await pool.query("SELECT * FROM conversations WHERE ((first_user_id = $1 AND" + 
               " second_user_id = $2) OR (first_user_id = $2 AND second_user_id = $1)) AND offering_id = $3;", [fromId, toId, offeringId]);
               
               // Make a conversation if the users have never talked.
               if (qResult.rowCount == 0) {
                   console.log("making new conversation");
                   qResult = await pool.query("INSERT INTO conversations(first_user_id, second_user_id" +
                   ", first_user_username, second_user_username, offering_id) VALUES ($1, $2, $3, $4, $5);", [fromId, toId, fromUsername, toUsername, offeringId]);
                   sendConversations(io, req.user.id, getCurrentTime());
                   sendConversations(io, toId, getCurrentTime());
               }
               res.redirect('/message');
           } else {
               console.log("Someone is trying to make a conversation with a" 
               + " a non-existent user.");
               res.render('message-template', {message: 'Your request could not be completed.'});
           }
       } catch (err) {
           console.log("There was some error while generating a conversation.", err);
           res.render('message-template', {message: 'Your request could not be completed.'});
       }
      
    });
    
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
                // Temporary comment
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
                // DO NOT use the from Id sent by user !!!
                var fromId = client_user_id;
                var conversation_id = data.conversation_id;
                var message = data.message;
                var qResult = await pool.query("SELECT first_user_id," +
                    "second_user_id, offering_id FROM conversations WHERE id = $1 AND (first_user_id = $2 OR second_user_id = $2);", [conversation_id, fromId]);
                if (qResult.rowCount == 1) {
                    // If the conversation exists and the user is legit.
                    var toId = (qResult.rows[0].first_user_id == fromId) ? qResult.rows[0].second_user_id : qResult.rows[0].first_user_id;
                    var offering_id = qResult.rows[0].offering_id;
                    pool.query("INSERT INTO messages(from_id, to_id, content, conversation_id) VALUES ($1, $2, $3, $4);", [fromId, toId, message, conversation_id],
                                function(err, res) {
                                    if (err) {
                                        console.log("There was an error while inserting message into database.", err);
                                    } else {
                                      // Record in the database that this user has seen this message.
                                      updateLastSeenState(conversation_id, client_user_id);
                                    }
                                });
                    qResult = await pool.query("SELECT username, socket_id, online, email FROM users WHERE id = $1;", [toId]);
                    if (qResult.rowCount == 1) {
                        // If the recipient exists.
                        // Ask recipient to check for new notification in the database
                        // and don't wait for him to be online (Let us be on the
                        // safer side).
                        pool.query("select * from users where id=$1;", [fromId], async function(err, res) {
                            if (err) {
                                console.log("There was an error while fetching information" +
                                 + " about the user who sent the message", err);
                            } else {
                                if (res.rowCount != 0) { // If we found user info.
                                    var toEmail = qResult.rows[0].email;
                                    var fromUsername = res.rows[0].username;
                                    try {
                                        var offeringQuery = await pool.query("SELECT item FROM offerings WHERE "
                                        + " offering_id = $1", [offering_id]);
                                        if (offeringQuery.rowCount != 0) {
                                            var emailBody = fromUsername + " sent you message regarding "
                                            + offeringQuery.rows[0].item + ": \n" + message;
                                            emailer.sendEmailGeneral(toEmail, emailBody, "New message from " + fromUsername);
                                        }
                                    } catch (err) {
                                        console.log("Error while getting offering item info for the new message.", err);
                                    }
                                } else {
                                    console.log("Trying to send email to someone who" +
                                    + " doesn't exist. Id : ", toId);
                                }
                            }
                        });
                        
                        io.to(qResult.rows[0].socket_id).emit('check-for-notification');
                        if (qResult.rows[0].online == true) {
                            // If recipient is online he automatically noticies
                            // the messages, so update seen state in database for recipient.
                            // updateLastSeenState(conversation_id, toId);
                            data.fromId = fromId;
                            console.log("recipient is online. Recipient's socket id is " + qResult.rows[0].socket_id);
                            io.to(qResult.rows[0].socket_id).emit('new-chat-message', data);
                        }
                    }
                }
            }
            catch (err) {
                console.log("error while handing a new message", err);
            }
        });
        
        // Calculate the number of message notifications for this user.
        socket.on('number-of-new-messages', async function(newMessagesHandler) {
            console.log("someone asked for number of messages");
            try {
                var qResult = await pool.query("SELECT * from conversations WHERE first_user_id = $1 OR second_user_id = $1;", [client_user_id]);
                var notificationCount = 0;
                for (var i = 0; i < qResult.rowCount; i++) {
                    var row = qResult.rows[i];
                    if (row.first_user_id == client_user_id) {
                        if (row.last_seen_first_user < row.last_seen_second_user) {
                            notificationCount += row.last_seen_second_user - row.last_seen_first_user;
                        }
                    } else {
                        if (row.last_seen_second_user < row.last_seen_first_user) {
                            notificationCount += row.last_seen_first_user - row.last_seen_second_user;
                        }
                    }
                }
                if (notificationCount > 0) {
                    newMessagesHandler(notificationCount);
                }
            } catch (err) {
                console.log("Problem in finding the number of message notifications.", err);
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
        
        // Get all messages of a particular conversation.
        socket.on('get-conversation', async function(conversation_id, messagesHandler) {
            try {
                var qResult = await pool.query("SELECT * from conversations" 
                + " WHERE id = $1 AND (first_user_id = $2 OR second_user_id = $2)", [conversation_id, client_user_id]);
                if (qResult.rowCount == 1) {
                    updateLastSeenState(conversation_id, client_user_id);
                    qResult = await pool.query("SELECT * FROM messages"
                    + " WHERE conversation_id = $1 ORDER BY id;", [conversation_id]);
                    
                    messagesHandler(qResult.rows);
                } else {
                    console.log(client_user_id + " was trying to access a restricted conversation");
                }
            } catch (err) {
                console.log("error while getting a conversation of two users ." , err);  
            }
        });
        
        // Get the list of conversations of this user.
        socket.on('get-conversation-list', async function (conversationHandler) {
            console.log("conversation handler", conversationHandler);
            try {
                var qResult = await pool.query('SELECT * FROM conversations INNER JOIN offerings ON (conversations.offering_id = offerings.offering_id) WHERE'
            + ' conversations.first_user_id = $1 OR conversations.second_user_id = $1;', [client_user_id]);
            } catch (err) {
                console.log("There was an error while getting all the conversation list of " + client_user_id, err);
            }
            conversationHandler({ rows: qResult.rows, online_status_updated: getCurrentTime()});
        });
        
        // Log when user disconnects.
        socket.on('disconnect', async function() {
            try {
                console.log("user disconected");
                // Temporary comment
                // updateOnlineStatus(io, client_user_id, true, socket);
            }
            catch (err) {
                console.log('There was some error while updating online status of the user', err);
            }
        });
    });
};

var updateOnlineStatus = async function(io, client_user_id, isDisconnecting, socket) {
    var time = getCurrentTime();
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
    //sendConversations(io, client_user_id, time);
};

// Sends new conversation-list to the socket of 'user_id'.
async function sendConversations(io, user_id, time) {
    try {
        console.log("sending conversation");
        var qResult = await pool.query("SELECT socket_id FROM users WHERE id = $1;", [user_id]);
        var socket_id = qResult.rows[0].socket_id;
        qResult = await pool.query('SELECT * FROM conversations INNER JOIN offerings ON (conversations.offering_id = offerings.offering_id) WHERE'
            + ' conversations.first_user_id = $1 OR conversations.second_user_id = $1;', [user_id]);
        console.log("sending user_id " + user_id + " at socket " + socket_id);
        io.to(socket_id).emit('conversation-list', { rows: qResult.rows, online_status_updated: time});
    } catch (err) {
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

function getCurrentTime() {
    var date = new Date();
    var time = date.getTime();
    return time;
}

async function updateLastSeenState(conversation_id, client_user_id) {
    var qResult = await pool.query("SELECT * from conversations" 
                + " WHERE id = $1 AND (first_user_id = $2 OR second_user_id = $2)", [conversation_id, client_user_id]);
    if (qResult.rowCount == 1) {
        var lastSeenField;
        // Determine which last seen field we should update.
        if (qResult.rows[0].first_user_id == client_user_id) {
            lastSeenField = "last_seen_first_user";
        } else {
            lastSeenField = "last_seen_second_user";
        }
        pool.query("UPDATE conversations AS c"
                        + " SET " + lastSeenField + " = r.max"
                        + " FROM (SELECT MAX(id), conversation_id FROM messages GROUP BY conversation_id) AS r"
                        + " WHERE c.id = r.conversation_id AND c.id = $1;"
                        , [conversation_id]
                        , function (err, res) {
                            if (err) {
                                console.log("Failed to update last_viewed state.", err);
                            }
                        });
    } else {
        console.log(client_user_id + " is trying to access a conversation he "
        + "is not authorized to see.");
    }
}
