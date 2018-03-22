module.exports = {
    // this function replaces slashes with x's.
    // I don't know why I chose x's. I should probably generate a non '/' character randomly.
    formatHash : function(hash){
        var result = '';
        for(var i = 0;  i < hash.length; i++){
            if(hash.charAt(i) == '/'){
                result += 'x';
            }else{
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
};