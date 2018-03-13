var express = require("express"),
app = express(),
bodyParser = require("body-parser"),
pool = require('./db/db-module.js'),
passport = require('./config/passport.js'),
session = require('express-session'),
bcrypt = require("bcrypt");

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

app.get("/secret1", function(req, res){
   res.render("secret1");
});

app.get("/secret2", function(req, res){
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
   
   pool.query("INSERT INTO users values($1, $2, $3, $4)",[1, req.body.username, hash, 'type'], function(err, result){
      if(err){
         console.log(err);
      }else{
         console.log(result);
      }
   });
   
   res.redirect("/");
});


app.get("/login", function(req, res){
   res.render("login"); 
});


app.post("/login", passport.authenticate("local"), function(req, res){
  const { user } = req;

  res.json(user);
});

app.get("/logout", function(req, res){
   req.send("you have been logged out");
   req.logout;
});





app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear hoho"); 
});

