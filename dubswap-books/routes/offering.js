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
    // Handle request for registering a request in an offering.
    app.post("/offering-interests", isLoggedIn, async function(req, res, next) {
        var offering_id = req.body.offering_id;
        var user_id = req.body.user_id;
        try {
            var qresult1 = await pool.query("SELECT * FROM offering_interests WHERE offering_id = $1 AND user_id = $2;", [offering_id, user_id]);
            if (qresult1.rowCount == 0) {
                var qresult2 = await pool.query("INSERT INTO offering_interests(offering_id, user_id) VALUES($1, $2);", [offering_id, user_id]);
                console.log("The interest was succesfully stored.");
            }
        } catch (err) {
            console.log("There was an error while storing an interest of user " + user_id);
            next(err);
        }
    });
    
    // displays the details of an offering.
    app.get("/offering/:offeringID", isLoggedIn ,async function(req, response, next) {
        // get information about the offering with offering ID = offeringID
        try {
            var result = await pool.query("select * from offerings INNER JOIN users ON (users.id =" 
            + " offerings.user_id) where offerings.offering_id = $1 ;", [req.params.offeringID]);
            if (result.rowCount == 0) {
                response.send("Offering doesn't exist");
            }
            else {
                var offeringUserId = result.rows[0].user_id;
                var offeringUsername = "<a href=\"/profile/" + offeringUserId + "\">" + result.rows[0].username + "</a>";
                var display_image = helper.convertHexToBase64(result.rows[0].image_1);
                var other_image1 = helper.convertHexToBase64(result.rows[0].image_2);
                var other_image2 = helper.convertHexToBase64(result.rows[0].image_3);
                var other_image3 = helper.convertHexToBase64(result.rows[0].image_4);
                var productName = result.rows[0].item;
                var price = result.rows[0].price;
                var description = result.rows[0].description;
                var imagesScript = "";
                var otherImagesHTML = "";
                
                // Create HTML for images
                otherImagesHTML +=
                    "<div class='column1'>" +
                    "<img class='offering-image' src='' id='other_image1'>" +
                    "</div>";
                imagesScript += "document.getElementById(\"other_image1\").src = \"data:image/jpg;base64,\" + \"" + other_image1 + "\";" ; 
                otherImagesHTML +=
                    "<div class='column1'>" +
                    "<img class='offering-image' src='' id='other_image2'>" +
                    "</div>";
                imagesScript += "document.getElementById(\"other_image2\").src = \"data:image/jpg;base64,\" + \"" + other_image2 + "\";" ;
                otherImagesHTML +=
                    "<div class='column1'>" +
                    "<img class='offering-image' src='' id='other_image3'>" +
                    "</div>";
                imagesScript += "document.getElementById(\"other_image3\").src = \"data:image/jpg;base64,\" + \"" + other_image3 + "\";" ;
                
                // Create HTML for the display image. 
                imagesScript += "document.getElementById(\"display_image\").src = \"data:image/jpg;base64,\" + \"" + display_image + "\";" ;
                
                // Query for the number of likes this offering has received
                try {
                    var interestResults = await pool.query("SELECT COUNT(*) FROM offering_interests WHERE offering_id=$1;", [req.params.offeringID]);
                    var numberOfInterestedPeople = interestResults.rows[0].count;
                    var sendMessageLink = 
                      "<a href=\"/start-conversation/" + offeringUserId + "/" + req.params.offeringID + "\" class = \"btn btn-primary card-link\" role=\"button\">Send Message To Owner</a>";
                     response.render("offering", {
                       username: req.user.username,
                       offeringUsername : offeringUsername,
                       productName: productName,
                       price: price,
                       description: description,
                       imagesScript: imagesScript,
                       otherImagesHTML: otherImagesHTML, 
                       numberOfInterestedPeople: numberOfInterestedPeople,
                       sendMessageLink : sendMessageLink
                     });
                } catch (err) {
                   console.log("There was an error while finding the" +
                             "number of intersts for offering with" + 
                             "offering_id : " + req.params.offeringID );
                   next(err); 
                }
            }
        } catch (err) {
            console.log("There was an error while fetching the offering info of offering id : " + req.params.offeringID );
            next(err);
        }
    });
    
    
    // Display the offerings page where all the offerings made by the user are
    // displayed in a nice layout.
    app.get("/offerings", isLoggedIn, (req, response) => {
        var username = req.user.username;
        pool.query("SELECT offerings.item, offerings.price, offerings.image_1, offerings.offering_id "
        + "FROM users INNER JOIN offerings ON (users.id = offerings.user_id) WHERE "  
        + "users.username = $1 ;", [username], function(err, result) {
            if (err) {
                console.log("There was some problem while fetching the offerings of "
                + "user " + username);
                console.log(err);
                response.send("Some problem occured while finding your offerings");
            } else {
                var htmlResult = "";
                var imagesScript = "";
                for (var i = 0; i < result.rowCount; i++) {
                    var rowData = result.rows[i];
                    var itemName = rowData.item;
                    var price = rowData.price;
                    var display_pic = helper.convertHexToBase64(rowData.image_1);
                    var offering_id = rowData.offering_id;
                    
                    // The structures that will contain the offering information. 
                    htmlResult += 
                           "<div class='column1'>" +
        
                              "<a href = 'offering/" + offering_id + "'>"
                                + "<img class='offering-image' src='' id='offering" + offering_id + "'>" + 
                              "</a>" +
        
                            "<div class='d-flex flex-column card-text'>" + 
                              "<div class='card-item'>" + price + "$</div>" +
                              "<div class='card-item'>" + itemName + "</div>" +
                              "<a href='/edit-offering/" + offering_id + "' class = 'btn btn-primary'>Edit</a>" +
                            "</div>"
                            +
                            "</div>"
                            ;
                            
                    // This javascript will embed the pictures. 
                    imagesScript += "document.getElementById(\"offering"+ offering_id + "\").src = \"data:image/jpg;base64,\" + \"" + display_pic + "\";" ;
                }
                response.render("offerings", {threeImages: htmlResult,
                imagesScript: imagesScript, username: req.user.username });
            }
        });
    });
    
    app.get('/edit-offering/:offeringID', isLoggedIn, async function(req, res) {
       try {
         var offeringID = req.params.offeringID;
         var offeringRows = await pool.query("SELECT * FROM offerings WHERE offering_id = $1;", [offeringID]);
         if (offeringRows.rowCount == 0) {
             console.log("MALICIOUS: Someone is trying to edit an offering" +
             + "through non-conventional means, user : ", req.user.username)
             res.render("message-template", {message: "There was an error while"
              + " requesting an edit. Please try again.", username: req.user.username});
         } else if (offeringRows.rowCount == 1) {
             var item = offeringRows.rows[0].item;
             var author = offeringRows.rows[0].author;
             var course = offeringRows.rows[0].course;
             var isRent = offeringRows.rows[0].is_rent;
             var isBook = offeringRows.rows[0].is_book;
             var price = offeringRows.rows[0].price;
             var description = offeringRows.rows[0].description;
             res.render('editOffering', {
                 item: item,
                 author: author,
                 course: course,
                 isRent: isRent,
                 isBook: isBook,
                 price: price,
                 description: description,
                 offeringID: offeringID
             });
         } else {
             console.log("ERROR: Two offerings had the same id !!!! : ", req.params.offeringID)
             res.render("message-template", {message: "There was an error while"
             + " requesting an edit. Please try again.", username: req.user.username});
         }
       } catch(err) {
         console.log("There was an error while preparing the"
         + "edit page for offering.", err) 
       }
    });
    
    app.post('/edit-offering/:offeringID', [isLoggedIn, addTime, 
    memoryUpload.fields(
        [{
            name: 'dp',
            maxCount: 1
        }, {
            name: 'img1',
            maxCount: 1
        }, {
            name: 'img2',
            maxCount: 1
        }, {
            name: 'img3',
            maxCount: 1
        }]
    )], async function(req, res) {
       try {
         var offeringID = req.params.offeringID;
         var offeringRows = await pool.query("SELECT * FROM offerings WHERE offering_id = $1 AND user_id=$2;", [offeringID, req.user.id]);
         if (offeringRows.rowCount == 0) {
             console.log("MALICIOUS: Someone is trying to edit an offering" +
             + "that does not belong to user : ", req.user.username)
             res.render("message-template", {message: "There was an error while"
              + " requesting an edit. Please try again.", username: req.user.username});
         } else if (offeringRows.rowCount == 1) {
            var test = req.body.itemBoy;
            console.log(test);
            var item = req.body.itemName;
            console.log("item", item);
            var itemAuthor = req.body.itemAuthor;
            console.log("author", itemAuthor);
            var isRent = req.body.isRent;
            console.log("isRent", isRent);
            var isBook = req.body.isBook;
            console.log("isBook", isBook);
            var price = parseInt(req.body.price, 10);
            console.log("price", price);
            if (isNaN(price)) {
                res.render("message-template", {message: "Price cannot be a non-number. Please fill the form again."});
                return;
            }
            var course = req.body.itemCourse;
            console.log("course", course);
            var description = req.body.description;
            console.log("description", description);
            var pic_1 = null; // This is the display picture
            var pic_2 = null; // This is the second image
            var pic_3 = null; // this is the third image
            var pic_4 = null; // this is the fourth image
            if (req.files['dp'].length == 1 && req.files['img1'].length == 1
            && req.files['img2'].length == 1 && req.files['img3'].length == 1) {
                pic_1 = helper.getHexFromBuffer(req.files['dp'][0].buffer);
                pic_2 = helper.getHexFromBuffer(req.files['img1'][0].buffer);
                pic_3 = helper.getHexFromBuffer(req.files['img2'][0].buffer);
                pic_4 = helper.getHexFromBuffer(req.files['img3'][0].buffer);
            } else {
                res.send("Make sure you uploaded one of each 4 images");
                return;
            }
            var offeringUpdatedResult = await pool.query(
            " UPDATE offerings SET" + 
            " author=$1, is_rent=$2, is_book=$3, price=$4, course=$5," + 
            " description=$6, image_1=$7, image_2=$8, image_3=$9, image_4=$10," + 
            " item=$11 WHERE offering_id=$12 AND user_id = $13;", 
            [itemAuthor, isRent, isBook, price, course, description, pic_1, 
             pic_2, pic_3, pic_4, item, offeringID, req.user.id]);
            res.render("message-template", {message: "Your offering was " +
            "succesfully updated", username: req.user.username});
         } else {
             console.log("ERROR: Two offerings had the same id !!!! : ", req.params.offeringID)
             res.render("message-template", {message: "There was an error while"
             + " requesting an edit. Please try again.", username: req.user.username});
         }
       } catch(err) {
         console.log("There was an error while updating offering during post request.", err) 
       }
    });
    
    app.get("/addOffering", isLoggedIn, function(req, res) {
        res.render("addOffering", {username: req.user.username});
    });
    
    // Adds the given offering to the market. 
    app.post("/addOffering", [isLoggedIn, addTime, 
    memoryUpload.fields(
        [{
            name: 'dp',
            maxCount: 1
        }, {
            name: 'img1',
            maxCount: 1
        }, {
            name: 'img2',
            maxCount: 1
        }, {
            name: 'img3',
            maxCount: 1
        }]
    )], function(req, res) {
            var item = req.body.itemName;
            console.log("item", item);
            var itemAuthor = req.body.itemAuthor;
            console.log("author", itemAuthor);
            var isRent = req.body.isRent;
            console.log("isRent", isRent);
            var isBook = req.body.isBook;
            console.log("isBook", isBook);
            var price = parseInt(req.body.price, 10);
            console.log("price", price);
            var course = req.body.itemCourse;
            console.log("course", course);
            if (isNaN(price)) {
                res.render("message-template", {message: "Price cannot be a non-number. Please fill the form again."});
                return;
            }
            var description = req.body.description;
            console.log("description", description);
            var pic_1 = null; // This is the display picture
            var pic_2 = null; // This is the second image
            var pic_3 = null; // this is the third image
            var pic_4 = null; // this is the fourth image
            if (req.files['dp'].length == 1 && req.files['img1'].length == 1
            && req.files['img2'].length == 1 && req.files['img3'].length == 1) {
                pic_1 = helper.getHexFromBuffer(req.files['dp'][0].buffer);
                pic_2 = helper.getHexFromBuffer(req.files['img1'][0].buffer);
                pic_3 = helper.getHexFromBuffer(req.files['img2'][0].buffer);
                pic_4 = helper.getHexFromBuffer(req.files['img3'][0].buffer);
            } else {
                res.send("Make sure you uploaded one of each 4 images");
                return;
            }
        
            pool.query("INSERT INTO offerings(item, user_id, description, price, author, is_rent, is_book, image_1, image_2, image_3, image_4, course) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING offering_id;", [item, req.user.id, description, price, itemAuthor, isRent, isBook, pic_1, pic_2, pic_3, pic_4, course], 
            function(err, result) {
                if (err) {
                    console.log("There was some error while uploading the offering.");
                    console.log(err);
                } else {
                    var offering_id = result.rows[0].offering_id;
                    // Add the offering to elastic search
                    elasticClient.index({
                        index: 'offerings',
                        type: 'offering',
                        id: '' + offering_id,
                        body: {
                            "item": item,
                            "description": description,
                            "course": course,
                            "author": itemAuthor,
                        }
                    }, function(err, resp, status) {
                        if (err) {
                            console.log("There was an error while adding offering_id ("+ offering_id + ") to elastic search.");
                            console.log(err);
                        }
                        else {
                            console.log(resp);
                        }
                    });
                    res.render("message-template", {message: "Your offering was succesfully added to the market.", username: req.user.username});
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

function addTime(req, res, next) {
    var date = new Date();
    var time = date.getTime();
    req.params.time = time;
    return next();
}