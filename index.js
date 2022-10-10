/*
Size constants
*/

const WIDTH = document.getElementById("vis1").clientWidth;
const HEIGHT = document.getElementById("vis1").clientHeight;

const margin = {top: 50, right: 50, bottom: 50, left: 50};
const width = WIDTH - margin.left - margin.right;
const height = HEIGHT - margin.top - margin.bottom;

/* 
Functions
*/

// This function loads the data
async function initialLoad() {
    const countries = await d3.json("./data/countries.geojson");
    const starbucks = await d3.csv("./data/starbucks.csv");
    return {countries, starbucks};
}

// This function gets the number of starbucks in each country and returns and array of objects with 
// the country name and the number of starbucks
function totalStarbucksByCountry(starbucksData) {
    const sumByCountry = d3.rollup(starbucksData, v => v.length, d => d.countryCode);
    const starbucksByCountryArray = Array.from(sumByCountry, ([countryCode, total]) => ({countryCode, total}));
    return starbucksByCountryArray;
}

/* 
Projections
*/

const projectionWinkel3 = d3.geoWinkel3();
//const projection = d3.geoMercator();

/*
Scales
*/

function logScale(data, min, max) {
    const scale = d3.scaleLog()
                    .domain(d3.extent(data, d => d.total))
                    .range([min, max]);
    return scale;
}

function linearScale(data, min, max) {
    const scale = d3.scaleLinear()
                    .domain(d3.extent(data, d => d.total))
                    .range([min, max]);
    return scale;
}

function sqrtScale(data, min, max) {
    const scale = d3.scaleSqrt()
                    .domain(d3.extent(data, d => d.total))
                    .range([min, max]);
    return scale;
}

const svg = d3.select("#vis1")
                .append("svg")
                .attr("width", WIDTH)
                .attr("height", HEIGHT);

const map = svg.append("g")
                .attr('id', 'map')
                .attr("transform", `translate(${margin.left}, ${margin.top})`);

const countriesGroup = map.append("g")
                    .attr("id", "countries");

const boundingRect = map.append("rect")
                            .attr("id", "bounding-rect")
                            .attr("width", width)
                            .attr("height", height)
                            .attr("fill", "none")
                            .attr("stroke", "black");


/*
Main
*/

//Create first visualization: static map
initialLoad().then(data => {
    const {countries, starbucks} = data;

    const starbucksByCountry = totalStarbucksByCountry(starbucks);

    projectionWinkel3.fitSize([width, height], countries);
    const pathGenerator = d3.geoPath().projection(projectionWinkel3);

    // For every country we create a g element to group his path and bubble 
    const countryNodes = countriesGroup.selectAll("path.country")
                                        .data(countries.features)
                                        .enter()
                                        .append("g")
                                        .attr("class", "country")
                                        
    countryNodes.append("path")               
                .attr("d", pathGenerator)
                .attr("fill", "lightgrey")
                .attr("opacity", 0.6)
                .attr("stroke", "black")

    countryNodes.each(addBubbles);    
    
    function addBubbles(d){
        d3.select(this)
        .selectAll("circle")
        .data(starbucksByCountry.filter(function(D){
            return D.countryCode == d.properties.ISO_A2}))
        .enter()
        .append("circle")
        .attr("cx",  pathGenerator.centroid(d)[0])
        .attr("cy", pathGenerator.centroid(d)[1])
        .attr("r", function(D){
            const scale = logScale(starbucksByCountry, 1, 20);
            return scale(D.total);
            })
        .attr("id", function(D){
            return D.countryCode;
        })
        .style("fill", "#00704A")
        .style("opacity", 0.5)
    }

});