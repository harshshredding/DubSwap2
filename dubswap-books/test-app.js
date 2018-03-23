// random file to test stuff

var express = require("express");
var multer = require('multer');
var ejs = require('ejs');
var path = require('path');
var fs = require('fs');
const app = express();
app.set("view engine", "ejs");
var dir = 'users/harshv';

 if (!fs.existsSync(dir)){
     fs.mkdirSync(dir);
 }
console.log(__dirname);
app.use(express.static(__dirname + '/public'));
var dirname = __dirname + '/public' + '/dir';
fs.readdir(dirname, function(err, files) {
    if (err) {
       console.log(err);
    } else {
       if (!files.length) {
           console.log("something is empty ;)");
       }else{
         console.log("something is not empty ;)");
       }
    }
});


//storage engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    cb(null, file.originalname + Date.now() + path.extname(file.originalname));
  }
});

// init upload
const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
  }
}).single('myImage');

function checkFileType(file, cb){
  // allowed extens
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // check mime
  const mimetype = filetypes.test(file.mimetype); 
}





app.get("/", function(req, res){
  res.render("uploadTest");
});

app.post("/upload", (req, res)=>{
  upload(req, res, (err) =>{
    if(err){
      console.log(err);
    }else{
      res.send(req.file);
    }
  });
});








app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear hoho"); 
});