// ===================== TASK 5: PAKISTAN POINT MAP =====================

async function task5() {
  const width = 700, height = 650;
  const tooltip = d3.select("#tooltip");

  // 1) Load map + cities
  const [world, cities] = await Promise.all([
    d3.json("dataset/world.geojson"),
    d3.csv("dataset/pakistan_cities.csv", d3.autoType)
  ]);

  // 2) Mercator projection centered on Pakistan
  //    fitExtent zooms the map so the Pakistan shape fills the box
  const pakistan = world.features.find(d => d.id === "PAK");
  const projection = d3.geoMercator()
    .center([69.5, 30])                                      // lon, lat of Pakistan's middle
    .fitExtent([[30, 50], [width - 30, height - 20]], pakistan);
  const path = d3.geoPath(projection);

  // 3) Square-root radius scale -> circle AREA is proportional to population
  const radius = d3.scaleSqrt()
    .domain([0, d3.max(cities, d => d.pop)])
    .range([0, 40]);

  // 4) SVG
  const svg = d3.select("#task5").append("svg")
    .attr("width", width)
    .attr("height", height);

  // Clip so neighbouring countries don't spill outside the box
  svg.append("defs").append("clipPath").attr("id", "clip5")
    .append("rect").attr("width", width).attr("height", height);

  const mapG = svg.append("g").attr("clip-path", "url(#clip5)");

  // Countries (Pakistan highlighted)
  mapG.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => d.id === "PAK" ? "#e0f2ec" : "#f1ede6")
    .attr("stroke", "#aaa");

  // 5) City circles - projection([lon, lat])  (longitude FIRST)
  mapG.selectAll("circle")
    .data(cities.sort((a, b) => b.pop - a.pop))   // big first so small ones stay on top
    .join("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", d => Math.max(radius(d.pop), 3))     // min 3px so tiny cities are visible
    .attr("fill", "#e15759")
    .attr("fill-opacity", 0.5)                      // semi-transparent
    .attr("stroke", "#a3302f")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("fill-opacity", 0.9);
      tooltip.style("opacity", 1).html(`<b>${d.name}</b><br>Population: ${d.pop} million`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("fill-opacity", 0.5);
      tooltip.style("opacity", 0);
    });

  // 6) Labels only for cities with population > 1 million
  mapG.selectAll("text.city")
    .data(cities.filter(d => d.pop > 1))
    .join("text")
    .attr("class", "city")
    .attr("x", d => projection([d.lon, d.lat])[0] + radius(d.pop) + 4)
    .attr("y", d => projection([d.lon, d.lat])[1] + 4)
    .style("font-size", "13px")
    .style("pointer-events", "none")
    .text(d => d.name);

  // Title on a white strip
  svg.append("rect").attr("width", width).attr("height", 38).attr("fill", "white");
  svg.append("text")
    .attr("x", 10).attr("y", 25)
    .style("font-size", "18px").style("font-weight", "bold")
    .text("Major Cities of Pakistan (circle area = population)");
}

task5();
