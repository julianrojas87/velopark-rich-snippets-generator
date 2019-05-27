const request = require('request');
const dbAdapter = require('./database-adapter');

let levels = ['country', 'region', 'province', 'district', 'municipality'];

exports.loadNazka = function () {
    return new Promise((resolveAll, rejectAll) => {
        let areas = {};
        let promises = [];
        //get NIS and name of each possible area
        for (i in levels) {
            promises.push(
                new Promise((resolve, reject) => {
                    try {
                        request('http://belgium.geo.nazkamapps.com/list/level/' + levels[i], (err, res, body) => {
                            try {
                                if (err) {
                                    console.error('Error loading Nazka areas', err);
                                    resolve();
                                } else {
                                    let levelAreas = JSON.parse(body);
                                    for (j in levelAreas) {
                                        areas[levelAreas[j].NIS_CODE] = levelAreas[j];
                                    }
                                    resolve();
                                }
                            } catch (e) {
                                console.error("Error loading Nazka areas.", levels[i]);
                                console.error(e);
                                resolve();
                            }
                        });
                    } catch (e) {
                        console.error("Error loading Nazka data.");
                        console.error(e);
                        resolve();
                    }
                })
            );
        }

        Promise.all(promises).then(() => {
            promises = [];
            //get geometry of each area
            for (i in areas) {
                //console.log(i);
                requestGeo(i, 3, areas, promises);
            }
            Promise.all(promises).then(() => {
                resolveAll();
            });
        });
    });
};

function requestGeo(NIS, retries, areas, promises){
    promises.push(
        new Promise((resolve, reject) => {
            try {
                request('http://belgium.geo.nazkamapps.com/geometry/nis/' + NIS + "?simplify=1", (err, res, body) => {
                    try {
                        if (err) {
                            console.error('Error loading Nazka geometry for area.', NIS, err);
                            if(retries > 0) {
                                console.log('Trying again for NIS ', NIS);
                                requestGeo(NIS, --retries, areas, promises);
                            }
                            resolve();
                        } else {
                            let geo = JSON.parse(body);
                            let area = areas[geo.properties.NIS_CODE];
                            for (j in area) {
                                geo.properties[j] = area[j];
                                geo.properties.cityname = area.name_NL;
                            }
                            dbAdapter.insertCity(geo).then((res) => {
                                resolve();
                            }).catch((error) => {
                                console.error('Error loading Nazka geometry for area.', error);
                                resolve();
                            });
                        }
                    } catch (e) {
                        console.error('Error loading Nazka geometry for area.', e);
                        if(retries > 0) {
                            console.log('Trying again for NIS ', NIS);
                            requestGeo(NIS, --retries, areas, promises);
                        }
                        resolve();
                    }
                });
            } catch (e) {
                console.error('Error loading Nazka geometry for area.', e);
                if(retries > 0) {
                    console.log('Trying again for NIS ', NIS);
                    requestGeo(NIS, --retries, areas, promises);
                }
                resolve();
            }
        })
    );
}