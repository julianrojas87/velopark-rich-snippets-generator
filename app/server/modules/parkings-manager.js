const fs = require('fs');
const util = require('util');
const N3 = require('n3');
const request = require('request');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const data = config['data'] || './data';
const dbAdapter = require('./database-adapter');
const AM = require('./account-manager');
const EM = require('./email-dispatcher');

let recentlyDeletedParkingIds = new Set();

dbAdapter.initDbAdapter().then(() => {
    initFolders();
    initCatalog();
});

let availableLang = ["en", "nl", "fr", "de"];


let returnTableData = function (parkings, callback) {
    let tableData = [];
    if (parkings != null) {
        parkings.forEach(function (parking) {
            let tdata = {};
            let parkingData = JSON.parse(fs.readFileSync(data + '/public/' + parking.filename, 'utf8'));
            tdata['@id'] = decodeURIComponent(parking.parkingID);
            tdata['name'] = parkingData['name'] || '';
            tdata['approvedstatus'] = parking.approvedstatus;
            if (parking.company && parking.company.length > 0) {
                tdata['account-company'] = parking.company[0].name;
            }
            tdata.location = {};
            tdata.location.lon = parking.location.coordinates[0];
            tdata.location.lat = parking.location.coordinates[1];
            tableData.push(tdata);
        });
    }
    callback(null, tableData);
};

exports.listAllParkings = async () => {
    return new Promise((resolve, reject) => {
        dbAdapter.findParkingsWithCompanies()
            .then(res => {
                returnTableData(res, function(error, result){
                    if(error != null){
                        reject(error);
                    } else {
                        resolve(result);
                    }
                });
            })
            .catch(error => {
                reject(error);
            });
    });

};

exports.listParkingsByEmail = async (username, skip, limit, callback) => {
    dbAdapter.findParkingsByEmail(username, skip, limit,function (error, res) {
        if (error != null) {
            console.error("Error: " + error);
            callback(error);
        } else {
            returnTableData(res, callback);
        }
    });
};

exports.listParkingsInCity = function (cityName, callback) {
    dbAdapter.findParkingsByCityName(cityName, (error, res) => {
        if (error != null) {
            console.error("Error: " + error);
            callback(error);
        } else {
            returnTableData(res, callback);
        }
    });
};

exports.toggleParkingEnabled = function (parkingid, enabled, callback) {
    dbAdapter.updateParkingApproved(parkingid, enabled, async function (error, result) {
        if (error != null) {
            callback(error);
        } else if (result != null) {
            let localId = result.value.filename.substring(0, result.value.filename.indexOf('.jsonld'));
            if (enabled) {
                try {
                    await addParkingToCatalog(localId);
                    callback(null, "Parking added to catalog");
                } catch (e) {
                    console.log(e);
                    callback('Could not add parking to catalog.');
                }
            } else {
                try {
                    await removeParkingFromCatalog(localId);
                    callback(null, "Parking removed from catalog");
                } catch (e) {
                    callback('Could not remove parking from catalog.');
                }
            }
        }
    });
};

/*
    Saves parking as a normal user that is part of a company
 */
