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

// A route that handles the search queries
app.get("/search", function(req, responseHTTP) {
    var query = req.query.query;
    elasticClient.search({
        index: 'offerings',
        type: 'offering',
        body: {
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["description", "item"]
                }
            }
        }
    }, function(error, response, status) {
        if (error) {
            console.log("error while executing elasticsearch query" + error);
        }
        else {
            console.log("--- Response ---");
            console.log(response);
            console.log("--- Hits ---");
            // We maintain a list of results
            var offeringIdList = [];

            response.hits.hits.forEach(function(hit) {
                offeringIdList.push(hit._id);
            });
            
            if (offeringIdList === undefined || offeringIdList.length == 0) {
                // array empty or does not exist
                responseHTTP.render("search-result", {
                        allResults: "",
                        imagesScript: "",
                        username: null, 
                        hasNoResults: true
                });
                return ;
            }
            
            // We find all the offering records corresponding to the search results.
            pool.query("SELECT * FROM offerings WHERE offering_id IN (" + offeringIdList.join(',') + ");", function(err, result) {
                if (err) {
                    console.log("There was a problem while querying the database for search offering-ids.");
                    console.log(err);
                }
                else {
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

                            "<a href = 'offering/" + offering_id + "'>" +
                            "<img class='offering-image' src='' id='offering" + offering_id + "'>" +
                            "</a>" +

                            "<div class='d-flex flex-column card-text'>" +
                            "<div class='card-item'>" + price + "$</div>" +
                            "<div class='card-item'>" + itemName + "</div>" +
                            "</div>"

                            +
                            "</div>";

                        // This javascript will embed the pictures. 
                        imagesScript += "document.getElementById(\"offering" + offering_id + "\").src = \"data:image/jpg;base64,\" + \"" + display_pic + "\";";
                    }
                    
                    // Render Search Results HTML.
                    responseHTTP.render("search-result", {
                        allResults: htmlResult,
                        imagesScript: imagesScript,
                        username: null,
                        hasNoResults: false
                    });
                }
            });
        }
    });
});

