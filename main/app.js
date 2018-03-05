var express = require("express"),
app = express(),
bodyParser = require("body-parser");

app.use(express.static(__dirname + '/public'));
console.log(__dirname);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/signup", function(req, res){
   res.render("sign-up"); 
});

app.post("/", function(req, res){
    res.send("yoyoyo you just posted somehting my friend");
});


app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear"); 
});