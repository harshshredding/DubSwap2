 var button = document.querySelector("button");
// var bool = false;
// button.addEventListener("click", function(){
// 	if(!bool){	
// 		document.body.style.background = "purple";
// 	}else{
// 		document.body.style.background = "white";
// 	}
// 	bool = !bool;
// });


button.addEventListener("click", function(){
	document.body.classList.toggle("purple");
});