// Prepares the homepage and renders it. 
app.get("/", function(req, res) {
    var username = null;
    if (req.isAuthenticated()) {
        username = req.user.username;
    }
    var offeringsHTML = "";
    var imagesScript = "";
    var interestButtonScript = "";
    var user_id = null;

    // Get the user-id of the current user. 
    pool.query("SELECT id from users where username=$1;", [username])
        .then((result) => {
            // If we are logged in ! 
            if (result.rows.length > 0) {
                user_id = result.rows[0].id;
            }
            // Get the details of the four most recent offerings from the database.
            pool.query("SELECT item, image_1, price, offering_id from offerings ORDER BY time_stamp DESC limit 4;", function(err, result) {
                if (err) {
                    console.log(err);
                }
                else {
                    for (var i = 0; i < result.rows.length; i++) {
                        var price = result.rows[i].price;
                        var image = helper.convertHexToBase64(result.rows[i].image_1);
                        var item = result.rows[i].item;
                        var offering_id = result.rows[i].offering_id;
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

                    // Render the page
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
                }
            });
        });
});

app.post("/offering-interests", function(req, res) {
    var offering_id = req.body.offering_id;
    var user_id = req.body.user_id;
    pool.query("INSERT INTO offering_interests(offering_id, user_id) VALUES($1, $2);", [offering_id, user_id], function(err, result) {
        if (err) {
            console.log("There was an error while storing an interest of user " + user_id);
            console.log(err);
        } else {
            console.log("The interest was succesfully stored.");
        }
    });
    console.log("You have reached me !!!");
});

app.get("/home", function(req, res) {
    res.render("home", { username: null });
});

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
app.post("/register", function(req, res) {
    const username = req.body.username;
    const password = req.body.password;
    const firstName = req.body.firstname;
    const lastName = req.body.lastname;
    const email = req.body.email;
    
    const saltRounds = 10;
    var salt = bcrypt.genSaltSync(saltRounds); 
    var hash = bcrypt.hashSync(password, salt);
    // We email a link with salt appended at the end. The use of salts keeps the
    // link a secret even when the enemy has a hold of the hash function we are
    // using.
    var newSalt = bcrypt.genSaltSync(saltRounds);
    var modifiedSalt = helper.formatHash(newSalt);
    
    pool.query("SELECT * from users where username=$1", [username], function(err, result) {
        if (err) {
            console.log(err);
        } else {
            // If no one with the same username exists
            if (result.rowCount == 0) {
                console.log("username : " + username);
                var imageDirectory = __dirname + '/Images/default_profile_picture.jpg';
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
        }
    });
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
app.get("/forgotPassword/requestChange/:nonce/:username", function(req, res) {
    var nonce = req.params.nonce;
    var username = req.params.username;
    pool.query("select username from passwordchangeverification where password=$1 AND username=$2", [nonce, username], function(err, result) {
        if (err) {
            console.log(err);
        } else {
            // If we find that the corresponding entry exists
            if (result != null && result.rowCount > 0) {
                res.render('enterNewPassword', {oldHash: nonce, username: null});
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
        }
    });
});


// Takes in the old hash of the previous password and uses it to identify user.
// Then it updates the records by replacing the old hash at its position in the
// database by the new hash.
// Old-hash is also used to verify the user. 
app.post("/forgotPassword/requestChange/:oldHash/:username", function(req, res) {
    var oldHash = req.params.oldHash;
    const saltRounds = 10;
    const myPlaintextPassword = req.body.password1;
    var salt = bcrypt.genSaltSync(saltRounds);
    var newHash = bcrypt.hashSync(myPlaintextPassword, salt);

    var username = req.params.username;
    pool.query("select username from passwordchangeverification where password=$1 AND username=$2", [oldHash, username], function(err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result != null && result.rowCount > 0) {
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

// Displays the profile of the logged in user. 
app.get("/profile", isLoggedIn, function(req, res) {
    var username  = req.user.username;
    pool.query("SELECT profile_picture from users where username = $1", [username],
        function(err, result) {
           if (err) {
               console.log("There was an error while fetching the profile picture for"
               + "user : " + req.user.username);
               console.log(err);
               res.render("profile", { username: username, profile_picture: "" });
           } else {
               var profile_picture = helper.convertHexToBase64(result.rows[0].profile_picture);
               res.render("profile", { username: username, profile_picture: profile_picture });
           }
        });
});

app.get("/profile2", function(req, res) {
    res.render("profile", { username: 'harshv' });
});

var memoryStorage = multer.memoryStorage();
var memoryUpload = multer({ storage: memoryStorage });

let upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            console.log("holalal");
            let type = req.params.type;
            console.log(file);
            let path = './users/' + req.user.username;
            if (!fs.existsSync(path)) {
                fs.mkdirsSync(path);
            }
            callback(null, path);
        },
        filename: (req, file, callback) => {
            //originalname is the uploaded file's name with extn
            callback(null, file.originalname);
        }
    })
});

const storage2 = multer.diskStorage({
    destination: function(req, file, cb) {
        let path = './users/' + 'harshv' + '/offerings/' + 'something' + "/" + file.fieldname;
        if (!fs.existsSync(path)) {
            mkdirp.sync(path);
            console.log("a directory was made for you");
        }
        
        cb(null, path);
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname + Date.now() + path.extname(file.originalname));
    }
});

// init upload
const upload2 = multer({
    storage: storage2
}).fields([{
    name: 'dp',
    maxCount: 4
}, {
    name: 'other',
    maxCount: 5
}]);


let uploadOfferingImages = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            console.log("hola");
            let path = './users/' + req.user.username + '/offerings/' + req.params.time.toString() + "/" + file.fieldname;
            if (!fs.existsSync(path)) {
                mkdirp.sync(path);
                console.log("a directory was made for you");
            }
            callback(null, path);
        },
        filename: (req, file, callback) => {
            //originalname is the uploaded file's name with extn
            callback(null, file.originalname);
        }
    })
}).fields([{
    name: 'dp',
    maxCount: 2
}, {
    name: 'otherImages',
    maxCount: 4
}]);

