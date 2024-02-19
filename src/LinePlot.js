// Line Plot
import * as d3 from "d3";
export function drawLinePlot(data, selectedOccupation) {

    // Remove existing SVG elements
    d3.select("#my_dataviz").selectAll("*").remove();

    // console.log("Selected Group:", selectedGroup);

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
      .text("Income Per Gender for " + selectedOccupation);

    // Filter data for the selected occupation and remove NaN values
    var filteredData = data.filter(d => d.Groups === selectedOccupation && !isNaN(d.STANDARDINCOME));

    // Group data by 'MULTYEAR' and 'SEX'
    var groupedData = d3.group(filteredData, d => d.MULTYEAR, d => d.SEX);

    // Calculate median values for male and female
    var medianValuesMale = Array.from(groupedData, ([year, sexValues]) => ({
      Year: year,
      Median: d3.median(sexValues.get('1') || [], d => d.STANDARDINCOME) || 0
    }));

    var medianValuesFemale = Array.from(groupedData, ([year, sexValues]) => ({
      Year: year,
      Median: d3.median(sexValues.get('2') || [], d => d.STANDARDINCOME) || 0
    }));

    // Set up X and Y scales
    var xScale = d3.scaleBand()
      .domain(["2017", "2018", "2019", "2020", "2021"]) // Set domain to desired years
      .range([0, width])
      .paddingInner(0.1);


    // Calculate the minimum value among male and female medians
    var minValue = d3.min([...medianValuesMale, ...medianValuesFemale], d => d.Median);
  

    // Set up Y scale based on the minimum value with a 1000 offset
    var yScale = d3.scaleLinear()
      .domain([Math.max(0, minValue - 3000), d3.max([...medianValuesMale, ...medianValuesFemale], d => d.Median)])
      .range([height, 0]);
    
    // Sort the data based on the year
    medianValuesMale.sort((a, b) => a.Year - b.Year);
    medianValuesFemale.sort((a, b) => a.Year - b.Year);

    // Draw the lines for male and female
    svg.append("path")
      .datum(medianValuesMale)
      .attr("fill", "none")
      .attr("stroke", "#0066FF")
      .attr("stroke-width", 2)
      .attr("d", d3.line()
        .x(d => xScale(d.Year) + xScale.bandwidth() / 2)
        .y(d => yScale(d.Median))
      );

    svg.append("path")
      .datum(medianValuesFemale)
      .attr("fill", "none")
      .attr("stroke", "#FF6699")
      .attr("stroke-width", 2)
      .attr("d", d3.line()
        .x(d => xScale(d.Year) + xScale.bandwidth() / 2)
        .y(d => yScale(d.Median))
      );
    
    // Function to format numbers as currency
    function currencyFormatter(number) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(number);
    }

    // Draw circles for each data point on the male line
    svg.selectAll("circle.male")
      .data(medianValuesMale)
      .enter().append("circle")
      .attr("class", "male-circle")
      .attr("cx", d => xScale(d.Year) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d.Median))
      .attr("r", 5) // Adjust the radius as needed
      .attr("fill", "#0066FF"); // Set the fill color for male circles

        // Draw circles for each data point on the female line
    svg.selectAll("circle.female")
      .data(medianValuesFemale)
      .enter().append("circle")
      .attr("class", "female-circle")
      .attr("cx", d => xScale(d.Year) + xScale.bandwidth() / 2)
      .attr("cy", d => yScale(d.Median))
      .attr("r", 5) // Adjust the radius as needed
      .attr("fill", "#FF6699"); // Set the fill color for female circles

    // Define the bins
    const bins = ["2017", "2018", "2019", "2020", "2021"];

    // Iterate over each bin to create rectangles and handle mouseover events
    bins.forEach((bin, index) => {
      const nextBin = bins[index + 1];
      const xStart = xScale(bin);
      const xEnd = nextBin ? xScale(nextBin) : width;

      svg.append("rect")
        .attr("x", xStart)  // Left boundary
        .attr("y", 0)  // Top boundary
        .attr("width", xEnd - xStart)  // Width
        .attr("height", height)  // Height
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", function (event) {
          const hoveredYear = bin;
          // Show labels only for the hovered year
          svg.selectAll("text.male-label").attr("visibility", d => (d.Year === hoveredYear ? "visible" : "hidden"));
          svg.selectAll("text.female-label").attr("visibility", d => (d.Year === hoveredYear ? "visible" : "hidden"));
        })
        .on("mouseout", function (d) {
          // Hide labels
          svg.selectAll("text.male-label").attr("visibility", "hidden");
          svg.selectAll("text.female-label").attr("visibility", "hidden");
        });
    });


    // Add labels for male medians
    svg.selectAll("text.male-label")
      .data(medianValuesMale)
      .enter().append("text")
      .attr("class", "male-label")
      .attr("id", d => `male-label-${d.Year}`)
      .attr("x", d => xScale(d.Year) + xScale.bandwidth() / 2 + 10)
      .attr("y", d => yScale(d.Median) - 10)
      .attr("dy", "-0.7em")
      .attr("visibility", "hidden")
      .attr("text-anchor", "top")
      .text(d => `Male Income: ${currencyFormatter(d.Median)}`)
      .style("font-size", "0.7em")
      .style("padding", "30px");

    // Add labels for female medians
    svg.selectAll("text.female-label")
      .data(medianValuesFemale)
      .enter().append("text")
      .attr("class", "female-label")
      .attr("id", d => `female-label-${d.Year}`)
      .attr("x", d => xScale(d.Year) + xScale.bandwidth() / 2 + 10)
      .attr("y", d => yScale(d.Median) + 20)
      .attr("text-anchor", "top")
      .attr("dy", "-3.0em")
      .attr("visibility", "hidden")
      .text(d => `Female Income: ${currencyFormatter(d.Median)}`)
      .style("font-size", "0.7em")
      .style("padding", "30px");

    // Draw X-axis
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xScale))
      .style("font-size", ".7em");

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.top - 30)
      .attr("dy", "0.75em")
      .style("text-anchor", "middle")
      .text("Year");

    // Draw Y-axis
    svg.append("g")
      .call(d3.axisLeft(yScale))
      .style("font-size", "0.7em");

    // Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left - 50)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Median Total Pre-Tax Personal Income");


    // Add a tooltip element
    var tooltip = d3.select("body")
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("font-size", "0.05em");
  }