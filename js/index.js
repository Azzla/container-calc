//Element Selectors
const DOM = {
	zipField: document.querySelector('.zip_field'),
	enterBtn: document.querySelector('.enter_btn'),
	zipError: document.querySelector('.zip_error')
};

//Price Data
const priceData = {
	initAmt: 1000,
	margin: 550,
	pricePerMi: 5.5
};

//Current Search Data
let searchData = {
	deliveryZip: '',
	closestZips: [],
	milesToDepots: [],
	names: [],
	prices: []
};

//Depot Zip Locations
const depotZips = [
	'37128', '38654', '84032', '51106', '12203', '44406', '20782', '47933', '60062', '07026'
];

//Distance Class
class Distance {
	constructor(origin, origin2, origin3, dest) {
		this.origin = origin;
		this.origin2 = origin2;
		this.origin3 = origin3;
		this.dest = dest;
	}
	
	//Get Driving Distances Between Points in miles
	async getDistances() {
		try {
			//const res = await fetch(`http://localhost:8010/proxy/maps/api/distancematrix/json?units=imperial&origins=${this.origin}|${this.origin2}|${this.origin3}&destinations=${this.dest}&key=AIzaSyDx-GTgp58k6t5DcKe-nQlr--QVZf5rKJ0`);
			const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${this.origin}|${this.origin2}|${this.origin3}&destinations=${this.dest}&key=AIzaSyDx-GTgp58k6t5DcKe-nQlr--QVZf5rKJ0`);
			const data = await res.json();
			
			if (!data.destination_addresses[0])
			{
				DOM.zipError.textContent = 'Invalid destination zip code.';
			}
			else
			{
				this.result1 = data.rows[0].elements[0].distance.text;
				this.result2 = data.rows[1].elements[0].distance.text;
				this.result3 = data.rows[2].elements[0].distance.text;
				this.name1 = data.origin_addresses[0];
				this.name2 = data.origin_addresses[1];
				this.name3 = data.origin_addresses[2];
			}
		} catch (e) {
			alert(e);
		}
	}
} // ----------------------- Distance Class


//Enter Button Listener
DOM.enterBtn.addEventListener('click', async() => {
	//Clear error field
	DOM.zipError.textContent = '';
	
	//Check if zip code is both present and valid
	if (DOM.zipField.value && isValidUSZip(DOM.zipField.value))
	{
		//store zip
		const dest = DOM.zipField.value;
		searchData.deliveryZip = dest;
		
		//determine three closest depots
		const arrDepots = closestZip(dest);
		searchData.closestZips = arrDepots.slice(0);
		
		//create distance object
		const dist = new Distance(...arrDepots, dest);
		
		//retrieve distances and store
		await dist.getDistances();
		searchData.milesToDepots = [dist.result1, dist.result2, dist.result3];
		searchData.names = [dist.name1, dist.name2, dist.name3];
		
		//separate miles into correctly formatted numbers
		let miles = [];
		searchData.milesToDepots.forEach(str => {
			let arr = str.split(' ');
			if (arr[0].includes(',')) {
				miles.push(parseFloat(arr[0].replace(/,/g, '')));
			} else {
				miles.push(parseFloat(arr[0]));
			}
		});
		
		//Calc prices based on distances and store
		const priceArr = calcPrices(miles);
		searchData.prices = priceArr.slice(0);
		
		//Display resulting data in DOM
		displayResults(searchData.milesToDepots, searchData.names, searchData.prices);
	}
	else
	{
		DOM.zipError.textContent = 'Please enter a valid US zip code.';
	}
});
//----------------------------------------------------


///////////////////////HELPER FUNCTIONS//////////////////////////////
//Valid US Postal Regex Code//
function isValidUSZip(sZip) {
  return /^\d{5}(-\d{4})?$/.test(sZip);
}

//Calculate Prices Based on Distances//
function calcPrices(arr) {
	let finalArr = [];
	
	for (let i=0; i<arr.length; i++) {
		finalArr.push(priceData.initAmt + (arr[i]*priceData.pricePerMi) + priceData.margin);
	}
	
	return finalArr;
}

//Display Results//
function displayResults(arrMile, arrName, arrPrice) {
	for (let i=1; i<4; i++) {
		document.querySelector(`.mile_${i}`).textContent = `${arrMile[i-1]}`;
		document.querySelector(`.name_${i}`).textContent = `${arrName[i-1]}`;
		document.querySelector(`.price_${i}`).textContent = `$${arrPrice[i-1]}`;
	}
}

//Find Three Closest Zips//
function closestZip(sZip) {
	let arrZips = [];
	let closest, index;
	
	//duplicate array of depot zips and convert to numbers for comparison
	let depots = depotZips.map(el => parseInt(el));
	
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








//AIzaSyDx-GTgp58k6t5DcKe-nQlr--QVZf5rKJ0 -- DISTANCE MATRIX API KEY
