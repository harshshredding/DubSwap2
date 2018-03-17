var express = require("express"),
app = express(),
bodyParser = require("body-parser"),
pool = require('./db/db-module.js'),
user = require('./test/test-email-verification/sendEmail.js'),
passport = require('./config/passport.js'),
session = require('express-session'),
bcrypt = require("bcrypt"),
emailer = require('./test/test-email-verification/sendEmail.js');

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

// pool.query("CREATE TABLE lalabhi(id int, favnum int)", function(err, result){
//    if(err){
//       console.log(err);
//    }else{
//       console.log(result);
//    }
// });

app.use(passport.initialize());
app.use(passport.session());


app.use(express.static(__dirname + '/public'));
console.log(__dirname);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));



app.get("/", function(req, res){
   res.render("home"); 
});

app.get("/secret1",isLoggedIn, function(req, res){
   res.render("secret1");
});

app.get("/secret2", isLoggedIn,function(req, res){
   res.render("secret2"); 
});

app.get("/register", function(req, res){
   res.render("register");
});


app.post("/register", function(req, res){
   const saltRounds = 10;
   const myPlaintextPassword = req.body.password;
   var salt = bcrypt.genSaltSync(saltRounds);
   var hash = bcrypt.hashSync(myPlaintextPassword, salt);
   
   pool.query("INSERT INTO users values($1, $2, $3)",[req.body.username, hash, 'false'], function(err, result){
      if(err){
         console.log(err);
      }else{
         console.log(result);
      }
   });
   
   pool.query("INSERT INTO verificationtable values($1, $2)",[req.body.username, hash], function(err, result){
      if(err){
         console.log(err);
      }else{
         console.log(result);
      }
   });
   emailer.sendEmail(hash, req.body.username);
   res.send("A verification email has been sent to your uw email account.");
});


app.get("/login", function(req, res){
   res.render("login"); 
});


app.post("/login", passport.authenticate("local"), function(req, res){
  const { user } = req;
  res.redirect("/");
});

app.get("/verification/:hash", function(req, res) {
   var hash = req.params.hash;
   
   pool.query("select username from verificationtable where hash=$1", [hash], function(err, result) {
       console.log(result);
       if (err) {
           console.log(err);
       }
       if (result != null && result.rowCount > 0) {
           pool.query("update users set type='true' where password=$1", [hash], function(err, result) {
               if (err) {
                   console.log(err);
               }
           });
            res.render('verified');
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

app.get("/logout", function(req, res){
   req.logout();
   res.redirect("/");
});

function isLoggedIn(req, res, next){
   if(req.isAuthenticated()){
      return next();
   }
   return res.redirect("/login");
}










app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear hoho"); 
});

