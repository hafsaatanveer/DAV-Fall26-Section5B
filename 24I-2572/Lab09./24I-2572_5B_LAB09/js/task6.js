// ===================== TASK 6: COMBINED MAP =====================
// 4 encodings: position = location, size = population,
//              color = hub or not, line width = flights per week

async function task6() {
  const width = 900, height = 650;
  const mapW = 680;               // left part = map, right part = legend
  const tooltip = d3.select("#tooltip");

  // 1) Load everything
  const [world, cities, flights] = await Promise.all([
    d3.json("dataset/world.geojson"),
    d3.csv("dataset/pakistan_cities.csv", d3.autoType),
    d3.csv("dataset/flights.csv", d3.autoType)
  ]);

  // 2) Projection (same idea as Task 5)
  const pakistan = world.features.find(d => d.id === "PAK");
  const projection = d3.geoMercator()
    .fitExtent([[30, 50], [mapW - 30, height - 20]], pakistan);
  const path = d3.geoPath(projection);

  // 3) Match routes to city coordinates
  const cityByName = new Map(cities.map(c => [c.name, c]));

  // degree (number of routes) for each city -> decide hub
  cities.forEach(c => {
    c.degree = flights.filter(f => f.source === c.name || f.target === c.name).length;
    c.isHub = c.degree >= 4;
  });

  // 4) Scales
  const radius = d3.scaleSqrt().domain([0, d3.max(cities, d => d.pop)]).range([0, 35]);
  const lineW = d3.scaleLinear().domain(d3.extent(flights, d => d.flights)).range([1, 9]);
  const hubColor = d => (d.isHub ? "#d62728" : "#1f77b4");

  // 5) SVG + background map
  const svg = d3.select("#task6").append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("defs").append("clipPath").attr("id", "clip6")
    .append("rect").attr("width", mapW).attr("height", height);

  const mapG = svg.append("g").attr("clip-path", "url(#clip6)");

  mapG.selectAll("path")
    .data(world.features)
    .join("path")
    .attr("d", path)
    .attr("fill", d => d.id === "PAK" ? "#eef5ee" : "#f4f1ec")
    .attr("stroke", "#bbb");

  // 6) Routes FIRST (so cities are drawn on top)
  const routes = mapG.append("g")
    .selectAll("line")
    .data(flights)
    .join("line")
    .attr("x1", d => projection([cityByName.get(d.source).lon, cityByName.get(d.source).lat])[0])
    .attr("y1", d => projection([cityByName.get(d.source).lon, cityByName.get(d.source).lat])[1])
    .attr("x2", d => projection([cityByName.get(d.target).lon, cityByName.get(d.target).lat])[0])
    .attr("y2", d => projection([cityByName.get(d.target).lon, cityByName.get(d.target).lat])[1])
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", d => lineW(d.flights));

  // 7) Cities on top
  const circles = mapG.append("g")
    .selectAll("circle")
    .data(cities.sort((a, b) => b.pop - a.pop))
    .join("circle")
    .attr("cx", d => projection([d.lon, d.lat])[0])
    .attr("cy", d => projection([d.lon, d.lat])[1])
    .attr("r", d => Math.max(radius(d.pop), 4))
    .attr("fill", hubColor)
    .attr("fill-opacity", 0.6)
    .attr("stroke", "white");

  mapG.append("g")
    .selectAll("text")
    .data(cities)
    .join("text")
    .attr("x", d => projection([d.lon, d.lat])[0] + Math.max(radius(d.pop), 4) + 3)
    .attr("y", d => projection([d.lon, d.lat])[1] + 4)
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .text(d => d.name);

  // 8) Hover: highlight this city's routes, dim the rest
  circles
    .on("mouseover", (event, d) => {
      routes
        .attr("stroke", r => (r.source === d.name || r.target === d.name) ? "#ff7f0e" : "#555")
        .attr("stroke-opacity", r => (r.source === d.name || r.target === d.name) ? 1 : 0.08);
      circles.attr("fill-opacity", c => c.name === d.name ? 1 : 0.25);
      tooltip.style("opacity", 1).html(
        `<b>${d.name}</b><br>Population: ${d.pop} million<br>Routes: ${d.degree}` +
        (d.isHub ? "<br><b>Hub</b>" : ""));
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      routes.attr("stroke", "#555").attr("stroke-opacity", 0.5);
      circles.attr("fill-opacity", 0.6);
      tooltip.style("opacity", 0);
    });

  // 9) Title
  svg.append("rect").attr("width", width).attr("height", 38).attr("fill", "white");
  svg.append("text")
    .attr("x", 10).attr("y", 25)
    .style("font-size", "18px").style("font-weight", "bold")
    .text("Pakistan: Cities, Population and Flight Routes");

  // 10) Legend explaining all 4 encodings
  const lg = svg.append("g").attr("transform", `translate(${mapW + 20}, 70)`);
  const heading = (y, t) => lg.append("text").attr("y", y)
    .style("font-weight", "bold").style("font-size", "13px").text(t);

  // (a) Position
  heading(0, "Position");
  lg.append("text").attr("y", 18).style("font-size", "12px").text("= real city location");

  // (b) Size = population
  heading(55, "Circle size = population");
  [1, 5, 16].forEach((p, i) => {
    const cy = 100 + i * 55;
    lg.append("circle").attr("cx", 35).attr("cy", cy).attr("r", radius(p))
      .attr("fill", "none").attr("stroke", "#555");
    lg.append("text").attr("x", 80).attr("y", cy + 4).style("font-size", "12px").text(p + " million");
  });

  // (c) Color = hub
  heading(275, "Color = hub?");
  [["Hub (4+ routes)", true], ["Not a hub", false]].forEach(([label, hub], i) => {
    lg.append("circle").attr("cx", 10).attr("cy", 295 + i * 22).attr("r", 7)
      .attr("fill", hubColor({ isHub: hub })).attr("fill-opacity", 0.6);
    lg.append("text").attr("x", 25).attr("y", 299 + i * 22).style("font-size", "12px").text(label);
  });

  // (d) Line width = flights
  heading(370, "Line width = flights/week");
  [6, 30, 70].forEach((f, i) => {
    const y = 392 + i * 22;
    lg.append("line").attr("x1", 0).attr("x2", 50).attr("y1", y).attr("y2", y)
      .attr("stroke", "#555").attr("stroke-width", lineW(f));
    lg.append("text").attr("x", 60).attr("y", y + 4).style("font-size", "12px").text(f + " flights");
  });
}

task6();
