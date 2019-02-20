var Map = ol.Map;
var View = ol.View;
var Draw = ol.interaction.Draw;
var TileLayer = ol.layer.Tile;
var VectorLayer = ol.layer.Vector;
var OSM = ol.source.OSM;
var VectorSource = ol.source.Vector;
var CircleStyle = ol.style.Circle;
var Fill = ol.style.Fill;
var Stroke = ol.style.Stroke;
var Style = ol.style.Style;


var raster = new TileLayer({
    source: new OSM()
});

var pointSource = new VectorSource({ wrapX: false });
var pointVector = new VectorLayer({
    source: pointSource,
    style: new Style({
        image: new CircleStyle({
            radius: 5,
            fill: new Fill({
                color: '#36ff1c'
            }),
            stroke: new Stroke({
                width: 3
            })
        })
    })
});

var polygonSource = new VectorSource({ wrapX: false });
var polygonVector = new VectorLayer({
    source: polygonSource,
    style: new Style({
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new Stroke({
            color: '#2912bc',
            width: 4
        }),
    })
});

var pointMap = new Map({
    target: 'point-map',
    layers: [raster, pointVector],
    view: new ol.View({
        center: ol.proj.fromLonLat([4.30, 50.85]),
        zoom: 8
    })
});

var polygonMap = new Map({
    target: 'polygon-map',
    layers: [raster, polygonVector],
    view: new ol.View({
        center: ol.proj.fromLonLat([4.30, 50.85]),
        zoom: 8
    })
});

var point;
var polygon;

function addInteractions() {
    point = new Draw({
        source: pointSource,
        type: 'Point'
    });
    pointMap.addInteraction(point);

    polygon = new Draw({
        source: polygonSource,
        type: 'Polygon'
    });
    polygonMap.addInteraction(polygon);
}

($ => {
    addInteractions();

    pointSource.on('addfeature', event => {
        if (pointSource.getFeatures().length > 1) {
            pointSource.removeFeature(pointSource.getFeatures()[0]);
        }
        let coordinates = ol.proj.toLonLat(event.feature.getGeometry().getCoordinates());
        let lat = coordinates[1];
        let long = coordinates[0];

        $('input[name = "location.latitude"]').val(lat);
        $('input[name = "location.longitude"]').val(long);
    });

    polygonSource.on('addfeature', event => {
        if (polygonSource.getFeatures().length > 1) {
            polygonSource.removeFeature(polygonSource.getFeatures()[0]);
        }

        let coordinates = event.feature.getGeometry().getCoordinates()[0];
        let polygonString = 'POLYGON (('; 


        for(let i = 0; i < coordinates.length; i++) {
            let coord = ol.proj.toLonLat(coordinates[i]);
            let lat = coord[1];
            let long = coord[0];

            polygonString += lat + ' ' + long + ', ';
        }

        polygonString = polygonString.slice(0, -2) + '))';

        $('input[name = "location.polygon"]').val(polygonString);
    });

    $('#clear-point').click(() => {
        pointSource.clear();
        $('input[name = "location.latitude"]').val('');
        $('input[name = "location.longitude"]').val('');
    });

    $('#clear-polygon').click(() => {
        polygonSource.clear();
        $('input[name = "location.polygon"]').val('');
    });

})(jQuery);