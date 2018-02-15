var userAge = prompt("What is your age?");

if(userAge < 0){
	alert("You are not a human !");
}else if(userAge < 18){
	alert("you are just a kid !");
}else if(userAge < 21){
	alert("you can fuck around but you can't touch the booze");
}else{
	alert("Hey old pal, want a beer ?");
}

var sqrtAge = Math.sqrt(userAge);

if( sqrtAge != Math.round(sqrtAge)) {
	console.log("your age is not a perfect square");
}else{
	console.log("your age is a perfect square");
}