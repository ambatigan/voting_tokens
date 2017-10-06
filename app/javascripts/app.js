// Import libraries we need.
import { default as Web3} from 'web3';
import { default as contract } from 'truffle-contract';

/*
 * When you compile and deploy your Voting contract,
 * truffle stores the abi and deployed address in a json
 * file in the build directory. We will use this information
 * to setup a Voting abstraction. We will use this abstraction
 * later to create an instance of the Voting contract.
 */

import voting_artifacts from '../../build/contracts/Voting.json';
 
// Import the page's CSS. Webpack will know what to do with it.
import "../vendor/jquery-3.2.1.min.js";
import "../vendor/bootstrap-3.3.7-dist/js/bootstrap.min.js";
import "../vendor/bootstrap-3.3.7-dist/css/bootstrap.min.css";
import "../stylesheets/app.css";
import "../stylesheets/font-awesome.min.css";
import "../stylesheets/animate.css";
import "../stylesheets/responsive.css";





//require("font-awesome-webpack");
//require("bootstrap");

global.jQuery = require('../vendor/jquery-3.2.1.min');
//import $ from 'vendor/jquery';
//window.jQuery = require('jquery');


var config = require('../../config.json');
var redrawit;
var Voting = contract(voting_artifacts);

let candidates = {}

let tokenPrice = null;
let userId = null;
let userPassphrase=null;
let userToken = null;
let userName = null;
let companyName = null;
let userInfo = null;
let evsn = null;
let securitiesSize = null;


window.voteForCandidate = function(candidate) {
  let candidateName = $("#candidate").val();
  let voteTokens = $("#vote-tokens").val();
  //$("#msg").html("Vote has been submitted. The vote count will increment as soon as the vote is recorded on the blockchain. Please wait.")
  document.getElementById('msg-vote-count').style.display = 'block';
  document.getElementById('msg-vote-count').style.visibility = 'visible';
  //$("#candidate").val("");
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
  document.getElementById('msg-buy-count').style.display = 'block';
  document.getElementById('msg-buy-count').style.visibility = 'visible';
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
  document.getElementById('msg-loading-voter').style.display = 'block';
  document.getElementById('msg-loading-voter').style.visibility = 'visible';
  console.log("voter address : "+address);
  Voting.deployed().then(function(contractInstance) {
    contractInstance.voterDetails.call(address).then(function(v) {
      $("#tokens-bought").html("Total Tokens bought: " + v[0].toString());
      let votesPerCandidate = v[1];
      $("#votes-cast").empty();
      $("#votes-cast").append("Votes cast per candidate: <br>");
      let allCandidates = Object.keys(candidates);
      for(let i=0; i < allCandidates.length; i++) {
		  if(allCandidates[i] == "Resolution-1")
			$("#votes-cast").append(config.Resolution1 + ": " + votesPerCandidate[i] + "<br>");
		if(allCandidates[i] == "Resolution-2")
			$("#votes-cast").append(config.Resolution2 + ": " + votesPerCandidate[i] + "<br>");
		if(allCandidates[i] == "Resolution-3")
			$("#votes-cast").append(config.Resolution3 + ": " + votesPerCandidate[i] + "<br>");
      }
    });
  });
  document.getElementById('msg-loading-voter').style.display = 'none';
  document.getElementById('msg-loading-voter').style.visibility = 'none';
}

