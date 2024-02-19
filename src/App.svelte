<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import { onDestroy } from 'svelte';
  import {drawBoxPlot} from "./BoxPlot";
  import {drawLinePlot} from "./LinePlot";

  let data = [];
  let selectedGroup = "All Groups";
  let svgWidth = 0;
  let svgHeight = 0;
  let showLinePlot = true;


  function togglePlot() {
    // if (typeof event.target !== 'undefined') {
    //   showLinePlot = event.target.value;
    // }
    // else {
    //   showLinePlot = event;
    // }
    showLinePlot = !showLinePlot;
    if (selectedGroup === 'All Groups') {
      allGroups();
    } else {
      if (showLinePlot) {
        drawLinePlot(data, selectedGroup);
      } else {
        drawBoxPlot(data, selectedGroup);
      }
    }
  }

  function updateSvgDimensions() {
    //const container = document.getElementById('container');
    svgWidth = window.innerWidth;
    svgHeight = window.innerHeight;
    
    if (data.length > 0) {
      if (selectedGroup === 'All Groups') {
        allGroups();
      } else {
        if (showLinePlot) {
          drawLinePlot(data, selectedGroup);
        } else {
          drawBoxPlot(data, selectedGroup);
        }
      }
    }
  }

  onMount(async () => {
    updateSvgDimensions();
    window.addEventListener("resize", updateSvgDimensions);
    const res = await fetch('data_full.csv');
    const csv = await res.text();

    // Parse the CSV with explicit data types
    data = d3.csvParse(csv, (d) => ({
      // Convert 'STANDARDINCOME' to a number
      ...d,
      STANDARDINCOME: +d.STANDARDINCOME,
    }));

    // console.log(data);

    // Draw line plot for a specific occupation
    if (data.length > 0) {
      if (selectedGroup === 'All Groups') {
        allGroups();
      } else {
        drawLinePlot(data, selectedGroup);
        //drawBoxPlot(data, selectedGroup)
      }
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined'){
      window.removeEventListener('resize', updateSvgDimensions)
    }
  
  });

  function allGroups() {
    // Remove existing SVG elements
    d3.select("#my_dataviz").selectAll("*").remove();

    // Set the dimensions of the SVG
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Adjust dimensions as needed
    const margin = { top: 60, right: 30, bottom: 90, left: 30 }; // Adjust left margin
    const padding = 60; // Increase the padding
    const width = screenWidth - margin.left - margin.right - (padding * 2);
    const height = screenHeight - margin.top - margin.bottom - (padding * 2);

    // Append the svg object to the body of the page
    var svg = d3.select("#my_dataviz")
      .append("svg")
      .attr("width", width + margin.left + margin.right + (padding * 2))
      .attr("height", height + margin.top + margin.bottom + (padding * 2))
      .append("g")
      .attr("transform", "translate(" + (margin.left + padding) + "," + (margin.top + padding) + ")");

    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -90) // Adjusted y-coordinate
      .attr("dy", "0.75em")
      .style("text-anchor", "middle")
      .style("font-size", "1.5em") // Adjust font size as needed
      .text("Income Per Gender for All Occupations");

    // Define the scales for x and y axes
    var xScale = d3.scaleBand()
      .domain(["2017", "2018", "2019", "2020", "2021"]) // Set domain to desired years
      .range([0, width])
      .paddingInner(0.1);

    const yScale = d3.scaleLinear()
        .domain([10000, 152000]) // Set the domain for y-axis
        .range([height, 0]); // Inverted range for y-axis

    // Draw x axis
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xScale))
      .style("font-size", ".7em")
      .selectAll("text")
      .style("font-family", '"Kode Mono", monospace');

    // Draw y axis
    svg.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format("$,.0f"))) // Format y-axis ticks as currency
      .style("font-size", "0.7em")
      .selectAll("text")
      .style("font-family", '"Kode Mono", monospace');

    // Labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.top - 30)
      .attr("dy", "0.75em")
      .style("text-anchor", "middle")
      .text("Year");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left - 60)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Median Total Pre-Tax Personal Income");

    // Group data by 'Groups', 'MULTYEAR', and 'SEX'
    var groupedData = d3.group(data, d => d.Groups, d => d.MULTYEAR, d => d.SEX);

    // Iterate over each group
    groupedData.forEach((groupValues, group) => {
      // Initialize an array to store the data for plotting
      var plotData = [];

      // Iterate over each year
      ["2017", "2018", "2019", "2020", "2021"].forEach(year => {
        // Get median income for males and females
        var maleMedian = d3.median(groupValues.get(year)?.get('1') || [], d => d.STANDARDINCOME) || 0;
        var femaleMedian = d3.median(groupValues.get(year)?.get('2') || [], d => d.STANDARDINCOME) || 0;
        
        // Push data points to plotData
        plotData.push({ Year: year, Sex: 'Male', MedianIncome: maleMedian });
        plotData.push({ Year: year, Sex: 'Female', MedianIncome: femaleMedian });
      });

      // Draw lines and handle mouse events
      drawLine(svg, plotData, group, width, height);
    });
}

