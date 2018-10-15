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









// All routes
//***************************************

app.get("/", isLoggedInHome, function(req, res) {
    res.render("home", { username: req.user.username});
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
                pool.query("INSERT INTO users (username, password, type, first_name, last_name, email) values($1, $2, $3, $4, $5, $6)",
                           [username, hash, 'false', firstName, lastName, email], function(err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(result);
                    }
                });
                
                fs.exists(__dirname + '/users' + "/" + username, function(exists) {
                    if (!exists) {
                        fs.mkdir("users/" + username, function(err) {
                            if (err) {
                                console.log("error while making directory : " + err);
                            }
                            else {
                                console.log("some folder was created, check it out");
                            }
                        });
                    } else {
                        console.log("no need to make directory");
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
                res.redirect('/verification-sendEmail/' + username);
            } else {
                res.render('register', { alreadyExists: true });
            }
        }
    });
});


// renders the login form
app.get("/login", function(req, res) {
    res.render("login", { username: 'harshv' });
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
                res.send("There was some problem in verifying your identity.")
            }
            // Delete the entry in table passwordchangeverification as it is
            // no longer needed. Deletion also prevents malicious users to
            // brute force on all possible verification links.
            pool.query("delete from passwordchangeverification where username=$1", [username], function(err, result) {
                            if (err) {
                                console.log("problem while deleting entry in"
                                + " passwordchangeverification.")
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
                var username = results.row[0].username;
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
                res.render('verified', { username: name });
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

app.get("/profile", isLoggedIn, function(req, res) {
    res.render("profile", { username: req.user.username });
});

app.get("/profile2", function(req, res) {
    res.render("profile", { username: 'harshv' });
});

let upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
            console.log("holalal");
            let type = req.params.type;
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

app.post("/upload", [isLoggedIn, upload.array('myImage', 3)], (req, res) => {
    res.send("hohoho you just uploaded something");
});

// displays the details of a offering
app.get("/offering/:offeringID", function(req, response) {
    // get information about the offering with offering ID = offeringID
    pool.query("select folder_id,description,item,price,user_id from offerings where offering_id = $1", [req.params.offeringID])
        .then((res) => {
            if (res.rowCount == 0) {
                response.send("Offering doesn't exist");
            }
            else {
                console.log(res.rows[0].user_id + "hohoho");
                pool.query("select username from users where id=$1", [res.rows[0].user_id], function(err, result) {
                    if (err) {
                        console.lof(err);
                    }
                    else {
                        var userName = result.rows[0].username;
                        var dirname = __dirname + '/users/' + userName;

                        // get the list of file names
                        var otherFiles;
                        var dpFiles;
                        try {

                            dpFiles = fs.readdirSync(dirname + "/offerings/" + res.rows[0].folder_id + "/dp");
                            otherFiles = fs.readdirSync(dirname + "/offerings/" + res.rows[0].folder_id + "/otherImages");

                        }
                        catch (err) { console.error('could not locate folder dp : ', err.stack) }

                        var otherFilesHTML;
                        for (var i = 0; i < otherFiles.length; i++) {
                            otherFilesHTML +=
                                "<div class='column1'>" +
                                "<img class='offering-image' src='/users/" +
                                userName + "/offerings/" + res.rows[0].folder_id + "/otherImages/" +
                                otherFiles[i] + "'>" +
                                "</div>"
                        }
                        var imageAddress = "/users/" + userName + "/offerings/" + res.rows[0].folder_id + "/dp/" + dpFiles[0];

                        response.render("offering", {
                            productName: res.rows[0].item,
                            price: res.rows[0].price,
                            description: res.rows[0].description,
                            imagePath: imageAddress,
                            otherFilesHTML: otherFilesHTML
                        });

                    }
                });
            }
        })
        .catch(err => console.error('Error executing query', err.stack));
});

// Display the offerings page where all the offerings made by the user are displayed in a
// nice layout. 
app.get("/offerings", isLoggedIn, (req, response) => {
    var dirname = __dirname + '/users/' + req.user.username;
    fs.readdir(dirname, function(err, files) {
        if (err) {
            console.log("Error while reading user directory to find offerings");
            console.log(err);
        }
        else {
            pool.query("select id from users where username=$1", [req.user.username])
                // get user id and ask for folder names
                .then((res) => {
                    console.log(res.rows[0].id);
                    return pool.query("select folder_id,item,price,offering_id" +
                    + "from offerings where user_id = $1", [res.rows[0].id]);

                })
                // get photos inside the folder names and display them
                .then((res) => {
                    var result = "";
                    console.log(res.rowCount);
                    for (var i = 0; i < res.rowCount; i++) {
                        // find the name of the file in dp
                        try {

                            var fileNames = fs.readdirSync(dirname + "/offerings/" + res.rows[i].folder_id + "/dp");
                        }
                        catch (err) { console.error('could not locate folder dp : ', err.stack) }

                        console.log(fileNames[0]);

                        // if no error occured while getting the file name
                        if (fileNames.length != 0) {
                            result +=

                                "<div class='column1'>" +

                                "<a href = 'offering/" + res.rows[i].offering_id + "'>" +
                                "<img class='offering-image' src='/users/" +
                                req.user.username + "/offerings/" + res.rows[i].folder_id + "/dp/" +
                                fileNames[0] + "'>" + "</a>" +

                                "<div class='d-flex flex-column card-text'>"

                                +
                                "<div class='card-item'>" + res.rows[i].price + "$</div>" +
                                "<div class='card-item'>" + res.rows[i].item + "</div>" +
                                "</div>"

                                +
                                "</div>"

                                +
                                "</div>";
                        }
                    }
                    response.render("offerings", { threeImages: result });
                })
                .catch(err => console.error('Error executing query', err.stack));
        }
    });
});

app.get("/addOffering", isLoggedIn, function(req, res) {
    res.render("addOffering");
});

app.post("/addOffering", [isLoggedIn, addTime, uploadOfferingImages], function(req, res) {
    var item = req.body.itemName;
    var itemType = req.body.itemType;
    var itemModel = req.body.itemModel;
    var price = parseInt(req.body.price, 10);

    var description = req.body.description;
    var date = new Date();

    pool.query("INSERT INTO offerings(item, user_id, description, price, item_type, item_model_author, folder_id) values($1, $2, $3, $4, $5, $6, $7)", [item, req.user.id, description, price, itemType, itemModel, req.params.time])
        .then((result) => {
            // do something
        }).catch(e => console.error(e.stack));
    res.send("hola");
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

function isLoggedInHome(req, res, next) {
    if (req.isAuthenticated()) {
        console.log(req.user.username);
        return next();
    }
    console.log(req.url);
    return res.render("home");
}

// Boiler plate again, 
// this starts the server
app.listen(process.env.PORT, process.env.IP, function() {
    console.log("The server has started my dear hoho");
});