var formatDate = d3.time.format("%d-%b-%y"),
	formatDate_csv = d3.time.format("%Y-%m-%d"),
	bisectDate = d3.bisector(function(d) { return d.date; }).left,
	format_nb = d3.format(".2f");

function parseDate_csv (d) { return (d==null) ? null : formatDate_csv.parse(d); }

var svg = {width: 960, height: 500},
	margin = {top: 30, right: 80, bottom: 60, left: 110},
	width = svg.width-margin.left-margin.right,
	height = svg.height-margin.top-margin.bottom;

var x = d3.time.scale().range([0, width]),
	yLeft = d3.scale.linear().range([height, 0]),
	yRight = d3.scale.linear().range([height, 0]);

var xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(formatDate),
	yAxisLeft = d3.svg.axis().scale(yLeft).orient("left"),
	yAxisRight = d3.svg.axis().scale(yRight).orient("right"),
	xGrid = d3.svg.axis().scale(x).orient("bottom");

var valueline = d3.svg.line()
		.defined(function(d) { return d.close!=0; })
		.x(function(d) { return x(d.date); })
		.y(function(d) { return yLeft(d.close); })
		.interpolate("linear");

var color = d3.scale.linear()
	.domain([-4, 0, 4])
	.range(["red", "white", "blue"]);

var title = d3.select("#title"),
	table_fut = d3.select("#table_fut");

var svg = d3.select("#container")
		.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom);

var main = svg.append("g")
		.attr("id", "main")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var defs = svg.append("svg:defs");

var dataset = [],
	dataset_term_struct = [],
	dataset_to_current_date,
	dataset_table,
	current_date;

d3.text("./data/vix_mkt_data_d3.csv", "text/csv", function(text) {
	var rows1 = d3.csv.parseRows(text);
	var rows2 = d3.csv.parseRows(text);
	var nb_fut_max = 0;

	rows1.forEach(function(d) {
		nb_fut_max  =Math.max(nb_fut_max, +d[2]);
	})
	console.log("nb_fut_max="+nb_fut_max);

	rows2.forEach(function(d) {
		var obj={};
		obj.date = parseDate_csv(d[0]);
		obj.VIX = +d[1];
		obj.nb_fut = +d[2];
		obj.last_tradeable_date = [];
		obj.ticker = [];
		obj.close = [];
		obj.volume = [];
		obj.open_int = [];
		for (var i = 0; i < obj.nb_fut; i++) {
			var s = 0, f = 3;
			obj.last_tradeable_date[i] = parseDate_csv(d[f+s*nb_fut_max+i]); s++;
			obj.ticker[i] = d[f+s*nb_fut_max+i]; s++;
			obj.close[i] = +d[f+s*nb_fut_max+i]; s++;
			obj.volume[i] = +d[f+s*nb_fut_max+i]; s++;
			obj.open_int[i] = +d[f+s*nb_fut_max+i]; s++;
		}

		var obj_term_struct = [{date: obj.date, close: obj.VIX, nb_fut: obj.nb_fut, strat_ER: obj.strat_ER, strat_TR: obj.strat_TR}];
		for (var i = 0; i < obj.nb_fut; i++) {
			var fut={};
			fut.date = obj.last_tradeable_date[i];
			if (fut.date==null) { console.log(d[0]); }
			fut.ticker = obj.ticker[i];
			fut.close = obj.close[i];
			fut.volume = obj.volume[i];
			fut.open_int = obj.open_int[i];
			obj_term_struct.push(fut);
		}

		dataset.push(obj);
		dataset_term_struct.push(obj_term_struct);
	});

	var nb_data_col = 1+nb_fut_max;
	dataset_table = build_dataset_table(nb_data_col);

	setTimeout(function() {
	console.log('create Animation object');
	anim = new Animation(dataset.length, "container", "time_slider_id", "loop_select_id",
		"left_axis_max_slider_id", "left_axis_min_slider_id", "bottom_axis_max_slider_id", "right_axis_max_slider_id",
		"second_slider_id", "second_slider_value", "second_span_id");
	}, 0);

});

function union_sort_unique(arrayA, arrayB) {
	var arrayC = d3.merge([arrayA, arrayB]);
	arrayC.sort(d3.ascending);
	for ( var i = 1; i < arrayC.length; i++ ) {
		if ( arrayC[i] === arrayC[ i - 1 ] ) {
			arrayC.splice( i--, 1 );
		}
	}
	return arrayC;
};