function drawLine(svg, data, group, width, height) {
    const xScale = d3.scaleBand()
        .domain(["2017", "2018", "2019", "2020", "2021"])
        .range([0, width])
        .paddingInner(0.1);

    const yScale = d3.scaleLinear()
        .domain([10000, 152000])
        .range([height, 0]);

    const line = d3.line()
        .x(d => xScale(d.Year) + xScale.bandwidth() / 2)
        .y(d => yScale(d.MedianIncome));

    // Draw lines connecting the circles for male medians
    const malePath = svg.append("path")
        .datum(data.filter(d => d.Sex === 'Male'))
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "#0066FF")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mouseover", function() {
            malePath.attr("stroke-width", 4); // Increase stroke width on mouseover
            femalePath.attr("stroke-width", 4); // Increase stroke width on mouseover
            malePath.attr("stroke", "black"); // Change stroke color to black on mouseover
            femalePath.attr("stroke", "black"); // Change stroke color to black on mouseover
            // Add label showing group name
            svg.append("text")
                .attr("class", "group-label")
                .attr("x", width / 2) // Adjust position to the center horizontally
                .attr("y", -50) // Adjust position below the title
                .attr("dy", "0.35em")
                .style("text-anchor", "middle")
                .style("font-size", "1em")
                .text(group);
        })
        .on("click", function() {
          selectedGroup = group;
          showLinePlot = true;
          drawLinePlot(data, group);
          updateSvgDimensions();
        })
        .on("mouseout", function() {
            malePath.attr("stroke-width", 2); // Restore original stroke width on mouseout
            femalePath.attr("stroke-width", 2); // Restore original stroke width on mouseout
            malePath.attr("stroke", "#0066FF"); // Restore original stroke color on mouseout
            femalePath.attr("stroke", "#FF6699"); // Restore original stroke color on mouseout
            svg.selectAll(".group-label").remove(); // Remove group label on mouseout
        });

    // Draw lines connecting the circles for female medians
    const femalePath = svg.append("path")
        .datum(data.filter(d => d.Sex === 'Female'))
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "#FF6699")
        .attr("stroke-width", 2)
        .attr("d", line)
        .on("mouseover", function() {
            malePath.attr("stroke-width", 4); // Increase stroke width on mouseover
            femalePath.attr("stroke-width", 4); // Increase stroke width on mouseover
            malePath.attr("stroke", "black"); // Change stroke color to black on mouseover
            femalePath.attr("stroke", "black"); // Change stroke color to black on mouseover
            // Add label showing group name
            svg.append("text")
                .attr("class", "group-label")
                .attr("x", width / 2) // Adjust position to the center horizontally
                .attr("y", -50) // Adjust position below the title
                .attr("dy", "0.35em")
                .style("text-anchor", "middle")
                .style("font-size", "1em")
                .text(group);
        })
        .on("click", function() {
          selectedGroup = group;
          showLinePlot = true;
            drawLinePlot(data, group);
            updateSvgDimensions();
        })
        .on("mouseout", function() {
            malePath.attr("stroke-width", 2); // Restore original stroke width on mouseout
            femalePath.attr("stroke-width", 2); // Restore original stroke width on mouseout
            malePath.attr("stroke", "#0066FF"); // Restore original stroke color on mouseout
            femalePath.attr("stroke", "#FF6699"); // Restore original stroke color on mouseout
            svg.selectAll(".group-label").remove(); // Remove group label on mouseout
        });
}

</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kode+Mono:wght@400..700&display=swap" rel="stylesheet">

