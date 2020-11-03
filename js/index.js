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

//Depot Zip Locations
const depotZips = [
	10493, 33326, 84032, 86936, 19233, 10948, 84084, 62324
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
			const res = await fetch(`http://localhost:8010/proxy/maps/api/distancematrix/json?units=imperial&origins=${this.origin}|${this.origin2}|${this.origin3}&destinations=${this.dest}&key=AIzaSyDx-GTgp58k6t5DcKe-nQlr--QVZf5rKJ0`);
			const data = await res.json();
			
			this.result = data.rows[0].elements[0].distance.text;
			this.result2 = data.rows[1].elements[0].distance.text;
			this.result3 = data.rows[2].elements[0].distance.text;
			
		} catch (e) {
			alert(e);
		}
	}
} // ----------------------- Distance Class


//Enter Button Listener
DOM.enterBtn.addEventListener('click', async() => {
	//Check if zip code is present and valid
	if (DOM.zipField.value && isValidUSZip(parseInt(DOM.zipField.value)))
	{
		//store destination zip
		const dest = parseInt(DOM.zipField.value);
		
		//Determine three closest depots to destination zip
		const arrDepots = closestZip(dest);
		
		//Store Zip Codes in distance object
		const dist = new Distance(...arrDepots, dest);
		
		//Store distance between zip codes in state
		await dist.getDistances();
		state.distance = dist.result;
		
		console.log(state);
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

//Find Three Closest Zips//
function closestZip(sZip) {
	//duplicate array of depot zips
	let depots = depotZips.slice(0);
	let arrZips = [];
	
	//Do this three times for three zips
	for (let i=0; i<3; i++) {
		//Determine closest num to sZip
		let closest = depots.reduce(function(prev, curr) {
			return (Math.abs(curr - sZip) < Math.abs(prev - sZip) ? curr : prev);
		});
		
		//Push the retrieved num
		arrZips.push(closest);
		
		//Remove it from duplicate array
		let index = depots.indexOf(closest);
		depots.splice(index, 1);
	}

	//Test logs
	console.log(depots);
	console.log(depotZips);
	console.log(arrZips);
	
	return arrZips;
}

closestZip(80832);










//AIzaSyDx-GTgp58k6t5DcKe-nQlr--QVZf5rKJ0 -- DISTANCE MATRIX API KEY
