// Import the page's CSS. Webpack will know what to do with it.
import "../stylesheets/app.css";

// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract'

/*
 * When you compile and deploy your Voting contract,
 * truffle stores the abi and deployed address in a json
 * file in the build directory. We will use this information
 * to setup a Voting abstraction. We will use this abstraction
 * later to create an instance of the Voting contract.
 */

import voting_artifacts from '../../build/contracts/Voting.json'

var users = require('../../users.json');
var redrawit;
var Voting = contract(voting_artifacts);

let candidates = {}

let tokenPrice = null;
let userId = null;
let userPassphrase=null;
let userToken = null;

window.voteForCandidate = function(candidate) {
  let candidateName = $("#candidate").val();
  let voteTokens = $("#vote-tokens").val();
  $("#msg").html("Vote has been submitted. The vote count will increment as soon as the vote is recorded on the blockchain. Please wait.")
  $("#candidate").val("");
  $("#vote-tokens").val("");

  /* Voting.deployed() returns an instance of the contract. Every call
   * in Truffle returns a promise which is why we have used then()
   * everywhere we have a transaction call
   */
  Voting.deployed().then(function(contractInstance) {
    contractInstance.voteForCandidate(candidateName, voteTokens, {gas: 140000, from: userToken}).then(function() {
      let div_id = candidates[candidateName];
      return contractInstance.totalVotesFor.call(candidateName).then(function(v) {
        $("#" + div_id).html(v.toString());
        $("#msg").html("");
      });
    });
  });
}

/* The user enters the total no. of tokens to buy. We calculate the total cost and send it in
 * the request. We have to send the value in Wei. So, we use the toWei helper method to convert
 * from Ether to Wei.
 */

window.buyTokens = function() {
  let tokensToBuy = $("#buy").val();
  let price = tokensToBuy * tokenPrice;
  $("#buy-msg").html("Purchase order has been submitted. Please wait.");
  Voting.deployed().then(function(contractInstance) {
    contractInstance.buy({value: web3.toWei(price, 'ether'), from: userToken}).then(function(v) {
      $("#buy-msg").html("");
      web3.eth.getBalance(contractInstance.address, function(error, result) {
        $("#contract-balance").html(web3.fromWei(result.toString()) + " Ether");
      });
    })
  });
  populateTokenData();
}

window.lookupVoterInfo = function() {
  let address = $("#voter-info").val();
  console.log("voter address : "+address);
  Voting.deployed().then(function(contractInstance) {
    contractInstance.voterDetails.call(address).then(function(v) {
      $("#tokens-bought").html("Total Tokens bought: " + v[0].toString());
      let votesPerCandidate = v[1];
      $("#votes-cast").empty();
      $("#votes-cast").append("Votes cast per candidate: <br>");
      let allCandidates = Object.keys(candidates);
      for(let i=0; i < allCandidates.length; i++) {
        $("#votes-cast").append(allCandidates[i] + ": " + votesPerCandidate[i] + "<br>");
      }
    });
  });
}

window.authenticateUser = function() {
	userPassphrase = $("#passphrase").val();
	$("#error-msg").html("");
	 $("#userToken").html("");
	 disableAll();
	var bool="Login failed";
	var loginData = users.users;
	for(var i=0 ; i<loginData.length ; i++) {
		if(loginData[i].passphrase == userPassphrase) {
			bool="Success";
			userId = loginData[i].id;
			userToken = loginData[i].token;	
		}
	}
	if(bool == "Success") {
		unlockAccountsIfNeeded(userToken,userPassphrase);
		//unlockAccount(userToken, userPassphrase);
		if (isAccountLocked(userToken))
           disableAll();
		else {
			enableAll();
			 $("#userToken").html(userToken);
		}
	} else {
		alert("Please enter valid passphrase..!");
		disableAll();
	}
}

/* Instead of hardcoding the candidates hash, we now fetch the candidate list from
 * the blockchain and populate the array. Once we fetch the candidates, we setup the
 * table in the UI with all the candidates and the votes they have received.
 */
function populateCandidates() {
  Voting.deployed().then(function(contractInstance) {
    contractInstance.allCandidates.call().then(function(candidateArray) {
      for(let i=0; i < candidateArray.length; i++) {
        /* We store the candidate names as bytes32 on the blockchain. We use the
         * handy toUtf8 method to convert from bytes32 to string
         */
        candidates[web3.toUtf8(candidateArray[i])] = "candidate-" + i;
      }
      setupCandidateRows();
      populateCandidateVotes();
      populateTokenData();
    });
  });
}

function populateCandidateVotes() {
  let candidateNames = Object.keys(candidates);
  for (var i = 0; i < candidateNames.length; i++) {
    let name = candidateNames[i];
    Voting.deployed().then(function(contractInstance) {
      contractInstance.totalVotesFor.call(name).then(function(v) {
        $("#" + candidates[name]).html(v.toString());
      });
    });
  }
}

function setupCandidateRows() {
  Object.keys(candidates).forEach(function (candidate) { 
    $("#candidate-rows").append("<tr><td>" + candidate + "</td><td id='" + candidates[candidate] + "'></td></tr>");
  });
}

/* Fetch the total tokens, tokens available for sale and the price of
 * each token and display in the UI
 */
