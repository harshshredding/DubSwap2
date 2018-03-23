// boiler-plate
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


app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());

app.use(passport.session());

app.use(express.static(__dirname + '/public'));

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));















// All routes
//***************************************

// renders homepage
app.get("/", function(req, res){
   res.render("home"); 
});


// renders secret1.html, which was used to test user authenticationm.
app.get("/secret1",isLoggedIn, function(req, res){
   res.send(req.user);
});

// renders secret2.html, which was used to test user authenticationm.
app.get("/secret2", isLoggedIn,function(req, res){
   res.render("secret2"); 
});


// renders registration page
app.get("/register", function(req, res){
   res.render("register", {alreadyExists : false});
});



// - Receives a post request with password and username of the newly registered user.
// - Hashes password and stores it in the database.
// - Formats the hash before sending the verificaiton email because the link contained in the
//   verification email shouldn't contain slashes.
// - sends a verification email
// - stores the hash in a verificationtable table in the database, so that the link in the 
//    verification email can verify the user.
app.post("/register", function(req, res){
   const saltRounds = 10;
   const myPlaintextPassword = req.body.password;
   var salt = bcrypt.genSaltSync(saltRounds);
   var hash = bcrypt.hashSync(myPlaintextPassword, salt);
   var modifiedHash = helper.formatHash(hash);
   pool.query("SELECT * from users where username=$1",[req.body.username], function(err, result){
      if(err){
         console.log(err);
      }else{
         if(result.rowCount == 0){
            pool.query("INSERT INTO users values($1, $2, $3)",[req.body.username, hash, 'false'], function(err, result){
               if(err){
                  console.log(err);
               }else{
                  console.log(result);
               }
            });
            fs.mkdir("users/" + req.body.username, function(err){
               if(err){
                  console.log("error while making directory : " + err);
               }else{
                  console.log("some folder was created, check it out");
               }
            });
            pool.query("INSERT INTO verificationtable values($1, $2)",[req.body.username, modifiedHash], function(err, result){
               if(err){
                  console.log(err);
               }else{
                  console.log(result);
               }
            });
            emailer.sendEmail(modifiedHash, req.body.username, 'verification');
            
            res.redirect('/verification/sendEmail/' + req.body.username);
         }else{
            res.render('register', {alreadyExists : true});
         }
   } 
});
   
});


// renders the login form
app.get("/login", function(req, res){
   res.render("login", {username : 'harshv'}); 
});


app.get("/forgotPassword/requestChange", function(req, res){
   res.render('passwordRequestChange', {doesntExist : false});
});

app.get("/forgotPassword/requestChange/:hash", function(req, res){
   var hash = req.params.hash;
   pool.query("select username from passwordchangeverification where password=$1", [hash], function(err, result) {
       
       if (err) {
           console.log(err);
       }else{
          if (result != null && result.rowCount > 0) {
              var name = result.rows[0].username;
               res.render('enterNewPassword', {oldHash: hash, username: name});
               // pool.query("delete from passwordchangeverification where hash=$1", [hash], function(err, result){
               //        if(err){
               //             console.log(err);
               //        }
               //        console.log('stuff deleted');
               // });
          }else{
               res.send('There was a problem verifying your identity, please try again');
          }
       }
   });
   
   
});


