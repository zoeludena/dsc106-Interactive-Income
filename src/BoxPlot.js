import * as d3 from 'd3';
export function drawBoxPlot(data, selectedOccupation) {
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
      .text("Income Per Gender for " + selectedOccupation);

    // Filter data for the selected occupation and remove NaN values
    var filteredData = data.filter(d => d.Groups === selectedOccupation && !isNaN(d.STANDARDINCOME));

    // Group data by 'MULTYEAR' and 'SEX'
    var groupedData = d3.group(filteredData, d => d.MULTYEAR, d => d.SEX);

    // Calculate median values for male and female
    var medianValuesMale = Array.from(groupedData, ([year, sexValues]) => ({
      Year: year,
      Median: d3.median(sexValues.get('1') || [], d => d.STANDARDINCOME) || 0,
      Min: d3.min(sexValues.get('1') || [], d => d.STANDARDINCOME) || 0,
      Max: d3.max(sexValues.get('1') || [], d => d.STANDARDINCOME) || 0
    }));

    var medianValuesFemale = Array.from(groupedData, ([year, sexValues]) => ({
      Year: year,
      Median: d3.median(sexValues.get('2') || [], d => d.STANDARDINCOME) || 0,
      Min: d3.min(sexValues.get('2') || [], d => d.STANDARDINCOME) || 0,
      Max: d3.max(sexValues.get('2') || [], d => d.STANDARDINCOME) || 0
    }));

    // Set up X scale
    var xScale = d3.scaleBand()
      .domain(["2017", "2018", "2019", "2020", "2021"]) // Set domain to desired years
      .range([0, width])
      .paddingInner(0.1);

    // Define color scale
    const colorScale = d3.scaleOrdinal()
        .domain(['1', '2'])
        .range(['#0066FF', '#FF6699']);

    // Set up Y scale based on the minimum and maximum median values
    var minValue = d3.min([...medianValuesMale, ...medianValuesFemale], d => d.Min);
    var maxValue = d3.max([...medianValuesMale, ...medianValuesFemale], d => d.Max);
    // console.log(minValue, maxValue)
    var yScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([height, 0]);

    groupedData.forEach((genderData, year) => {
      genderData.forEach((values, gender) => {
          const median = d3.median(values, d => d.STANDARDINCOME);
          const q1 = d3.quantile(values, 0.25, d => d.STANDARDINCOME);
          const q3 = d3.quantile(values, 0.75, d => d.STANDARDINCOME);
          const min = d3.min(values || [], d => d.STANDARDINCOME) || 0;
          const max = d3.max(values || [], d => d.STANDARDINCOME) || 0 ;

          const x = xScale(year) + (gender === "1" ? 0 : xScale.bandwidth() / 2);
          const boxWidth = xScale.bandwidth() / 2;

          // Draw box
          svg.append('rect')
              .attr('x', x)
              .attr('y', yScale(q3))
              .attr('width', boxWidth)
              .attr('height', yScale(q1) - yScale(q3))
              .attr("stroke", "black")
              .attr("fill", "none")
              .attr('fill', gender === '1' ? '#0066FF' : '#FF6699');

          // Draw median line
          svg.append('line')
              .attr('x1', x)
              .attr('y1', yScale(median))
              .attr('x2', x + boxWidth)
              .attr('y2', yScale(median))
              .attr('stroke', 'black');

          // Draw whiskers
          svg.append('line')
              .attr('x1', x + boxWidth / 2)
              .attr('y1', yScale(min))
              .attr('x2', x + boxWidth / 2)
              .attr('y2', yScale(max))
              .attr('stroke', 'black');

          // Draw rectangles for each year
          svg.selectAll('.year-rect')
          .data(["2017", "2018", "2019", "2020", "2021"]) // Assuming these are your years
          .enter()
          .append('rect')
          .attr('class', 'year-rect')
          .attr('x', d => xScale(d)) // x-coordinate based on the year
          .attr('y', 0)
          .attr('width', xScale.bandwidth())
          .attr('height', height)
          .style('fill', 'none')
          .style('pointer-events', 'all'); // Allow pointer events for interaction


          const scatterGroup = svg.append('g').attr('class', 'scatter-group');

          // Draw scatter plot
          var jitterWidth = boxWidth;
          values.forEach(d => {
            if (d.STANDARDINCOME >= yScale.domain()[0] && d.STANDARDINCOME <= yScale.domain()[1]){
              let x_val = xScale(year) + (gender === "1" ? 0 : boxWidth) + Math.random() * jitterWidth;
              svg
                .append('circle')
                .attr('cx', x_val)
                .attr('cy', yScale(d.STANDARDINCOME))
                .attr('r', 3)
                .attr('class', 'scatter-point')
                .attr('data-year', year)
                .attr('fill', colorScale(gender))
                .attr('stroke', 'white')
                .attr('visibility', 'hidden');
              }
        });
        //console.log(svg.selectAll('circle').each(function(dd){dd.getAttribute('data-year');}));

        svg.selectAll('.year-rect').on('mouseover', function(d){
          const hoveredYear = d.target.__data__;
          svg.selectAll('circle').attr('visibility', function(){
            const dd = this.getAttribute('data-year');
            console.log(hoveredYear);
            return (dd == hoveredYear ? 'visible' : 'hidden');
          });
      });
      svg.selectAll('.year-rect').on('mouseout', function(d){
        svg.selectAll('circle').attr('visibility', 'hidden');
        });
    });
  });

    // Draw X-axis
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xScale))
      .style("font-size", ".7em")
      .selectAll("text")
      .style("font-family", '"Kode Mono", monospace');

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.top - 30)
      .attr("dy", "0.75em")
      .style("text-anchor", "middle")
      .text("Year");

    // Draw Y-axis
    svg.append("g")
    .call(d3.axisLeft(yScale).tickFormat(d3.format("$,.0f")))
      .style("font-size", "0.7em")
      .selectAll("text")
      .style("font-family", '"Kode Mono", monospace');

    // Y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left - 60)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Median Total Pre-Tax Personal Income");
}