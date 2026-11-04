// Lab 10 - Time series with D3.js : air quality 2025
// Data: dataset/air_quality_2025.csv  (date, pm25_city, pm25_suburb, temp_c)

const WHO_GUIDE = 15;      // WHO 24-hour guideline, ug/m3
const WHO_INTERIM1 = 75;   // WHO interim target 1, ug/m3
const W = 900;             // common SVG width (charts scale with the page via viewBox)

const parseDate = d3.timeParse("%Y-%m-%d");
const fmtDay = d3.timeFormat("%d %b %Y");
const fmtShort = d3.timeFormat("%d %b");
const fmtMonth = d3.timeFormat("%b");
const f1 = d3.format(".1f");
const pct = d3.format(".1f");

const tip = d3.select("#tip");
function showTip(event, html) {
  tip.html(html).style("opacity", 1)
     .style("left", (event.clientX + 14) + "px")
     .style("top", (event.clientY + 14) + "px");
}
function hideTip() { tip.style("opacity", 0); }

// ---------- small helpers ----------
function makeChart(sel, H, m) {
  const svg = d3.select(sel).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", `translate(${m.l},${m.t})`);
  return { svg, g, iw: W - m.l - m.r, ih: H - m.t - m.b, m };
}

function yAxis(c, y, title) {
  c.g.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-c.iw).tickFormat(""));
  c.g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));
  c.g.append("text").attr("transform", "rotate(-90)")
    .attr("x", -c.ih / 2).attr("y", -c.m.l + 16).attr("text-anchor", "middle")
    .attr("fill", "#475569").attr("font-size", 12).text(title);
}

