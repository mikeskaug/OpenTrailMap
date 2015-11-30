var map = L.map('map',{minZoom:10}).setView([36.5785155, -118.3010362], 13);
var tooltip = $('#tooltip')
var infoPanel = $("#infoPanel")

// create the tile layer with correct attribution
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="http://mapbox.com">Mapbox</a>',
	maxZoom: 18,
	id:'YOUR_ID',
	accessToken: 'YOUR_TOKEN'
    }).addTo(map);


var visibleStyle = {
"weight": 1.5,
"opacity": 1.0,
"clickable": false
};
var clicksStyle = {
"weight": 10,
"opacity": 0
};
var highlightStyle = {
"opacity": 1
};

function highlightFeature(e) {
        geojson.setStyle(e.target);
}

function resetFeatureStyle(e) {
        resetStyle(e.target);
}

$(function() {
  $('.toggle-info').click(function() {
    toggleInfoPanel();
  });
});

function toggleInfoPanel() {
	if ($('#infoPanel').hasClass('show-infoPanel')) {
	  // Do things on Nav Close
	  $('#infoPanel').removeClass('show-infoPanel');
	} else {
	  // Do things on Nav Open
	  $('#infoPanel').addClass('show-infoPanel');
	}
}
 
function onEachFeature_clicks(feature, layer) {
	switch (feature.properties.tags.highway) {
		    case 'cycleway': layer.setStyle({className: "cycleway"}); break;
            case 'track':   layer.setStyle({className: "track"}); break;
		    case 'path':   layer.setStyle({className: "path"}); break;
        }
	layer.setStyle(clicksStyle);
	layer.on('mouseover',function(e){
		tooltip.toggleClass("hidden")
				.css({top: event.pageY, left: event.pageX})
				.find('#value').text((feature.properties.tags.name) ? feature.properties.tags.name:'\u2014');
		});
	layer.on('mouseout',function(e){
		tooltip.toggleClass("hidden");
		});
	layer.on('click',function(e){
		getElevations(feature);
		infoPanel.addClass('show-infoPanel');
		infoPanel.find('#trailname').text((feature.properties.tags.name) ? feature.properties.tags.name:'\u2014')
		
		});
}

function onEachFeature_visible(feature, layer) {
	switch (feature.properties.tags.highway) {
		case 'cycleway': layer.setStyle({className: "cycleway"}); break;
		case 'track':   layer.setStyle({className: "track"}); break;
		case 'path':   layer.setStyle({className: "path"}); break;
	}
	layer.setStyle(visibleStyle);
}

var el = L.control.elevation({
    position: "topright",
    theme: "steelblue-theme", //default: lime-theme
    width: 300,
    height: 100,
    margins: {
        top: 30,
        right: 20,
        bottom: 30,
        left: 50
    },
    useHeightIndicator: true, //if false a marker is drawn at map position
    interpolation: "linear", //see https://github.com/mbostock/d3/wiki/SVG-Shapes#wiki-area_interpolate
    hoverNumber: {
        decimalsX: 1, //decimals on distance (always in km)
        decimalsY: 0, //deciamls on height (always in m)
        formatter: undefined //custom formatter function may be injected
    },
    xTicks: undefined, //number of ticks in x axis, calculated by default according to width
    yTicks: undefined, //number of ticks on y axis, calculated by default according to height
    collapsed: false    //collapsed mode, show chart on click or mouseover
});

el.addTo(map)
el._container.remove();
document.getElementById('ele_profile').appendChild(el.onAdd(map));

