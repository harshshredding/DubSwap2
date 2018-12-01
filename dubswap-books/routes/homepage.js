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

var memoryStorage = multer.memoryStorage();
var memoryUpload = multer({ storage: memoryStorage });

module.exports = function(app){
    
    // Prepares the homepage and renders it. 
    app.get("/", async function(req, res, next) {
        var username = null;
        if (req.isAuthenticated()) {
            username = req.user.username;
        }
        var offeringsHTML = "";
        var imagesScript = "";
        var interestButtonScript = "";
        var user_id = null;
        
        // Get the id of the currently logged in user.
        try {
           var queryResult = await pool.query("SELECT id from users where username=$1;", [username]);
           if (queryResult.rows.length > 0) {
                user_id = queryResult.rows[0].id;
            }
        } catch (err) {
           console.log("(homepage)There was an error while" + 
           "getting the id of the currently logged user.");
           next(err);
        }
        
        // Get the details of the four most recent offerings from the database.
        var offerings;
        try {
            offerings = await pool.query("SELECT item, image_1, price, offering_id from offerings ORDER BY time_stamp DESC limit 4;");
        } catch (err) {
            console.log("there was an error while getting the most recent offerings on the homepage.");
            next(err);
        }
        
        // Construct HTML and JS for offerings. 
        for (var i = 0; i < offerings.rows.length; i++) {
            var price = offerings.rows[i].price;
            var image = helper.convertHexToBase64(offerings.rows[i].image_1);
            var item = offerings.rows[i].item;
            var offering_id = offerings.rows[i].offering_id;
            offeringsHTML +=
                "<div class='product col-sm-3'>" +
                "<a href = 'offering/" + offering_id + "'>" +
                "<img src = '' id='offering" + i + "'>" +
                "</a>" +
                "<div class='d-flex flex-column card-text'>" +
                "<div class='card-item'>" + price + "</div>" +
                "<div class='card-item'>" + item + "</div>" +
                "<div class='card-item cart-button-container'><button class='rounded' id='interestButton" + offering_id + "'>Interested</button></div>" +
                "</div>" +
                "</div>";
    
            // Create the script that will embed the corresponding image.
            imagesScript += "document.getElementById(\"offering" + i + "\").src = \"data:image/jpg;base64,\" + \"" + image + "\";";
            // Creates scripts that give functionality to the offering-interest button.
            interestButtonScript +=
                "$('#interestButton" + offering_id + "').click(function() {" +
                "$.ajax({" +
                "url: '/offering-interests'," +
                "type: 'POST'," +
                "data: {" +
                "offering_id: '" + offering_id + "'," +
                "user_id: '" + user_id + "'" +
                "}," +
                "success: function(msg) {" +
                "alert('Email Sent');" +
                "}" +
                "});" +
                "});";
        }
    
        // Render the page based on whether the user is logged in.
        if (req.isAuthenticated()) {
            res.render("home", {
                username: req.user.username,
                offeringsHTML: offeringsHTML,
                imagesScript: imagesScript,
                interestButtonScript: interestButtonScript
            });
        }
        else {
            res.render("home", {
                username: null,
                offeringsHTML: offeringsHTML,
                imagesScript: imagesScript,
                interestButtonScript: interestButtonScript
            });
        }
    });


    // The default home without current-user specific info.
    app.get("/home", function(req, res) {
        res.render("home", { username: null });
    });
    
    // Displays the profile of the logged in user. 
    app.get("/profile", isLoggedIn, async function(req, res, next) {
        var username  = req.user.username;
        try {
            var result = await pool.query("SELECT profile_picture from users"
            + " where username = $1;", [username]);
            var profile_picture = helper.convertHexToBase64(result.rows[0].profile_picture);
            res.render("profile", { username: username, profile_picture: profile_picture });
        } catch (err) {
            console.log("There was an error while fetching the profile picture for"
                   + "user : " + req.user.username);
            next(err);
            res.render("profile", { username: username, profile_picture: "" });
        }
    });
    
    app.get("/profile2", function(req, res) {
        res.render("profile", { username: 'harshv' });
    });
    
    // Uploads a new profile picture to the database, updating the user's profile.
    app.post("/uploadProfilePicture", [isLoggedIn, memoryUpload.single('myImage')], (req, res) => {
        var fileInHex = helper.getHexFromBuffer(req.file.buffer);
        var username = req.user.username;
        pool.query("update users set profile_picture = $1 where username = $2;", [fileInHex, username], function(err, result) {
            if (err) {
                console.log("There was some problem while uploading your new"
                + "dp to the database in hex format for user " + username);
                console.log(err);
                res.send("There was a problem while uploading your profile picture");
            } else {
                console.log("Profile picture was successfully updated!");
                res.redirect("/profile");
            }
        });
    });
    
}
// a middleware which checks whether a user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect("/login");
}