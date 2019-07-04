const request = require('request');
const dbAdapter = require('./database-adapter');

let levels = ['country', 'region', 'province', 'district', 'municipality'];

exports.loadNazka = async function () {
    let areas = {};

    //get NIS and name of each possible area
    await Promise.all(levels.map(async level => {
        let levelAreas = JSON.parse(await doLevelRequest(level));
        for (j in levelAreas) {
            areas[levelAreas[j].NIS_CODE] = levelAreas[j];
        }
    }));

    //get geometry of each area
    await requestGeo(areas);
};

async function requestGeo(areas) {
    await Promise.all(Object.keys(areas).map(async NIS => {
        let geo = JSON.parse(await doGeometryRequest(NIS, 3));
        let area = areas[geo.properties.NIS_CODE];
        for (j in area) {
            geo.properties[j] = area[j];
            geo.properties.cityname = area.name_NL;
        }
        dbAdapter.insertCity(geo).catch((error) => {
            console.error('Error loading Nazka geometry for area.', error);
        });
    }));
}

function doLevelRequest(level) {
    return new Promise((resolve, reject) => {
        request('http://belgium.geo.nazkamapps.com/list/level/' + level, (err, res, body) => {
            if (res) {
                console.log('REQ: ' + res.request.uri.href);
            }
            if (err) {
                console.error('Error loading Nazka areas', err);
                reject();
            } else {
                resolve(body);
            }
        });
    });
}

function doGeometryRequest(NIS, retries) {
    return new Promise((resolve, reject) => {
        request('http://belgium.geo.nazkamapps.com/geometry/nis/' + NIS + "?simplify=1", async (err, res, body) => {
            if (res) {
                console.log('REQ: ' + res.request.uri.href);
            }
            if (err) {
                console.error('Error loading Nazka geometry for area.', NIS, err);
                if (retries > 0) {
                    console.log('Trying again for NIS ', NIS);
                    resolve(doGeometryRequest(NIS, --retries));
                }
            } else {
                resolve(body);
            }
        });
    });
}