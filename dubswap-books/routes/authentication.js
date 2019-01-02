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

module.exports = function(app) {
    // renders registration page
    app.get("/register", function(req, res) {
        res.render("register", { alreadyExists: false });
    });
    
    // - Receives a request with username, password, first_name, last_name, and email.
    // - Hashes password and stores it in the database.
    // - Formats the salt before sending the verificaiton email because the link 
    // - contained in the verification email shouldn't contain slashes.
    // - sends a verification email
    // - stores the salt in a verificationtable table in the database, so that the link in the 
    //    verification email can verify the user.
    app.post("/register", async function(req, res, next) {
        // collect user info
        const username = req.body.username;
        const password = req.body.password;
        const firstName = req.body.firstname;
        const lastName = req.body.lastname;
        const email = req.body.email;
        
        const saltRounds = 10;
        var salt = bcrypt.genSaltSync(saltRounds); 
        var hash = bcrypt.hashSync(password, salt);
        // We email a link with salt appended at the end. The use of salts keeps the
        // link a secret even when the enemy has hold of the hash function we are
        // using.
        var newSalt = bcrypt.genSaltSync(saltRounds);
        var modifiedSalt = helper.formatHash(newSalt);
        
        
        // Get user info.
        var queryResult;
        try {
            queryResult = await pool.query("SELECT * from users where username=$1", [username]);
        } catch (err) {
            console.log("Error while getting information about the user while registering.");   
            next(err);
        }
        
        // check if user already exist. If he doesn't we store information in the database.
        // Otherwise we show an error.
        if (queryResult.rowCount == 0) {
            console.log("username : " + username);
            var imageDirectory = '/home/ubuntu/workspace/dubswap-books/Images/default_profile_picture.jpg';
            var defaultProfilePic = helper.getHexFromImage(imageDirectory, fs);
            pool.query("INSERT INTO users (username, password, type, first_name, last_name, email, profile_picture) values($1, $2, $3, $4, $5, $6, $7)",
                       [username, hash, 'false', firstName, lastName, email, defaultProfilePic], function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(result);
                }
            });
            pool.query("INSERT INTO verificationtable values($1, $2)", [username, modifiedSalt], function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    console.log(result);
                }
            });
            emailer.sendEmail(modifiedSalt, email, username,'verification');
            res.render('emailSent', {email : email, username : null});
        } else {
            res.render('register', { alreadyExists: true }); 
        }
    });
    
    // renders the login form
    app.get("/login", function(req, res) {
        res.render("login", { username: null });
    });
    
    app.get("/forgotPassword/requestChange", function(req, res) {
        res.render('passwordRequestChange', { doesntExist: false });
    });
    
    // Displays the page where you can change the password if you are allowed to
    // change the password. 
    app.get("/forgotPassword/requestChange/:nonce/:username", async function(req, res, next) {
        var nonce = req.params.nonce;
        var username = req.params.username;
        var queryResult = null;
        try {
            queryResult = await pool.query("select username from passwordchangeverification where password=$1 AND username=$2", [nonce, username]);
        } catch (err) {
            console.log("Error while finding whether a correct verifcation entry exists.");
            next(err);
        }
        
        // If we find that the corresponding entry exists
        if (queryResult != null && queryResult.rowCount > 0) {
            res.render('enterNewPassword', {oldHash: nonce, username: username});
        } else {
            res.send('There was a problem verifying your identity, please try again');
            // Deletion prevents malicious users to
            // brute force on all possible verification links.
            pool.query("delete from passwordchangeverification where username=$1", [username], function(err, result){
                    if(err){
                        console.log(err);
                    }
                    console.log('stuff deleted');
            });
        }
    });
    
    // Takes in the old hash of the previous password and uses it to identify user.
    // Then it updates the records by replacing the old hash at its position in the
    // database by the new hash.
    // Old-hash is also used to verify the user. 
    app.post("/forgotPassword/requestChange/:oldHash/:username", async function(req, res, next) {
        // gather user information.
        var oldHash = req.params.oldHash;
        const saltRounds = 10;
        const myPlaintextPassword = req.body.password1;
        var salt = bcrypt.genSaltSync(saltRounds);
        var newHash = bcrypt.hashSync(myPlaintextPassword, salt);
        var username = req.params.username;
        console.log("oldHash : " + oldHash);
        console.log("username : " + username);
        var queryResult;
        try {
            queryResult = await pool.query("select username from passwordchangeverification where password=$1 AND username=$2", [oldHash, username]);
        } catch (err) {
            console.log("Error while determining whether the password change request was legitimate.");
            next(err);
        }
        console.log("queryResult  " + queryResult);
        console.log(queryResult == null);
        
        // If the request is legitimate.
        if (queryResult != null && queryResult.rowCount > 0) {
                    // Update password in table
            pool.query("update users set password=$1 where username=$2", [newHash, username], function(err, result) {
                if (err) {
                    console.log(err);
                } else {
                    res.send("<h1> Your password has been updated.</h1>");
                }
            });
        } else {
            res.send("There was some problem in verifying your identity.");
        }
        
        // Delete the entry in table passwordchangeverification as it is
        // no longer needed. Deletion also prevents malicious users to
        // brute force on all possible verification links.
        pool.query("delete from passwordchangeverification where username=$1", [username], function(err, result) {
            if (err) {
                console.log("problem while deleting entry in"
                + " passwordchangeverification.");
                console.log(err);
            } else {
                console.log('stuff deleted');
            }
        });
    
    });
    
    // sends an email with a link to the user so that he or she can change password. 
    // Uses a nonce/salt as the verification link.
    app.post("/forgotPassword/requestChange/sendEmail", function(req, res) {
        var email = req.body.email;
        pool.query('select * from users where email=$1', [email], function(err, results) {
            if (err) {
                console.log(err);
            }
            else {
                if (results.rowCount == 0) {
                    res.render('passwordRequestChange', { doesntExist: true });
                } else {
                    var username = results.rows[0].username;
                    // nonce that will be used to make the verification link.
                    var nonce = helper.formatHash(bcrypt.genSaltSync(10));
                    emailer.sendEmail(nonce, email, username, 'forgotPassword/requestChange');
                    pool.query("INSERT INTO passwordchangeverification values($1, $2)", [username, nonce])
                        .then((result) => {
                            res.render('passwordChangeEmailSent', { username: username });
                        }).catch(e => console.error("error while creating a forgot" + 
                        + "password verification entry in table" + e.stack));
                }
            }
        });
    });
    
    // uses passport to log the user in.
    app.post("/login", passport.authenticate("local"), function(req, res) {
        const { user } = req;
        res.redirect("/");
    });
    
    // Verifies the user after user has clicked on the verification link in the email they received.
    app.get("/verification/:hash/:username", function(req, res) {
        var hash = req.params.hash;
        var username = req.params.username;
        pool.query("select username from verificationtable where hash=$1 AND username=$2", [hash, username], function(err, result) {
            console.log(result);
            if (err) {
                console.log(err);
            } else {
                if (result != null && result.rowCount > 0) {
                    var name = result.rows[0].username;
                    pool.query("update users set type='true' where username=$1", [name], function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                    });
                    res.render('verified', { username: null });
                } else {
                    res.send('There was a problem verifying your identity, please try again');
                }
                pool.query("delete from verificationtable where username=$1", [username], function(err, result) {
                    if (err) {
                        console.log(err);
                    }
                    console.log('stuff deleted');
                });
            }
        });
    });
    
    // sends a verification email with the modified hash to the person corresponding with :username
    app.get("/verification-sendEmail/:username", function(req, res) {
        res.render("emailSent", { username: req.params.username });
    });
    
    // logs the user out using passport
    app.get("/logout", function(req, res) {
        req.logout();
        res.redirect("/");
    });
}

// a middleware which checks whether a user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect("/login");
}