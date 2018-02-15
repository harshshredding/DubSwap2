console.log("eveything is fine");
var list = new Array();
var doAction = true;
while(doAction){
	var action = prompt("Enter an action");
	if(action == "new"){
		var item = prompt("enter an item");
		list.push(item);
	}else if(action == "list"){
		console.log(list);
	}else if(action == "quit"){
		doAction = false;
	}else{
		alert("illegal action, try again");
	}
}