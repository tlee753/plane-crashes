function scrollView() {
    window.scroll({
        top: 200,
        left: 0,
        behavior: 'smooth'
    });
};

d3.csv("aircraft_incidents.csv", function (csv) {

    // DATA MANIPULATION
    var mapData = d3.nest()
        .key(function (d) {
            return d.Country;
        })
        .rollup(function (leaves) {
            return leaves.length;
        })
        .object(csv);

    var bubblesData = d3.nest()
        .key(function (d) {
            return d.Make;
        })
        .key(function (d) {
            return d.Model;
        })
        .rollup(function (leaves) {
            return leaves.length;
        })
        .entries(csv);

    console.log(bubblesData);

    // COLOR & LABELS
    var mapDataMin = d3.min(d3.values(mapData));
    var mapDataMax = d3.max(d3.values(mapData));
    var mapDataI = 10;

    var colors = ["black", "#FFDB01", "#FFC102", "#FFA704", "#FF8D05", "#FF7306", "#FF5908", "#FF3F09", "#FF250A", "#FF0B0C"];
    var mapRange = [0, mapDataMin, mapDataMin + mapDataI, mapDataMin + 2 * mapDataI, mapDataMin + 3 * mapDataI, mapDataMin + 4 * mapDataI, mapDataMin + 5 * mapDataI, mapDataMin + 6 * mapDataI, mapDataMin + 7 * mapDataI, mapDataMax];
    var legendLabels = ["No Data", "1-10", "11-20", "21-30", "31-40", "41-50", "51-60", "61-70", "71-80", "80+"];
    var bubblesRange = [0, 1, 2, 3, 4];
    var bubblesLabels = ["Bombardier", "Boeing", "McDonnell Douglas", "Embraer", "Airbus"];

    var color = d3.scaleThreshold()
        .range(colors)
        .domain(mapRange);

    // MAP
    var map = d3.select("#map")
        .append("svg")
        .attr("viewBox", "0 0 960 520")
        .attr("width", 1200)
        .attr("height", 720);

    var mapOutlines = d3.geoPath().projection(d3.geoEquirectangular());
    d3.json("world.json", function (world) {
        map.selectAll("path")
            .data(world.features)
            .enter()
            .append("path")
            .style("fill", function (d) {
                return color(mapData[d.properties.name]);
            })
            .attr("stroke", "white")
            .attr("stroke-width", "0.7px")
            .attr("stroke-linejoin", "round")
            .attr("d", mapOutlines)
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut);
    });

    // MAP LEGEND
    var legend = d3.select("#map-legend")
        .append("svg")
        .attr("height", 400)
        .attr("width", 100)
        .append("g");

    legend.selectAll("g")
        .data(mapRange)
        .enter()
        .append("rect")
        .attr("stroke", "white")
        .attr("x", 0)
        .attr("y", function (d, i) { return 400 - (i * 40) - 40; })
        .attr("width", 20)
        .attr("height", 40)
        .style("fill", function (d, i) { return colors[i]; });

    legend.selectAll("g")
        .data(legendLabels)
        .enter()
        .append("text")
        .attr("fill", "white")
        .attr("x", 25)
        .attr("y", function (d, i) { return 400 - (i * 40) - 13; })
        .text(function (d, i) { return legendLabels[i]; });

    // MAP TOOLTIPS
    function handleMouseOver(d) {
        var xPosition = d3.event.pageX;
        var yPosition = d3.event.pageY;

        var text = mapData[d.properties.name] + " incidents";

        if (mapData[d.properties.name] == null) {
            text = "No Data";
        }

        d3.select("#tooltip")
            .classed("hidden", false)
            .style("left", xPosition - 175 + "px")
            .style("top", yPosition - 275 + "px")
            .html(d.properties.name + "<br>" + text);
    }

    function handleMouseOut(d) {
        d3.select("#tooltip")
            .classed("hidden", true);
    }

    // BUBBLES
    var bubbles = d3.select("#bubbles")
        .append("svg")
        .attr("width", 1200)
        .attr("height", 1000)
        .append("g");

    var m = bubblesData.length;
    var n = 0;
    for (i = 0; i < m; i++) {
        n += bubblesData[i]["values"].length;
    }

    var clusters = new Array(5);
    var nodes = [];
    for (var i = 0; i < m; i++) {
        for (var j = 0; j < bubblesData[i]["values"].length; j++) {
            nodes.push({
                cluster: i,
                incidents: bubblesData[i]["values"][j]["value"],
                radius: bubblesData[i]["values"][j]["value"] / 1.8,
                text: bubblesData[i]["values"][j]["key"],
                x: Math.cos(i / m * 2 * Math.PI) * 200 + 1200 / 2 + Math.random(),
                y: Math.sin(i / m * 2 * Math.PI) * 200 + 1000 / 2 + Math.random()
            })
        }
    }

    var forceCollide = d3.forceCollide()
        .radius(function (d) { return d.radius })
        .iterations(1);

    var simulation = d3.forceSimulation()
        .nodes(nodes)
        .force("center", d3.forceCenter(600, 500))
        .force("collide", forceCollide)
        .force("link", d3.forceLink().id(function (d) { return d.cluster }))
        .force("charge", d3.forceManyBody())
        .force("x", d3.forceX(0))
        .force("y", d3.forceY(0))
        .on("tick", tick);

    var circle = bubbles.selectAll("circle")
        .data(nodes)
        .enter()
        .append("g")
        .on("mouseover", bubblesMouseOver)
        .on("mouseout", bubblesMouseOut);

    circle
        .append("circle")
        .attr("r", function (d) {
            return d.radius;
        })
        .style("fill", function (d) {
            return colors[d.cluster * 2 + 1];
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

    circle
        .append("text")
        .attr("dy", "0.3em")
        .style("text-anchor", "middle")
        .attr("fill", "white")
        .text(function (d) {
            return d.text;
        });

    function tick() {
        circle.selectAll("circle")
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            })
        circle.selectAll("text")
            .attr("x", function (d) {
                return d.x;
            })
            .attr("y", function (d) {
                return d.y;
            })
    }

    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // function forceCluster(alpha) {
    //     for (var i = 0, n = nodes.length, node, cluster, k = alpha * 1; i < n; ++i) {
    //         node = nodes[i];
    //         cluster = clusters[node.cluster];
    //         node.vx -= (node.x - cluster.x) * k;
    //         node.vy -= (node.y - cluster.y) * k;
    //     }
    // }

    // BUBBLES LEGEND
    var legend = d3.select("#bubbles-legend")
        .append("svg")
        .attr("height", 200)
        .attr("width", 200)
        .append("g");

    legend.selectAll("g")
        .data(bubblesRange)
        .enter()
        .append("rect")
        .attr("stroke", "white")
        .attr("x", 0)
        .attr("y", function (d, i) { return 200 - (i * 40) - 40; })
        .attr("width", 20)
        .attr("height", 40)
        .style("fill", function (d, i) { return colors[i * 2 + 1]; });

    legend.selectAll("g")
        .data(bubblesLabels)
        .enter()
        .append("text")
        .attr("fill", "white")
        .attr("x", 25)
        .attr("y", function (d, i) { return 200 - (i * 40) - 13; })
        .text(function (d, i) { return bubblesLabels[i]; });

    // BUBBLES TOOLTIPS
    function bubblesMouseOver(d) {
        d3.select("#bubbles-tooltip")
            .classed("hidden", false)
            .style("right", 180 + "px")
            .style("top", 20 + "px")
            .html(bubblesLabels[d.cluster] + " " + d.text + "</br>" + d.incidents + " incidents");
    }

    function bubblesMouseOut(d) {
        d3.select("#bubbles-tooltip")
            .classed("hidden", true);
    }

    // BARS
    var bars = d3.select("#bars")
        .append("svg")
        .attr("width", 1560)
        .attr("height", 360)
        .append("g");

    // FATAL
    var fatal = d3.select("#fatal")
        .append("svg")
        .attr("width", 360)
        .attr("height", 360)
        .append("g");
});