// Takes in the old hash of the previous password and uses it to identify user.
// Then it updates the records by replacing the old hash at its position in the
// database by the new hash.
// Old-hash is also used to verify the user. 
app.post("/forgotPassword/requestChange/:oldHash/:username", function(req, res){
   var oldHash = req.params.oldHash;
   const saltRounds = 10;
   const myPlaintextPassword = req.body.password1;
   var salt = bcrypt.genSaltSync(saltRounds);
   var newHash = bcrypt.hashSync(myPlaintextPassword, salt);
   
   var username = req.params.username;
   pool.query("select username from passwordchangeverification where password=$1", [oldHash], function(err, result) {
      if(err){
         console.log(err);
      }else{
         if (result != null && result.rowCount > 0) {
            // things are safe here
            pool.query("update users set password=$1 where username=$2", [newHash,username], function(err, result) {
                if(err){
                   console.log(err);
                }else{
                   console.log(username.charAt(0));
                   console.log(username);
                   console.log('harshv');
                   
                   console.log(newHash);
                   res.send("<h1> Your password has been updated.</h1>");
                    pool.query("delete from passwordchangeverification where password=$1", [oldHash], function(err, result) {
                       if (err) {
                          console.log(err);
                       }
                       console.log('stuff deleted');
                    });
                }
            });
         }else{
            res.send("There was some problem in verifying your identity.")
         }
      }
   });
   
});

// sends an email with a link to the user so that he or she can change password. 
// Uses the hash of their current password as the verification link.
// there might be some serious issues with using the hash of the current password.
app.post("/forgotPassword/requestChange/sendEmail", function(req, res){
   var email = req.body.email;
   var username = helper.parseEmail(email);
   pool.query('select * from users where username=$1', [username], function(err, results){
      if(err){
         console.log(err);
      }else{
         if(results.rowCount == 0){
            res.render('passwordRequestChange', {doesntExist: true});
         }else{
                var hash = results.rows[0].password;
                var modifiedHash = helper.formatHash(hash);
                emailer.sendEmail(modifiedHash, username, 'forgotPassword/requestChange');
                pool.query("INSERT INTO passwordchangeverification values($1, $2)",[username, modifiedHash])
               .then((result)=>{
                  console.log('I have reached');
                  res.render('passwordChangeEmailSent', {username : username});
               }).catch(e => console.error(e.stack));
               
         }
      }
   });
});



// uses passport to log the user in.
app.post("/login", passport.authenticate("local"), function(req, res){
  const { user } = req;
  res.redirect("/");
});

// Verifies the user after user has click on the verification link in the email they received.
app.get("/verification/:hash", function(req, res) {
   var hash = req.params.hash;

   
   pool.query("select username from verificationtable where hash=$1", [hash], function(err, result) {
       console.log(result);
       if (err) {
           console.log(err);
       }
       
       if (result != null && result.rowCount > 0) {
           var name = result.rows[0].username;
           pool.query("update users set type='true' where username=$1", [name], function(err, result) {
               if (err) {
                   console.log(err);
               }
           });
            res.render('verified', {username : name});
            pool.query("delete from verificationtable where hash=$1", [hash], function(err, result){
                    if(err){
                        console.log(err);
                    }
                    console.log('stuff deleted');
            });
       }else{
            res.send('There was a problem verifying your identity, please try again');
       }
   });
   
});


// sends a verification email with the modified hash to the person corresponding with :username
app.get("/verification/sendEmail/:username", function(req, res){
   res.render("emailSent", {username : req.params.username });
});
   


// logs the user out using passport
app.get("/logout", function(req, res){
   req.logout();
   res.redirect("/");
});



app.get("/profile", isLoggedIn, function(req, res){
   res.render("profile", {username: req.user.username});
});

app.get("/profile2", function(req, res){
    res.render("profile", {username: 'harshv'});
});



let upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => {
              let type = req.params.type;
              let path = './users/' + type;
              if (!fs.existsSync(path)) {
                  fs.mkdirsSync(path);
              }
              callback(null, path); 
        }
    , 
        filename: (req, file, callback) => {
      //originalname is the uploaded file's name with extn
            callback(null, file.originalname);
        }
    })
});

app.post("/upload/:type", [ isLoggedIn, upload.single('myImage')] ,(req, res)=>{
    res.send("hohoho you just uploaded something");
});


// a middleware which checks whether a user is logged in
function isLoggedIn(req, res, next){
   if(req.isAuthenticated()){
      return next();
   }
   return res.redirect("/login");
}











// Boiler plate again, 
// this starts the server
app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear hoho"); 
});