function xAxisYear(c, x) {
  c.g.append("g").attr("class", "axis").attr("transform", `translate(0,${c.ih})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(fmtMonth));
}

function halo(sel) {
  return sel.attr("paint-order", "stroke").attr("stroke", "#fff").attr("stroke-width", 3).attr("stroke-linejoin", "round");
}

// Split rows into runs of consecutive days. A jump of more than one calendar day starts a new run,
// so lines are broken at gaps instead of being joined across them.
function splitSegments(data) {
  const segs = [];
  let cur = [];
  data.forEach((d, i) => {
    if (i > 0 && d3.timeDay.count(data[i - 1].date, d.date) > 1) { segs.push(cur); cur = []; }
    cur.push(d);
  });
  if (cur.length) segs.push(cur);
  return segs;
}

function findGaps(data) {
  const gaps = [];
  for (let i = 1; i < data.length; i++) {
    const n = d3.timeDay.count(data[i - 1].date, data[i].date);
    if (n > 1) {
      gaps.push({
        start: data[i - 1].date, end: data[i].date, missing: n - 1,
        firstMissing: d3.timeDay.offset(data[i - 1].date, 1),
        lastMissing: d3.timeDay.offset(data[i].date, -1)
      });
    }
  }
  return gaps;
}

function level(v) {
  if (v <= 35) return "Low";
  if (v <= 75) return "Moderate";
  if (v <= 150) return "High";
  return "Severe";
}

function monthlyStats(data) {
  return Array.from(d3.group(data, d => d.date.getMonth()), ([m, rows]) => ({
    m,
    min: d3.min(rows, d => d.city),
    max: d3.max(rows, d => d.city),
    mean: d3.mean(rows, d => d.city),
    n: rows.length,
    mid: new Date(2025, m, 15)
  })).sort((a, b) => a.m - b.m).map(s => ({ ...s, range: s.max - s.min }));
}

// ---------- load ----------
d3.csv("dataset/air_quality_2025.csv", d => ({
  date: parseDate(d.date),
  city: +d.pm25_city,
  sub: +d.pm25_suburb,
  temp: +d.temp_c
})).then(raw => {
  const data = raw.filter(d => d.date && !isNaN(d.city)).sort((a, b) => a.date - b.date);
  task1(data); task2(data); task3(data); task4(data); task5(data);
  task6(data); task7(data); task8(data); task9(data);
}).catch(err => {
  console.error(err);
  d3.select("#main").insert("div", ":first-child").attr("class", "err")
    .text("Could not load dataset/air_quality_2025.csv. Open this page through a local server (e.g. VS Code Live Server).");
});

// ================= Task 1 =================
function task1(data) {
  const first = data[0].date, last = data[data.length - 1].date;
  const daysIn2025 = d3.timeDay.count(new Date(2025, 0, 1), new Date(2026, 0, 1));
  const gaps = findGaps(data);
  const missing = daysIn2025 - data.length;
  const rows = [
    ["Rows in the file", data.length],
    ["First date", fmtDay(first)],
    ["Last date", fmtDay(last)],
    ["Days in 2025", daysIn2025],
    ["Missing days (365 - rows)", missing]
  ];
  gaps.forEach(g => rows.push([
    "Gap in the dates",
    `${g.missing} days with no reading: ${fmtShort(g.firstMissing)} to ${fmtShort(g.lastMissing)} (readings jump from ${fmtShort(g.start)} to ${fmtShort(g.end)})`
  ]));
  d3.select("#t1-body").html(
    `<table class="facts">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table>` +
    `<p class="note">The file covers the whole year but is ${missing} rows short of 365. The missing days form one continuous block, so the sensor was offline, not randomly dropping readings.</p>`
  );
}

// ================= Task 2 =================
function task2(data) {
  const above15 = data.filter(d => d.city > WHO_GUIDE).length;
  const above75 = data.filter(d => d.city > WHO_INTERIM1).length;
  d3.select("#t2-sub").text(
    `Days above ${WHO_GUIDE}: ${above15} of ${data.length} (${pct(100 * above15 / data.length)}%)   |   ` +
    `Days above ${WHO_INTERIM1}: ${above75} of ${data.length} (${pct(100 * above75 / data.length)}%)`);

  const c = makeChart("#t2-chart", 380, { t: 24, r: 24, b: 36, l: 56 });
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, c.iw]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.city) * 1.12]).nice().range([c.ih, 0]);
  yAxis(c, y, "PM2.5 (µg/m³)");
  xAxisYear(c, x);

  const line = d3.line().x(d => x(d.date)).y(d => y(d.city));
  c.g.selectAll("path.seg").data(splitSegments(data)).join("path")
    .attr("fill", "none").attr("stroke", "#c2410c").attr("stroke-width", 1.4).attr("d", line);

  [[WHO_GUIDE, "WHO 24-hour guideline: 15 µg/m³"], [WHO_INTERIM1, "WHO interim target 1: 75 µg/m³"]].forEach(([v, label]) => {
    c.g.append("line").attr("x1", 0).attr("x2", c.iw).attr("y1", y(v)).attr("y2", y(v))
      .attr("stroke", "#334155").attr("stroke-dasharray", "6 4");
    halo(c.g.append("text").attr("x", 6).attr("y", y(v) - 5).attr("font-size", 12).attr("fill", "#334155").text(label));
  });

  const top2 = [...data].sort((a, b) => b.city - a.city).slice(0, 2);
  top2.forEach(d => {
    c.g.append("circle").attr("cx", x(d.date)).attr("cy", y(d.city)).attr("r", 5)
      .attr("fill", "#7f1d1d").attr("stroke", "#fff").attr("stroke-width", 1.5);
    halo(c.g.append("text").attr("x", x(d.date)).attr("y", y(d.city) - 10)
      .attr("text-anchor", x(d.date) > c.iw - 90 ? "end" : "middle")
      .attr("font-size", 12).attr("font-weight", 600).attr("fill", "#7f1d1d")
      .text(`${fmtShort(d.date)}: ${f1(d.city)}`));
  });
}

// ================= Task 3 =================
function task3(data) {
  const flags = data.map(d => (d.city > WHO_INTERIM1 ? 1 : 0));
  const cum = d3.cumsum(flags);
  const rows = data.map((d, i) => ({ date: d.date, total: cum[i] }));
  const finalTotal = rows[rows.length - 1].total;
  const task2Count = data.filter(d => d.city > WHO_INTERIM1).length;
  d3.select("#t3-sub").text(
    `Running total on ${fmtDay(rows[rows.length - 1].date)}: ${finalTotal} days above ${WHO_INTERIM1}` +
    (finalTotal === task2Count ? `  (matches the count in Task 2: ${task2Count})` : `  (WARNING: Task 2 count is ${task2Count})`));

  const c = makeChart("#t3-chart", 360, { t: 20, r: 24, b: 36, l: 56 });
  const x = d3.scaleTime().domain(d3.extent(rows, d => d.date)).range([0, c.iw]);
  const y = d3.scaleLinear().domain([0, finalTotal * 1.08]).nice().range([c.ih, 0]);
  yAxis(c, y, "Cumulative days above 75");
  xAxisYear(c, x);

  c.g.append("path").datum(rows).attr("fill", "#fdba74").attr("fill-opacity", 0.75)
    .attr("d", d3.area().x(d => x(d.date)).y0(c.ih).y1(d => y(d.total)).curve(d3.curveStepAfter));
  c.g.append("path").datum(rows).attr("fill", "none").attr("stroke", "#c2410c").attr("stroke-width", 2)
    .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.total)).curve(d3.curveStepAfter));

  const last = rows[rows.length - 1];
  c.g.append("circle").attr("cx", x(last.date)).attr("cy", y(last.total)).attr("r", 4).attr("fill", "#c2410c");
  halo(c.g.append("text").attr("x", x(last.date) - 8).attr("y", y(last.total) - 10)
    .attr("text-anchor", "end").attr("font-size", 12).attr("font-weight", 600).attr("fill", "#7c2d12")
    .text(`${last.total} days`));
}

// ================= Task 4 =================
function task4(data) {
  const c = makeChart("#t4-chart", 400, { t: 40, r: 24, b: 36, l: 56 });
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, c.iw]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(d.city, d.sub)) * 1.05]).nice().range([c.ih, 0]);
  yAxis(c, y, "PM2.5 (µg/m³)");
  xAxisYear(c, x);

  const segs = splitSegments(data);
  const series = [
    { key: "city", label: "City centre", color: "#c2410c" },
    { key: "sub", label: "Suburb", color: "#0f766e" }
  ];
  series.forEach(s => {
    c.g.append("g").selectAll("path").data(segs).join("path")
      .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 1.4).attr("stroke-opacity", 0.9)
      .attr("d", d3.line().x(d => x(d.date)).y(d => y(d[s.key])));
  });

  const legend = c.g.append("g").attr("transform", "translate(0,-26)");
  series.forEach((s, i) => {
    const lg = legend.append("g").attr("transform", `translate(${i * 130},0)`);
    lg.append("line").attr("x1", 0).attr("x2", 22).attr("y1", 0).attr("y2", 0).attr("stroke", s.color).attr("stroke-width", 3);
    lg.append("text").attr("x", 28).attr("y", 4).attr("font-size", 13).attr("fill", "#1f2933").text(s.label);
  });

  // hover: find the nearest recorded day with a bisector
  const bis = d3.bisector(d => d.date).center;
  const vline = c.g.append("line").attr("y1", 0).attr("y2", c.ih).attr("stroke", "#64748b").attr("stroke-dasharray", "3 3").style("display", "none");
  const dots = series.map(s => c.g.append("circle").attr("r", 4.5).attr("fill", s.color).attr("stroke", "#fff").style("display", "none"));
  c.g.append("rect").attr("width", c.iw).attr("height", c.ih).attr("fill", "none").attr("pointer-events", "all")
    .on("mousemove", event => {
      const d = data[bis(data, x.invert(d3.pointer(event)[0]))];
      vline.style("display", null).attr("x1", x(d.date)).attr("x2", x(d.date));
      series.forEach((s, i) => dots[i].style("display", null).attr("cx", x(d.date)).attr("cy", y(d[s.key])));
      showTip(event, `<b>${fmtDay(d.date)}</b><br>City: ${f1(d.city)} µg/m³<br>Suburb: ${f1(d.sub)} µg/m³<br>Difference: ${f1(d.city - d.sub)}`);
    })
    .on("mouseleave", () => { vline.style("display", "none"); dots.forEach(p => p.style("display", "none")); hideTip(); });
}

// ================= Task 5 =================
function task5(data) {
  const keys = ["Low", "Moderate", "High", "Severe"];
  const colors = d3.scaleOrdinal().domain(keys).range(["#fee5b3", "#f9a459", "#d9461f", "#6f1010"]);
  const counts = d3.rollup(data, v => d3.rollup(v, vv => vv.length, d => level(d.city)), d => d.date.getMonth());
  const rows = d3.range(12).map(m => {
    const r = { m };
    keys.forEach(k => (r[k] = (counts.get(m) && counts.get(m).get(k)) || 0));
    r.total = d3.sum(keys, k => r[k]);
    return r;
  });
  const stacked = d3.stack().keys(keys)(rows);

  const c = makeChart("#t5-chart", 400, { t: 44, r: 24, b: 36, l: 56 });
  const x = d3.scaleBand().domain(d3.range(12)).range([0, c.iw]).padding(0.2);
  const y = d3.scaleLinear().domain([0, 34]).range([c.ih, 0]);
  yAxis(c, y, "Number of days");
  c.g.append("g").attr("class", "axis").attr("transform", `translate(0,${c.ih})`)
    .call(d3.axisBottom(x).tickFormat(m => fmtMonth(new Date(2025, m, 1))));

  c.g.selectAll("g.layer").data(stacked).join("g").attr("class", "layer").attr("fill", d => colors(d.key))
    .selectAll("rect").data(layer => layer.map(v => Object.assign(v, { key: layer.key }))).join("rect")
    .attr("x", d => x(d.data.m)).attr("width", x.bandwidth())
    .attr("y", d => y(d[1])).attr("height", d => y(d[0]) - y(d[1]))
    .attr("stroke", "#fff").attr("stroke-width", 1)
    .on("mousemove", (event, d) => showTip(event, `<b>${fmtMonth(new Date(2025, d.data.m, 1))}</b><br>${d.key}: ${d.data[d.key]} days<br>Recorded days: ${d.data.total}`))
    .on("mouseleave", hideTip);

  c.g.selectAll("text.total").data(rows).join("text")
    .attr("x", d => x(d.m) + x.bandwidth() / 2).attr("y", d => y(d.total) - 5)
    .attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#334155").text(d => d.total);

  const legend = c.g.append("g").attr("transform", "translate(0,-32)");
  const labels = { Low: "Low (≤ 35)", Moderate: "Moderate (36-75)", High: "High (76-150)", Severe: "Severe (> 150)" };
  keys.forEach((k, i) => {
    const lg = legend.append("g").attr("transform", `translate(${i * 170},0)`);
    lg.append("rect").attr("width", 16).attr("height", 16).attr("rx", 3).attr("fill", colors(k)).attr("stroke", "#cbd5e1");
    lg.append("text").attr("x", 22).attr("y", 12).attr("font-size", 13).attr("fill", "#1f2933").text(labels[k]);
  });
}

// ================= Task 6 =================
function task6(data) {
  const dowNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dowOf = d => (d.date.getDay() + 6) % 7;      // Monday = 0
  const grouped = d3.rollup(data, v => ({ mean: d3.mean(v, d => d.city), n: v.length }), d => d.date.getMonth(), d => dowOf(d));
  const cells = [];
  grouped.forEach((byDow, m) => byDow.forEach((v, dow) => cells.push({ m, dow, mean: v.mean, n: v.n })));

  const c = makeChart("#t6-chart", 410, { t: 10, r: 24, b: 90, l: 56 });
  const x = d3.scaleBand().domain(d3.range(12)).range([0, c.iw]).padding(0.05);
  const y = d3.scaleBand().domain(d3.range(7)).range([0, c.ih]).padding(0.05);
  const ext = d3.extent(cells, d => d.mean);
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain(ext);

  c.g.append("g").attr("class", "axis").attr("transform", `translate(0,${c.ih})`)
    .call(d3.axisBottom(x).tickSize(0).tickFormat(m => fmtMonth(new Date(2025, m, 1)))).select(".domain").remove();
  c.g.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0).tickFormat(i => dowNames[i])).select(".domain").remove();

  const cell = c.g.selectAll("g.cell").data(cells).join("g").attr("transform", d => `translate(${x(d.m)},${y(d.dow)})`);
  cell.append("rect").attr("width", x.bandwidth()).attr("height", y.bandwidth()).attr("rx", 3)
    .attr("fill", d => color(d.mean))
    .on("mousemove", (event, d) => showTip(event, `<b>${fmtMonth(new Date(2025, d.m, 1))}, ${dowNames[d.dow]}</b><br>Average city PM2.5: ${f1(d.mean)} µg/m³<br>Based on ${d.n} days`))
    .on("mouseleave", hideTip);
  cell.append("text").attr("x", x.bandwidth() / 2).attr("y", y.bandwidth() / 2 + 4).attr("text-anchor", "middle")
    .attr("font-size", 11).attr("pointer-events", "none")
    .attr("fill", d => (d.mean > ext[0] + 0.55 * (ext[1] - ext[0]) ? "#fff" : "#1f2933"))
    .text(d => Math.round(d.mean));

  // colour legend
  const lw = 320, lx = c.iw / 2 - lw / 2, ly = c.ih + 40;
  const id = "grad6";
  const grad = c.svg.append("defs").append("linearGradient").attr("id", id);
  d3.range(0, 1.001, 0.1).forEach(t => grad.append("stop").attr("offset", t).attr("stop-color", d3.interpolateYlOrRd(t)));
  const lg = c.g.append("g").attr("transform", `translate(${lx},${ly})`);
  lg.append("rect").attr("width", lw).attr("height", 12).attr("fill", `url(#${id})`);
  lg.append("g").attr("class", "axis").attr("transform", "translate(0,12)")
    .call(d3.axisBottom(d3.scaleLinear().domain(ext).range([0, lw])).ticks(6));
  lg.append("text").attr("x", lw / 2).attr("y", 54).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "#475569")
    .text("Average city PM2.5 (µg/m³)");
}

// ================= Task 7 =================
function task7(data) {
  const stats = monthlyStats(data);
  const widest = stats.reduce((a, b) => (b.range > a.range ? b : a));

  const c = makeChart("#t7-chart", 400, { t: 40, r: 24, b: 36, l: 56 });
  const x = d3.scaleTime().domain([new Date(2025, 0, 1), new Date(2025, 11, 31)]).range([0, c.iw]);
  const y = d3.scaleLinear().domain([0, d3.max(stats, s => s.max) * 1.08]).nice().range([c.ih, 0]);
  yAxis(c, y, "City PM2.5 (µg/m³)");
  c.g.append("g").attr("class", "axis").attr("transform", `translate(0,${c.ih})`)
    .call(d3.axisBottom(x).tickValues(stats.map(s => s.mid)).tickFormat(fmtMonth));

  c.g.append("path").datum(stats).attr("fill", "#93c5fd").attr("fill-opacity", 0.55)
    .attr("d", d3.area().x(s => x(s.mid)).y0(s => y(s.min)).y1(s => y(s.max)).curve(d3.curveMonotoneX));
  c.g.append("path").datum(stats).attr("fill", "none").attr("stroke", "#1e3a8a").attr("stroke-width", 2.5)
    .attr("d", d3.line().x(s => x(s.mid)).y(s => y(s.mean)).curve(d3.curveMonotoneX));
  c.g.selectAll("circle.mean").data(stats).join("circle")
    .attr("cx", s => x(s.mid)).attr("cy", s => y(s.mean)).attr("r", 4).attr("fill", "#1e3a8a").attr("stroke", "#fff")
    .on("mousemove", (event, s) => showTip(event,
      `<b>${fmtMonth(s.mid)}</b><br>Max: ${f1(s.max)}<br>Mean: ${f1(s.mean)}<br>Min: ${f1(s.min)}<br>Range: ${f1(s.range)}`))
    .on("mouseleave", hideTip);

  halo(c.g.append("text").attr("x", x(widest.mid)).attr("y", y(widest.max) - 8).attr("text-anchor", "middle")
    .attr("font-size", 12).attr("font-weight", 600).attr("fill", "#1e3a8a")
    .text(`Widest: ${fmtMonth(widest.mid)} (${f1(widest.min)} to ${f1(widest.max)})`));

  const legend = c.g.append("g").attr("transform", "translate(0,-28)");
  legend.append("rect").attr("width", 20).attr("height", 12).attr("fill", "#93c5fd").attr("fill-opacity", 0.55);
  legend.append("text").attr("x", 26).attr("y", 11).attr("font-size", 13).text("Best to worst day (min-max)");
  legend.append("line").attr("x1", 230).attr("x2", 252).attr("y1", 6).attr("y2", 6).attr("stroke", "#1e3a8a").attr("stroke-width", 3);
  legend.append("text").attr("x", 258).attr("y", 11).attr("font-size", 13).text("Monthly mean");
}

// ================= Task 8 =================
function task8(data) {
  const segs = splitSegments(data);
  // 7-day moving average: each day with the previous six recorded days of the SAME run.
  // The average restarts after a gap, so nothing is averaged across missing days.
  segs.forEach(s => s.forEach((d, i) => { d.ma = d3.mean(s.slice(Math.max(0, i - 6), i + 1), e => e.city); }));
  const gaps = findGaps(data);

  const c = makeChart("#t8-chart", 400, { t: 40, r: 24, b: 36, l: 56 });
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, c.iw]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.city) * 1.05]).nice().range([c.ih, 0]);
  yAxis(c, y, "City PM2.5 (µg/m³)");
  xAxisYear(c, x);

  gaps.forEach(g => {
    c.g.append("rect").attr("x", x(g.start)).attr("width", Math.max(2, x(g.end) - x(g.start)))
      .attr("y", 0).attr("height", c.ih).attr("fill", "#f59e0b").attr("fill-opacity", 0.28);
    const lx = Math.min(Math.max(x(g.start) + (x(g.end) - x(g.start)) / 2, 80), c.iw - 80);
    halo(c.g.append("text").attr("x", lx).attr("y", -10).attr("text-anchor", "middle")
      .attr("font-size", 12).attr("font-weight", 600).attr("fill", "#92400e").text("No data: sensor offline"));
  });

  c.g.selectAll("path.daily").data(segs).join("path").attr("fill", "none")
    .attr("stroke", "#c2410c").attr("stroke-opacity", 0.3).attr("stroke-width", 1)
    .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.city)));
  c.g.selectAll("path.ma").data(segs).join("path").attr("fill", "none")
    .attr("stroke", "#7c2d12").attr("stroke-width", 3.2).attr("stroke-linejoin", "round")
    .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.ma)));

  const legend = c.g.append("g").attr("transform", `translate(${c.iw - 330},-30)`);
  legend.append("line").attr("x1", 0).attr("x2", 22).attr("y1", 5).attr("y2", 5).attr("stroke", "#c2410c").attr("stroke-opacity", 0.4).attr("stroke-width", 1.5);
  legend.append("text").attr("x", 28).attr("y", 9).attr("font-size", 12).text("Daily value");
  legend.append("line").attr("x1", 120).attr("x2", 142).attr("y1", 5).attr("y2", 5).attr("stroke", "#7c2d12").attr("stroke-width", 3.5);
  legend.append("text").attr("x", 148).attr("y", 9).attr("font-size", 12).text("7-day moving average");

  const note = gaps.length
    ? gaps.map(g => `Missing: ${g.missing} days (${fmtShort(g.firstMissing)} to ${fmtShort(g.lastMissing)}). The lines are broken here and the average restarts after the gap.`).join(" ")
    : "No gaps found in the dates.";
  d3.select("#t8-chart").append("p").attr("class", "note").text(note);
}

