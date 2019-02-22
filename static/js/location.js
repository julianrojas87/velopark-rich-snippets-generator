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

function initPointMap(target, latid, lonid, clear) {
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

    var pointMap = new Map({
        target: target,
        layers: [raster, pointVector],
        view: new ol.View({
            center: ol.proj.fromLonLat([4.30, 50.85]),
            zoom: 8
        })
    });

    var point = new Draw({
        source: pointSource,
        type: 'Point'
    });
    pointMap.addInteraction(point);

    pointSource.on('addfeature', event => {
        if (pointSource.getFeatures().length > 1) {
            pointSource.removeFeature(pointSource.getFeatures()[0]);
        }
        let coordinates = ol.proj.toLonLat(event.feature.getGeometry().getCoordinates());
        let lat = coordinates[1];
        let long = coordinates[0];

        $('#' + latid).val(lat);
        $('#' + lonid).val(long);
    });

    $('#' + clear).click(() => {
        pointSource.clear();
        $('#' + latid).val('');
        $('#' + lonid).val('');
    });
}


function initPolygonMap(target, polyid, clear) {
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

    var polygonMap = new Map({
        target: target,
        layers: [raster, polygonVector],
        view: new ol.View({
            center: ol.proj.fromLonLat([4.30, 50.85]),
            zoom: 8
        })
    });

    var polygon = new Draw({
        source: polygonSource,
        type: 'Polygon'
    });
    polygonMap.addInteraction(polygon);

    polygonSource.on('addfeature', event => {
        if (polygonSource.getFeatures().length > 1) {
            polygonSource.removeFeature(polygonSource.getFeatures()[0]);
        }

        let coordinates = event.feature.getGeometry().getCoordinates()[0];
        let polygonString = 'POLYGON ((';


        for (let i = 0; i < coordinates.length; i++) {
            let coord = ol.proj.toLonLat(coordinates[i]);
            let lat = coord[1];
            let long = coord[0];

            polygonString += lat + ' ' + long + ', ';
        }

        polygonString = polygonString.slice(0, -2) + '))';

        $('#' + polyid).val(polygonString);
    });

    $('#' + clear).click(() => {
        polygonSource.clear();
        $('#' + polyid).val('');
    });
}

($ => {
    initPointMap('point-map', 'point_lat', 'point_lon', 'clear-point');
    initPointMap('entrance-point-map', 'entrance_lat', 'entrance_lon', 'clear-entrance-point');
    initPointMap('exit-point-map', 'exit_lat', 'exit_lon', 'clear-exit-point');

    initPolygonMap('polygon-map', 'poly_string', 'clear-polygon')

})(jQuery);