let uploadOfferingDisplayImage = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            let path = './users/' + req.user.username + '/offerings/' + req.params.time.toString() + "/displayImage";
            if (!fs.existsSync(path)) {
                mkdirp.sync(path);
                console.log("a directory was made for you");
            }
            callback(null, path);
        },
        filename: (req, file, callback) => {
            //originalname is the uploaded file's name with extn
            callback(null, file.originalname);
        }
    })
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

// displays the details of an offering.
app.get("/offering/:offeringID", isLoggedIn ,function(req, response) {
    // get information about the offering with offering ID = offeringID
    pool.query("select * from offerings INNER JOIN users ON (users.id = offerings.user_id) where offerings.offering_id = $1 ;", [req.params.offeringID])
    .then((result) => {
        if (result.rowCount == 0) {
            response.send("Offering doesn't exist");
        }
        else {
            var userName = result.rows[0].username;
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
                "</div>"
            imagesScript += "document.getElementById(\"other_image1\").src = \"data:image/jpg;base64,\" + \"" + other_image1 + "\";" ; 
            otherImagesHTML +=
                "<div class='column1'>" +
                "<img class='offering-image' src='' id='other_image2'>" +
                "</div>"
            imagesScript += "document.getElementById(\"other_image2\").src = \"data:image/jpg;base64,\" + \"" + other_image2 + "\";" ;
            otherImagesHTML +=
                "<div class='column1'>" +
                "<img class='offering-image' src='' id='other_image3'>" +
                "</div>"
            imagesScript += "document.getElementById(\"other_image3\").src = \"data:image/jpg;base64,\" + \"" + other_image3 + "\";" ;
            
            // Create HTML for the display image. 
            imagesScript += "document.getElementById(\"display_image\").src = \"data:image/jpg;base64,\" + \"" + display_image + "\";" ;
            
            // Query for the number of likes this offering has received
            pool.query("SELECT COUNT(*) FROM offering_interests WHERE offering_id=$1;", [req.params.offeringID],
                function(err, result) {
                     if (err) {
                         console.log("There was an error while finding the" +
                         "number of intersts for offering with" + 
                         "offering_id : " + req.params.offeringID );
                         console.log(err);
                     } else {
                         var numberOfInterestedPeople = result.rows[0].count;
                         response.render("offering", {
                           username: req.user.username,
                           productName: productName,
                           price: price,
                           description: description,
                           imagesScript: imagesScript,
                           otherImagesHTML: otherImagesHTML, 
                           numberOfInterestedPeople: numberOfInterestedPeople
                         });
                     } 
                }
            );
        }
    })
    .catch(err => console.error('Error executing query', err.stack));
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
                        "</div>"
    
                        +
                        "</div>"
                        ;
                        
                // This javascript will embed the pictures. 
                imagesScript += "document.getElementById(\"offering"+ offering_id + "\").src = \"data:image/jpg;base64,\" + \"" + display_pic + "\";" ;
            }
            response.render("offerings", {threeImages: htmlResult,
            imagesScript: imagesScript, username: req.user.username});
        }
    });
});

app.get("/addOffering", isLoggedIn, function(req, res) {
    res.render("addOffering");
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
        var itemType = req.body.itemType;
        var itemModel = req.body.itemModel;
        var price = parseInt(req.body.price, 10);
        var description = req.body.description;
        
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
        

        // if (req.files['otherImages'].length == 3) {
        //     pic_2 = helper.getHexFromBuffer(req.files['otherImages'][0].buffer);
        //     pic_3 = helper.getHexFromBuffer(req.files['otherImages'][1].buffer);
        //     pic_4 = helper.getHexFromBuffer(req.files['otherImages'][2].buffer);
        // } else {
        //     res.send("The should upload exactly 3 images other than the" +
        //       "display pic. You tried to upload " + req.files['otherImages'].length + " images.");
        //     return;
        // }
    
        pool.query("INSERT INTO offerings(item, user_id, description, price, item_type, item_model_author, image_1, image_2, image_3, image_4) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING offering_id;", [item, req.user.id, description, price, itemType, itemModel, pic_1, pic_2, pic_3, pic_4], 
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
                res.send("hola ! Offering was successfully stored");
            }
        });
});

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

// Boiler plate again, 
// this starts the server
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("The server has started my dear hoho");
});