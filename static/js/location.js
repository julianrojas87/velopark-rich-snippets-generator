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
var Point = ol.geom.Point;
var Polygon = ol.geom.Polygon;


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

    $('#' + target).data('openlayers-map', pointMap);

    var point = new Draw({
        source: pointSource,
        type: 'Point'
    });
    pointMap.addInteraction(point);

    if((user && (user.cityrep || user.cityrep === "true")) && target === 'point-map'){
        let domain = domainName !== '' ? '/' + domainName : '';
        pointSource.on('addfeature', event => {
            $('.city-rep-location-loading-icon').css('visibility', 'visible');
            if (pointSource.getFeatures().length > 1) {
                pointSource.removeFeature(pointSource.getFeatures()[0]);
            }
            let coordinates = ol.proj.toLonLat(event.feature.getGeometry().getCoordinates());
            let lat = coordinates[1];
            let long = coordinates[0];
            $.ajax({
                type: "POST",
                url: domain + '/cityrep/check-location/' + lat + '/' + long,
                success: data => {
                    if(data){
                        $('.city-rep-location-loading-icon').css('visibility', 'hidden');
                        let latInput = $('#' + latid);
                        let lonInput = $('#' + lonid);

                        latInput.val(lat);
                        lonInput.val(long);

                        if (latInput.parent().hasClass('validate-input')) {
                            fullValidation(latInput);
                        }

                        if (lonInput.parent().hasClass('validate-input')) {
                            fullValidation(lonInput);
                        }
                    } else {
                        $('.city-rep-location-loading-icon').css('visibility', 'hidden');

                        //clear
                        pointSource.clear();
                        $('#' + latid).val('');
                        hideValidate($('#' + latid));
                        $('#' + lonid).val('');
                        hideValidate($('#' + lonid));

                        setTimeout(function(){  //To give UI time to update
                            alert("You are not allowed to create a parking in this area.");
                        }, 10);

                    }
                },
                error: e => {
                    $('.city-rep-location-loading-icon').css('visibility', 'hidden');
                }
            });
        });
    } else {
        pointSource.on('addfeature', event => {
            console.log(event);
            if (pointSource.getFeatures().length > 1) {
                pointSource.removeFeature(pointSource.getFeatures()[0]);
            }
            let coordinates = ol.proj.toLonLat(event.feature.getGeometry().getCoordinates());
            let lat = coordinates[1];
            let long = coordinates[0];
            let latInput = $('#' + latid);
            let lonInput = $('#' + lonid);

            latInput.val(lat);
            lonInput.val(long);

            if (latInput.parent().hasClass('validate-input')) {
                fullValidation(latInput);
            }

            if (lonInput.parent().hasClass('validate-input')) {
                fullValidation(lonInput);
            }
        });
    }

    $('#' + latid).on('change', function () {
        let lat = $(this).val();
        let lon = $('#' + lonid).val();

        if (lon != '') {
            if (pointSource.getFeatures().length == 0) {
                let coordinates = ol.proj.fromLonLat([parseFloat(lon), parseFloat(lat)]);
                let point = new Point(coordinates);
                let featurePoint = new ol.Feature({
                    geometry: point,
                });
                pointSource.addFeature(featurePoint);
                pointMap.getView().setCenter(coordinates);
                pointMap.getView().setZoom(14);
            }
        }
    });

    $('#' + lonid).on('change', function () {
        let lon = $(this).val();
        let lat = $('#' + latid).val();

        if (lat != '') {
            if (pointSource.getFeatures().length == 0) {
                let coordinates = ol.proj.fromLonLat([parseFloat(lon), parseFloat(lat)]);
                let point = new Point(coordinates);
                let featurePoint = new ol.Feature({
                    geometry: point,
                });
                pointSource.addFeature(featurePoint);
                pointMap.getView().setCenter(coordinates);
                pointMap.getView().setZoom(14);
            }
        }
    });

    $('#' + clear).click(() => {
        pointSource.clear();
        $('#' + latid).val('');
        hideValidate($('#' + latid));
        $('#' + lonid).val('');
        hideValidate($('#' + lonid));
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

    $('#' + target).data('openlayers-map', polygonMap);

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

            polygonString += long + ' ' + lat + ', ';
        }

        polygonString = polygonString.slice(0, -2) + '))';

        $('#' + polyid).val(polygonString);
    });

    $('#' + polyid).off('change');

    $('#' + polyid).change(function () {
        let polygonArr = $(this).val().substring(10, $(this).val().length - 3).split(',');
        polygonArr = polygonArr.map(cs => {
            let stArr = cs.trim().split(' ');
            return ol.proj.fromLonLat([parseFloat(stArr[0]), parseFloat(stArr[1])]);
        });

        let polygon = new Polygon([polygonArr]);
        let featurePolygon = new ol.Feature({
            geometry: polygon,
        });
        polygonSource.addFeature(featurePolygon);
        polygonMap.getView().fit(polygon);
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