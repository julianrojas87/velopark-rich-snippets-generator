const MongoClient = require('mongodb').MongoClient;
const dookie = require('dookie');
const fs = require('fs');
const utils = require('../utils/utils');
const nazka = require('./nazka');

const USE_NAZKA = true;
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

var db, accounts, parkings, companies, cities;

exports.initDbAdapter = function () {
    return new Promise((resolve, reject) => {
        MongoClient.connect(process.env.DB_URL, {useNewUrlParser: true}, function (e, client) {
            if (e) {
                console.error(e);
            } else {
                db = client.db(process.env.DB_NAME);
                accounts = db.collection('accounts');
                parkings = db.collection('parkings');
                companies = db.collection('companies');
                cities = db.collection('geocities');

                accounts.createIndex({location: "2dsphere"});
                cities.createIndex({geometry: "2dsphere"});
                // index fields 'user' & 'email' for faster new account validation //
                accounts.createIndex({user: 1, email: 1});
                console.log('mongo :: connected to database :: "' + process.env.DB_NAME + '"');

                initDB();
                resolve();
            }
        });
    });
}

let getObjectId = function (id) {
    return new require('mongodb').ObjectID(id);
};

async function initDB() {
    // Create Super Admin accounts
    if (config['superAdmins']) {
        config['superAdmins'].forEach(async sa => {
            if (!(await accounts.findOne({email: sa}))) {
                accounts.insertOne({
                    email: sa,
                    pass: utils.saltAndHash('velopark'),
                    date: new Date(),
                    superAdmin: true
                });
            }
        });
    }

    //detect if command line flag is used to force repopulation of geocities
    process.argv.forEach(function (val, index, array) {
        if (val === '--reload-regions') {
            cities.drop(function (err, delOK) {
                if (err) console.error(err);
                if (delOK) console.log("geocities deleted");
            });
        }
    });

    // Init geocities collection
    if (!USE_NAZKA && (await cities.estimatedDocumentCount({})) < 5) {
        const data = JSON.parse(fs.readFileSync('./geocities.json', 'utf8'));
        dookie.push('mongodb://localhost:27017/node-login', data).then(function () {
            console.log('Importing geocities done!');
        });
    }

    var hrstart = process.hrtime();
    if (USE_NAZKA && (await cities.estimatedDocumentCount({})) < 5) {
        nazka.loadNazka().then(() => {
            var hrend = process.hrtime(hrstart);
            console.log('Loading Nazka done');
            console.info('Nazka job execution time: %ds %dms', hrend[0], hrend[1] / 1000000)
        });
    }
}

/*
=======================
    Contents
    - Accounts
        * lookup
        * update
        * insert
        * delete
    - Parkings
        * lookup
        * save
        * update
    - Companies
        * update
    - Cities
        * lookup
    - Mixed
        * lookup
=======================
*/

/*
    ==== Accounts ====
*/

/*
    Accounts: lookup
*/

exports.findAccountByEmail = function (email, callback) {
    accounts.findOne({email: email}, callback);
};

exports.findAccountByCookie = function (cookie, callback) {
    accounts.findOne({cookie: cookie}, callback);
};

exports.findAccountByPasskey = function (passKey, ipAddress, callback) {
    accounts.findOne({passKey: passKey}, callback);
};

exports.findAccounts = function (callback) {
    accounts.find().toArray(function (e, res) {
        if (e) {
            callback(e);
        } else {
            callback(null, res);
        }
    });
};

exports.findAccountsByEmails = function (emails) {
    return new Promise((resolve, reject) => {
        accounts.find({
            email: {$in: emails}
        }).toArray(function (e, res) {
            if (e) {
                reject(e);
            } else {
                resolve(res);
            }
        });
    });

};

exports.findAllEmails = function (callback) {
    let emails = [];
    accounts.find().project({email: 1, _id: 0}).forEach(function (res) {
        emails.push(res.email);
    }, function (error) {
        callback(error, emails);
    });
};

