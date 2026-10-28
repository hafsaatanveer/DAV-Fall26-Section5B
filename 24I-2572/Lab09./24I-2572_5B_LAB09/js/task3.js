// ===================== TASK 3: FORCE-DIRECTED NETWORK =====================

async function task3() {
  const width = 900, height = 550;
  const tooltip = d3.select("#tooltip");

  // 1) Load the edge list
  const links = await d3.csv("dataset/flights.csv", d3.autoType);

  // 2) Build the node list from the edge list using a Set (removes duplicates)
  const cityNames = new Set();
  links.forEach(l => {
    cityNames.add(l.source);
    cityNames.add(l.target);
  });
  const nodes = Array.from(cityNames, name => ({ id: name, degree: 0 }));

  // 3) Degree = number of routes touching each city
  links.forEach(l => {
    nodes.find(n => n.id === l.source).degree++;
    nodes.find(n => n.id === l.target).degree++;
  });

  // 4) Scales
  const widthScale = d3.scaleLinear()                // link thickness = flights
    .domain(d3.extent(links, d => d.flights))
    .range([1, 10]);

  const radiusScale = d3.scaleSqrt()                 // node size = degree
    .domain([1, d3.max(nodes, d => d.degree)])
    .range([6, 26]);

  // 5) SVG
  const svg = d3.select("#task3").append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", 10).attr("y", 25)
    .style("font-size", "18px").style("font-weight", "bold")
    .text("Weekly Flights Between Pakistani Cities");

  // 6) Force simulation
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(130))
    .force("charge", d3.forceManyBody().strength(-600))
    .force("center", d3.forceCenter(width / 2, height / 2 + 15))
    .force("collide", d3.forceCollide(d => radiusScale(d.degree) + 25));

  // 7) Draw links first (so circles sit on top)
  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("stroke", "#888")
    .attr("stroke-opacity", 0.7)
    .attr("stroke-width", d => widthScale(d.flights));

  // 8) Draw nodes (circle + label inside a group)
  const node = svg.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .style("cursor", "grab")
    .call(d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null; d.fy = null;
      }));

  node.append("circle")
    .attr("r", d => radiusScale(d.degree))
    .attr("fill", "#4e79a7")
    .attr("stroke", "white")
    .attr("stroke-width", 2);

  node.append("text")
    .attr("x", d => radiusScale(d.degree) + 4)
    .attr("dy", "0.35em")
    .style("font-size", "13px")
    .text(d => d.id);

  // 9) Hover: highlight this city's routes, fade the others
  node.on("mouseover", (event, d) => {
      link.attr("stroke", l => (l.source.id === d.id || l.target.id === d.id) ? "#e15759" : "#888")
          .attr("stroke-opacity", l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1);
      tooltip.style("opacity", 1).html(`<b>${d.id}</b><br>Routes: ${d.degree}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      link.attr("stroke", "#888").attr("stroke-opacity", 0.7);
      tooltip.style("opacity", 0);
    });

  // Tooltip on links too (shows flights per week)
  link.on("mouseover", (event, d) => {
      tooltip.style("opacity", 1).html(`${d.source.id} - ${d.target.id}<br>${d.flights} flights/week`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // 10) Update positions on every tick of the simulation
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("transform", d => `translate(${d.x}, ${d.y})`);
  });
}

task3();
