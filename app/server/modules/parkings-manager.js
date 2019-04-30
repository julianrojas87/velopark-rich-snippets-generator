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

initFolders();
initCatalog();


let returnTableData = function (error, parkings, callback) {
    if (error != null) {
        console.error("Error: " + error);
        callback(error);
    } else {
        let tableData = [];
        if (parkings != null) {
            parkings.forEach(function (parking) {
                let tdata = {};
                let parkingData = JSON.parse(fs.readFileSync(data + '/public/' + parking.filename, 'utf8'));
                tdata['@id'] = decodeURIComponent(parking.parkingID);
                tdata['name'] = parkingData['name'] || '';
                tdata['approvedstatus'] = parking.approvedstatus;
                if (parking.account && parking.account.length > 0) {
                    tdata['account-company'] = "U: " + parking.account[0].email;
                }
                if (parking.company && parking.company.length > 0) {
                    tdata['account-company'] = parking.company[0].name;
                }
                tableData.push(tdata);
            });
        }
        callback(null, tableData);
    }
};

exports.listAllParkings = async (callback) => {
    dbAdapter.findParkingsWithAccountsAndCompanies(function (error, res) {
        returnTableData(error, res, callback);
    });
};

exports.listParkingsByEmail = async (username, callback) => {
    dbAdapter.findParkingsByEmail(username, function (error, res) {
        returnTableData(error, res, callback);
    });
};

exports.listParkingsInCity = function (cityName, callback) {
    dbAdapter.findParkingsByCityName(cityName, callback);
};

exports.toggleParkingEnabled = function (parkingid, enabled, callback) {
    dbAdapter.updateParkingApproved(parkingid, enabled, callback);
    //TODO: add/remove from catalog. Anything else?
};

/*
    If a username is given, it will be checked whether his company membership had been approved. 
    If only a company is given, no check is performed.
*/
exports.saveParking = async (user, companyName, parking, callback) => {
    if (user == null && companyName == null) {
        callback("[parkings-manager]\tNo user or company given to save this parking.");
    } else {
        let park_obj = JSON.parse(parking);
        let parkingID = encodeURIComponent(park_obj['dataOwner']['companyName'].replace(/\s/g, '-')
            + '_' + park_obj['identifier'].replace(/\s/g, '-'));
        //await writeFile(data + '/public/' + parkingID + '.jsonld', parking, 'utf8');
        //await addParkingToCatalog(park_obj, park_obj['@id']);
        let location;
        try {
            location = {
                type: "Point",
                coordinates: extractLocationFromJsonld(park_obj)
            };
        } catch (e) {
            console.error("Could not extract location from parking." + e);
        }
        if (companyName == null) {
            dbAdapter.saveParking(parkingID, parkingID + '.jsonld', false, location, user, function (e, res) {
                if (e != null) {
                    console.log("Error saving parking in database:");
                    console.log(e);
                    callback(e);
                } else {
                    writeFile(data + '/public/' + parkingID + '.jsonld', parking, 'utf8');
                    addParkingToCatalog(park_obj, park_obj['@id']);
                    callback(null, res);
                }
            });
        } else {
            dbAdapter.saveParkingToCompany(parkingID, parkingID + '.jsonld', false, location, companyName, function (e, res) {
                if (e != null) {
                    console.log("Error saving parking in database:");
                    console.log(e);
                    callback(e);
                } else {
                    writeFile(data + '/public/' + parkingID + '.jsonld', parking, 'utf8');
                    addParkingToCatalog(park_obj, park_obj['@id']);
                    callback(null, res);
                }
            });
        }
    }
};

exports.saveParkingAsCityRep = async (companyName, parking, callback) => {
    if (companyName == null) {
        callback("[parkings-manager]\tNo company given to save this parking.");
    } else {
        let park_obj = JSON.parse(parking);
        let parkingID = encodeURIComponent(park_obj['dataOwner']['companyName'].replace(/\s/g, '-')
            + '_' + park_obj['identifier'].replace(/\s/g, '-'));
        //await writeFile(data + '/public/' + parkingID + '.jsonld', parking, 'utf8');
        //await addParkingToCatalog(park_obj, park_obj['@id']);
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
                dbAdapter.updateParkingAsCityRep(companyName, parkingID, parkingID + '.jsonld', location, res, function (e, result) {
                    if (e != null) {
                        console.log("Error saving parking in database:");
                        console.log(e);
                        callback(e);
                    } else {
                        writeFile(data + '/public/' + parkingID + '.jsonld', parking, 'utf8');
                        addParkingToCatalog(park_obj, park_obj['@id']);
                        callback(null, result);
                    }
                });
            }
        });

    }
};