exports.findSuperAdminEmailsAndLang = function () {
    return new Promise((resolve, reject) => {
        let emails = [];
        accounts.find({
            superAdmin: true
        }, {projection: {_id: 0, "email": 1, 'lang': 1}}).forEach(function (res) {
            emails.push({email: res.email, lang: res.lang});
        }, function (error) {
            if (error) {
                reject(error);
            } else {
                resolve(emails);
            }
        });
    });
};

exports.findCityRepsForRegions = function (regions) {
    return new Promise((resolve, reject) => {
        accounts.find(
            {
                cityNames : {
                    $elemMatch: {
                        name: {
                            $in: regions
                        },
                        enabled: true
                    }
                }
            },
            {}
        ).toArray().then(res => {
            resolve(res);
        }).catch(error => {
            reject(error);
        });
    });
};

/*
    Accounts: update
*/

exports.updateAccountCookie = function (email, ipAddress, cookie, callback) {
    accounts.findOneAndUpdate({email: email}, {
        $set: {
            ip: ipAddress,
            cookie: cookie
        }
    }, {returnOriginal: false}, function (e, o) {
        callback(cookie);
    });
};

exports.updateAccountPasskey = function (email, ipAddress, passKey, callback) {
    accounts.findOneAndUpdate({email: email}, {
        $set: {
            ip: ipAddress,
            passKey: passKey
        }, $unset: {cookie: ''}
    }, {returnOriginal: false}, function (e, o) {
        if (o.value != null) {
            callback(null, o.value);
        } else {
            callback(e || 'account not found');
        }
    });
};

exports.updateAccountPassByPasskey = function (passKey, newPass, callback) {
    accounts.findOneAndUpdate({passKey: passKey}, {
        $set: {pass: newPass},
        $unset: {passKey: ''}
    }, {returnOriginal: false}, callback);
};

exports.updateAccount = function (data, callback) {
    let o = {
        name: data.name,
        email: data.email,
        country: data.country,
        lang: data.lang
    };
    if (data.pass) o.pass = data.pass;
    accounts.findOneAndUpdate({_id: getObjectId(data.id)}, {$set: o}, {returnOriginal: false}, callback);
};

exports.updateAccountParkingIDs = function (email, parkingID, callback) {
    accounts.findOneAndUpdate(
        {
            email: email
        },
        {
            $addToSet: {
                parkingIDs: parkingID
            }
        },
        {
            returnOriginal: false
        },
        callback
    );
};

exports.updateAccountEnableCompany = function (email, enabled) {
    return accounts.findOneAndUpdate(
        {
            email: email,
            companyName: {$not: {$type: 10}, $exists: true} //can't enable/disable company if user does not have one
        },
        {
            $set: {companyEnabled: enabled}
        },
        {
            returnOriginal: false
        }
    );
};

exports.updateAccountEnableCity = function (email, cityName, enabled) {
    return accounts.findOneAndUpdate(
        {
            email: email,
            'cityNames.name': cityName
        },
        {
            $set: {
                'cityNames.$.enabled': enabled
            }
        },
        {
            returnOriginal: true
        }
    );
};

exports.updateAccountLanguage = function (email, lang) {
    return accounts.findOneAndUpdate(
        {
            email: email
        },
        {
            $set: {
                lang: lang
            }
        });
};

/*
    Accounts: insert
*/
exports.insertAccount = function (data, callback) {
    accounts.insertOne(data, callback);
};

/*
    Accounts: delete
*/

exports.deleteAccount = function (id, callback) {
    accounts.deleteOne({_id: getObjectId(id)}, callback);
};

exports.deleteAccounts = function (callback) {
    accounts.deleteMany({}, callback);
};


/*
    ==== Parkings ====
*/

/*
    Parkings: lookup
*/

