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

function getTeamInfoClass() {
    return selectedGroup !== "All Groups" ? "team-info-selected" : "team-info";
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
  bottom: -500px; /* Adjust bottom position as needed */
  left: 0; /* Adjust left position as needed */
  font-size: x-small;
  padding-left: 110px;
}


  .team-info {
    position: absolute;
    bottom: -500px;
    right: 0;
    padding-right: 30px;
    /* font-family: 'Times New Roman', Times, serif; Set the font for the team info */
  }

  .team-info-selected {
    position: fixed;
    bottom: 0;
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

  .readme {
  position: absolute;
  top: 950px; /* Adjust the position from the bottom as needed */
  left: 50%; /* Center horizontally */
  transform: translateX(-50%);
  font-family: "Kode Mono", monospace; /* Set the font family */
  width: 80%;
}

  .readme p {
    margin: 0;
    font-size: 0.8em; /* Adjust the font size as needed */
  }

  .readme p:first-child {
    font-weight: bold; /* Make the team name bold */
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
  <!-- <div class="team-info">
    <p style="text-align: center;">Graphic Girls</p>
    <p>Anastasiya Markova, Maryam Almahasnah, Zoe Ludena</p>
  </div> -->

  <div class={getTeamInfoClass()}>
    <p style="text-align: center;">Graphic Girls</p>
    <p>Anastasiya Markova, Maryam Almahasnah, Zoe Ludena</p>
  </div>


{#if selectedGroup === 'All Groups'}
<div class="readme">
  <!-- Add your words here -->
  <p>Our Writeup:</p>

  <br>

  <p>In our interactive plot we explore the differences between male and female total pre-tax personal income. We were curious to know if the wage gap among different occupational groups were improving over time. To better explain our graphs it is important to first understand where our data came from. We collected our data from the <a href= 'https://usa.ipums.org/usa/'>Integrated Public Use Microdata Series (IPUMS) USA</a>. IPUMS is a reputable data source, as they collect and preserve U.S. census microdata. Our sample of data runs from the years 2017 to 2021, and contains the following information from census respondents: the number of hours worked, age, sex, marital status, income as an individual, income as a family, and the state the respondent lived in. Originally, our data had many different, specific occupations, so we decided to group the data based on the categories occupations were kept in by IPUMS. IPUMS updated how these groups were kept in 2018, so we had to make decisions to overlap them as specifically as possible: <a href = "https://usa.ipums.org/usa/volii/occ_acs.shtml">2000 to 2017 data</a> and <a href = "https://usa.ipums.org/usa/volii/occ2018.shtml">2018 onwards</a>. Some other cleaning Zoe did to prepare our data for the interactive visualization was replace missing values with NaNs, filter the data to only contain full-time workers (40 hours and more), and perform exploratory data analysis on the total pre-tax personal income, total pre-tax money income earned by a family from all sources, number of children, and sex. Zoe decided to standardize the income by taking the number of hours worked and the respondent’s income then making it as if they had only worked forty hours on average a week and were paid for those hours (original total pre-tax personal income divided by average number of hours worked then multiplied by forty).</p>
  <br>
  <p> Ultimately, we decided to use a line plot to demonstrate the median pre-tax personal income for each sex. We believed a line plot is the correct mark to use because we were curious about how income changes over time. We debated using the mean income, but we were worried about the extreme outliers. We were hoping that by choosing the median we could avoid outliers and get people of similar salaries together. This would make it easier to compare the income of the two sexes.</p>
  <br>
  <p>Our plot is interactive in a number of ways. On the homepage or “All Occupations” of the drop down menu if you hover over a line it will highlight that line and the other gender in that occupation. The occupation appears below the title. You can also click on the line you are hovering over and it will take you to the plot of just that specific line. It is an overview/high level of all the other pages in our visualization. It also invites the user to compare the salaries between different corporations. On the other pages in the drop down menu, if one were to hover over a datapoint on the line they are told the sex and median income for that profession. The drop down menu allows for easy access to choosing an occupational group. This allows someone to type and/or select the option they are most curious about. Finally, we added a button in the top right corner that allows a user to switch between a box plot representation and a line plot representation of the data. We thought a box plot would allow users to see the distribution of data more closely. If one were to hover over the box plot they would find each left half of the box plot would have a scatter plot appear. These are our data points for that year in that specific occupation. This allows an even closer look at the data we collected. For all of our plots we chose to adhere to the colors typically associated with Male and Female, blue and pink respectively. We choose colors from the <a href = "https://htmlcolorcodes.com/color-chart/web-safe-color-chart/">Web Safe Color Chart HTML website </a>. The blue is #0066FF and the pink is #FF6699. Under a color blind vision simulator the colors were easily distinguishable as different, so we thought they would work best. It is important to us that the colors we choose are web safe and easily discernible for everyone.</p>
	<br>
  <p>Our group worked together to come up with our question and explored many different datasets. We settled on Anastasiya's find of IPUMS because they allowed us to customize our dataset, which became tailored to answer our wage gap inquiries. Anastasiya worked on the initial research of the data and creation of box plots and interactivity features within the box plots. Since there is no box plot feature, she had to calculate everything and draw each line by hand, which took a little bit of time. The creation of box plots probably took around 8 hours. She also made sure that the transitions between plots were working. She worked on transitions between box plots and line plots, as well as the transition from all plots to line plots. This was a bit of a trial and error process and took an additional 5 hours. The most confusing thing was to make the graph responsive to windows of different sizes, but once that was done the rest of Anastasiya's work was just time consuming rather than challenging. This took about 6 hours overall as well. Zoe spent about eight hours performing EDA and cleaning the data. She also spent about fifteen hours getting the dropdown menu to work, setting up the line plot drawing function, setting up labels/axes/keys, making the "All Occupations" line plot, adjusting small elements (like positioning), having the drop down menu scale as the page does horizontally, and choosing colors for the graph. She also worked on this writeup for about an hour and a half. Zoe thought the thing that took the most time was setting up the line plot drawing functions. It took a lot of time to figure out the correct spacing for everything and how she could get D3 to code it together for each different group. She ended up having to code scatter plots first then connecting those circles with lines then making the circles really small. Maryam changed the drop down menu to make the occupations come up in alphabetical order (but it should still have all occupations as the first option). She also changed the font for everything on the visualization so that it is more consistent (we ended up going with Anastasiya's choice of font). She also made it so that the y-axis would have the incomes as currencies. Maryam also added the team name and team members' names and scaled the legend in addition to the team name/memebers names so that they do not overlap with the graph. There was a lot of back and forth with this because it looked like it was overlapping and not tidy on Maryam's computer but different and more consistent on others' computers, which is why it took a fair amount of time to do - about 5-6 hours total. She attempted to solve the problem of the overlapping labels for occupations in certain years that had a very similar median because it was difficult to read; this took several hours, but Maryam was unsuccessful at solving the problem - Zoe was then able to figure it out and solve the problem. Maryam also changed the size of the overall graph to make it smaller because we thought it would be better with less overlapping. Maryam also spent some time editing/proofreading this writeup. Overall, the part that took the most time was probably figuring out how the labels can come up without overlapping on top of each other.</p>
  <br>
</div>
{/if}
</div>