// ===================== TASK 1: TREEMAP =====================
// Each task is inside its own function so variable names don't clash.

async function task1() {
  const width = 900, height = 500;
  const tooltip = d3.select("#tooltip");

  // 1) Load data (d3.autoType turns "120" into the number 120)
  const data = await d3.csv("dataset/university.csv", d3.autoType);

  // 2) Reshape flat rows into a hierarchy: University -> Department -> Course
  const grouped = d3.group(data, d => d.department);   // Map: dept -> rows
  const treeData = {
    name: "University",
    children: Array.from(grouped, ([dept, rows]) => ({
      name: dept,
      children: rows.map(r => ({ name: r.course, value: r.students }))
    }))
  };

  // 3) Make hierarchy + sum the values + run the treemap layout
  const root = d3.hierarchy(treeData)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height - 40])   // leave 40px at top for title
    .paddingInner(2)
    .paddingOuter(4)
    (root);                       // adds x0, y0, x1, y1 to every node

  // 4) Color scale for departments
  const departments = Array.from(grouped.keys());
  const color = d3.scaleOrdinal()
    .domain(departments)
    .range(["#4e79a7", "#f28e2b", "#59a14f", "#e15759"]);

  // 5) SVG
  const svg = d3.select("#task1").append("svg")
    .attr("width", width)
    .attr("height", height + 40);

  // Title
  svg.append("text")
    .attr("x", 10).attr("y", 25)
    .style("font-size", "18px").style("font-weight", "bold")
    .text("Course Enrollment by Department");

  const chart = svg.append("g").attr("transform", "translate(0, 40)");

  // One group per course (the leaves)
  const leaf = chart.selectAll("g")
    .data(root.leaves())
    .join("g")
    .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

  leaf.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => color(d.parent.data.name))
    .attr("stroke", "white")
    .on("mouseover", function (event, d) {
      d3.select(this).attr("opacity", 0.7);
      tooltip.style("opacity", 1)
        .html(`<b>${d.data.name}</b><br>Department: ${d.parent.data.name}<br>Students: ${d.value}`);
    })
    .on("mousemove", event => {
      tooltip.style("left", event.pageX + 12 + "px").style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("opacity", 1);
      tooltip.style("opacity", 0);
    });

  // Course name label + student count inside each rectangle
  leaf.append("text")
    .attr("x", 5).attr("y", 18)
    .style("fill", "white").style("font-size", "13px").style("font-weight", "bold")
    .style("pointer-events", "none")
    .text(d => d.data.name);

  leaf.append("text")
    .attr("x", 5).attr("y", 34)
    .style("fill", "white").style("font-size", "12px")
    .style("pointer-events", "none")
    .text(d => d.value + " students");

  // 6) Legend (4 departments) at the bottom
  const legend = svg.append("g").attr("transform", `translate(10, ${height + 15})`);
  departments.forEach((dept, i) => {
    const item = legend.append("g").attr("transform", `translate(${i * 180}, 0)`);
    item.append("rect").attr("width", 16).attr("height", 16).attr("fill", color(dept));
    item.append("text").attr("x", 22).attr("y", 13).style("font-size", "13px").text(dept);
  });
}

task1();
