// creates the map object
const map = L.map("map").setView([37.2736702, -107.879303], 11);

// adds tile layer
const tileLayer = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'James Raines, Chris Ridener, Sam Ross | Tiles &copy; Esri &mdash; Colorado Parks and Wildlife, Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, METI'
}).addTo(map);


 // Declare Variables
// toggle editable markers
let editable = false;
let nearestActive = false;
let bufferActive = false;
let numberOfPoints;
let bufferDistance;
let markerSymbol;
let newSymbol = 'default';
let legendActive = true;
let geoprocessingActive = true;

let navigationCoords;
 // variable to hold marker locations
 let markerLocations = null;
// Set Global Variable that will hold your location
let myLocation = null;
// Set Global Variable that will hold the marker that goes at our location when found
let locationMarker = null;

 // Database Queries
 // Get all markers from dataset
 const sqlDB = 'durango' 
 const sqlQuery = `SELECT * FROM ${sqlDB}`;

 // Set CartoDB Username
 const cartoDBUserName = "lorax521";

// Set 'Your Location' icon
const redIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    //  shadowUrl: 'images/marker-shadow.png',
    iconAnchor: [13, 41],
    iconSize: [25, 40]
});

const greyIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
    //  shadowUrl: 'images/marker-shadow.png',
    iconAnchor: [13, 41],
    iconSize: [25, 40],
    popupAnchor:  [0, -34]
});

