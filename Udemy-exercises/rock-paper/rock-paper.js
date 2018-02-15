var button1 = document.querySelector("#p1");
var button2 = document.getElementById("p2");
var resetButton = document.getElementById("reset");
var score1Text = document.getElementById("playerOneScore");
var score2Text = document.getElementById("playerTwoScore");
var numInput = document.querySelector("input");
var winningValue = document.querySelector("p span");
var score1 = 0;
var score2 = 0;
var hasWon = false;
var winningScore = 5;
button1.addEventListener("click", function(){
	if(!hasWon){
		score1++;
		if(score1 == winningScore){
			hasWon = true;
			score1Text.style.color = "green";
		}
		score1Text.textContent = score1;
	}
});
button2.addEventListener("click", function(){
	if(!hasWon){
		score2++;
		if(score2 == winningScore){
			hasWon = true;
			score2Text.style.color = "green";
		}
		score2Text.textContent = score2;
	}
});

resetButton.addEventListener("click", function(){
	score1 = 0;
	score2 = 0;
	score1Text.textContent = 0;
	score1Text.style.color = "black";
	score2Text.textContent = 0;
	score2Text.style.color = "black";
	hasWon = false;
});

numInput.addEventListener("change", function(){
	winningScore = numInput.value;
	winningValue.textContent = numInput.value;

});