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
};