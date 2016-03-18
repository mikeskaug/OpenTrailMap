# Open Trail Map

Open Trail Map is a web application to view trails, bike paths and dirt roads in the [OpenStreetMap](https://www.openstreetmap.org/) database.  It allows a user to search for any location in North America and then select a trail to view distances, elevation stats and an elevation profile.

for further information:
[http://michaelskaug.com/open_trail_map/](http://michaelskaug.com/open_trail_map)

## Example
[Open Trail Map](http://michaelskaug.com/projects/OpenTrailMap/)

## Usage
The entry point is ```index.html```.  To run the app, start a web server in this repository's directory with, for example:
```
python -m SimpleHTTPServer
```
and then navigate to ```http://localhost:8000/#``` in a web browser

### Dependencies
Open Trail Map is built on Leaflet in addition to some plugins and libraries:
- [Leaflet 0.7.7](http://leafletjs.com/download.html)
- [leaflet-search 1.8.4](https://github.com/stefanocudini/leaflet-search)
- [leaflet-legend 1.0.0](https://github.com/mikeskaug/Leaflet.Legend)
- [leaflet-locatecontrol 0.48.0](https://github.com/domoritz/leaflet-locatecontrol)
- [bootstrap 3.3.5](http://getbootstrap.com)
- [font-awesome 4.4.0](https://fortawesome.github.io/Font-Awesome/)
- [osmtogeojson 2.2.5](https://github.com/tyrasd/osmtogeojson)

These can be installed individually (if you do this, make sure that index.html points to the correct location for the files) or in one step with [npm](https://www.npmjs.com):
```js
npm install
```

The following are also required, but they are loaded via a CDN, so they don't need to be installed separately:
- [d3 3.5.6](http://d3js.org)
- [jquery 1.11.3](http://jquery.com)


Open Trail Map also uses [Leaflet.Elevation](https://github.com/MrMufflon/Leaflet.Elevation) to display the elevation profiles, but the (modified) code comes packaged with this project.

### Map Components
Open Trail Map interacts with several service providers, some of which require a user account and a security key.
#####Map tiles
Leaflet can [load map imagery](http://leafletjs.com/examples/quick-start.html) from many locations with the ```L.tilelayer()``` command.  For example, I used [MapBox](https://www.mapbox.com):
```js
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
	attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a>, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy <a href="http://mapbox.com">Mapbox</a>',
	maxZoom: 18,
	id:'YOUR_ID',
	accessToken: 'YOUR_TOKEN'
    }).addTo(map);
```

#####Google Maps API
Open Trail Map also uses the [Google Maps Javascript API](https://developers.google.com/maps/documentation/javascript/) to access geocoding and elevation data.  This service requires an account and is loaded in the html:
```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=geometry"></script>
```

### To Do
Trail data is now loaded from a dedicated AWS server, rather than the public Overpass API. As a result, response times are much shorter, but it only supplies data for North America because of limited resources. Download times are still quite long, so additional simplification and compression of the trail data on the backend would improve performance. 