function populateTokenData() {
  Voting.deployed().then(function(contractInstance) {
    contractInstance.totalTokens().then(function(v) {
      $("#tokens-total").html(v.toString());
    });
    contractInstance.tokensSold.call().then(function(v) {
      $("#tokens-sold").html(v.toString());
    });
    contractInstance.tokenPrice().then(function(v) {
      tokenPrice = parseFloat(web3.fromWei(v.toString()));
      $("#token-cost").html(tokenPrice + " Ether");
    });
    web3.eth.getBalance(contractInstance.address, function(error, result) {
      $("#contract-balance").html(web3.fromWei(result.toString()) + " Ether");
    });
  });
}

function isAccountLocked(account) {
	console.log("checking Account " + account + " is activated or not");
	$("#error-msg").html("");
    try {
        web3.eth.sendTransaction({
            from: account,
            to: account,
            value: 0
        });
		console.log("Account is unlocked");
        return false;
    } catch (err) {
        if(err.message == "authentication needed: password or unlock") {
			console.log("Account is locked --- "+err.message);
		} else {
			//alert("Account is unlocked but "+err.message);
			 $("#error-msg").html("Account is unlocked but error is "+err.message);
		}
		return true;
    }
}

function unlockAccountsIfNeeded(account, pwd) {
	console.log("Trying to Account " + account + " unlock")
	if (isAccountLocked(account)) {
           console.log("Account " + account + " is locked. Unlocking")
           web3.personal.unlockAccount(account, pwd, 15000);
    }
}

function unlockAccount(userToken, userPassphrase) {
	var accounts = userToken;
	var passphrase = userPassphrase;
	if(passphrase !=null){
		web3.personal.unlockAccount(userToken, passphrase,1000, function (error, result){
			console.log("error :"+error);
			console.log("results : "+result);
			if(error){
				var str =error.toString();
				if(str.includes("could not decrypt")){
					alert("Please enter the valid Passphrase.! ");
				}
			}
		});
	}
}

function drawChart(){

	var w = ($('#chart').parent().parent().width())/3  //400;
	var h = $('#chart').parent().parent().height()-10; //400;
	
	
	var r = h/2;
	var color = d3.scale.category20c();

	var data = [{"label":"Murthy", "value":20}, 
					  {"label":"Sridhar", "value":50}, 
					  {"label":"Ganga", "value":30}];


var vis = d3.select('#chart').append("svg:svg").data([data]).attr("width", w).attr("height", h).append("svg:g").attr("transform", "translate(" + r + "," + r + ")");
var pie = d3.layout.pie().value(function(d){return d.value;});

// declare an arc generator function
var arc = d3.svg.arc().outerRadius(r);

// select paths, use arc generator to draw
var arcs = vis.selectAll("g.slice").data(pie).enter().append("svg:g").attr("class", "slice");
arcs.append("svg:path")
    .attr("fill", function(d, i){
        return color(i);
    })
    .attr("d", function (d) {
        // log the result of the arc generator to show how cool it is :)
        console.log(arc(d));
        return arc(d);
    });

// add the text
arcs.append("svg:text").attr("transform", function(d){
			d.innerRadius = 0;
			d.outerRadius = r;
    return "translate(" + arc.centroid(d) + ")";}).attr("text-anchor", "middle").text( function(d, i) {
    return data[i].label;})
}

function renderSelectBox(){
	var namesLst = ["Vote for..","Murthy", "Sridhar","Ganga"]
	$.each(namesLst, function(idx, item) {
			$("<option/>").text(item).val(item).appendTo('#candidate');
	})
}

function disableAll() {
	document.getElementById('divTokensInfo').style.display = 'none';
    document.getElementById('divTokensInfo').style.visibility = 'none';
	
	document.getElementById('divVoting').style.display = 'none';
    document.getElementById('divVoting').style.visibility = 'none';
	
	document.getElementById('divToken').style.display = 'none';
    document.getElementById('divToken').style.visibility = 'none';
	
	document.getElementById('divVotesDetails').style.display = 'none';
    document.getElementById('divVotesDetails').style.visibility = 'none';
}

function enableAll() {
	document.getElementById('divTokensInfo').style.display = 'block';
    document.getElementById('divTokensInfo').style.visibility = 'visible';
	
	document.getElementById('divVoting').style.display = 'block';
    document.getElementById('divVoting').style.visibility = 'visible';
	
	document.getElementById('divToken').style.display = 'block';
    document.getElementById('divToken').style.visibility = 'visible';
	
	document.getElementById('divVotesDetails').style.display = 'block';
    document.getElementById('divVotesDetails').style.visibility = 'visible';
}

window.onresize = function() {
	$('#chart').find('svg').remove();
	clearTimeout(redrawit);
	setTimeout(function() {
	drawChart();
	},10)
}

$( document ).ready(function() {
	disableAll();
  if (typeof web3 !== 'undefined') {
    console.warn("Using web3 detected from external source like Metamask")
    // Use Mist/MetaMask's provider
    //window.web3 = new Web3(web3.currentProvider);
	window.web3 = new Web3(new Web3.providers.HttpProvider("http://192.168.195.148:8545"));
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:8545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for development. More info here: http://truffleframework.com/tutorials/truffle-and-metamask");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://192.168.195.148:8545"));
  }
  Voting.setProvider(web3.currentProvider);
  populateCandidates();
  renderSelectBox();
  drawChart();
});
