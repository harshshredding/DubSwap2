var express = require("express");
var app = express();

var nodemailer = require('nodemailer');


app.get('/', function(req, res) {

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "harshshredding@gmail.com", // generated ethereal user
            pass: "***REMOVED***" // generated ethereal password
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Harsh Verma 👻" <harshshredding@gmail.com>', // sender address
        to: 'harshv@uw.edu', // list of receivers
        subject: 'Hello ✔', // Subject line
        text: 'Hello world?', // plain text body
        html: '<b>Hello world?</b>' // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
}); // handle the route at yourdomain.com/sayHello



app.listen(process.env.PORT, process.env.IP, function(){
    console.log("server started buoy");
});