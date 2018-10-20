// random file to test stuff

var express = require("express");
var multer = require('multer');
var ejs = require('ejs');
var pool = require('./db/db-module.js');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var helper = require('./helper.js');
const app = express();
app.set("view engine", "ejs");


var dir = 'users/harshv/holala/gopi';

mkdirp('users/harshv/holala/gopi', function (err) {
    if (err) console.error(err)
    else console.log('pow!')
});
console.log(__dirname);
app.use(express.static(__dirname + '/public'));
var dirname = __dirname + '/users' + '/harshv';
console.log(dirname);
var image_location  = __dirname + "/hopper.png";
var imgData;


imgData = helper.getHexFromImage(image_location, fs);
pool.query("insert into images values($1);", [imgData], function(err, result) {
    if(err) {
        console.log("There was an error while inserting the image into the database");
        console.log(err);
    } else {
        console.log("The image was written successfully.");
    }
});

app.get('/showImage', function(req, res, next) {
  pool.query('select image from images limit 1',
                     function(err, result) {
    console.log('err',err,'pg readResult', result);
    var base64Image = helper.convertHexToBase64(result.rows[0].image);
    res.render("testEjs", {imageBytes : base64Image});
  });
});

//get the list of jpg files in the image dir
function getImages(imageDir, callback) {
    var fileType = '.jpg',
        files = [], i;
    fs.readdir(imageDir, function (err, list) {
        for(i=0; i<list.length; i++) {
            if(path.extname(list[i]) === fileType) {
                files.push(list[i]); //store the file name into the array files
            }
        }
        callback(err, files);
    });
}

getImages(__dirname + '/users' + '/harshv', function(err, files){
  if(err){
    console.log("there was some error reading files");
    console.log(err);
  }else{
    console.log("printing files");
    console.log(files.length);
    for(var i=0; i < files.length; i++){
      console.log(files[i]);
    }
  }
});

// tests a way to read all the images names from a folder. 
fs.readdir(dirname, function(err, files) {
    if (err) {
       console.log(err);
    } else {
       if (!files.length) {
           console.log("something is empty ;)");
       }else{
         console.log("something is not empty ;)");
         for(var i=0; i < files.length; i++){
           console.log(files[i]);
         }
       }
    }
});

fs.exists(__dirname + '/users' + '/bobo', function(exists) {
  console.log("exists answer : " + exists);
});




//storage engine
const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: function(req, file, cb){
    cb(null, file.originalname + Date.now() + path.extname(file.originalname));
  }
});



// init upload
const upload = multer({
  storage: storage
}).single('myImage');

const storage2 = multer.diskStorage({
  destination: function (req, file, cb) {
      let path = './users/' + 'harshv' + '/offerings/' + 'something' + "/" + file.fieldname;
              if (!fs.existsSync(path)) {
                  mkdirp.sync(path);
                  console.log("a directory was made for you");
              }
               
    cb(null, path);
  } ,
  filename: function(req, file, cb){
    cb(null, file.originalname + Date.now() + path.extname(file.originalname));
  }
});

// init upload
const upload2 = multer({
  storage: storage2
}).fields([{
           name: 'hoho', maxCount: 4
         }, {
           name: 'uploads', maxCount: 5
         }]);

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

app.post("/upload", upload2 ,(req, res)=>{

   
  res.send("hohahah");
});

app.listen(process.env.PORT, process.env.IP, function(){
   console.log("The server has started my dear hoho"); 
});