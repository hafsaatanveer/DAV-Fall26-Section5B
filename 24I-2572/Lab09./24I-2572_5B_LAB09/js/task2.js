// ===================== TASK 2: DENDROGRAM =====================

async function task2() {
  const width = 900, height = 500;
  const margin = { top: 40, right: 160, bottom: 20, left: 110 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // 1) Load + reshape (same as Task 1)
  const data = await d3.csv("dataset/university.csv", d3.autoType);
  const grouped = d3.group(data, d => d.department);
  const treeData = {
    name: "University",
    children: Array.from(grouped, ([dept, rows]) => ({
      name: dept,
      children: rows.map(r => ({ name: r.course, value: r.students }))
    }))
  };

  const root = d3.hierarchy(treeData);

  // Color by depth: 0 = root, 1 = department, 2 = course
  const depthColor = ["#d62728", "#1f77b4", "#2ca02c"];

  // 2) SVG
  const svg = d3.select("#task2").append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.append("text")
    .attr("x", 10).attr("y", 25)
    .style("font-size", "18px").style("font-weight", "bold")
    .text("University -> Departments -> Courses");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Horizontal link generator (x and y are swapped for a left-to-right tree)
  const linkPath = d3.linkHorizontal()
    .x(d => d.y)
    .y(d => d.x);

  // 3) Draw function (called again every time we collapse / expand)
  function draw() {
    d3.cluster().size([innerH, innerW])(root);   // adds x, y to each node

    g.selectAll("*").remove();   // clear old drawing (simple approach)

    // Links (curved)
    g.selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", linkPath)
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5);

    // Nodes
    const node = g.selectAll("g.node")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.y}, ${d.x})`);

    node.append("circle")
      .attr("r", 6)
      .attr("fill", d => depthColor[d.depth])
      .attr("stroke", "#333")
      // collapsed departments get a thicker border so you know they have hidden children
      .attr("stroke-width", d => d._children ? 3 : 1)
      .style("cursor", d => d.depth === 1 ? "pointer" : "default")
      .on("click", (event, d) => {
        if (d.depth !== 1) return;          // only departments can collapse
        if (d.children) {                   // collapse
          d._children = d.children;
          d.children = null;
        } else {                            // expand
          d.children = d._children;
          d._children = null;
        }
        draw();
      });

    // Labels: leaves on the RIGHT, parents on the LEFT (so they don't sit on links)
    node.append("text")
      .attr("dy", "0.32em")
      .attr("x", d => (d.children ? -10 : 10))
      .attr("text-anchor", d => (d.children ? "end" : "start"))
      .style("font-size", "13px")
      .text(d => d.data.name);
  }

  draw();

  // 4) Small legend for depth colors
  const labels = ["Root (University)", "Department", "Course"];
  const legend = svg.append("g").attr("transform", `translate(10, ${height - 60})`);
  labels.forEach((t, i) => {
    legend.append("circle").attr("cx", 6).attr("cy", i * 20).attr("r", 6).attr("fill", depthColor[i]);
    legend.append("text").attr("x", 18).attr("y", i * 20 + 4).style("font-size", "12px").text(t);
  });
}

task2();