<style>
  /* Add any styles if needed */

  #container {
    position: relative;
    min-height: 40vh;
    padding: 10px; /* Add padding for better spacing */
    font-family: "Kode Mono", monospace;
  }

  #dropdown {
    position: absolute;
    font-family: "Kode Mono", monospace;
    top: 0;
    left: 0;
    width: 500px; /* Initial width of the dropdown menu */
  }

  /* Add media queries here */
  @media screen and (max-width: 800px) {
    #dropdown {
      width: 400px; /* Adjust the width for smaller screens */
    }
  }
  

  /* Add media queries here */
  @media screen and (max-width: 700px) {
    #dropdown {
      width: 300px; /* Adjust the width for smaller screens */
    }
  }

  @media screen and (max-width: 550px) {
    #dropdown {
      width: 200px; /* Adjust the width for smaller screens */
    }
  }

  @media screen and (max-width: 460px) {
    #dropdown {
      width: 80px; /* Further adjust the width for even smaller screens */
    }
  }

  #my_dataviz {
    /* font-family: 'Times New Roman', Times, serif; */
    width: calc(100% - 200px);
    height: 60vh;
    float: left;
    margin-top: 10px;
  }

  .legend {
  position: absolute;
  bottom: -380px; /* Adjust bottom position as needed */
  left: 0; /* Adjust left position as needed */
  font-size: x-small;
  padding-left: 110px;
}

  .team-info {
    position: absolute;
    bottom: -380px;
    right: 0;
    padding-right: 30px;
    /* font-family: 'Times New Roman', Times, serif; Set the font for the team info */
  }

  .team-info p:first-child {
    font-weight: bold; /* Make the team name bold */
  }

  .team-info p:nth-child(n+2) {
    font-size: 13px; /* Adjust the font size for the team members' names */
  }

  /* .slider-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-top: 20px;
  }

  .slider {
    display: block;
    margin-left: 20px;
    width: 200px;
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-left: 10px;
  } */

</style>
<div id="container">
  <!-- Dropdown menu for selecting groups -->
  <select id="dropdown" bind:value={selectedGroup} on:change={() => {
    if (selectedGroup === 'All Groups') {
      showLinePlot = 0;
      allGroups();
    } else {
      showLinePlot = true;
      drawLinePlot(data, selectedGroup);
    }
  }}>
    <!-- New Option "All Groups" -->
    <option value="All Groups">All Occupations</option>
    <!-- Existing options -->
    {#each [...new Set(data.map(d => d.Groups))].sort() as group}
      <option value={group}>{group}</option>
    {/each}
  </select>

  <!-- Visualization container -->
  <div id="my_dataviz"></div>

<!-- Button -->
<button on:click={togglePlot} style="{selectedGroup !== 'All Groups' ? 'display: block; font-family: \'Kode Mono\', monospace;' : 'display: none;'}">
  {#if showLinePlot}
    Show Box Plot
  {:else}
    Show Line Plot
  {/if}
</button>


<!-- Slider container -->
<!-- <div class="slider-container" style="{selectedGroup !== 'All Groups' ? 'display: flex; flex-direction: column; align-items: center; position: absolute; top: calc(90vh); left: 54.25%; transform: translateX(-50%);' : 'display: none;'}">
  <div class="slider" style="{selectedGroup !== 'All Groups' ? 'display: block; width: 200px;' : 'display: none;'}">
    <input type="range" min="0" max="1" step="1" bind:value={showLinePlot} on:input={togglePlot}>
  </div>
  <div class="slider-labels" style="display: flex; margin-top: 5px; margin-right: 50px;">
    <span style="margin-right: 80px;">Line Plot</span>
    <span>Box Plot</span>
  </div>
</div> -->

  <div class="legend">
    <svg width="100" height="70">
      <rect x="10" y="10" width="20" height="20" fill="#0066FF"></rect>
      <text x="40" y="15" dy="0.75em">Male</text>
      <rect x="10" y="40" width="20" height="20" fill="#FF6699"></rect>
      <text x="40" y="45" dy="0.75em">Female</text>
    </svg>
  </div>

<!-- Team name and names -->
<!-- {#if selectedGroup === 'All Groups'} -->
  <div class="team-info">
    <p style="text-align: center;">Graphic Girls</p>
    <p>Anastasiya Markova, Maryam Almahasnah, Zoe Ludena</p>
  </div>
<!-- {/if} -->


</div>
