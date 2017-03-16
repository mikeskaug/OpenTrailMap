/*
	SETUP MAP
	~~~~~~~~~~~~~~~~~~~~~~~~
	Initialize the map, load tiles and define some styles

*/

//limit view to North America for which there is trail data available
var map = L.map('map',{minZoom:5, maxBounds:[[1.209763, -177.780297],[82.916148, -23.092799]]}) 
			.setView([39.994116, -105.303509], 13);

var tooltip = $('#tooltip')
var infoPanel = $("#infoPanel")
var dataExtent

// create the tile layer
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="http://mapbox.com">Mapbox</a>',
	maxZoom: 18,
	id:'mapbox.run-bike-hike',
	accessToken: 'pk.eyJ1IjoibWlrZXNrYXVnIiwiYSI6ImNpZzl1MHJ4eTAydDR1ZG0xcnE1Nm95NnUifQ._cFzGhBLWh5v1tZJ0C15Bg'
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




/*
	EVENT HANDLERS
	~~~~~~~~~~~~~~~~~~~~~~~~~~~	

*/
$('#zoom-msg').popover({
	content: 'Zoom in to view trail data',
	trigger: 'manual',
	template: '<div class="popover" role="tooltip"><h3 class="popover-title"></h3><div class="popover-content"></div></div>'
});

var searchErrorPopup = L.popup().setContent('<p>Trail data is not available for that location.</p>');

$(function() {
	$('.toggle-info').click(function() {
	  toggleInfoPanel();
	});
});

function toggleInfoPanel() {
	if ($('#infoPanel').hasClass('show-infoPanel')) {
	  $('#infoPanel').removeClass('show-infoPanel');
	} else {
	  $('#infoPanel').addClass('show-infoPanel');
	}
}

$(function () {
	$('[data-toggle="tooltip"]').tooltip()
})

map.on('moveend', function(e) {
	
	//$('#search_bar').popover('hide');
	var newbnds = map.getBounds();
	var current_zoom = map.getZoom();
	if (current_zoom == 12) {
		$('#zoom-msg').popover('show');
		$('.leaflet-overlay-pane').hide();
	}
	else if (current_zoom == 13) {
		$('#zoom-msg').popover('hide');
		$('.leaflet-overlay-pane').show();
	}
	if (!dataExtent.contains(newbnds) & current_zoom>12) {
		map.removeLayer(geoJson_clicks);
		map.removeLayer(geoJson_visible);
		load_paths();
		dataExtent = newbnds.pad(0.3);
	}

});
 



/*
	MAP FUNCTIONS
	~~~~~~~~~~~~~~~~~~~~~~~~~~
	
*/
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

function getElevations(feature) {
	
	var LatLng_array = [];
	feature.geometry.coordinates.forEach( function(s) {
		LatLng_array.push(new google.maps.LatLng(s[1],s[0]) );
	});
	
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

function load_paths() {
	
	bnds = map.getBounds();
	dataExtent = bnds.pad(0.3);
	bnds_str = dataExtent.getSouth()+','+dataExtent.getWest()+','+dataExtent.getNorth()+','+dataExtent.getEast()
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

function formatJSON(rawjson){
	var json = {},
		key, loc, disp = [];

	for (var i in rawjson) {
		key = rawjson[i].formatted_address;
		loc = L.latLng( rawjson[i].geometry.location.lat(), rawjson[i].geometry.location.lng() );
		json[ key ]= loc;
	}

	return json;
}




/*
	MAP CONTROLS
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	
*/

//Add elevation profile to the #infoPanel
var el = L.control.elevation({
    position: "topright",
    theme: "steelblue-theme",
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


//Add search bar with geocoding provided by google.maps.Geocoder()
//Uses leaflet-search plugin
var geocoder = new google.maps.Geocoder();
function googleGeocoding(text, callResponse){
	geocoder.geocode({address: text}, callResponse);
}

var searchOpts = {
		sourceData: googleGeocoding,
		formatData: formatJSON,
		container: 'search_box', //place in the #search_box div
		textPlaceholder: 'Search ...',
		markerLocation: false,
		animateLocation: false,
		circleLocation: false,
		autoType: false,
		collapsed: false,
		autoCollapse: true,
		minLength: 2,
		zoom: 13		
	};
	
var searchControl = new L.Control.Search(searchOpts).addTo(map);

searchControl.on('search_locationfound',function(e) {	
	if (!map.getBounds().contains(e.latlng)) {
		searchErrorPopup.setLatLng(map.getCenter());
		map.openPopup(searchErrorPopup);
	}
});


//Add geo locator button
//Uses leaflet.locatecontrol plugin
L.control.locate({
    position: 'topleft',  // set the location of the control
    layer: undefined,  // use your own layer for the location marker, creates a new layer by default
    drawCircle: true,  // controls whether a circle is drawn that shows the uncertainty about the location
    follow: false,  // follow the user's location
    setView: true, // automatically sets the map view to the user's location, enabled if `follow` is true
    keepCurrentZoomLevel: false, // keep the current map zoom level when displaying the user's location. (if `false`, use maxZoom)
    stopFollowingOnDrag: false, // stop following when the map is dragged if `follow` is true (deprecated, see below)
    remainActive: false, // if true locate control remains active on click even if the user's location is in view.
    markerClass: L.circleMarker, // L.circleMarker or L.marker
    circleStyle: {},  // change the style of the circle around the user's location
    markerStyle: {},
    followCircleStyle: {},  // set difference for the style of the circle around the user's location while following
    followMarkerStyle: {},
    icon: 'fa fa-map-marker',  // class for icon, fa-location-arrow or fa-map-marker
    iconLoading: 'fa fa-spinner fa-spin',  // class for loading icon
    iconElementTag: 'span',  // tag for the icon element, span or i
    circlePadding: [0, 0], // padding around accuracy circle, value is passed to setBounds
    metric: false,  // use metric or imperial units
    onLocationError: function(err) {alert(err.message)},  // define an error callback function
    onLocationOutsideMapBounds:  function(context) { // called when outside map boundaries
            alert(context.options.strings.outsideMapBoundsMsg);
    },
    showPopup: true, // display a popup when the user click on the inner marker
    strings: {
        title: "Show me where I am",  // title of the locate control
        metersUnit: "meters", // string for metric units
        feetUnit: "feet", // string for imperial units
        popup: "You are within {distance} {unit} from this point",  // text to appear if user clicks on circle
        outsideMapBoundsMsg: "You seem located outside the boundaries of the map" // default message for onLocationOutsideMapBounds
    },
    locateOptions: {maxZoom: 13}  // define location options e.g enableHighAccuracy: true or maxZoom: 10
}).addTo(map);

//Add a legend to the map
//uses leaflet.legend plugin
var Legend =  new L.Control.Legend();
map.addControl( Legend );
$(".legend-container").append( $("#legend") );
$(".legend-toggle").append( "<i class='legend-toggle-icon fa fa-info fa-2x' style='color: #000'></i>" );



//Load trail data onto the map
load_paths()


