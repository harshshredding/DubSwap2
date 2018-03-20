module.exports = {
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