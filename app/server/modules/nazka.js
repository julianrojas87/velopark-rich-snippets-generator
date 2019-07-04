const request = require('request');
const dbAdapter = require('./database-adapter');

let levels = ['country', 'region', 'province', 'district', 'municipality'];

exports.loadNazka = async function () {
    let areas = {};
    let hierarchy = {};

    //get NIS and name of each possible area
    await Promise.all(levels.map(async level => {
        let levelAreas = JSON.parse(await doLevelRequest(level));
        for (j in levelAreas) {
            areas[levelAreas[j].NIS_CODE] = levelAreas[j];
        }
    }));

    // Get geometry of each area and build the geographic hierarchy 
    await requestGeo(areas);
    await buildGeoHierarchy(1000, hierarchy, 3);
    dbAdapter.insertRegionHierarchy(hierarchy);
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

function buildGeoHierarchy(NIS, hierarchy, retries) {
    return new Promise((resolve, reject) => {
        request('http://belgium.geo.nazkamapps.com/attributes/nis/' + NIS, async (err, res, body) => {
            if (res) {
                console.log('REQ: ' + res.request.uri.href);
            }
            if (err) {
                console.error('Error loading Nazka hierarchy for area ' + NIS + '.', err);
                if (retries > 0) {
                    console.log('Trying again for NIS ', NIS);
                    resolve(buildGeoHierarchy(NIS, hierarchy, --retries));
                }
            } else {
                hierarchy = expand(hierarchy, JSON.parse(body));
                hierarchy['childAreas'] = {};
                if (hierarchy['children']) {
                    await Promise.all(hierarchy['children'].map(async child => {
                        hierarchy['childAreas'][child] = {};
                        await buildGeoHierarchy(child, hierarchy['childAreas'][child], 3);
                    }));
                }
                resolve();
            }
        });
    });
}

function expand(obj, src) {
    let keys = Object.keys(src);
    for (let i in keys) {
        obj[keys[i]] = src[keys[i]];
    }
    return obj;
}