exports.findParkingsWithCompanies = function () {
    return new Promise((resolve, reject) => {
        parkings.aggregate(
            [
                {
                    $lookup:
                        {
                            from: "companies",
                            localField: "parkingID",
                            foreignField: "parkingIDs",
                            as: "company"
                        }
                }
            ],
            {},
            function (error, res) {
                if (error != null) {
                    reject(error);
                } else {
                    if (res != null) {
                        res.toArray(function (error, documents) {
                            if (error != null) {
                                reject(error);
                            } else {
                                resolve(documents);
                            }
                        })
                    } else {
                        resolve();
                    }
                }
            }
        );
    });
};

exports.findParkings = function (callback) {
    parkings.find().toArray(callback);
};

exports.findParkingByID = id => {
    return parkings.findOne({parkingID: id});
};

exports.findParkingsByEmail = function (email, skip, limit, callback) {
    accounts.findOne({email: email, companyEnabled: true}, function (e, o) {
        if (o != null) {
            if (o.companyName != null) {
                //User is part of a company, the parkings of this company are to be returned
                companies.aggregate(
                    [
                        {
                            $match: {
                                name: o.companyName
                            }
                        },
                        {
                            $unwind: "$parkingIDs"
                        },
                        { $skip : skip },
                        { $limit : limit },
                        {
                            $lookup:
                                {
                                    from: "parkings",
                                    localField: "parkingIDs",
                                    foreignField: "parkingID",
                                    as: "parking"
                                }
                        }
                    ],
                    {},
                    function (e, o) {
                        if (e) {
                            callback(e);
                        } else {
                            let parkingArray;
                            o.toArray().then(res => {
                                parkingArray = res;
                                for (i in parkingArray) {
                                    parkingArray[i] = parkingArray[i].parking[0];
                                }
                                callback(null, parkingArray);
                            }).catch(err => {
                                callback(err);
                            });
                        }
                    }
                );
            } else {
                callback("User does not belong to a company.");
            }
        } else {
            callback(e || "User does not exist or his membership to his company has not been approved yet.");
        }
    });
};

exports.findParkingByEmailAndParkingId = function (email, parkingId, callback) {
    accounts.findOne({email: email, companyEnabled: true}, function (e, o) {
        if (e != null) {
            callback(e);
        } else if (o != null) {
            if (o.companyName != null) {
                //User is part of a company, the parkings of this company are to be returned
                companies.aggregate(
                    [
                        {
                            $match: {
                                name: o.companyName
                            }
                        },
                        {
                            $unwind: "$parkingIDs"
                        },
                        {
                            $lookup:
                                {
                                    from: "parkings",
                                    localField: "parkingIDs",
                                    foreignField: "parkingID",
                                    as: "parking"
                                }
                        },
                        {
                            $match: {
                                'parking.parkingID': parkingId
                            }
                        }
                    ],
                    {},
                    function (e, o) {
                        if (e) {
                            callback(e);
                        } else {
                            if (o) {
                                let processNextParking = function (parkings, o) {
                                    o.next(function (error, res) {
                                        if (error != null) {
                                            callback(error);
                                        } else {
                                            parkings.push(res.parking);
                                            o.hasNext(function (error, res) {
                                                if (res) {
                                                    processNextParking(parkings, o);
                                                } else {
                                                    callback(null, [].concat.apply([], parkings));
                                                }
                                            });
                                        }
                                    });
                                };
                                o.hasNext(function (error, res) {
                                    if (res) {
                                        processNextParking([], o);
                                    } else {
                                        callback(null, []);
                                    }
                                });
                            } else {
                                callback(null, []);
                            }
                        }
                    }
                );
            } else {
                callback("No valid company found for this user."); //Company is enabled but none is given
            }
        } else {
            // User does not exist, or he is not a member of a company.
            callback(null, []);
        }
    });
};

/*
    Parkings: save
*/

let updateOrCreateParking = function (id, filename, approvedStatus, location, callback) {
    parkings.findOneAndUpdate(
        {
            parkingID: id
        },
        {
            $set: {
                filename: filename,
                approvedstatus: approvedStatus,
                location: location
            },
        },
        {
            returnOriginal: true,
            upsert: true
        },
        function (e, o) {
            if (!e) {
                callback(null, o.value ? "updated" : "inserted");
            } else {
                callback(e);
            }
        });
};