let getCitiesOfParking = function(parking, callback) {
    lnglat = extractLocationFromJsonld(parking);
    dbAdapter.findCitiesByLocation(lnglat[1], lnglat[0], callback);
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
                let result = fs.readFileSync(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld');
                callback(null, result);
            } else {
                //Maybe you are admin?
                AM.isUserSuperAdmin(user, function (error, value) {
                    if (error != null) {
                        callback(error);
                    } else {
                        if (value === true) {
                            //user is admin, load data from disk
                            let result = fs.readFileSync(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld');
                            dbAdapter.findCompanyByParkingId(parkingId, function (error, account, company) {
                                if (account) {
                                    callback(null, result, account.email);
                                } else {
                                    callback(null, result, null, company.name);
                                }
                            });
                        } else {
                            //Maybe user is city-rep for this parking
                            AM.isAccountCityRepForParkingID(user, parkingId, function (error, value) {
                                if (value === true) {
                                    //user is city-rep, load data from disk
                                    let result = fs.readFileSync(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld');
                                    dbAdapter.findCompanyByParkingId(parkingId, function (error, account, company) {
                                        if (account) {
                                            callback(null, result, account.email);
                                        } else {
                                            callback(null, result, null, company ? company.name : null);
                                        }
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
    if (fs.existsSync(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld')) {
        dbAdapter.deleteParkingByIdAndEmail(parkingId, user, function (error, res) {
            if (error != null) {
                callback(error);
            } else {
                if (res === true) {
                    console.log("delete successfull " + res);
                    fs.unlinkSync(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld');
                    removeParkingFromCatalog(parkingId);
                    callback();
                } else {
                    //no error, but nothing found to delete. Are you admin?
                    AM.isUserSuperAdmin(user, function (error, res) {
                        if (error != null) {
                            calback(error);
                        } else {
                            if (res === true) {
                                dbAdapter.deleteParkingById(parkingId, function (error, res) {
                                    if (error != null) {
                                        callback(error);
                                    } else {
                                        if (res === true) {
                                            console.log("delete successfull " + res);
                                            fs.unlinkSync(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld');
                                            removeParkingFromCatalog(parkingId);
                                            callback();
                                        } else {
                                            callback("No parking found to be deleted.");
                                        }
                                    }
                                });
                            } else {
                                callback("No parking found to be deleted.");
                            }
                        }
                    });
                }
            }
        });
    }
};

exports.downloadParking = (user, parkingId, res) => {
    res.download(data + '/public/' + encodeURIComponent(parkingId) + '.jsonld');
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
        let tq = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        types.push({
            '@id': filtered[p].subject.value,
            'label': tq[0].object.value
        });
    }

    return types;
};

exports.getBikeTypes = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#Bicycle');

    for (let p in filtered) {
        let tq = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        types.push({
            '@id': filtered[p].subject.value,
            'label': tq[0].object.value
        });
    }

    return types;
};

exports.getFeatures = async () => {
    let types = [];
    let quads = await getTermsRDF();

    let filtered = quads.filter(quad => quad.object.value == 'https://velopark.ilabt.imec.be/openvelopark/vocabulary#BikeParkingFeature');

    for (let p in filtered) {
        let tq = quads.filter(quad => quad.subject.value == filtered[p].subject.value && quad.predicate.value == 'http://www.w3.org/2000/01/rdf-schema#label');
        types.push({
            '@id': filtered[p].subject.value,
            'label': tq[0].object.value
        });
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

async function addParkingToCatalog(parking, id) {
    let catalog = JSON.parse(await readFile(data + '/public/catalog.jsonld', 'utf8'));
    let dists = catalog['dcat:dataset']['dcat:distribution'];
    let found = false;

    for (let i in dists) {
        if (dists[i]['@id'] === id) {
            found = true;
            dists[i]['dct:modified'] = new Date().toISOString();
            break;
        }
    }

    if (!found) {
        dists.push({
            "@id": id,
            "@type": "dcat:Distribution",
            "dcat:accessURL": await getAccessURLsByUser(parking, id),
            "dct:license": "http://creativecommons.org/publicdomain/zero/1.0/",
            "dcat:mediaType": "application/ld+json",
            "dct:issued": new Date().toISOString(),
            "dct:modified": new Date().toISOString()
        });
    }

    await writeFile(data + '/public/catalog.jsonld', JSON.stringify(catalog), 'utf8');
}

async function removeParkingFromCatalog(id) {
    let catalog = JSON.parse(await readFile(data + '/public/catalog.jsonld', 'utf8'));
    let dists = catalog['dcat:dataset']['dcat:distribution'];
    let index = null;

    for (let i in dists) {
        if (dists[i]['@id'] === id) {
            index = i;
            break;
        }
    }

    if (index != null) {
        dists.splice(index, 1);
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

    await Promise.all((await readdir(data + '/public')).map(async p => {
        if (p.indexOf('catalog.jsonld') < 0) {
            let d = JSON.parse(await readFile(data + '/public/' + p));
            let localId = encodeURIComponent(d['dataOwner']['companyName'].replace(/\s/g, '-') + '_' + d['identifier'].replace(/\s/g, '-'));
            parkings.set(d['@id'], localId);
        }
    }));

    if (fs.existsSync(data + '/public/catalog.jsonld')) {
        let catalog = JSON.parse(await readFile(data + '/public/catalog.jsonld'));
        let dists = catalog['dcat:dataset']['dcat:distribution'];

        catalog['dct:modified'] = new Date().toISOString();

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
            "dct:issued": new Date().toISOString(),
            "dct:modified": new Date().toISOString(),
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

async function getAccessURLsByUser(park, id) {
    if (id.indexOf('velopark.ilabt.imec.be/data') >= 0) {
        return id;
    } else {
        //let park = JSON.parse(await readFile(data + '/' + user + '/' + encodeURIComponent(id) + '.jsonld'));    //TODO: use database
        let veloparkId = 'https://velopark.ilabt.imec.be/data/' + encodeURIComponent(park['dataOwner']['companyName'].replace(/\s/g, '-'))
            + '_' + encodeURIComponent(park['identifier'].replace(/\s/g, '-'));
        return [id, veloparkId];
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