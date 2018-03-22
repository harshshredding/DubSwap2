var pool = require("../../db/db-module.js");
var nodemailer = require("nodemailer");



module.exports = {
        // verifies user in the database after a verificaiton email has been received.
        permitUser: function(hash){
                            console.log(typeof hash);
                            console.log(hash);
                            pool.query("select * from users",function(err, result){
                                console.log('result:' +  result);
                        if(err){
                            //console.log(err);
                        }
                        if(result != null && result.rowCount > 0){
                            pool.query("update users set type='true' where hash=$1", [hash], function(err, result){
                                if(err){
                                    console.log(err);
                                }
                            });
                            return true;
                        }
                        return false;
                            });
                    }
                    ,
        // sends an email with the given hash appended to the link to username@uw.edu and
        // 'type' parameter dictates which kind of email it is.
        sendEmail: function(hash, username, type){
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
                    to: username + '@uw.edu', // list of receivers
                    subject: 'Verification link', // Subject line
                    text: 'https://dub-swap-harshv.c9users.io/' + type +'/' + hash, // plain text body
                    html: '<b>https://dub-swap-harshv.c9users.io/' + type +'/' + hash + '</b>' // html body
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
        }
};