exports.saveParkingAsCompanyUser = async (companyName, parking, approved, callback) => {
    if (!companyName) {
        callback("Cannot save parking as a company user without a company");
    } else {
        let park_obj = JSON.parse(parking);
        let localId = (park_obj['ownedBy']['companyName'] + '_' + park_obj['identifier']).replace(/\s/g, '-');
        let parkingID = encodeURIComponent(park_obj['@id']);
        let location;
        try {
            location = {
                type: "Point",
                coordinates: extractLocationFromJsonld(park_obj)
            };
        } catch (e) {
            console.error("Could not extract location from parking. " + e);
        }

        dbAdapter.saveParkingToCompany(parkingID, localId + '.jsonld', approved, location, companyName, async function (e, res) {
            if (e != null) {
                console.log("Error saving parking in database:");
                console.log(e);
                callback(e);
            } else {
                await writeFile(data + '/public/' + localId + '.jsonld', parking, 'utf8');
                if (approved) {
                    await addParkingToCatalog(localId);
                }
                callback();
                if(!recentlyDeletedParkingIds.has(parkingID)){
                    //Parking did not exist before. A company user has created a new parking. Send email to region representatives.
                    dbAdapter.findCitiesByLocation(location.coordinates[1], location.coordinates[0], null, function(error, result){
                        if(error){
                            console.log("ERROR: Cannot notify region reps of new parking.", error);
                        } else if(result){
                            dbAdapter.findCityRepsForRegions(result).then( reps => {
                                EM.dispatchNewParkingToRegionReps(reps, parkingID);
                            }).catch( error => {
                                console.error("ERROR: Cannot send new parking notification to region reps.", error);
                            });
                        } else {
                            console.error("No regions for new parking location found.");
                        }
                    });
                }
            }
        });
    }
};

/*
    Saves parking as a city rep. Company can be null: parking can be managed by the city reps for the parking location.
 */
exports.saveParkingAsCityRep = async (parking, userCities, approved, company, callback) => {
    let park_obj = JSON.parse(parking);
    let localId = (park_obj['ownedBy']['companyName'] + '_' + park_obj['identifier']).replace(/\s/g, '-');
    let parkingID = encodeURIComponent(park_obj['@id']);
    let location;
    try {
        location = {
            type: "Point",
            coordinates: extractLocationFromJsonld(park_obj)
        };
    } catch (e) {
        console.error("Could not extract location from parking." + e);
    }

    getCitiesOfParking(park_obj, function (error, res) {
        if (error != null) {
            callback(error);
        } else {
            let isCityRep = false;
            for (parkingcity in res) {
                for (usercity in userCities) {
                    if (userCities[usercity].enabled && userCities[usercity].name === res[parkingcity]) {
                        isCityRep = true;
                        break;
                    }
                }
            }
            if (isCityRep) {
                dbAdapter.updateParkingAsCityRep(parkingID, localId + '.jsonld', location, approved, async function (e, result) {
                    if (e != null) {
                        console.log("Error saving parking in database:");
                        console.log(e);
                        callback(e);
                    } else {
                        if (company) {
                            await promisifyUpdateCompanyParkingIDs(company, parkingID);
                        }
                        await writeFile(data + '/public/' + localId + '.jsonld', parking, 'utf8');
                        if (approved) {
                            await addParkingToCatalog(localId);
                        }
                        callback(null, result);
                    }
                });
            } else {
                callback("You are not city rep for this parking.");
            }
        }
    });
};

function promisifyUpdateCompanyParkingIDs(company, parkingId) {
    return new Promise((resolve, reject) => {
        dbAdapter.updateCompanyParkingIDs(company, parkingId, () => {
            resolve();
        });
    });
}

/*
    Saves parking as a city rep. Company can be null: parking can be managed by the city reps for the parking location.
 */
exports.saveParkingAsSuperAdmin = async (companyName, parking, approved, callback) => {
    let park_obj = JSON.parse(parking);
    let localId = (park_obj['ownedBy']['companyName'] + '_' + park_obj['identifier']).replace(/\s/g, '-');
    let parkingID = encodeURIComponent(park_obj['@id']);
    let location;
    try {
        location = {
            type: "Point",
            coordinates: extractLocationFromJsonld(park_obj)
        };
    } catch (e) {
        console.error("Could not extract location from parking." + e);
    }

    if (companyName) {
        dbAdapter.saveParkingToCompany(parkingID, localId + '.jsonld', approved, location, companyName, async function (e, res) {
            if (e != null) {
                console.log("Error saving parking in database:");
                console.log(e);
                callback(e);
            } else {
                await writeFile(data + '/public/' + localId + '.jsonld', parking, 'utf8');
                if (approved) {
                    await addParkingToCatalog(localId);
                }
                callback(null, res);
            }
        });
    } else {
        dbAdapter.saveParkingAsAdmin(parkingID, localId + '.jsonld', approved, location, async function (e, res) {
            if (e != null) {
                console.log("Error saving parking in database:");
                console.log(e);
                callback(e);
            } else {
                await writeFile(data + '/public/' + localId + '.jsonld', parking, 'utf8');
                if (approved) {
                    await addParkingToCatalog(localId);
                }
                callback(null, res);
            }
        });
    }
};