function build_dataset_table(nb_data_col) {
	var dataset_table = [],
		data_table,
		row;

	dataset.forEach(function(d) {
		data_table = [];

		row = ['Future Ticker'];
		row = row.concat(d.ticker);
		for(var i=1; i< row.length; i++) {
			row[i] = row[i].substring(0, row[i].length-6);
		}
		data_table.push(row);

		row = ['Future Close'];
		row = row.concat(d.close);
		data_table.push(row);

		row = ['Future Last Tradeable Date'];
		row = row.concat(d.last_tradeable_date.map(formatDate));
		data_table.push(row);

		//trim and pad data_table to fixed length for better display
		for(var i=0; i< data_table.length; i++) {
			data_table[i] = data_table[i].slice(0, nb_data_col);
			for(var j=data_table[i].length; j< nb_data_col; j++) {
				data_table[i].push("");
			}
		}

		dataset_table.push(data_table);
	})

	console.log("first date = , "+formatDate(dataset[0].date));
	console.log("last date = , "+formatDate(dataset[dataset.length-1].date));
	return dataset_table;
}

function extract_data_table(frame, offset) {
	var d = dataset[frame];
	var d1 = dataset[frame+offset];
	var data_table = dataset_table[frame].slice(0);
	return data_table;
}


function draw_init(frame, left_axis_max, left_axis_min, bottom_axis_max, right_axis_max) {

	var data = dataset[frame];
	var data_spot_fut = dataset_term_struct[frame];
	var data_fut = data_spot_fut.slice(1);

	current_date = data.date;
	var fut_dates = data.last_tradeable_date;

	dataset_to_current_date = dataset.filter(function(d) { return d.date<=current_date; });

	var bottom_axis_max_date = new Date();
	bottom_axis_max_date.setTime(current_date.getTime()+(bottom_axis_max*24*60*60*1000));

	window.data = data;
	window.data_spot_fut = data_spot_fut;
	window.data_fut = data_fut;
	window.dataset_to_current_date = dataset_to_current_date;

	x.domain([current_date, bottom_axis_max_date]);
	yLeft.domain([left_axis_min, left_axis_max]);
	yRight.domain([0, right_axis_max]);


	// define clippaths
	defs.append("svg:clipPath")
			.attr("id", "chart_shape")
		.append("svg:rect")
			.attr("x", -6)
			.attr("width", width+6)
			.attr("y", 0)
			.attr("height", height);

	defs.append("svg:clipPath")
			.attr("id", "line_shape")
		.append("svg:rect")
			.attr("x", 0)
			.attr("width", width+0)
			.attr("y", 0)
			.attr("height", height);

	defs.append("svg:clipPath")
			.attr("id", "grid-shape")
		.append("svg:rect")
			.attr("x", -6)
			.attr("width", width+6)
			.attr("y", -height)
			.attr("height", height);

	defs.append("svg:clipPath")
			.attr("id", "xAxis-shape")
		.append("rect")
			.attr("x", -35)
			.attr("width", width+35)
			.attr("y", 0)
			.attr("height", margin.bottom);

	// logo *************************************************************************************
	main.append("svg:image")
			.attr("id", "logo")
			.attr("xlink:href", "./logo/CBOE_logo.gif")
			.attr("alt", "logo")
			.attr("x", -margin.left*0.95)
			.attr("width", 70)
			.attr("y", -margin.top*0.75)
			.attr("height", 50);


	// draw spot and futures line
	main.append("svg:path")
			.attr("class", "line close")
			.attr("clip-path", "url(#line_shape)")
			.attr("d", valueline(data_spot_fut));

	// draw spot and futures line
	//second
	main.append("svg:path")
			.attr("class", "line close_second")
			.attr("clip-path", "url(#line_shape)")
			.classed("invisible", true)
			.attr("d", valueline(data_spot_fut));

	// draw yLeft axis text
	main.append("svg:text")
			.attr("class", "font1")
			.attr("transform", "rotate(-90)")
			.attr("y", -margin.left*0.8)
			.attr("x", -height/2)
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.text("VIX futures/spot close");

	// draw yRight axis text
	main.append("svg:text")
			.attr("class", "yRightLabel")
			.attr("transform", "rotate(-90)")
			.attr("y", width+margin.right*0.8)
			.attr("x", -height/2)
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.text("VIX futures volume");

	// draw x grid
	main.append("svg:g")
			.attr("class", "x grid")
			.attr("transform", "translate(0," + height + ")")
			.attr("clip-path", "url(#grid-shape)")
			.call(xGrid.tickValues(fut_dates)
				.tickSize(-height, 0, 0)
				.tickFormat("")
				);

	// draw x axis
	main.append("svg:g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.attr("clip-path", "url(#xAxis-shape)")
			.call(xAxis.tickValues(fut_dates))
			.selectAll("text")
				.attr("class", "font2")
				.style("text-anchor", "end")
				.attr("dx", "-0.8em")
				.attr("dy", "-0.3em")
				.attr("transform", "rotate(-55)");

	// draw y axis left
	main.append("svg:g")
			.attr("class", "yLeft axis")
			.call(yAxisLeft)
			.selectAll("text")
				.attr("class", "font1");

	// draw y axis right
	main.append("svg:g")
			.attr("class", "yRight axis")
			.attr("transform", "translate(" + width + "," + 0 + ")")
			.call(yAxisRight)
				.selectAll("text")
				.attr("class", "font1");

	// draw title
	title.text("Strategy on VIX futures");

}


function draw_update(frame, frame_offset, left_axis_max, left_axis_min, bottom_axis_max, right_axis_max, show_volumes, adjust_scale) {

	var data = dataset[frame];
	var data_spot_fut = dataset_term_struct[frame];
	var data_fut = data_spot_fut.slice(1);

	var data_second = dataset[frame+frame_offset];
	var data_spot_fut_second = dataset_term_struct[frame+frame_offset];
	var data_fut_second = data_spot_fut_second.slice(1);

	current_date = data.date;
	var current_date_second = data_second.date;

	// filter out past futures in fut_second
	data_fut_second = data_fut_second.filter(function(d) { return d.date>=current_date; });

	dataset_to_current_date = dataset.filter(function(d) { return d.date<=current_date; });

	var strat_ER = data.strat_ER,
		strat_TR = data.strat_TR;
	var fut_dates = union_sort_unique(data.last_tradeable_date, data_second.last_tradeable_date)

	// filter out past futures in fut_second
	fut_dates = fut_dates.filter(function(d) { return d>=current_date; });

	var bottom_axis_max_date = new Date();
	bottom_axis_max_date.setTime(current_date.getTime()+(bottom_axis_max*24*60*60*1000));

	window.data = data;
	window.data_spot_fut = data_spot_fut;
	window.data_fut = data_fut;

	window.data_second = data_second;
	window.data_spot_fut_second = data_spot_fut_second;
	window.data_fut_second = data_fut_second;

	window.dataset_to_current_date = dataset_to_current_date;
	window.fut_dates = fut_dates;

	x.domain([current_date, bottom_axis_max_date]);
	yLeft.domain([left_axis_min, left_axis_max]);
	yRight.domain([0, right_axis_max]);

	// console.log("--- draw_update, "+"frame = "+frame+", date = "+formatDate(current_date)+" "+", offset = "+frame_offset+" "+"frame+offset = "+(frame+frame_offset)+", date+offset = "+formatDate(current_date_second));

	// transition time in ms
	var dt = 0;

	// draw current date
	var currentdate = main.selectAll(".currentdate")
			.data([current_date]);

	currentdate.enter()
			.append("svg:text")
			.attr("class", "currentdate")
			.attr("x", -margin.left*0.3)
			.attr("y", height*0.97)
			.attr("dy", "1em")
			.text(function(d) {return formatDate(d)});

	currentdate.transition()
			.duration(dt)
			.text(function(d) {return formatDate(d)});

	// draw current date
	// second
	var currentdate_second = main.selectAll(".currentdate_second")
			.classed("invisible", frame_offset==0)
			.data([current_date_second]);

	currentdate_second.enter()
			.append("svg:text")
			.attr("class", "currentdate_second")
			.classed("invisible", true)
			.attr("x", -margin.left*0.3)
			.attr("y", height*0.87)
			.attr("dy", "1em")
			.text(function(d) {return formatDate(d)});

	currentdate_second.transition()
			.duration(dt)
			.text(function(d) {return formatDate(d)});

	// draw volume bar
	var volumes = main.selectAll(".volumes")
			.classed("invisible", show_volumes==false)
			.data(data_fut, function (d) { return d.date; });

	volumes.enter()
		.append("svg:rect")
			.attr("class", "volumes")
			.classed("invisible", show_volumes==false)
			.attr("clip-path", "url(#chart_shape)")
			.attr("x", function(d) { return x(d.date)-width/100; })
			.attr("width", width/50)
			.attr("y", function(d) { return yRight(d.volume) })
			.attr("height", function(d) { return height-yRight(d.volume) });

	volumes.transition()
			.duration(dt)
			.attr("x", function(d) { return x(d.date)-width/100; })
			.attr("width", width/50)
			.attr("y", function(d) { return yRight(d.volume) })
			.attr("height", function(d) { return height-yRight(d.volume) });

	volumes.exit()
			.transition()
			.duration(dt)
		.remove();

	// draw spot and futures line
	main.selectAll(".line.close")
		.transition()
			.duration(dt)
			.attr("d", valueline(data_spot_fut));

	// draw spot and futures line
	// second
	main.selectAll(".line.close_second")
		.classed("invisible", frame_offset==0)
		.transition()
			.duration(dt)
			.attr("d", valueline(data_spot_fut_second));

	// draw spot circle
	var spot = main.selectAll(".spot")
			.data([data_spot_fut[0]]);

	spot.enter()
		.append("svg:circle")
			.attr("class", "spot")
			.attr("clip-path", "url(#chart_shape)")
			.attr("r", 5)
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	spot.transition()
			.duration(dt)
			.attr("r", 5)
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	// draw spot circle
	// second
	var spot_second = main.selectAll(".spot_second")
			.classed("invisible", frame_offset<=0)
			.data([data_spot_fut_second[0]]);

	spot_second.enter()
		.append("svg:circle")
			.attr("class", "spot_second")
			.attr("clip-path", "url(#chart_shape)")
			.classed("invisible", true)
			.attr("r", 5)
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	spot_second.transition()
			.duration(dt)
			.attr("r", 5)
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	// draw futures circle
	var futures = main.selectAll(".fut")
			.data(data_fut, function (d) { return d.date });

	futures.enter()
			.append("svg:circle")
			.attr("class", "fut")
			.attr("clip-path", "url(#chart_shape)")
			.attr("r", function(d) { return d.close==0 ? 0 : 5 })
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	futures.transition()
			.duration(dt)
			.attr("r", function(d) { return d.close==0 ? 0 : 5 })
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	futures.exit()
			.transition()
			.duration(dt)
		.remove();

	// draw futures circle
	// second
	var futures_second = main.selectAll(".fut_second")
			.classed("invisible", frame_offset==0)
			.data(data_fut_second, function (d) { return d.date });

	futures_second.enter()
		.append("svg:circle")
			.attr("class", "fut_second")
			.attr("clip-path", "url(#chart_shape)")
			.classed("invisible", frame_offset==0)
			.attr("r", function(d) { return d.close==0 ? 0 : 5 })
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	futures_second.transition()
			.duration(dt)
			.attr("r", function(d) { return d.close==0 ? 0 : 5 })
			.attr("cx", function(d) { return x(d.date); })
			.attr("cy", function(d) { return yLeft(d.close); });

	futures_second.exit()
			.transition()
			.duration(dt)
		.remove();

	// draw x axis
	main.selectAll(".x.axis")
		.transition()
			.duration(dt)
			.call(xAxis.tickValues(fut_dates))
			.selectAll("text")
				.attr("class", "font2")
				.style("text-anchor", "end")
				.attr("dx", "-0.8em")
				.attr("dy", "-0.3em")
				.attr("transform", "rotate(-55)");

	// draw y axis left
	main.selectAll(".yLeft.axis")
		.transition()
			.call(yAxisLeft);

	// draw y axis right
	main.selectAll(".yRight.axis")
		.classed("invisible", show_volumes==false)
		.transition()
			.call(yAxisRight);

	// draw y axis right text
	main.selectAll(".yRightLabel")
		.classed("invisible", show_volumes==false)
		.text("VIX futures volume");

	// draw x grid
	main.select(".x.grid")
		.transition()
			.duration(dt)
			.call(xGrid.tickValues(fut_dates));

	// draw table_fut
	var table_data = extract_data_table(frame, frame_offset);

	d3.selectAll(".tr_market").remove();
	d3.selectAll(".tr_position").remove();

	var rows = table_fut.selectAll("tr")
			.data(table_data)
			.enter()
		.append("tr")
			// .attr("class", function(d, i) { return (i<4) ? "tr_market" : (return (i<6) ? "tr_decision" : "tr_position"); });
			.attr("class", function(d, i) { return (i<2) ? "tr_market" : "tr_position"; });

	var cells_market = d3.selectAll(".tr_market").selectAll("td")
			.data(function(d) { return d; })
			.enter()
		.append("td")
			.attr("class", function(d, i) { return (i>0) ?  "next_col" : "first_col"; })
			.text(function(d) { return (d instanceof Date) ? formatDate(d) : ((typeof(d)==="number" & d!==0)? d.toFixed(2) : d); })
			.on("mouseover", function(){d3.select(this).style("background-color", "yellow");})
			.on("mouseleave", function(){d3.select(this).style("background-color", "white");});

	var cells_position = d3.selectAll(".tr_position").selectAll("td")
			.data(function(d) { return d; })
			.enter()
		.append("td")
			.attr("class", function(d, i) { return (i>0) ?  "next_col" : "first_col"; })
			.text(function(d) { return (typeof(d)==="number" & d!==0) ? d.toFixed(2) : d; })
			.style("background-color", function(d) { return (typeof(d)==="number") ? color(d) : "white"; })
			.on("mouseover", function(){d3.select(this).style("background-color", "yellow");})
			.on("mouseleave", function(){d3.select(this).style("background-color", function(d, i) { return (typeof(d)==="number") ? color(d) : "white"; }) });

}