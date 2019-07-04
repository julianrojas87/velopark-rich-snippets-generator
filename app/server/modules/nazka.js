const request = require('request');
const dbAdapter = require('./database-adapter');

let levels = ['country', 'region', 'province', 'district', 'municipality'];
let hierarchyObject;

exports.loadNazka = function () {
    return new Promise((resolveAll, rejectAll) => {
        let areas = {};
        let promises = [];
        let countryLevelNIS = [];
        //get NIS and name of each possible area
        for (i in levels) {
            let promise = new Promise((resolve, reject) => {
                try {
                    request('http://belgium.geo.nazkamapps.com/list/level/' + levels[i], (err, res, body) => {
                        if (res) {
                            console.log('REQ: ' + res.request.uri.href);
                        }
                        try {
                            if (err) {
                                console.error('Error loading Nazka areas', err);
                                resolve();
                            } else {
                                let levelAreas = JSON.parse(body);
                                for (j in levelAreas) {
                                    areas[levelAreas[j].NIS_CODE] = levelAreas[j];
                                }
                                resolve(levelAreas);
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
            });
            promises.push(promise);
            if(i === "0"){
                promise.then( res => {
                    for (j in res) {
                        countryLevelNIS.push(res[j].NIS_CODE);
                    }
                });
            }
        }
        dbAdapter.insertCity(geo).catch((error) => {
            console.error('Error loading Nazka geometry for area.', error);
        });
    }));
}

        Promise.all(promises).then(() => {
            newPromises = [];
            //get geometry of each area
            for (i in areas) {
                requestGeo(i, 3, areas, newPromises);
            }
            hierarchyObject = {};
            for (i in countryLevelNIS) {
                requestHierarchy(3, countryLevelNIS[i], hierarchyObject);
            }
            Promise.all(newPromises).then(() => {
                resolveAll();
            });
        });
    });
}

function requestGeo(NIS, retries, areas, promises) {
    promises.push(
        new Promise((resolve, reject) => {
            try {
                request('http://belgium.geo.nazkamapps.com/geometry/nis/' + NIS + "?simplify=1", (err, res, body) => {
                    if (res) {
                        console.log('REQ: ' + res.request.uri.href);
                    }
                    try {
                        if (err) {
                            console.error('Error loading Nazka geometry for area.', NIS, err);
                            if (retries > 0) {
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
                        if (retries > 0) {
                            console.log('Trying again for NIS ', NIS);
                            requestGeo(NIS, --retries, areas, promises);
                        }
                        resolve();
                    }
                });
            } catch (e) {
                console.error('Error loading Nazka geometry for area.', e);
                if (retries > 0) {
                    console.log('Trying again for NIS ', NIS);
                    resolve(doGeometryRequest(NIS, --retries));
                }
            } else {
                resolve(body);
            }
        })
    );
}

let numHierarchyRequestsQueued = 0;

function requestHierarchy(retries, NIS, hierarchyObj) {
    numHierarchyRequestsQueued++;
        let promise = new Promise((resolve, reject) => {
            try {
                console.log("requesting \"http://belgium.geo.nazkamapps.com/attributes/nis/" + NIS + '"');
                request('http://belgium.geo.nazkamapps.com/attributes/nis/' + NIS, (err, res, body) => {
                    try {
                        if (err) {
                            console.error('Error loading Nazka hierarchy for area ' + NIS + '.', err);
                            if (retries > 0) {
                                console.log('Trying again for NIS ', NIS);
                                requestHierarchy(--retries, NIS);
                            }
                            resolve();
                        } else {
                            extend(hierarchyObj, JSON.parse(body));
                            hierarchyObj.childAreas = {};
                            for (j in hierarchyObj.children) {
                                hierarchyObj.childAreas[hierarchyObj.children[j]] = {};
                                requestHierarchy(3, hierarchyObj.children[j], hierarchyObj.childAreas[hierarchyObj.children[j]]);
                            }
                            resolve();
                        }
                    } catch (e) {
                        console.error('Error loading Nazka attributes for area ' + NIS, e);
                        if (retries > 0) {
                            console.log('Trying again for NIS ', NIS);
                            requestHierarchy(--retries, NIS, hierarchyObj);
                        }
                        resolve();
                    }
                });
            } catch (e) {
                console.error('Error loading Nazka hierarchy for area ' + NIS + '.', e);
                if (retries > 0) {
                    console.log('Trying again for NIS ', NIS);
                    requestHierarchy(--retries, NIS);
                }
                resolve();
            }
        });
        promise.then(() => {
            numHierarchyRequestsQueued--;
            if(numHierarchyRequestsQueued === 0){
                dbAdapter.insertRegionHierarchy(hierarchyObject);
                console.log("Loading hierarchy done.");
            }
        }).catch( e => {
            console.error(e);
            numHierarchyRequestsQueued--;
            if(numHierarchyRequestsQueued === 0){
                dbAdapter.insertRegionHierarchy(hierarchyObject);
                console.log("Loading hierarchy done.");
            }
        });
}

function extend(obj, src) {
    Object.keys(src).forEach(function (key) {
        obj[key] = src[key];
    });
    return obj;
}