// ================= Task 9 =================
function task9(data) {
  const segs = splitSegments(data);
  const stats = monthlyStats(data);
  const widest = stats.reduce((a, b) => (b.range > a.range ? b : a));
  const full = d3.extent(data, d => d.date);
  const yMax = d3.max(data, d => d.city) * 1.08;

  const m = { l: 56, r: 24 };
  const iw = W - m.l - m.r, mh = 270, ch = 56;
  const svg = d3.select("#t9-chart").append("svg").attr("viewBox", `0 0 ${W} 410`);
  svg.append("defs").append("clipPath").attr("id", "clip9").append("rect")
    .attr("x", -6).attr("y", -6).attr("width", iw + 12).attr("height", mh + 12);

  const main = svg.append("g").attr("transform", `translate(${m.l},14)`);
  const ctx = svg.append("g").attr("transform", `translate(${m.l},336)`);

  const x = d3.scaleTime().domain(full).range([0, iw]);
  const x2 = d3.scaleTime().domain(full).range([0, iw]);
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([mh, 0]);
  const y2 = d3.scaleLinear().domain(y.domain()).range([ch, 0]);

  // main chart: static parts
  main.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-iw).tickFormat(""));
  main.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));
  main.append("text").attr("transform", "rotate(-90)").attr("x", -mh / 2).attr("y", -m.l + 16)
    .attr("text-anchor", "middle").attr("fill", "#475569").attr("font-size", 12).text("City PM2.5 (µg/m³)");
  const xAxisG = main.append("g").attr("class", "axis").attr("transform", `translate(0,${mh})`);
  main.append("line").attr("x1", 0).attr("x2", iw).attr("y1", y(WHO_INTERIM1)).attr("y2", y(WHO_INTERIM1))
    .attr("stroke", "#334155").attr("stroke-dasharray", "6 4");
  halo(main.append("text").attr("x", 6).attr("y", y(WHO_INTERIM1) - 5).attr("font-size", 12).attr("fill", "#334155")
    .text("WHO interim target 1: 75 µg/m³"));

  const clipped = main.append("g").attr("clip-path", "url(#clip9)");
  const mainLine = d3.line().x(d => x(d.date)).y(d => y(d.city));
  const segPaths = clipped.selectAll("path.seg").data(segs).join("path")
    .attr("fill", "none").attr("stroke", "#c2410c").attr("stroke-width", 1.6);
  const ptsG = clipped.append("g");

  // hover on the main chart
  const bis = d3.bisector(d => d.date).center;
  const focus = main.append("circle").attr("r", 5).attr("fill", "#7f1d1d").attr("stroke", "#fff").style("display", "none");
  main.append("rect").attr("width", iw).attr("height", mh).attr("fill", "none").attr("pointer-events", "all")
    .on("mousemove", event => {
      const d = data[bis(data, x.invert(d3.pointer(event)[0]))];
      if (d.date < x.domain()[0] || d.date > x.domain()[1]) { focus.style("display", "none"); hideTip(); return; }
      focus.style("display", null).attr("cx", x(d.date)).attr("cy", y(d.city));
      showTip(event, `<b>${fmtDay(d.date)}</b><br>City: ${f1(d.city)} µg/m³<br>Suburb: ${f1(d.sub)} µg/m³`);
    })
    .on("mouseleave", () => { focus.style("display", "none"); hideTip(); });

  // overview (context) chart
  ctx.append("g").attr("class", "axis").attr("transform", `translate(0,${ch})`)
    .call(d3.axisBottom(x2).ticks(d3.timeMonth.every(1)).tickFormat(fmtMonth));
  ctx.selectAll("path.ov").data(segs).join("path").attr("fill", "none").attr("stroke", "#c2410c").attr("stroke-width", 1)
    .attr("d", d3.line().x(d => x2(d.date)).y(d => y2(d.city)));

  function ticksFor(domain) {
    const days = d3.timeDay.count(domain[0], domain[1]);
    if (days > 200) return d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(fmtMonth);
    if (days > 75) return d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %Y"));
    if (days > 20) return d3.axisBottom(x).ticks(d3.timeWeek.every(1)).tickFormat(fmtShort);
    return d3.axisBottom(x).ticks(d3.timeDay.every(1)).tickFormat(fmtShort);
  }

  function update(domain) {
    x.domain(domain);
    xAxisG.call(ticksFor(domain));
    segPaths.attr("d", s => mainLine(s));
    const visible = data.filter(d => d.date >= domain[0] && d.date <= domain[1]);
    ptsG.selectAll("circle").data(visible.length <= 62 ? visible : [], d => +d.date).join("circle")
      .attr("cx", d => x(d.date)).attr("cy", d => y(d.city)).attr("r", 3.2).attr("fill", "#c2410c");
    const isFull = +domain[0] === +full[0] && +domain[1] === +full[1];
    d3.select("#t9-range").text(
      isFull ? `Showing the full year (${visible.length} recorded days)`
             : `Showing ${fmtDay(domain[0])} to ${fmtDay(domain[1])} (${visible.length} recorded days)`);
  }

  const brush = d3.brushX().extent([[0, 0], [iw, ch]]).on("brush end", event => {
    const s = event.selection;
    update(s ? s.map(x2.invert) : full);
  });
  const brushG = ctx.append("g").attr("class", "brush").call(brush);
  brushG.selectAll(".selection").attr("fill", "#2563eb").attr("fill-opacity", 0.25).attr("stroke", "#1d4ed8");

  d3.select("#t9-reset").on("click", () => brushG.call(brush.move, null));
  d3.select("#t9-widest").text(`Zoom to widest-spread month (${fmtMonth(widest.mid)})`).on("click", () => {
    const start = new Date(2025, widest.m, 1), end = new Date(2025, widest.m + 1, 0);
    brushG.call(brush.move, [x2(start), x2(end)]);
  });

  update(full);
}