exports.updateParkingAsCityRep = function (id, filename, location, approved, callback) {
    //1. find account of city rep
    //2. make sure the city rep is responsible for this parking location
    //3. update the parking itself, leaving the owning company as is
    parkings.findOneAndUpdate(
        {
            parkingID: id
        },
        {
            $set: {
                filename: filename,
                location: location
            },
            $setOnInsert: {
                approvedstatus: approved
            }
        },
        {
            returnOriginal: false,
            upsert: true
        },
        function (e, o) {
            if (o.value != null) {
                callback(null, o.value);
            } else {
                callback(e);
            }
        });
};

exports.saveParkingAsAdmin = function (id, filename, approvedStatus, location, callback) {
    updateOrCreateParking(id, filename, approvedStatus, location, callback);
};

exports.saveParkingToCompany = function (id, filename, approvedStatus, location, companyName, callback) {
    exports.updateCompanyParkingIDs(companyName, id, function (error, result) {
        if (error != null) {
            callback(error);
        } else {
            if (result != null) {
                updateOrCreateParking(id, filename, approvedStatus, location, callback);
            } else {
                //Company not found
                callback("This company does not exist");
            }
        }
    });
};

/*
    Parkings: Update
*/

exports.updateParkingApproved = function (parkingid, enabled, callback) {
    parkings.findOneAndUpdate(
        {
            parkingID: parkingid,
        },
        {
            $set: {approvedstatus: enabled}
        },
        {
            returnOriginal: false
        },
        callback
    );
};

/*
    Parkings: Delete
*/

let deleteParkingFromParkingsTable = function (id, callback) {
    parkings.deleteOne({parkingID: id}, {}, callback);
};

exports.deleteParkingByIdAndEmail = function (parkingId, email, callback) {
    exports.findAccountByEmail(email,
        function (error, res) {
            if (error != null) {
                callback(error);
            } else if (res == null) {
                callback("user not found");
            } else {
                //looking for a company now
                companies.findOneAndUpdate({
                        parkingIDs: parkingId,
                        name: res.companyName
                    }, {
                        $pull: {parkingIDs: parkingId}
                    },
                    {},
                    function (error, res) {
                        if (error != null) {
                            callback(error);
                        } else {
                            if (res.value) {
                                deleteParkingFromParkingsTable(parkingId, function (error, res) {
                                    if (error != null) {
                                        callback(error);
                                    } else {
                                        callback(null, true);
                                    }
                                });
                            } else {
                                //did not find a company with this parkingId (the parking could exist under another company, e.g. if this method is called by an admin)
                                callback(null, false);
                            }
                        }
                    });
                //}
            }
        });
};

exports.deleteParkingById = function (parkingId, callback) {
    companies.findOneAndUpdate({
            parkingIDs: parkingId
        }, {
            $pull: {parkingIDs: parkingId}
        },
        {},
        function (error, res) {
            if (error != null) {
                callback(error);
            } else {
                if (res.value) {
                    deleteParkingFromParkingsTable(parkingId, function (error, res) {
                        if (error != null) {
                            callback(error);
                        } else {
                            callback(null, true);
                        }
                    });
                } else {
                    // parking does not belong to a company
                    deleteParkingFromParkingsTable(parkingId, function (error, res) {
                        if (error != null) {
                            callback(error);
                        } else {
                            callback(null, true);
                        }
                    });
                }
            }
        });
};


/*
    ==== Companies ====
*/

/*
    Companies: lookup
*/
exports.findAllCompanies = function (callback) {
    companies.find().toArray(callback);
};

exports.findAllCompaniesWithUsers = function (callback) {
    companies.aggregate([
            {
                $lookup: {
                    from: "accounts",
                    localField: "name",
                    foreignField: "companyName",
                    as: "users"
                }
            }
        ],
        {},
        function (error, cursor) {
            if (error != null) {
                callback(error);
            } else {
                cursor.toArray(callback);
            }
        });
};