let getCitiesOfParking = function (parking, callback) {
    lnglat = extractLocationFromJsonld(parking);
    dbAdapter.findCitiesByLocation(lnglat[1], lnglat[0], null, callback);
};

let extractLocationFromJsonld = function (jsonld) {
    let geo = jsonld['@graph'][0]["geo"];
    let lonlat = [];
    for (let i = 0; i < geo.length; i++) {
        if (geo[i]["@type"] === "GeoCoordinates") {
            lonlat[0] = geo[i]["longitude"];
            lonlat[1] = geo[i]["latitude"];
        }
    }
    return lonlat;
};

exports.getParking = async (user, parkingId, callback) => {
    dbAdapter.findParkingByEmailAndParkingId(user, parkingId, function (error, res) {
        if (error != null) {
            callback(error);
        } else {
            if (res.length === 1) {
                //parking belongs to user, load data from disk
                let result = fs.readFileSync(data + '/public/' + res[0].filename);
                callback(null, result, res[0].approvedstatus);
            } else {
                //Maybe you are admin?
                AM.isUserSuperAdmin(user, async function (error, value) {
                    if (error != null) {
                        callback(error);
                    } else {
                        if (value === true) {
                            //user is admin, load data from disk
                            let p = await dbAdapter.findParkingByID(parkingId);
                            let result = fs.readFileSync(data + '/public/' + p.filename);
                            dbAdapter.findCompanyByParkingId(parkingId, function (error, account, company) {
                                callback(null, result, p.approvedstatus, company);
                            });
                        } else {
                            //Maybe user is city-rep for this parking
                            AM.isAccountCityRepForParkingID(user, parkingId, async function (error, value) {
                                if (value === true) {
                                    //user is city-rep, load data from disk
                                    let p = await dbAdapter.findParkingByID(parkingId);
                                    let result = fs.readFileSync(data + '/public/' + p.filename);
                                    dbAdapter.findCompanyByParkingId(parkingId, function (error, account, company) {
                                        callback(null, result, p.approvedstatus, company);
                                    });
                                } else {
                                    callback("This parking does not belong to you.");
                                }
                            });
                        }
                    }
                });
            }
        }
    });
};