const greenIcon = L.Icon.extend({
    options: {
        shadowUrl: null,
        iconSize: [25, 40],
        iconAnchor: [13, 41],
        popupAnchor:  [0, -34],
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    }
});

 function showAll() {
  $('#editable').css('background', 'white');
  $('#editable').css('color', 'black');
  if (map.hasLayer(markerLocations)) {
    map.removeLayer(markerLocations);
  };
  if (map.hasLayer(locationMarker)) {
    map.removeLayer(locationMarker);
  };
  //  map.setView(new L.LatLng(37.284972, -107.875428), 11);
   $.getJSON(`https://${cartoDBUserName}.carto.com/api/v2/sql?format=GeoJSON&q=${sqlQuery}`, function(data) {
     markerLocations = L.geoJson(data,{
       onEachFeature: function (feature, layer) {
         let featureNotes = feature.properties.notes ? feature.properties.notes : '';
         layer.feature.properties.icon == 'harvested' ? layer.options.icon = greyIcon : null;
         layer.bindPopup(
          '</em></p><button class="nav-btn" onclick="navigate()"><i class="fa fa-location-arrow" aria-hidden="true"></i></button>' +
           '<p><b> Type: </b>' + feature.properties.type +
           '<br /><b> Count: </b><em>' + feature.properties.count + '</em>' +
           '<br /><b> Permission Required: </b><em>' + feature.properties.permission + '</em>' +
           '<br /><b> Notes: </b><em>' + featureNotes + '</em>' +
           '</p> <div id="hidden">' + feature.properties.cartodb_id + '</div>');
         layer.cartodb_id=feature.properties.cartodb_id;
       }
     }).addTo(map).on('click', (layer) => {
          cartoID = layer.layer.cartodb_id; cartoLayer = layer.layer;
          navigationCoords = `${layer.layer._latlng.lat}, ${layer.layer._latlng.lng}`;
     });
   });
 };

  // Get CartoDB selection as GeoJSON and Add to Map
  function showAllWithEdit(){
    $('#editable').css('background', '#808080')
    $('#editable').css('color', '#f5f5f5')
    if (map.hasLayer(markerLocations)) {
      map.removeLayer(markerLocations);
    };
    if (map.hasLayer(locationMarker)) {
      map.removeLayer(locationMarker);
    };
    // map.setView(new L.LatLng(37.284972, -107.875428), 11);
    $.getJSON(`https://${cartoDBUserName}.carto.com/api/v2/sql?format=GeoJSON&q=${sqlQuery}`, function(data) {
      markerLocations = L.geoJson(data,{
        onEachFeature: function (feature, layer) {
          let featureNotes = feature.properties.notes ? feature.properties.notes : '';
            layer.feature.properties.icon == 'harvested' ? layer.options.icon = greyIcon : null;
          layer.bindPopup(
            '<p><b> Type: </b>' + feature.properties.type +
            '<br /><b> Count: </b><em>' + feature.properties.count + '</em>' +
            '<br /><b> Permission Required: </b><em>' + feature.properties.permission + '</em>' +
            '<br /><b> Notes: </b><em>' + featureNotes + '</em>' +
            '</p> <div id="hidden">' + feature.properties.cartodb_id + '</div>' +
            '</em></p><button class="del-btn" onclick="deletePoint()"><i class="fa fa-trash" aria-hidden="true"></i></button>' +
            '<div class="change-btn-item"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png"></div>' +
            '<div class="change-btn-item"><button class="change-btn" onclick="updatePoint()"><i class="fa fa-exchange" aria-hidden="true"></i></button></div>' +
            '<div class="change-btn-item"><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png"></div>');
          layer.cartodb_id=feature.properties.cartodb_id;
        }
      }).addTo(map).on('click', (layer) => {
           cartoID = layer.layer.cartodb_id;
           cartoLayer = layer.layer;
           markerSymbol = layer.layer.feature.properties.icon;
           newSymbol = markerSymbol == 'harvested' | markerSymbol == null ? 'default' : 'harvested';
           console.log(newSymbol);
      });
    });
  };

    //find and make markers for the nearest 5 markers
    function nearestPoints() {
        numberOfPoints = $('#number-of-points').val();
        if (nearestActive) {
            //sql query
            const sqlQueryClosest = `select * from durango order by the_geom <-> ST_SetSRID(ST_MakePoint(${myLocation.lng}, ${myLocation.lat}), 4326) limit ${numberOfPoints}`;
            if (map.hasLayer(markerLocations)) {
                map.removeLayer(markerLocations);
            };
            if (map.hasLayer(locationMarker)) {
                map.removeLayer(locationMarker);
            };

            //get GeoJSON of five closest points
            $.getJSON(`https://${cartoDBUserName}.carto.com/api/v2/sql?format=GeoJSON&q=${sqlQueryClosest}`, function(data) {
                markerLocations = L.geoJson(data, {
                    onEachFeature: function (feature, layer) {
                        let featureNotes = feature.properties.notes ? feature.properties.notes : '';
                        layer.feature.properties.icon == 'harvested' ? layer.options.icon = greyIcon : null;
                        layer.bindPopup(
                            '</em></p><button class="nav-btn" onclick="navigate()"><i class="fa fa-location-arrow" aria-hidden="true"></i></button>' +
                            '<p><b> Type: </b>' + feature.properties.type +
                            '<br /><b> Count: </b><em>' + feature.properties.count + '</em>' +
                            '<br /><b> Permission Required: </b><em>' + feature.properties.permission + '</em>' +
                            '<br /><b> Notes: </b><em>' + featureNotes + '</em>' +
                            '</p> <div id="hidden">' + feature.properties.cartodb_id + '</div>');
                        layer.cartodb_id=feature.properties.cartodb_id;
                    }
                }).addTo(map);
            });
        }
    };

    //find and make markers for the nearest 5 markers
    function buffer() {
        bufferDistance = $('#buffer-distance').val() / 69;
        if (bufferActive) {
            //sql query
            const sqlQueryBuffer = `select * from durango where st_intersects(the_geom, (select st_buffer((st_geomfromtext('POINT(${myLocation.lng} ${myLocation.lat})', 4326)), ${bufferDistance})));`;

            if (map.hasLayer(markerLocations)) {
                map.removeLayer(markerLocations);
            };
            if (map.hasLayer(locationMarker)) {
                map.removeLayer(locationMarker);
            };

            //get GeoJSON of five closest points
            $.getJSON(`https://${cartoDBUserName}.carto.com/api/v2/sql?format=GeoJSON&q=${sqlQueryBuffer}`, function(data) {
                markerLocations = L.geoJson(data, {
                    onEachFeature: function (feature, layer) {
                        let featureNotes = feature.properties.notes ? feature.properties.notes : '';
                        layer.feature.properties.icon == 'harvested' ? layer.options.icon = greyIcon : null;
                        layer.bindPopup(
                            '</em></p><button class="nav-btn" onclick="navigate()"><i class="fa fa-location-arrow" aria-hidden="true"></i></button>' +
                            '<p><b> Type: </b>' + feature.properties.type +
                            '<br /><b> Count: </b><em>' + feature.properties.count + '</em>' +
                            '<br /><b> Permission Required: </b><em>' + feature.properties.permission + '</em>' +
                            '<br /><b> Notes: </b><em>' + featureNotes + '</em>' +
                            '</p> <div id="hidden">' + feature.properties.cartodb_id + '</div>');
                        layer.cartodb_id=feature.properties.cartodb_id;
                    }
                }).addTo(map);
            });
        }
    };

 //function will run when location of user is found
 function locationFound(e) {
   myLocation = e.latlng;
      if (nearestActive) {
        nearestPoints();
        locationMarker = L.marker(e.latlng, {icon: redIcon});
        map.addLayer(locationMarker);
      }
      if (bufferActive) {
        buffer();
        locationMarker = L.marker(e.latlng, {icon: redIcon});
        map.addLayer(locationMarker);
      }
  };

 // Run showAll function automatically when document loads
 $( document ).ready(function() {
   showAll();
 });

 //listen for a click event on the map element
 map.on('click', locationFound);


 // Leaflet Draw
 // Initialize the FeatureGroup to store editable layers
let editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);


const drawPluginOptions = {
  position: 'topleft',
  draw: {
    polyline: false,
    //             {
    //   shapeOptions: {
    //     color: '#f357a1',
    //     weight: 10
    //   }
    // },
    polygon: false,
    //             {
    //   allowIntersection: false, // Restricts shapes to simple polygons
    //   drawError: {
    //     color: '#e1e100', // Color the shape will turn when intersects
    //     message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
    //   },
    //   shapeOptions: {
    //     color: '#bada55'
    //   }
    // },
    circle: false, // Turns off this drawing tool
    rectangle: false,
    //                 {
    //   shapeOptions: {
    //     clickable: false
    //   }
    // },
    marker: {
        icon: new greenIcon
    }
  },
  edit: {
    featureGroup: editableLayers, //REQUIRED!!
    remove: false
  }
};

// Initialize the draw control and pass it the FeatureGroup of editable layers
const drawControl = new L.Control.Draw(drawPluginOptions);

let layer = map.on('draw:created', function (e) {
  if (editableLayers._layers) {console.log('true')}
  const type = e.layerType,
  layer = e.layer;
  const form = document.querySelector('#tree-form');
  const formGeom = document.querySelector('#form-geom');

  form.style.display = 'block';
  formGeom.value = "'" + JSON.stringify(layer.toGeoJSON().geometry) + "'";

  if (type === 'marker') {
    layer.bindPopup('Information about this point will be added the next time the page is refreshed');
  }

  editableLayers.addLayer(layer);
  return layer;

});