window.authenticateUser = function() {

	if($('#passphrase').val() === "") {
        alert('please enter passphrase');
    } else {
	document.getElementById('msg-vote-count').style.display = 'none';
    document.getElementById('msg-vote-count').style.visibility = 'none';
	document.getElementById('msg-buy-count').style.display = 'none';
    document.getElementById('msg-buy-count').style.visibility = 'none';
	$("#buy").val("");
	$("#buy").text("")
	$("#buy").attr("placeholder","Number of tokens to buy")
	$("#votes-cast").empty();
	$("#tokens-bought").empty();
	$('#vote-tokens').text('');
	$('#vote-tokens').val("");
	$('#voter-info').text('');
	$('#voter-info').val("");
	
	
		userPassphrase = $("#passphrase").val();
		$("#error-msg").html("");
		$("#userToken").html("");
		var bool="Login failed";
		var loginData = config.users;
		for(var i=0 ; i<loginData.length ; i++) {
			if(loginData[i].passphrase == userPassphrase) {
				bool="Success";
				userId = loginData[i].id;
				userToken = loginData[i].token;	
				userInfo = loginData[i].userId+' : '+loginData[i].userName;
				userName = loginData[i].userName;
				evsn = loginData[i].evsn;
			}
		}
		if(bool == "Success") {
			unlockAccountsIfNeeded(userToken,userPassphrase);
			if(!$('.full-container').hasClass('auth-success')) {
				$('.full-container').addClass('auth-success');
			}
		} else {
			if($('.full-container').hasClass('auth-success')) {
				$('.full-container').removeClass('auth-success');
			}
			alert("Please enter valid passphrase..!");
		}
		populateUserData();
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
		if(name == "Resolution-1")
			$("#res1-data").html(v.toString());
		if(name == "Resolution-2")
			$("#res2-data").html(v.toString());
		if(name == "Resolution-3") 
			$("#res3-data").html(v.toString());
      });
    });
  }
}

function setupCandidateRows() {
  Object.keys(candidates).forEach(function (candidate) {
	if(candidate == "Resolution-1")
		$("#resolution1").append(config.Resolution1);
	if(candidate == "Resolution-2")
		$("#resolution2").append(config.Resolution2);
	if(candidate == "Resolution-3")
		$("#resolution3").append(config.Resolution3);
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

function populateUserData() {
	$("#userName").html(userName);
	$("#userToken").html(userToken);
	$("#companyName").html(config.company);
	$("#evsn").html(evsn);
	$("#userId").html(userInfo);
	Voting.deployed().then(function(contractInstance) {
		contractInstance.voterDetails.call(userToken).then(function(v) {
			$("#securitiesSize").html(v[0].toString());
		});
	})
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

function renderSelectBox(){
	var items={option1:{value:"Resolution-1",text:"Confirm the dividend of Rs.2.00 per equity share"},
			option2:{value:"Resolution-2",text:"Approve transactions with related party"},
			option3:{value:'Resolution-3',text:"Re-appoint Mr.Sampath as Director"}};
	$.each(items, function (i, item) {
		$('#candidate').append($('<option>', { 
			value: item.value,
			text : item.text 
		}));
	});
	/*var namesLst = ["Murthy", "Sridhar","Ganga"]
	$.each(namesLst, function(idx, item) {
			$("<option/>").text(item).val(item).appendTo('#candidate');
	})*/
}

function disableAll() {
	document.getElementById('msg-vote-count').style.display = 'none';
    document.getElementById('msg-vote-count').style.visibility = 'none';
	
	document.getElementById('msg-buy-count').style.display = 'none';
    document.getElementById('msg-buy-count').style.visibility = 'none';
	
	document.getElementById('msg-loading-voter').style.display = 'none';
    document.getElementById('msg-loading-voter').style.visibility = 'none';
}

function enableAll() {
	document.getElementById('userInfo').style.display = 'block';
    document.getElementById('userInfo').style.visibility = 'visible';
	
	document.getElementById('divVoting').style.display = 'block';
    document.getElementById('divVoting').style.visibility = 'visible';
	
	document.getElementById('divToken').style.display = 'block';
    document.getElementById('divToken').style.visibility = 'visible';
	
	document.getElementById('divVotesDetails').style.display = 'block';
    document.getElementById('divVotesDetails').style.visibility = 'visible';
	
	document.getElementById('userText').style.display = 'block';
    document.getElementById('userText').style.visibility = 'visible';
}

function clearItems(){
	 $("#msg").html("");
	$('#vote-tokens').text('')
}

$( document ).ready(function() {
	disableAll();
	console.log("in document ready function.....");
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
  $('#passphrase').keypress(function (event) {
        if(event.which == 13) {
			authenticateUser()
        } else
            return;
    });
  
});
