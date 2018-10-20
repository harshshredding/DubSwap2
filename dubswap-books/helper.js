var Buffer = require('buffer/').Buffer
module.exports = {
    
    // this function replaces slashes with x's.
    // I don't know why I chose x's. I should probably generate a non '/' character randomly.
    formatHash : function(hash){
        var result = '';
        for(var i = 0;  i < hash.length; i++){
            if (hash.charAt(i) == '/') {
                result += 'x';
            } else {
                result += hash.charAt(i);
            }
        }
        return result;
    }
    ,
    // takes an email address as a function and returns the email id.
    // returns false if the email is not formatted correctly.
    parseEmail: function(email){
        var result = '';
        var counter = 0;
        while(email.charAt(counter) != '@' && counter < email.length){
            result += email.charAt(counter);
            counter++;
        }
        if(result.length != email.length){
            return result;
        }else{
            return false;   
        }
    }
    ,
    
    // Returns the hex string of the image at the given location. 
    // This format is used to store images in the database.
    getHexFromImage: function(imageDirectory, fs) {
        var imgData = fs.readFileSync(imageDirectory, 'hex');
        return '\\x' + imgData;
    }
    ,
    
    // Converts a hex string to a base 64 string.
    convertHexToBase64: function(hex) {
        return Buffer.from(hex, 'hex').toString('base64');
    }
    , 
    
    // Converts a hex string to a base 64 string.
    getHexFromBuffer: function(buffer) {
        return '\\x' + buffer.toString("hex");
    }
};