exports.findAllCompanyNames = function (callback) {
    companieNames = [];
    companies.find().project({name: 1, _id: 0}).forEach(function (res) {
        companieNames.push(res.name);
    }, function (error) {
        callback(error, companieNames);
    });
};

exports.findCompanyByParkingId = function (parkingId, callback) {
    companies.findOne(
        {parkingIDs: parkingId},
        {},
        function (error, res) {
            if (error != null) {
                callback(error);
            } else {
                if (res != null) {
                    callback(null, null, res);
                } else {
                    callback();
                }
            }
        }
    );
};

/*
    Companies: update
*/

exports.updateCompanyParkingIDs = function (companyName, parkingID, callback) {
    companies.findOneAndUpdate(
        {
            name: companyName
        },
        {
            $addToSet: {
                parkingIDs: parkingID
            }
        },
        {
            returnOriginal: false
        },
        callback
    );
};

exports.transferParkingToCompany = function (newCompany, parkingID, callback) {
    if (!newCompany) {
        companies.findOneAndUpdate({parkingIDs: parkingID}, {
            $pull: {parkingIDs: parkingID}
        }).then(result => {
            callback(null, result);
        });
    } else {
        companies.findOneAndUpdate({
                parkingIDs: parkingID
            },
            {
                $pull: {parkingIDs: {$in: [parkingID,]}}
            },
            {
                returnOriginal: false
            }, function (error, res) {
                if (error != null) {
                    callback(error);
                } else {
                    if (res.value != null) {
                        exports.updateCompanyParkingIDs(newCompany, parkingID, function (error, result) {
                            if (error != null) {
                                //revert
                                exports.updateCompanyParkingIDs(res.value.name, parkingID, function (error2, result) {
                                    if (error2 != null) {
                                        callback(error2);
                                    } else {
                                        callback(error + " \nreverted successfully.");
                                    }
                                });
                            } else {
                                if (result.value == null) {
                                    //revert
                                    exports.updateCompanyParkingIDs(res.value.name, parkingID, function (error2, result) {
                                        if (error2 != null) {
                                            callback(error2);
                                        } else {
                                            callback(error + " \nreverted successfully.");
                                        }
                                    });
                                } else {
                                    callback(error, result);
                                }
                            }
                        });
                    } else {
                        exports.updateCompanyParkingIDs(newCompany, parkingID, (error, result) => {
                            if (result) {
                                callback(null, result);
                            } else {
                                callback("Could not find company to update.");
                            }
                        });
                    }
                }
            });
    }
};

/*
    Add the account with the given email to the given company.
    Existing parkings owned by this user will be transferred to this company.
*/
exports.addAccountToCompany = function (email, companyName, callback) {
    accounts.findOneAndUpdate({email: email}, {
        $set: {
            companyName: companyName,
        }
    }, {returnOriginal: true}, function (e, o) {
        if (e != null) {
            callback(e);
        } else {
            //add user to company email and add parkingIDs to the company's parkingIDs
            companies.findOneAndUpdate(
                {
                    name: companyName
                },
                {
                    $addToSet: {
                        parkingIDs: o.parkingIDs
                    },
                    /*$addToSet: {
                        email: email
                    }*/
                },
                {returnOriginal: false},
                callback
            )
        }
    })
};

/*
    Companies: Insert
*/

exports.insertCompany = function (companyName, callback) {
    companies.findOneAndUpdate(
        {name: companyName},
        {
            $set: {
                name: companyName
            }
        },
        {upsert: true},
        function (error, result) {
            if (error != null) {
                callback(error);
            } else if (result.value == null) {
                callback(null, true);
            } else {
                callback("Company existed already.");
            }
        });
};

/*
    ==== Cities ====
*/

/*
    Cities: lookup
*/

exports.findAllCityNames = function (callback) {
    let citynames = [];
    cities.find().project({'properties.cityname': 1, _id: 0}).forEach(function (res) {
        citynames.push(res.properties.cityname);
    }, function (error) {
        callback(error, citynames);
    });
};

