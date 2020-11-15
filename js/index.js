//DOM element Selectors
const DOM = {
	zipField: document.querySelector('.zip_field'),
	enterBtn: document.querySelector('.enter_btn'),
	zipError: document.querySelector('.zip_error')
};

//Import Depot Price Info by Zip
import {containerCosts} from './costs.js';

//Price Data
const priceData = {
	markup: 550,
	pricePerMi: 5,
	creditFee: .03
};

//Current Search Data
let searchData = {
	closestZips: [],
	milesToDepots: [],
	cityNames: [],
	prices: [],
	creditFees: [],
	inventory: []
};

//Store Depot Zip Codes
const depotZips = containerCosts.map(el => el['zip']);

//Enter Button Listener
DOM.enterBtn.addEventListener('click', async() => {
	//Clear error field
	DOM.zipError.textContent = '';
	//Clear Inventory fields
	searchData.inventory = [];
	
	//Check if zip code is both present and valid
	if (DOM.zipField.value && isValidUSZip(DOM.zipField.value))
	{
		//Esure condition is selected
		let condition;
		try {
			condition = Array.from(document.getElementsByName("condition")).find(r => r.checked).value;
		}
		catch {
			DOM.zipError.textContent = 'Please select the container condition.';
			return;
		}
		
		//Esure size is selected
		let size;
		try {
			size = Array.from(document.getElementsByName("size")).find(r => r.checked).value;
		}
		catch {
			DOM.zipError.textContent = 'Please select a container size/type.';
			return;
		}
		
		//store zip
		const dest = DOM.zipField.value;
		
		//determine three closest depots
		const arrDepots = closestZip(parseInt(dest, 10));
		searchData.closestZips = arrDepots.slice(0);
		const indices = getIndices(searchData.closestZips); // -- Retrieve indices
		
		let data;
		//call matrix service and store
		try {
			data = await matrix(...arrDepots, dest);
		} catch (e) {
			DOM.zipError.textContent = 'Something went wrong with the entered zip code.'
			return;
		}
		searchData.milesToDepots = [data.mile1, data.mile2, data.mile3];
		//separate locations into simplified names
		searchData.cityNames = formatNames([data.name1, data.name2, data.name3]);
		
		//separate miles into correctly formatted numbers
		const miles = formatMiles(searchData.milesToDepots);
		
		//Calc prices based on distances, indices, size, and condition
		const priceArr = calcPrices(miles, indices, size, condition);
		searchData.prices = priceArr.slice(0);
		
		//Display resulting data in DOM
		displayResults(searchData.milesToDepots, searchData.cityNames, searchData.prices, searchData.creditFees, searchData.inventory);
	}
	else
	{
		DOM.zipError.textContent = 'Please enter a valid US zip code.';
	}
});
//---------End of Event Listener--------------------//

//////////////////////////////////////////////////////
//DISTANCE MATRIX SERVICE//
async function matrix(origin1, origin2, origin3, dest) {
	let service = new google.maps.DistanceMatrixService();
	const data = await service.getDistanceMatrix(
		{
			origins: [origin1, origin2, origin3],
			destinations: [dest],
			travelMode: 'DRIVING',
			unitSystem: google.maps.UnitSystem.IMPERIAL,
		});
	return parseData(data);
}

function parseData(data) {
	const obj = {};
	const origins = data.originAddresses;
	
	obj.mile1 = data.rows[0].elements[0].distance.text;
	obj.mile2 = data.rows[1].elements[0].distance.text;
	obj.mile3 = data.rows[2].elements[0].distance.text;
	obj.name1 = origins[0];
	obj.name2 = origins[1];
	obj.name3 = origins[2];
	
	return obj;
}

///////////////////////HELPER FUNCTIONS//////////////////////////////
//Mile Formatter//
function formatMiles(array) {
	let finalArr = []
	array.forEach(str => {
		let arr = str.split(' ');
		if (arr[0].includes(',')) {
			finalArr.push(parseFloat(arr[0].replace(/,/g, '')));
		} else {
			finalArr.push(parseFloat(arr[0]));
		}
	});
	
	return finalArr;
}

//City Name Formatter//
function formatNames(array) {
	let finalArr = [];
	array.forEach(str => {
		let arr = str.split(', ');
		arr[1] = arr[1].replace(/[0-9]/g, '');
		
		finalArr.push(`${arr[0]}, ${arr[1]}`);
	});
	
	return finalArr;
}