function getElevations(feature) {
	
	var LatLng_array = [];
	feature.geometry.coordinates.forEach( function(s) {
		LatLng_array.push(new google.maps.LatLng(s[1],s[0]) );
	} );
	
	var elevator = new google.maps.ElevationService;
	var len = LatLng_array.length
	var block_size = 300;
	if (len > block_size) { //break up request because of Google Elevation limit of 512 points per query
		var blocks = Math.floor(len/block_size);
		var result_array = [];
		var last_block = [];
		var len_cnt = 0;
		for (var bl = 0; bl <= blocks; bl++) {
			var locations = LatLng_array.slice(bl*block_size, (bl+1)*block_size<len ? (bl+1)*block_size : len);
			elevator.getElevationForLocations({
				'locations': locations
			}, function(results, status) {
				if (status === google.maps.ElevationStatus.OK) {
					
					//catch the last, short block which returns early so we can append the blocks in the right order
					if (results.length == block_size) { 
						result_array = result_array.concat(results)
						len_cnt += results.length
					} else {
						last_block = last_block.concat(results)
						len_cnt += results.length
					}
					
					if (len_cnt == len) {
						result_array = result_array.concat(last_block)
						feature.geometry.coordinates.forEach( function(s,i,a) {
							s.push(result_array[i].elevation);
						});
						addData(feature);
					}
				} else {
				  console.log('Elevation service failed due to: ' + status);
				}
			});
		}
		
	} else {

		elevator.getElevationForLocations({
			'locations': LatLng_array
		}, function(results, status) {
			if (status === google.maps.ElevationStatus.OK) {
				feature.geometry.coordinates.forEach( function(s,i,a) {
					s.push(results[i].elevation);
				});
				addData(feature);
			} else {
			  console.log('Elevation service failed due to: ' + status);
			}
		});
	};

}

function addData(e) {
	el.clear();
    el.addData(e);
	infoPanel.find('#ele_max').text(el.MaxElevation);
	infoPanel.find('#ele_min').text(el.MinElevation);
	infoPanel.find('#ele_gain').text(el.up);
	infoPanel.find('#ele_loss').text(el.down);
	infoPanel.find('#distance').text(el.TotalDist);
	
}

function load_paths(){
	
	bnds = map.getBounds();
	bnds_str = bnds.getSouth()+','+bnds.getWest()+','+bnds.getNorth()+','+bnds.getEast()
	baseurl = "http://overpass-api.de/api/interpreter?";
	query = 'data=[out:json][timeout:25];(way["highway"="path"]('+bnds_str+');way["highway"="track"]('+bnds_str+');way["highway"="cycleway"]('+bnds_str+'););out body;>;out skel qt;';
	
	$(".load-icon").show();
	$.getJSON(baseurl+query,  function(data) {
		
		$(".load-icon").hide();
		paths = osmtogeojson(data);
		geoJson_clicks = L.geoJson(paths,{onEachFeature: onEachFeature_clicks}).addTo(map);
		geoJson_visible = L.geoJson(paths,{onEachFeature: onEachFeature_visible}).addTo(map);
		
	});
}

var geocoder = new google.maps.Geocoder();

function googleGeocoding(text, callResponse){
	geocoder.geocode({address: text}, callResponse);
}

function formatJSON(rawjson){
	var json = {},
		key, loc, disp = [];

	for(var i in rawjson)
	{
		key = rawjson[i].formatted_address;
		
		loc = L.latLng( rawjson[i].geometry.location.lat(), rawjson[i].geometry.location.lng() );
		
		json[ key ]= loc;
	}

	return json;
}


//Build and add the search bar to the map
//uses leaflet-search plugin
var searchOpts = {
		sourceData: googleGeocoding,
		formatData: formatJSON,
		container: 'search_box',
		textPlaceholder: 'New Location ...',
		markerLocation: false,
		animateLocation: false,
		circleLocation: false,
		autoType: false,
		collapsed: false,
		autoCollapse: true,
		minLength: 2,
		zoom: 13		
	};
	
var searchControl = new L.Control.Search(searchOpts);

searchControl.on('search_locationfound',function(e) {	

	load_paths();
});

map.addControl( searchControl );



$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})


//Build and add the legend to the map
//uses leaflet.legend plugin
var Legend =  new L.Control.Legend();
map.addControl( Legend );
$(".legend-container").append( $("#legend") );
$(".legend-toggle").append( "<i class='legend-toggle-icon fa fa-info fa-2x' style='color: #000'></i>" );


load_paths()