exports.deleteParking = async (user, parkingId, callback) => {
    let parking = await dbAdapter.findParkingByID(parkingId);
    if (parking) {
        if (fs.existsSync(data + '/public/' + parking.filename)) {
            let localId = parking.filename.substring(0, parking.filename.indexOf('.jsonld'));
            dbAdapter.deleteParkingByIdAndEmail(parkingId, user, async function (error, res) {
                if (error != null) {
                    callback(error);
                } else {
                    if (res === true) {
                        console.log("delete successful " + res);
                        await removeParkingFromCatalog(localId);
                        fs.unlinkSync(data + '/public/' + parking.filename);
                        callback();
                    } else {
                        //no error, but nothing found to delete. Are you admin?
                        AM.isUserSuperAdmin(user, function (error, res) {
                            if (error != null) {
                                calback(error);
                            } else {
                                if (res === true) {
                                    dbAdapter.deleteParkingById(parkingId, async function (error, res) {
                                        if (error != null) {
                                            callback(error);
                                        } else {
                                            if (res === true) {
                                                console.log("delete successfull " + res);
                                                await removeParkingFromCatalog(localId);
                                                fs.unlinkSync(data + '/public/' + parking.filename);
                                                callback();
                                            } else {
                                                callback("No parking found to be deleted.");
                                            }
                                        }
                                    });
                                } else {
                                    // Is the user a city-rep for this parking?
                                    AM.isAccountCityRepForParkingID(user, parkingId, (err, value) => {
                                        if (value === true) {
                                            dbAdapter.deleteParkingById(parkingId, async function (error, res) {
                                                if (error != null) {
                                                    callback(error);
                                                } else {
                                                    if (res === true) {
                                                        console.log("delete successfull " + res);
                                                        await removeParkingFromCatalog(localId);
                                                        fs.unlinkSync(data + '/public/' + parking.filename);
                                                        callback();
                                                    } else {
                                                        callback("No parking found to be deleted.");
                                                    }
                                                }
                                            });
                                        } else {
                                            callback("Unauthorized to delete this parking");
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            });
            recentlyDeletedParkingIds.add(parkingId);
            setTimeout(function(){recentlyDeletedParkingIds.delete(parkingId)}, 5000);
        } else {
            callback('Parking file does not exist in disk')
        }
    } else {
        callback('Parking does not exist in DB');
    }
};

exports.downloadParking = async (user, parkingId, res) => {
    let parking = await dbAdapter.findParkingByID(parkingId);
    if (parking) {
        if (fs.existsSync(data + '/public/' + parking.filename)) {
            res.download(data + '/public/' + parking.filename);
            return;
        }
    }
    res.status(404).send();
};

exports.getListOfTerms = async () => {
    let terms = [];
    let quads = await getTermsRDF();
    let filtered = quads.filter(quad => quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label'
        && quad.subject.value != 'https://velopark.ilabt.imec.be/openvelopark/terms#');

    for (let q in filtered) {
        terms.push({
            '@id': filtered[q].subject.value,
            'label': filtered[q].object.value
        });
    }
    return terms;

};

exports.getParkingTypes = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'http://schema.mobivoc.org/BicycleParkingStation');

    for (let p in filtered) {
        let tq_label = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        let tq_comment = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#comment');
        let obj = {
            '@id' : filtered[p].subject.value,
            'label' : {},
            'comment' : {}
        };
        for(i in availableLang){
            obj['label'][availableLang[i]] = tq_label[i].object.value;
            obj['comment'][availableLang[i]] = tq_comment[i].object.value;
        }
        types.push(obj);
    }

    return types;
};

exports.getBikeTypes = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#Bicycle');

    for (let p in filtered) {
        let tq_label = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        let tq_comment = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#comment');
        let obj = {
            '@id' : filtered[p].subject.value,
            'label' : {},
            'comment' : {}
        };
        for(i in availableLang){
            obj['label'][availableLang[i]] = tq_label[i].object.value;
            obj['comment'][availableLang[i]] = tq_comment[i].object.value;
        }
        types.push(obj);
    }

    return types;
};



exports.getFeatures = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#BikeParkingFeature');

    for (let p in filtered) {
        let tq_label = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        let tq_comment = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#comment');
        let obj = {
            '@id' : filtered[p].subject.value,
            'label' : {},
            'comment' : {}
        };
        for(i in availableLang){
            obj['label'][availableLang[i]] = tq_label[i].object.value;
            obj['comment'][availableLang[i]] = tq_comment[i].object.value;
        }
        types.push(obj);
    }

    return types;
};

exports.getSecurityFeatures = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#SecurityFeature');

    for (let p in filtered) {
        let tq_label = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        let tq_comment = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#comment');
        let obj = {
            '@id' : filtered[p].subject.value,
            'label' : {},
            'comment' : {}
        };
        for(i in availableLang){
            obj['label'][availableLang[i]] = tq_label[i].object.value;
            obj['comment'][availableLang[i]] = tq_comment[i].object.value;
        }
        types.push(obj);
    }

    return types;
};

async function getTermsRDF() {
    return new Promise((resolve, reject) => {
        try {
            const vocabURI = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))['vocabulary'] || 'http://velopark.ilabt.imec.be';
            request(vocabURI + '/openvelopark/terms', (err, res, body) => {
                try {
                    if (err) {
                        reject();
                    } else {
                        const parser = new N3.Parser();
                        resolve(parser.parse(body));
                    }
                } catch (e) {
                    console.error("Could not load terms.");
                    console.error(e);
                    resolve([]);
                }
            });
        } catch (e) {
            console.error("Could not load terms.");
            console.error(e);
            resolve([]);
        }
    });
}

async function addParkingToCatalog(id) {
    let parking = JSON.parse(await readFile(data + '/public/' + id + '.jsonld', 'utf8'));
    let localId = (parking['ownedBy']['companyName'] + '_' + parking['identifier']).replace(/\s/g, '-');
    let catalog = JSON.parse(await readFile(data + '/public/catalog.jsonld', 'utf8'));
    let dists = catalog['dcat:dataset']['dcat:distribution'];
    let found = false;
    let modificationDate = new Date().toISOString();

    for (let i in dists) {
        if (dists[i]['@id'] === 'https://velopark.ilabt.imec.be/data/' + localId || dists[i]['@id'] === parking['@id']) {
            found = true;
            dists[i]['dct:modified'] = modificationDate;
            break;
        }
    }

    if (!found) {
        dists.push({
            "@id": parking['@id'],
            "@type": "dcat:Distribution",
            "dcat:accessURL": getParkingAccessURLs(parking, localId),
            "dct:license": "http://creativecommons.org/publicdomain/zero/1.0/",
            "dcat:mediaType": "application/ld+json",
            "dct:issued": modificationDate,
            "dct:modified": modificationDate
        });
    }

    catalog['dct:modified'] = modificationDate;

    await writeFile(data + '/public/catalog.jsonld', JSON.stringify(catalog), 'utf8');
}

async function removeParkingFromCatalog(id) {
    let parking = JSON.parse(await readFile(data + '/public/' + id + '.jsonld', 'utf8'));
    let localId = (parking['ownedBy']['companyName'] + '_' + parking['identifier']).replace(/\s/g, '-');
    let catalog = JSON.parse(await readFile(data + '/public/catalog.jsonld', 'utf8'));
    let dists = catalog['dcat:dataset']['dcat:distribution'];
    let index = null;

    for (let i in dists) {
        if (dists[i]['@id'] === 'https://velopark.ilabt.imec.be/data/' + localId || dists[i]['@id'] === parking['@id']) {
            index = i;
            break;
        }
    }

    if (index != null) {
        dists.splice(index, 1);
        catalog['dct:modified'] = new Date().toISOString();
        await writeFile(data + '/public/catalog.jsonld', JSON.stringify(catalog), 'utf8');
    }
}

function initFolders() {
    if (!fs.existsSync(data)) {
        fs.mkdirSync(data);
    }

    if (!fs.existsSync(data + '/public')) {
        fs.mkdirSync(data + '/public');
    }
}

async function initCatalog() {
    let parkings = new Map();
    let modificationDate = new Date().toISOString();

    await Promise.all((await readdir(data + '/public')).map(async p => {
        if (p.indexOf('catalog.jsonld') < 0) {
            let d = JSON.parse(await readFile(data + '/public/' + p));
            let localId = (d['ownedBy']['companyName'] + '_' + d['identifier']).replace(/\s/g, '-');
            if ((await dbAdapter.findParkingByID(encodeURIComponent(d['@id']))).approvedstatus) {
                parkings.set(d['@id'], localId);
            }
        }
    }));

    if (fs.existsSync(data + '/public/catalog.jsonld')) {
        let catalog = JSON.parse(await readFile(data + '/public/catalog.jsonld'));
        let dists = catalog['dcat:dataset']['dcat:distribution'];

        for (let p of parkings) {
            let found = false;
            for (let j in dists) {
                if (dists[j]['@id'] === p[0]) {
                    found = true;
                    break;
                }
            }

            if (!found) {
                dists.push({
                    "@id": p[0],
                    "@type": "dcat:Distribution",
                    "dcat:accessURL": getAccessURLs(p),
                    "dct:license": "http://creativecommons.org/publicdomain/zero/1.0/",
                    "dcat:mediaType": "application/ld+json",
                    "dct:issued": getLastModified(p[1]),
                    "dct:modified": getLastModified(p[1])
                });

                catalog['dct:modified'] = modificationDate;
            }
        }

        await writeFile(data + '/public/catalog.jsonld', JSON.stringify(catalog), 'utf8');
    } else {
        let catalog_skeleton = {
            "@context": {
                "xsd": "http://www.w3.org/2001/XMLSchema#",
                "dcat": "http://www.w3.org/ns/dcat#",
                "dct": "http://purl.org/dc/terms/",
                "foaf": "http://xmlns.com/foaf/0.1/",
                "owl": "http://www.w3.org/2002/07/owl#",
                "schema": "http://schema.org/",
                "dct:modified": {
                    "@type": "xsd:dateTime"
                },
                "dct:issued": {
                    "@type": "xsd:dateTime"
                },
                "dct:spatial": {
                    "@type": "@id"
                },
                "dct:license": {
                    "@type": "@id"
                },
                "dct:conformsTo": {
                    "@type": "@id"
                },
                "dcat:mediaType": {
                    "@type": "xsd:string"
                }
            },
            "@id": "http://velopark.ilabt.imec.be/data/catalog",
            "@type": "dcat:Catalog",
            "dct:title": "Catalog of Bicycle Parking Facilities in Belgium",
            "dct:description": "List of Linked Open Data documents describing bicycle parking facilities in Belgium",
            "dct:issued": modificationDate,
            "dct:modified": modificationDate,
            "dct:license": "http://creativecommons.org/publicdomain/zero/1.0/",
            "dct:rights": "public",
            "dct:publisher": {
                "@id": "https://velopark.be",
                "@type": "foaf:Organization",
                "foaf:name": "Velopark Team"
            },
            "dcat:dataset": {
                "@type": "dcat:Dataset",
                "dct:description": "List of bicycle parking facilities in Belgium",
                "dct:title": "Velopark Dataset",
                "dct:spatial": "http://sws.geonames.org/2802361",
                "dcat:keyword": [
                    "Bicycle",
                    "Parking",
                    "Mobility"
                ],
                "dct:conformsTo": "https://velopark.ilabt.imec.be/openvelopark/vocabulary",
                "dct:accessRights": "public",
                "dcat:distribution": []
            }
        };

        for (let p of parkings) {
            let dist = {
                "@id": p[0],
                "@type": "dcat:Distribution",
                "dcat:accessURL": getAccessURLs(p),
                "dct:license": "http://creativecommons.org/publicdomain/zero/1.0/",
                "dcat:mediaType": "application/ld+json",
                "dct:issued": getLastModified(p[1]),
                "dct:modified": getLastModified(p[1])
            };

            catalog_skeleton['dcat:dataset']['dcat:distribution'].push(dist);
        }

        await writeFile(data + '/public/catalog.jsonld', JSON.stringify(catalog_skeleton), 'utf8');
    }
}

function getParkingAccessURLs(parking, id) {
    if (parking['@id'].indexOf('velopark.ilabt.imec.be/data') >= 0) {
        return [parking['@id']];
    } else {
        let veloparkId = 'https://velopark.ilabt.imec.be/data/' + id;
        return [parking['@id'], veloparkId];
    }
}

function getAccessURLs(p) {
    if (p[0].indexOf('velopark.ilabt.imec.be/data') >= 0) {
        return p[0];
    } else {
        let localUrl = 'https://velopark.ilabt.imec.be/data/' + p[1];
        return [p[0], localUrl];
    }
}

function getLastModified(id) {
    return fs.statSync(data + '/public/' + id + '.jsonld').mtime.toISOString();
}