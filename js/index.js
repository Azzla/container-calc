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
	salesTax: .0725,
	creditFee: .03,
	quantity: 1
};

//Current Search Data
let searchData = {
	deliveryZip: '',
	closestZips: [],
	milesToDepots: [],
	cityNames: [],
	prices: []
};

//Depot Zip Locations
const depotZips = [
	'37128', '38654', '84032', '51106', '12203', '44406', '20782'
];

//Enter Button Listener
DOM.enterBtn.addEventListener('click', async() => {
	//Clear error field
	DOM.zipError.textContent = '';
	
	//Check if zip code is both present and valid
	if (DOM.zipField.value && isValidUSZip(DOM.zipField.value))
	{
		//Esure size is selected
		let size;
		try {
			size = Array.from(document.getElementsByName("size")).find(r => r.checked).value;
		}
		catch {
			DOM.zipError.textContent = 'Please select a size/type.';
			return;
		}
		
		//store zip
		const dest = DOM.zipField.value;
		searchData.deliveryZip = dest;
		
		//determine three closest depots
		const arrDepots = closestZip(parseInt(dest, 10));
		searchData.closestZips = arrDepots.slice(0);
		
		//call matrix service and store
		const data = await matrix(...arrDepots, dest);
		searchData.milesToDepots = [data.mile1, data.mile2, data.mile3];
		//separate locations into simplified names
		searchData.cityNames = formatNames([data.name1, data.name2, data.name3]);
		
		//separate miles into correctly formatted numbers
		const miles = formatMiles(searchData.milesToDepots);
		
		//Calc prices based on distances, zip codes, and size
		const priceArr = calcPrices(miles, searchData.closestZips, size);
		searchData.prices = priceArr.slice(0);
		
		//Get Depot Names
		const ind1 = containerCosts.findIndex(x => x.zip === searchData.closestZips[0]);
		const ind2 = containerCosts.findIndex(x => x.zip === searchData.closestZips[1]);
		const ind3 = containerCosts.findIndex(x => x.zip === searchData.closestZips[2]);
		searchData.depotNames = [containerCosts[ind1].depot, containerCosts[ind2].depot, containerCosts[ind3].depot];
		
		//Display resulting data in DOM
		displayResults(searchData.milesToDepots, searchData.cityNames, searchData.depotNames, searchData.prices);
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

//

//Calculate Prices Based on Distances and Initial Prices//
function calcPrices(arr, zips, size) {
	let finalArr = [];
	
	//Delivery Prices
	for (let i=0; i<arr.length; i++) {
		//Retrieve Index of Object Matching Desired Zip Code
		const index = containerCosts.findIndex(x => x.zip === zips[i]);
		//Get Appropriate Starting Price Based on Selected Radio Type
		const initPrice = containerCosts[index].prices[size];
		
		let curr = (initPrice*priceData.quantity) + (arr[i]*priceData.pricePerMi + 100) + priceData.markup;
		curr = curr + (curr * priceData.salesTax);
		curr = curr + (curr * priceData.creditFee);
		
		finalArr.push(Math.round(curr * 100) / 100);
	}
	
	//Pickup Prices
	for (let i=0; i<arr.length; i++) {
		//Retrieve Index of Object Matching Desired Zip Code
		const index = containerCosts.findIndex(x => x.zip === zips[i]);
		//Get Appropriate Starting Price Based on Selected Radio Type
		const initPrice = containerCosts[index].prices[size];
		
		let curr = (initPrice*priceData.quantity) + priceData.markup;
		curr = curr + (curr * priceData.salesTax);
		curr = curr + (curr * priceData.creditFee);
		
		finalArr.push(Math.round(curr * 100) / 100);
	}
	
	return finalArr;
}

//Display Results//
function displayResults(arrMile, arrName, arrDepot, arrPrice) {
	for (let i=1; i<4; i++) {
		document.querySelector(`.mile_${i}`).textContent = `${arrMile[i-1]}`;
		document.querySelector(`.name_${i}`).textContent = `${arrName[i-1]}`;
		document.querySelector(`.depot_${i}`).textContent = `${arrDepot[i-1]}`;
		document.querySelector(`.price_${i}`).textContent = `$${arrPrice[i-1]}`;
		document.querySelector(`.pickup_${i}`).textContent = `$${arrPrice[(i-1)+3]}`;
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