//Valid US Postal Regex Code//
function isValidUSZip(sZip) {
  return /^\d{5}(-\d{4})?$/.test(sZip);
}

//Return array of container cost indices
function getIndices(zips) {
	let index;
	let arr = [];
	let costs = containerCosts.slice(0);
	
	for (let i=0; i<zips.length; i++) {
		index = costs.findIndex(x => x.zip === zips[i]);
		
		if (arr.includes(index)) {
			if (arr.includes(index+1)) {
				arr.push(index + 2);
			}
			else {
				arr.push(index + 1);
			}
		}
		else {
			arr.push(index);
		}
	}
	
	return arr;
}

//Calculate Prices Based on Distances and Initial Prices//
function calcPrices(arr, indices, size, condition) {
	let finalArr = [];
	
	//Delivery Prices
	for (let i=0; i<arr.length; i++) {
		//Get Appropriate Starting Price Based on Selected Radio Type
		const initPrice = containerCosts[indices[i]].prices[condition][size];
		//Set boolean values if inventory is <= 1
		if (containerCosts[indices[i]].inventory[condition][size] <= 1) {
			searchData.inventory[i] = true;
		}
		
		let curr = initPrice + (arr[i]*priceData.pricePerMi + 100) + priceData.markup;
		
		//Store credit fee
		searchData.creditFees.push(Math.round(curr * priceData.creditFee));
		curr = curr + (curr * priceData.creditFee);
		
		finalArr.push(Math.round(curr * 100) / 100);
	}
	
	//Pickup Prices
	for (let i=0; i<arr.length; i++) {
		//Get Appropriate Starting Price Based on Selected Radio Type
		const initPrice = containerCosts[indices[i]].prices[condition][size];
		
		let curr = initPrice + priceData.markup;
		
		//Store credit fee
		searchData.creditFees.push(Math.round(curr * priceData.creditFee));
		curr = curr + (curr * priceData.creditFee);
		
		finalArr.push(Math.round(curr * 100) / 100);
	}
	
	return finalArr;
}

//Display Results//
function displayResults(arrMile, arrName, arrPrice, arrCredit, arrInv) {
	for (let i=1; i<4; i++) {
		if (arrInv[i-1] === true) {
			document.querySelector(`.inv_notif_${i}`).style.display = "block";
		} else {
			document.querySelector(`.inv_notif_${i}`).style.display = "none";
		}
		document.querySelector(`.mile_${i}`).textContent = `${arrMile[i-1]}`;
		document.querySelector(`.name_${i}`).textContent = `${arrName[i-1]}`;
		document.querySelector(`.price_${i}`).textContent = `$${arrPrice[i-1]}`;
		document.querySelector(`.pickup_${i}`).textContent = `$${arrPrice[(i-1)+3]}`;
		document.querySelector(`.delcred_${i}`).textContent = `CC Fee: $${arrCredit[i-1]}`;
		document.querySelector(`.picred_${i}`).textContent = `CC Fee: $${arrCredit[(i-1)+3]}`;
	}
}

//Find Three Closest Zips//
function closestZip(sZip) {
	let arrZips = [];
	let closest, index;
	
	//duplicate array of depot zips and convert to numbers for comparison
	let depots = depotZips.map(el => parseInt(el, 10));
	
	/////////////////////////////////////
	//Do this three times for three zips
	for (let i=0; i<3; i++) {
		//Determine closest num to sZip
		closest = depots.reduce(function(prev, curr) {
			return (Math.abs(curr - sZip) < Math.abs(prev - sZip) ? curr : prev);
		});
		
		//Remove num from duplicate array
		index = depots.indexOf(closest);
		depots.splice(index, 1);
		
		//Push formatted zip into final array
		if (closest.toString().length < 5)
		{
			closest = formatZip(closest);
			arrZips.push(closest);
		}
		else
		{
			arrZips.push(closest.toString());
		}
	}

	//Test logs
	// console.log(depots);
	// console.log(depotZips);
	// console.log(arrZips);
	return arrZips;
}

//Zero Padding Function
function formatZip(num) {
    var s = "00000"+num;
    return s.substr(s.length-5);
}











//