// editable
function toggleEdit() {
  editable = !editable;
  if (editable) {
      map.addControl(drawControl);
      showAllWithEdit();
    } else {
      map.removeControl(drawControl);
      showAll();
    }
  }

  function cancelPostPoint() {
    // hides the form
    const form = document.querySelector('#tree-form');
    form.style.display = 'none';
    // removes the green icon
    if (Object.keys(editableLayers._layers).length > 0) {map.removeLayer(map._layers[Number(Object.keys(editableLayers._layers)[Object.keys(editableLayers._layers).length - 1])])}
  }

  function postPoint(layer) {
    persistOnCartoDB("INSERT", layer);
    // hides and resets the form
    document.querySelector('#form').reset();
    document.querySelector('#tree-form').style.display = 'none';
    // removes the green icon
    if (Object.keys(editableLayers._layers).length > 0) {map.removeLayer(map._layers[Number(Object.keys(editableLayers._layers)[Object.keys(editableLayers._layers).length - 1])])}
    // refreshes the map
    setTimeout(function(){showAllWithEdit()}, 500);
   }

    function updatePoint() {
            persistOnCartoDB("UPDATE", cartoLayer);
            setTimeout(function(){showAllWithEdit()}, 500);
    }

    function deletePoint() {
        if(confirm('Are you sure you want to delete this point? THIS CANNOT BE UNDONE')) {
            persistOnCartoDB("DELETE", cartoLayer);
            // refreshes the map
            setTimeout(function(){showAllWithEdit()}, 500);
        }
    }

    function persistOnCartoDB(action, layers) {
      callback = false;
      /*
        this function interacts with the Security Definer
        function previously defined in our CARTO account.
        Gets an action (update, insert, or delete) and a list
        of GeoJSON objects (the geometry objects only, to work
        with ST_GeomFromGeojson()) with which to change the table.
        see http://gis.stackexchange.com/questions/169219/invalid-geojson-when-inserting-data-to-a-cartodb-postgis-table-from-leaflet
        thanks to: https://gist.github.com/andrewbt/24bf9d8cf7cf241b2472c0c91a976b89
      */
      const cartodb_ids = [];
      const geojsons = [];
      const Vtype = $('#form-type').val();
      let Vcount = $('#form-count').val();
      const Vpermission = $('#form-permission').val();
      const Vnotes = $('#form-notes').val();
      const geom = document.querySelector('#form-geom').value;
      //console.log(action + " persistOnCartoDB");
      switch (action) {
        case "UPDATE":
            cartodb_ids.push(layers.cartodb_id);
            geojsons.push(`'{"type":"Point","coordinates":[-108, 39]}'`);
          console.log(geom);
          break;
        case "INSERT":
          cartodb_ids.push(-1);
          geojsons.push(geom);
          break;
        case "DELETE":
            cartodb_ids.push(layers.cartodb_id);
            geojsons.push("''");
          break;
      }
      //constructs the SQL statement
      let sql = "SELECT upsertLeafletData(ARRAY[";
      sql += cartodb_ids.join(",");
      sql += "],ARRAY[";
      sql += geojsons.join(",");
      sql += "],ARRAY['"+ Vtype + "'],ARRAY['"+ Vcount + "'],ARRAY['"+ Vpermission + "'],ARRAY['"+ Vnotes + "'],ARRAY['"+ newSymbol + "']);";
      console.log("persisting... " + sql);
      //POST the SQL up to CARTO
      $.ajax({
        type: 'POST',
        url: `https://${cartoDBUserName}.carto.com/api/v2/sql`,
        crossDomain: true,
        data: {
          "q": sql
        },
        dataType: 'json',
        success: function(responseData, textStatus, jqXHR) {
          console.log("Data saved");
          if (action == "INSERT")
            layers.cartodb_id = responseData.rows[0].cartodb_id;
        },
        error: function(responseData, textStatus, errorThrown) {
          console.log("Problem saving the data " + responseData);
        }
      });
      if (map.hasLayer(greenIcon)) {
        map.removeLayer(greenIcon);
      };  
    }

      function infoBuffer() {
        alert('Find all points within a specified buffer distance. The default is 5 miles. Enter a value in the input box to change the parameters.')
      }

      function infoNearest() {
        alert('Find the number of nearest points. The default is 3 points. Enter a value in the input box to change the parameters.')
      }

      function toggleGeoprocessing() {
        bufferActive = false;
        nearestActive = false;
      }

      function startGeospatialTool(geospatialTool) {
        if (geospatialTool === 'nearest') {
          bufferActive = false;
          nearestActive = true;
          $('#geospatial-tool-buffer').css('display', 'none');
          $('#geospatial-tool-nearest').css('display', 'inline-block');
          $('#number-of-points').val('3');
        }
        if (geospatialTool === 'buffer') {
          nearestActive = false;
          bufferActive = true;
          $('#geospatial-tool-nearest').css('display', 'none');
          $('#geospatial-tool-buffer').css('display', 'inline-block');
          $('#buffer-distance').val('5');
        }
        if (geospatialTool === 'none') {
          nearestActive = false;
          bufferActive = false;
          $('#geospatial-tool-nearest').css('display', 'none');
          $('#geospatial-tool-buffer').css('display', 'none');
        }
        console.log(geospatialTool);
      }

      // sets the map location to the users location
      function locateUser () {
        map.locate({setView: true});
      }

      // navigates to marker coordinates
      function navigate () {
        window.open(`https://www.google.com/maps/dir/Current+Location/${navigationCoords}`, '_blank');
      }

      function toggleLegend() {
        if (legendActive) {
            $('#legend').css('display', 'none');
            $('#legend-maximize').css('display', 'block');
        } else {
            $('#legend').css('display', 'block');
            $('#legend-maximize').css('display', 'none');
        }
        legendActive = !legendActive;
      }

      function toggleGeoprocessing() {
        if (geoprocessingActive) {
            $('#geospatial-tools-container').css('display', 'none');
            $('#geoprocessing-maximize').css('display', 'block');
        } else {
            $('#geospatial-tools-container').css('display', 'flex');
            $('#geoprocessing-maximize').css('display', 'none');
        }
          geoprocessingActive = !geoprocessingActive;
      }
