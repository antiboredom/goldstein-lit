var everything;

function load_book(url) {
  d3.select('#main').html('loading...');
  d3.selectAll('#graph, #actors, #events, #victims').html('');
  d3.csv(url, function(error, data){
    data = data.filter(function(item) {
      return item.goldstein_score != '' && item.actor1 != '' && item.actor2 != '';
    });
    everything = data;
    main_text(data);
    goldstein(data);
    load_stats(data);
    the_big_list(data);
  });
}

function filter(data, col, val) {
  if (arguments.length === 0) {
    d = everything;
  } else {
    var d = everything.filter(function(item) {
      return item[col] === val;
    });
  }
  main_text(d);
  goldstein(d);
}

function clean_actor(actor) {
  if (typeof country_codes[actor] != 'undefined') actor = country_codes[actor];
  actor = actor.replace(/"/g, '');
  actor = actor.replace(/-/g, '');
  //actor = actor.toUpperCase();
  actor = actor.toLowerCase();
  return actor;
}

function clean_event(event) {
  event = event.replace(', not specified below', '').toLowerCase();//.toUpperCase();
  return event;
}

function decorate_event(item) {
  var text = item.orignal_text;
  var actor1 = clean_actor(item.actor1).toUpperCase();
  var actor2 = clean_actor(item.actor2).toUpperCase();

  var sentences = text.match( /[^\.!\?]+[\.!\?]+/g );
  var sentence = text;

  if (sentences) {
    for (var i = 0; i < sentences.length; i ++) {
      if (sentences[i].toUpperCase().indexOf(actor1) > -1 && sentences[i].toUpperCase().indexOf(actor2) > -1) {
        sentence = sentences[i];
      }
    }
  }

  sentence = sentence.replace(new RegExp('\\b' + actor1 + '\\b', 'gi'), '<strong class="f_actor">' + actor1 + '</strong>');
  sentence = sentence.replace(new RegExp('\\b' + actor2 + '\\b', 'gi'), '<strong class="f_victim">' + actor2 + '</strong>');

  return sentence.toLowerCase();
}


function main_text(data) {

  var x = d3.scale.linear().range([0, parseInt(d3.select('#main').style('width'))/3]).domain([-10.0, 10.0]);

  var events = d3.select('#main').html('')
    .selectAll('.event')
    .data(data)

  //events.remove();

  events
    .enter()
    .append('div')
    .attr('class', 'event')
    .style('margin-left', function(d) { return x(+d.goldstein_score) + 'px' })
    //.style('text-align', function(d) { return +d.goldstein_score >=0 ? 'left' : 'right' });

  events
    .on('mouseover', function(d){
      d3.select(this).classed('hover', true);
      tooltip.style('visibility', 'visible').html(decorate_event(d));
    })
    .on('mouseout', function(){
      d3.select(this).classed('hover', false);
      tooltip.style('visibility', 'hidden');
    })
    .on('mousemove', function(){
      tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px');
    })

  events.append('div')
    .attr('class', 'actor')
    .text(function(d){ return clean_actor(d.actor1) })
    .on('click', function(d) { filter(data, 'actor1', d.actor1) });

  events.append('div')
    .attr('class', 'description')
    //.text(function(d){ return d.goldstein_score + ' ' + clean_event(d.event_description) })
    .text(function(d){ return clean_event(d.event_description) })
    .on('click', function(d) { filter(data, 'event_description', d.event_description) });

  events.append('div')
    .attr('class', 'victim')
    .text(function(d){ return clean_actor(d.actor2) })
    .on('click', function(d) { filter(data, 'actor2', d.actor2) });

}

function goldstein(data) {
  var selector = d3.select('#graph').html('');

  var margin = {top: 0, right: 0, bottom: 0, left: 0};
  //var width = parseInt(d3.select('#main').style('width')) - margin.left - margin.right;
  //var width = parseInt(d3.select('#main').style('width'))/2 - margin.left - margin.right;
  var width = parseInt(selector.style('width')) - margin.left - margin.right;
  var height = parseInt(d3.select('#main').style('height')) - margin.top - margin.bottom;

  var y = d3.scale.linear().range([0, height]).domain([0, data.length]);
  var x = d3.scale.linear().range([0, width]).domain([-10.0, 10.0]);

  var ref = d3.selectAll('.description')[0];
  //console.log(ref, data.length);
  var line = d3.svg.line()
    //.interpolate('basis')
    .x(function(d, i) { return x(+d.goldstein_score); })
    //.y(function(d, i) { if (ref[i]) return ref[i].offsetTop + 10; else return height; })
    .y(function(d, i) { return ref[i].offsetTop - 10; })
    //.y(function(d, i) { return y(i); })

  var svg = selector.append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    //.style('margin-left', width/2)

  var path = svg.append('path')
    .datum(data)
		.attr('class', 'line')
		.attr('d', line);


  var text = svg.selectAll('text')
    .data(data)
    .enter()
    .append('text')
    .attr('x', function(d, i) { return x(+d.goldstein_score) + (+d.goldstein_score >= 5 ? -20 : 5); })
    .attr('y', function(d, i) { return ref[i].offsetTop - 5; })
    .html(function(d, i) { return d.goldstein_score; })
}

function load_stats(data) {

  var actors = d3.nest()
    .key(function(d) { return d.actor1 })
    .rollup(function(values) {
      return {
        total: values.length,
        mean: d3.mean(values, function(d) { return d.goldstein_score }).toFixed(3)
      }
    })
    .entries(data)
  actors.sort(function(a, b) { return b.values.total - a.values.total });

  var victims = d3.nest()
    .key(function(d) { return d.actor2 })
    .rollup(function(values) {
      return {
        total: values.length,
        mean: d3.mean(values, function(d) { return d.goldstein_score }).toFixed(3)
      }
    })
    .entries(data)
  victims.sort(function(a, b) { return b.values.total - a.values.total });

  var events = d3.nest()
    .key(function(d) { return d.event_description} )
    .rollup(function(values) { return values.length; })
    .entries(data)
  events.sort(function(a, b) { return b.values - a.values });

  d3.select('#actors').html('')
    .selectAll('a.top-actor')
    .data(actors.slice(0, 20))
    .enter()
    .append('a')
    .attr('class', 'top-actor')
    .attr('href', '#')
    //.text(function(d) { return clean_actor(d.key) + ' ('+d.values.total + '/' + d.values.mean +')'; })
    .text(function(d) { return clean_actor(d.key) + ' (' + d.values.total + ')'; })
    .on('click', function(d) { filter(data, 'actor1', d.key) });

  d3.select('#victims').html('')
    .selectAll('a.top-victim')
    .data(victims.slice(0, 20))
    .enter()
    .append('a')
    .attr('class', 'top-victim')
    .attr('href', '#')
    .text(function(d) { return clean_actor(d.key) + ' (' + d.values.total + ')'; })
    .on('click', function(d) { filter(data, 'actor2', d.key) });

  d3.select('#events').html('')
    .selectAll('a.top-event')
    .data(events.slice(0, 20))
    .enter()
    .append('a')
    .attr('class', 'top-event')
    .attr('href', '#')
    .text(function(d) { return clean_event(d.key) + ' ('+d.values+')'; })
    .on('click', function(d) { filter(data, 'event_description', d.key) });
}

function the_big_list(data) {
  var events = d3.nest()
    .key(function(d) { return parseFloat(d.goldstein_score).toFixed(1) + ': ' + d.event_description} )
    //.rollup(function(values) { return values.length; })
    .entries(data)
  events.sort(function(a, b) { return a.values[0].goldstein_score - b.values[0].goldstein_score; });

  var cats = d3.select('#everything').html('')
    .selectAll('div.cat')
    .data(events)
    .enter()
    .append('div')
    .attr('class', 'cat')

  cats.append('h3')
    .html(function(d) { return clean_event(d.key); })
    .on('click', function(d) {filter(data, 'event_description', d.values[0].event_description)})

  cats = cats.selectAll('div')
    .data(function (d) { return d.values; })
    .enter()
    .append('div')

  //var lines = cats.append('div')
  cats
    .on('mouseover', function(d){
      //d3.select(this).classed('hover', true);
      tooltip.style('visibility', 'visible').html(decorate_event(d));
    })
    .on('mouseout', function(){
      //d3.select(this).classed('hover', false);
      tooltip.style('visibility', 'hidden');
    })
    .on('mousemove', function(){
      tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px');
    })

  cats.append('span')
    .text(function(d) { return clean_actor(d.actor1); })
    .on('click', function(d) { filter(data, 'actor1', d.actor1); })

  cats.append('span')
    .text(function(d) { return ' -> '; })

  cats.append('span')
    .text(function(d) { return clean_actor(d.actor2); })
    .on('click', function(d) { filter(data, 'actor2', d.actor2); })

}

var tooltip = d3.select('body')
	.append('div')
  .attr('class', 'tt')

d3.select('#books').on('change', function() {
  load_book('csv/' + this.value + '.csv');
});

d3.select('#reset').on('click', function() {
  filter();
});

load_book('csv/rainbow.csv');


