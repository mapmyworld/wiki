
var MAP_BASE = '';
var mapId = '/wiki';

var headerEl = mmw._overlay.headerEl;
var rightheaderEl = mmw._overlay.rightheaderEl;
var rightbarEl = mmw._overlay.rightbarEl;

var map = mmw.map;

document.title = 'Nearby Wiki';

rightheaderEl.style.display = 'flex';
rightheaderEl.children[1].innerHTML = "Nearby Wiki";
rightheaderEl.firstElementChild.src = MAP_BASE + mapId + '/img/wikipedia.ico';
rightheaderEl.firstElementChild.style.height = '35px';
rightheaderEl.firstElementChild.style['padding-left'] = '5px';
rightheaderEl.firstElementChild.style['padding-right'] = '5px';

let rightbarListEl = document.createElement('ol');
rightbarListEl.classList.add('rightbarlist');

rightbarEl.style.display = 'grid';

var zoom = 12;
if(map.getCanvasContainer().offsetWidth < 640) {
	headerEl.style.width = '50px';
	headerEl.children[1].style.display = 'none';
	zoom = 11;
} else {
	rightbarEl.style.height = (map.getCanvas().clientHeight - 80) + 'px';
	rightbarListEl.style.height = (map.getCanvas().clientHeight - 100) + 'px';;	
}

rightbarEl.append(rightbarListEl);

function newCollection() {
	return { type: "FeatureCollection", features: [] };
}

function newPoint() {
	return { type: 'Feature', properties : {}, geometry: { type: 'Point', coordinates: [] } };
}

var popupFn = function(e) {
	var props = e.features[0].properties;
	var popupHTML = '<b>'+ props.name +'</b><hr>'+(props.desc||'');
	return popupHTML;
}

map.on('load',  async () => {
	
	map.addSource('nearby', { 
		cluster: true,  clusterMaxZoom: 15, clusterRadius: 10, 
		type: 'geojson', data: newCollection(),
		attribution : 'Source <a href="https://en.wikipedia.org/" target="_blank">Wikipedia</a>'
	});
	mmw._layer.addSymbolLayer('nearby', 'pin-blue-xs', '', popupFn);
	
	var onClick = function(e) {
		const clickedFeatures = map.queryRenderedFeatures(e.point);
		const clickedFeature = clickedFeatures[clickedFeatures.length-1];
		window.open(clickedFeature.properties.url,'_blank');
	};
	
	map.on('click', onClick);
	map.on('touchstart', 'countries', onClick);
	
	loadData();
	map.on('moveend', async function() {
		loadData();
	});
	
	window.navigator.geolocation.getCurrentPosition(function(p) {
		//map.flyTo({center: [77.23, 28.614] });
		map.flyTo({center: [p.coords.longitude, p.coords.latitude], zoom: zoom });
	});

});

async function loadData() {
	
	var cen = map.getCenter();
	
	var API_URL = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&formatversion=2&prop=coordinates%7Cpageprops%7Cpageimages%7Cdescription%7Cinfo%7Cpageterms&inprop=url&colimit=max&generator=geosearch&ggsradius=10000&ggsnamespace=0&ggslimit=50&redirects=no&uselang=en&ppprop=displaytitle&piprop=thumbnail&pithumbsize=150&pilimit=50&ggscoord=' + cen.lat + '|' + cen.lng;
	var wikidata = await mmw._common.fetchJSON(API_URL);
	if(!wikidata.query) return;
	
	var geojsonData = newCollection();
	rightbarListEl.innerHTML = '';
	
	wikidata.query.pages.forEach( (p) => {
		var point = newPoint();
		var coords = point.geometry.coordinates = [p.coordinates[0].lon, p.coordinates[0].lat];
		var props = point.properties;
		[ props.name, props.desc, props.url ]= [ p.title, p.description, p.fullurl];
		geojsonData.features.push(point);
		
		var pageEl = document.createElement('li');
		pageEl.innerHTML = '<a href="'+ p.fullurl +'" target="blank">' + p.title + '</a>';
		var popupHTML = '<b>'+ props.name +'</b><hr>'+(props.desc||'');
		pageEl.setAttribute('onmouseover', 'mmw.markerpopup.setLngLat(['+coords[0]+','+coords[1]+']).setHTML("'+popupHTML+'").addTo(map)' );
		pageEl.setAttribute('onmouseout', 'mmw.markerpopup.remove()' );
		rightbarListEl.append(pageEl);
	});
	
	map.getSource('nearby').setData(geojsonData);
}
