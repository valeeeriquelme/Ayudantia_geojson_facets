/********************************************************************
Constantes de tamaño:
Acá vamos a dejar las constantes ocupadas para obtener el tamaño de 
los elementos donde se van a dibujar los mapas y los gráficos.
*********************************************************************/


const WIDTH = document.getElementById("vis1").clientWidth;
const HEIGHT = document.getElementById("vis1").clientHeight;
const WIDTH2 = document.getElementById("vis2").clientWidth;
const HEIGHT2 = document.getElementById("vis2").clientHeight;

const margin = { top: 50, right: 50, bottom: 50, left: 50 };
const width = WIDTH - margin.left - margin.right;
const height = HEIGHT - margin.top - margin.bottom;

/********************************************************************
Otras variables globales
*********************************************************************/

// Variable que nos va a ayudar a saber si el último país 
// que se dibujó fue en el vis2 o en el vis3
let lastUsed = 1;

/********************************************************************
Proyecciones
*********************************************************************/
const projectionWinkel3 = d3.geoWinkel3();
const projectionMercator = d3.geoMercator();
const pathGenerator = d3.geoPath()

/******************************************************************** 
Escalas
*********************************************************************/

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

/******************************************************************** 
Funciones
*********************************************************************/

// Función que carga los datos de los archivos .csv y .json
async function initialLoad() {
    const countries = await d3.json("./data/countries.geojson");
    const starbucks = await d3.csv("./data/starbucks.csv");
    return { countries, starbucks };
}

// Función para obtener el número de tiendas por país
function totalStarbucksByCountry(starbucksData) {
    const sumByCountry = d3.rollup(starbucksData, v => v.length, d => d.countryCode);
    const starbucksByCountry = Array.from(sumByCountry, ([countryCode, total]) => ({ countryCode, total }));
    const starbucksByCountryDict = {}
    starbucksByCountry.forEach(d => {
        starbucksByCountryDict[d.countryCode] = d.total;
    })
    
    return {starbucksByCountry, starbucksByCountryDict};
}

// Función para desplegar un país con sus respectivas tiendas 
function displayCountry(d, vis, starbucksData) {

    const countryCode = d.properties.ISO_A2;

    // Agregamos el svg al vis correspondiente
    const svg = d3.select(`${vis}`)
                    .append("svg")
                    .attr("width", WIDTH2)
                    .attr("height", HEIGHT2);
    
    // Agregamos el grupo mapa que va a contener al path del país
    const map = svg.append("g")
                    .attr('class', 'countryMap')
    
    // Agregamos el grupo tiendas que va a contener a las tiendas representadas
    // como círculos
    const circlesGroup = svg.append("g")
                    .attr('class', 'storePoints')

    // Definimos la proyección
    const projection = projectionWinkel3.fitSize([WIDTH2, HEIGHT2], d);
    
    // Definimos el path generator
    const path = pathGenerator.projection(projection);

    //Agregamos el path del país al mapa
    map.selectAll("countryPath")
        .data([d])
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "lightgrey")
        .attr("opacity", 0.6)
        .attr("stroke", "black")

    // Filtramos los datos de starbucks para quedarnos solo con los del país
    // seleccionado y luego agregamos los círculos/puntos correspondientes a 
    // cada tienda de ese país 
    circlesGroup.selectAll("circle")
        .data(starbucksData)
        .enter()
        .filter(d => countryCode === d.countryCode)
        .append("circle")
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", 2)
        .attr("fill", "red")
        .attr("opacity", 0.6)
        .attr("stroke", "black")   
}

// Revisa donde fue agregada la última visualización de país y según eso 
// agrega la nueva visualización en la otra área
function chooseVisArea(d, starbucksData) {
    //check if there is a svg element in vis2
    if(lastUsed == 0){
        // Eliminar el svg del área
        d3.select("#vis3").select("svg").remove();
        // Dibujar el país en el área
        displayCountry(d, "#vis3", starbucksData);
        lastUsed = 1;
    }
    else{
        d3.select("#vis2").select("svg").remove();
        displayCountry(d, "#vis2", starbucksData);
        lastUsed = 0;
    }

}

function displayWorldMap(countries, starbucks){

    const {starbucksByCountry, starbucksByCountryDict} = totalStarbucksByCountry(starbucks);

    const svg = d3.select("#vis1")
        .append("svg")
        .attr("width", WIDTH)
        .attr("height", HEIGHT);

    const countriesGroup = svg.append("g")
                            .attr("id", "worldMap")
                            .attr("transform", `translate(${margin.left}, ${margin.top})`);


    svg.append("rect")
        .attr("id", "bounding-rect")
        .attr("width", width)
        .attr("height", height)
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
        .attr("fill", "none")
        .attr("stroke", "black");

        const projection = projectionWinkel3.fitSize([width, height], countries);
        const path = pathGenerator.projection(projection);
    
        // Para cada país, agregamos un g que va a contener el path del país
        // y una burbuja asociada al número de tiendas de ese país
        const countryNodes = countriesGroup.selectAll("country")
            .data(countries.features)
            .enter()
            .append("g")
            .attr("class", "country")
    
        countryNodes.append("path")
            .attr("d", path)
            .attr("fill", "lightgrey")
            .attr("opacity", 0.6)
            .attr("stroke", "black")
    
        // Setear los valores de la escala logaritmica
        const scale = logScale(starbucksByCountry, 1, 20);
    
        // Filtrar los G para solo quedarme con aquellos cuya data esté en starbucksByCountryDict
        countryNodes
            .filter(feature => feature.properties.ISO_A2 in starbucksByCountryDict)
            .append("circle")
            .attr("cx", d => path.centroid(d.geometry)[0])
            .attr("cy", d => path.centroid(d.geometry)[1])
            .attr("r", function (d) {
                return scale(starbucksByCountryDict[d.properties.ISO_A2]);
            })
            .attr("id", function (d) {
                return d.properties.ISO_A2;
            })
            .style("fill", "#00704A")
            .style("opacity", 0.5)
    
        // Agregar evento gatillado por click
        countryNodes.on("click", function (e, d) {
            console.log(d.properties.ADMIN, d.properties.ISO_A2);
            chooseVisArea(d, starbucks);
        });
}

/******************************************************************** 
Main
*********************************************************************/

initialLoad().then(data => {
    const { countries, starbucks } = data;
    console.log(countries);

    displayWorldMap(countries, starbucks);
});