exports.findParkingsByCityName = function (cityName, callback, skip=0, limit=0 ) {
    cities.findOne({'properties.cityname': cityName}, {}, function (error, city) {
        if (error != null) {
            callback(error);
        } else {
            parkings.find({
                'location': {
                    '$geoWithin': {
                        '$geometry': city.geometry
                    }
                }
            }).skip(skip).limit(limit).toArray(function (error, result) {
                if (error != null) {
                    callback(error);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};

exports.findCitiesByLocation = function (lat, lng, lang, callback) {
    let propertyName;
    if (lang === 'en') {
        propertyName = 'name_EN';
    } else if (lang === 'fr') {
        propertyName = 'name_FR';
    } else if (lang === 'de') {
        propertyName = 'name_DE';
    } else if (lang === 'nl') {
        propertyName = 'name_NL'
    } else {
        propertyName = "cityname";
    }
    let cityNames = [];
    cities.find({
        'geometry': {
            '$geoIntersects': {
                '$geometry': {
                    type: "Point",
                    coordinates: [lng, lat]
                }
            }
        }
    }, {projection: {"properties": 1}}).forEach(function (res) {
        cityNames.push(res.properties[propertyName] || res.properties["cityname"]);
    }, function (error) {
        callback(error, cityNames);
    });
};

exports.findMunicipalityByLocation = function (lat, lng, lang, callback) {
    let propertyName;
    if (lang === 'en') {
        propertyName = 'name_EN';
    } else if (lang === 'fr') {
        propertyName = 'name_FR';
    } else if (lang === 'de') {
        propertyName = 'name_DE';
    } else if (lang === 'nl') {
        propertyName = 'name_NL'
    } else {
        propertyName = "cityname";
    }
    let cityNames = [];
    cities.find({
        'geometry': {
            '$geoIntersects': {
                '$geometry': {
                    type: "Point",
                    coordinates: [lng, lat]
                }
            }
        }
    }, {projection: {"properties": 1}}).forEach(function (res) {
        if (res.properties['adminLevel'] === 4) {
            cityNames.push(res.properties[propertyName] || res.properties["cityname"]);
        }
    }, function (error) {
        callback(error, cityNames);
    });
};

exports.insertCity = function (json) {
    return cities.insertOne(json);
};


/*
    ==== Mixed ====
*/

/*
    Mixed: lookup
*/

exports.isAccountCityRepForParkingID = function (email, parkingID, callback) {
    accounts.aggregate([
            {
                $match: {email: email}
            },
            {
                $unwind: "$cityNames"
            },
            {
                $match: {"cityNames.enabled": true}
            },
            {
                $lookup: {
                    from: "geocities",
                    localField: "cityNames.name",
                    foreignField: "properties.cityname",
                    as: "city"
                }
            }
        ],
        {},
        function (error, cursor) {
            cursor.toArray(function (error, accountcities) {
                if (error != null) {
                    callback(error);
                } else {
                    let callbackcalled = false;
                    let numtolook = accountcities.length;
                    for (let i = 0; i < accountcities.length; i++) {
                        if (accountcities[i].city && accountcities[i].city.length > 0) {
                            exports.findParkingsByCityName(accountcities[i].city[0].properties.cityname, function (error, parkings) {
                                if (error != null) {
                                    callback(error);
                                } else {
                                    numtolook += parkings.length;
                                    for (let j = 0; j < parkings.length; j++) {
                                        if (parkings[j].parkingID === parkingID && !callbackcalled) {
                                            callbackcalled = true;
                                            callback(null, true);
                                        }
                                        numtolook--;
                                        if (numtolook === 0 && !callbackcalled) {
                                            callback(null, false);
                                        }
                                    }
                                    numtolook--;
                                    if (numtolook === 0 && !callbackcalled) {
                                        callback(null, false);
                                    }
                                }
                            });
                        } else {
                            numtolook--;
                            if (numtolook === 0 && !callbackcalled) {
                                callback(null, false);
                            }
                        }
                    }
                }
            });
        });
};




