// ===================== TASK 4: CHOROPLETH MAP =====================

async function task4() {
  const width = 900, height = 520;
  const tooltip = d3.select("#tooltip");

  // 1) Load the map and the data together
  const [world, popData] = await Promise.all([
    d3.json("dataset/world.geojson"),
    d3.csv("dataset/population.csv", d3.autoType)
  ]);

  // 2) Lookup table: country code -> row   (e.g. "PAK" -> {country, population_millions})
  const popById = new Map(popData.map(d => [d.id, d]));

  // 3) Projection + path generator
  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height - 80], world);
  const path = d3.geoPath(projection);

  // 4) Sequential color scale with square-root (keeps middle values distinguishable)
  const maxPop = d3.max(popData, d => d.population_millions);
  const minPop = d3.min(popData, d => d.population_millions);
  const color = d3.scaleSequentialSqrt(d3.interpolateBlues)
    .domain([0, maxPop]);

  // 5) SVG
  const svg = d3.select("#task4").append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", 10).attr("y", 25)
    .style("font-size", "18px").style("font-weight", "bold")
    .text("Population by Country (millions)");

  // 6) Draw countries
  svg.append("g")
    .attr("transform", "translate(0, 35)")
    .selectAll("path")
    .data(world.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => {
      const row = popById.get(d.id);
      return row ? color(row.population_millions) : "#d9d9d9";   // gray = no data
    })
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke", "black").attr("stroke-width", 1.5).raise();
      const row = popById.get(d.id);
      const text = row ? row.population_millions + " million" : "No data";
      tooltip.style("opacity", 1).html(`<b>${d.properties.name}</b><br>Population: ${text}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke", "white").attr("stroke-width", 0.5);
      tooltip.style("opacity", 0);
    });

  // 7) Legend: gradient bar with min and max labels
  const legendW = 260, legendX = 20, legendY = height - 35;

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient").attr("id", "pop-gradient");
  // add 10 color stops from 0 to max
  d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", t * 100 + "%")
      .attr("stop-color", color(t * maxPop));
  });

  svg.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", 12)
    .attr("fill", "url(#pop-gradient)")
    .attr("stroke", "#999");

  svg.append("text").attr("x", legendX).attr("y", legendY - 5)
    .style("font-size", "12px").text("Min: " + minPop + "M");
  svg.append("text").attr("x", legendX + legendW).attr("y", legendY - 5)
    .attr("text-anchor", "end")
    .style("font-size", "12px").text("Max: " + maxPop + "M");

  // "No data" box
  svg.append("rect").attr("x", legendX + legendW + 30).attr("y", legendY)
    .attr("width", 12).attr("height", 12).attr("fill", "#d9d9d9");
  svg.append("text").attr("x", legendX + legendW + 48).attr("y", legendY + 11)
    .style("font-size", "12px").text("No data");
}

task4();
