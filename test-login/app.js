var express = require("express"),
app = express(),
bodyParser = require("body-parser"),
pool = require('./db/db-module.js');

pool.query("CREATE TABLE lalabhi(id int, favnum int)", function(err, result){
   if(err){
      console.log(err);
   }else{
      console.log(result);
   }
});


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

app.get("/login", function(req, res){
   res.render("login"); 
});





app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear"); 
});