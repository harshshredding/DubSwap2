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

app.get("/market", function(req, res) {
   // pull information and show stuff 
   // courses = getCoursesWithRequests();
   // show courses with requests
});

app.get("/user/profile", function(req, res){
   // get information about the user profile
});

app.post("/user/profile", function(req, res){
   // get information about the user profile
});

app.get("/user", function(req, res) {
  // get information about user and show it on the page  
  // show requests
});

app.get("/user/:id", function(req, res) {
    console.log(req.params.id);
  // get information about user and show it on the page  
  // show requests
});

app.post("/user", function(req, res) {
   // post changes after user changes information  
});



app.get("/user/chat", function(res, req){
    // get chat history of this particular user
});


app.post("/", function(req, res){
    res.send("yoyoyo you just posted somehting my friend");
});


app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear"); 
});