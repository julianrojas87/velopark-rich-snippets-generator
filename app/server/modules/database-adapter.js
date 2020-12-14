const MongoClient = require('mongodb').MongoClient;
const dookie = require('dookie');
const fs = require('fs');
const utils = require('../utils/utils');
const nazka = require('./nazka');
const jsts = require('jsts');

const USE_NAZKA = true;
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

var db, accounts, parkings, companies, cities, regionHierarchy;

exports.initDbAdapter = function () {
    return new Promise((resolve, reject) => {
        MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true }, function (e, client) {
            if (e) {
                console.error(e);
            } else {
                db = client.db(process.env.MONGO_NAME);
                accounts = db.collection('accounts');
                parkings = db.collection('parkings');
                companies = db.collection('companies');
                cities = db.collection('geocities');
                regionHierarchy = db.collection('regionHierarchy');

                accounts.createIndex({ location: "2dsphere" });
                cities.createIndex({ geometry: "2dsphere" });
                // index fields 'user' & 'email' for faster new account validation //
                accounts.createIndex({ user: 1, email: 1 });
                console.log('mongo :: connected to database :: "' + process.env.MONGO_NAME + '"');

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
            if (!(await accounts.findOne({ email: sa }))) {
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
            regionHierarchy.drop(function (err, delOK) {
                if (err) console.error(err);
                if (delOK) console.log("regionHierarchy deleted");
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

    var hrstart = new Date();
    if (USE_NAZKA && (await cities.estimatedDocumentCount({})) < 5) {
        nazka.loadNazka().then(() => {
            var hrend = new Date();
            console.log('Loading Nazka done');
            console.info('Nazka job execution time: ' + (hrend.getTime() - hrstart.getTime()) + ' ms');
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
    - regionHierarchy
        * lookup
        * insert
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
    accounts.findOne({ email: email }, callback);
};

exports.findAccountByCookie = function (cookie, callback) {
    accounts.findOne({ cookie: cookie }, callback);
};

exports.findAccountByPasskey = function (passKey, ipAddress, callback) {
    accounts.findOne({ passKey: passKey }, callback);
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
            email: { $in: emails }
        }).toArray(function (e, res) {
            if (e) {
                reject(e);
            } else {
                resolve(res);
            }
        });
    });
};

exports.findAccountsByCompany = companyName => {
    return accounts.find({ companyName: companyName }).toArray();
};

exports.findAllEmails = function (callback) {
    let emails = [];
    accounts.find().project({ email: 1, _id: 0 }).forEach(function (res) {
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
        }, { projection: { _id: 0, "email": 1, 'lang': 1 } }).forEach(function (res) {
            emails.push({ email: res.email, lang: res.lang });
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
                cityNames: {
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
    accounts.findOneAndUpdate({ email: email }, {
        $set: {
            ip: ipAddress,
            cookie: cookie
        }
    }, { returnOriginal: false }, function (e, o) {
        callback(cookie);
    });
};

exports.updateAccountPasskey = function (email, ipAddress, passKey, callback) {
    accounts.findOneAndUpdate({ email: email }, {
        $set: {
            ip: ipAddress,
            passKey: passKey
        }, $unset: { cookie: '' }
    }, { returnOriginal: false }, function (e, o) {
        if (o.value != null) {
            callback(null, o.value);
        } else {
            callback(e || 'account not found');
        }
    });
};

exports.updateAccountPassByPasskey = function (passKey, newPass, callback) {
    accounts.findOneAndUpdate({ passKey: passKey }, {
        $set: { pass: newPass },
        $unset: { passKey: '' }
    }, { returnOriginal: false }, callback);
};

exports.updateAccount = function (data, callback) {
    let o = {
        name: data.name,
        email: data.email,
        country: data.country,
        lang: data.lang
    };
    if (data.pass) o.pass = data.pass;
    accounts.findOneAndUpdate({ _id: getObjectId(data.id) }, { $set: o }, { returnOriginal: false }, callback);
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
            companyName: { $not: { $type: 10 }, $exists: true } //can't enable/disable company if user does not have one
        },
        {
            $set: { companyEnabled: enabled }
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

exports.deleteAccount = id => {
    accounts.deleteOne({ email: id });
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

exports.findParkingsWithCompanies = async (skip = 0, limit = Number.MAX_SAFE_INTEGER, idFilter = '', nameFilter = '', regionFilter, lang, sort = -1) => {
    if (regionFilter) {
        let city = null;

        if (lang === 'en') {
            city = await cities.findOne({ 'properties.name_EN': regionFilter, 'properties.adminLevel': 4 });
        } else if (lang === 'fr') {
            city = await cities.findOne({ 'properties.name_FR': regionFilter, 'properties.adminLevel': 4 });
        } else if (lang === 'de') {
            city = await cities.findOne({ 'properties.name_DE': regionFilter, 'properties.adminLevel': 4 });
        } else if (lang === 'nl') {
            city = await cities.findOne({ 'properties.name_NL': regionFilter, 'properties.adminLevel': 4 });
        } else {
            city = await cities.findOne({ 'properties.cityname': regionFilter, 'properties.adminLevel': 4 });
        }

        return parkings.aggregate([
            {
                $match: {
                    "parkingID": { $regex: ".*" + idFilter + ".*" },
                    "name": { $regex: ".*" + nameFilter + ".*" },
                    "location": {
                        '$geoWithin': {
                            '$geometry': city.geometry
                        }
                    }
                }
            },
            { $sort: { "lastModified": sort } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup:
                {
                    from: "companies",
                    localField: "parkingID",
                    foreignField: "parkingIDs",
                    as: "company"
                }
            }
        ]).toArray();
    } else {
        return parkings.aggregate([
            {
                $match: {
                    "parkingID": { $regex: ".*" + idFilter + ".*" },
                    "name": { $regex: ".*" + nameFilter + ".*" },
                }
            },
            { $sort: { "lastModified": sort } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup:
                {
                    from: "companies",
                    localField: "parkingID",
                    foreignField: "parkingIDs",
                    as: "company"
                }
            }
        ]).toArray();
    }
};

exports.getRegionParkings = async nis => {
    const region = await cities.findOne({ 'properties.NIS_CODE': nis });
    if (region) {
        let arr = [];
        await parkings.find({
            "approvedstatus": true,
            "location": {
                '$geoWithin': {
                    '$geometry': region.geometry
                }
            }
        }).forEach(p => {
            arr.push(decodeURIComponent(p['parkingID']));
        });
        return arr;
    } else {
        return null;
    }
};

exports.findParkings = (skip, limit) => {
    return parkings.find().skip(skip).limit(limit).toArray();
};

exports.findParkingByID = id => {
    return parkings.findOne({ parkingID: id });
};

exports.findParkingsByEmail = async function (email, skip = 0, limit = Number.MAX_SAFE_INTEGER, idFilter = '', nameFilter = '', regionFilter = '', lang, sort = -1) {
    try {
        let account = await accounts.findOne({ email: email, companyEnabled: true });
        let parkings = [];

        if (regionFilter !== '') {
            let city = null;
            if (lang === 'en') {
                city = await cities.findOne({ 'properties.name_EN': regionFilter, 'properties.adminLevel': 4 });
            } else if (lang === 'fr') {
                city = await cities.findOne({ 'properties.name_FR': regionFilter, 'properties.adminLevel': 4 });
            } else if (lang === 'de') {
                city = await cities.findOne({ 'properties.name_DE': regionFilter, 'properties.adminLevel': 4 });
            } else if (lang === 'nl') {
                city = await cities.findOne({ 'properties.name_NL': regionFilter, 'properties.adminLevel': 4 });
            } else {
                city = await cities.findOne({ 'properties.cityname': regionFilter, 'properties.adminLevel': 4 });
            }

            await companies.aggregate([
                {
                    $match: {
                        name: account.companyName
                    }
                },
                { $unwind: "$parkingIDs" },
                {
                    $lookup: {
                        from: "parkings",
                        localField: "parkingIDs",
                        foreignField: "parkingID",
                        as: "parking"
                    }
                },
                {
                    $match: {
                        "parking.location": {
                            '$geoWithin': {
                                '$geometry': city.geometry
                            }
                        }
                    }
                },
                { $sort: { "parking.lastModified": sort } },
                { $skip: skip },
                { $limit: limit },
            ]).forEach(p => {
                parkings.push(p.parking[0]);
            });
        } else {
            await companies.aggregate([
                {
                    $match: {
                        name: account.companyName
                    }
                },
                { $unwind: "$parkingIDs" },
                { $match: { "parkingIDs": { $regex: ".*" + idFilter + ".*" } } },
                {
                    $lookup: {
                        from: "parkings",
                        localField: "parkingIDs",
                        foreignField: "parkingID",
                        as: "parking"
                    }
                },
                { $match: { "parking.name": { $regex: ".*" + nameFilter + ".*" } } },
                { $sort: { "parking.lastModified": sort } },
                { $skip: skip },
                { $limit: limit },
            ]).forEach(p => {
                parkings.push(p.parking[0]);
            });
        }

        return parkings;

    } catch (err) {
        throw err;
    }
};

exports.findParkingByEmailAndParkingId = function (email, parkingId, callback) {
    accounts.findOne({ email: email, companyEnabled: true }, function (e, o) {
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

let updateOrCreateParking = function (id, filename, approvedStatus, location, name, lastModified, callback) {
    parkings.findOneAndUpdate(
        {
            parkingID: id
        },
        {
            $set: {
                filename: filename,
                approvedstatus: approvedStatus,
                location: location,
                name: name,
                lastModified: lastModified
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

exports.updateParkingAsCityRep = function (id, filename, location, approved, name, lastModified, callback) {
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
                location: location,
                name: name,
                lastModified: lastModified
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

exports.saveParkingAsAdmin = function (id, filename, approvedStatus, location, name, lastModified, callback) {
    updateOrCreateParking(id, filename, approvedStatus, location, name, lastModified, callback);
};

exports.saveParkingToCompany = function (id, filename, approvedStatus, location, name, lastModified, companyName, callback) {
    exports.updateCompanyParkingIDs(companyName, id, function (error, result) {
        if (error != null) {
            callback(error);
        } else {
            if (result != null) {
                updateOrCreateParking(id, filename, approvedStatus, location, name, lastModified, callback);
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
            $set: { approvedstatus: enabled }
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
    parkings.deleteOne({ parkingID: id }, {}, callback);
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
                    $pull: { parkingIDs: parkingId }
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
        $pull: { parkingIDs: parkingId }
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
    companies.find().project({ name: 1, _id: 0 }).forEach(function (res) {
        companieNames.push(res.name);
    }, function (error) {
        callback(error, companieNames);
    });
};

exports.findCompanyByParkingId = function (parkingId, callback) {
    companies.findOne(
        { parkingIDs: parkingId },
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
        companies.findOneAndUpdate({ parkingIDs: parkingID }, {
            $pull: { parkingIDs: parkingID }
        }).then(result => {
            callback(null, result);
        });
    } else {
        companies.findOneAndUpdate({
            parkingIDs: parkingID
        },
            {
                $pull: { parkingIDs: { $in: [parkingID,] } }
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
    accounts.findOneAndUpdate({ email: email }, {
        $set: {
            companyName: companyName,
        }
    }, { returnOriginal: true }, function (e, o) {
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
                { returnOriginal: false },
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
        { name: companyName },
        {
            $set: {
                name: companyName
            }
        },
        { upsert: true },
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

exports.findAllMunicipalities = async lang => {
    return new Promise((resolve, reject) => {
        let names = [];
        cities.aggregate([
            {
                $match: { 'properties.adminLevel': 4 }
            },
            {
                $sort: { 'properties.cityname': 1 }
            }
        ]).forEach(function (c) {
            if (lang === 'en') {
                names.push(c['properties']['name_EN']);
            } else if (lang === 'nl') {
                names.push(c['properties']['name_NL']);
            } else if (lang === 'fr') {
                names.push(c['properties']['name_FR']);
            } else if (lang === 'de') {
                names.push(c['properties']['name_DE']);
            } else {
                names.push(c['properties']['name_NL']);
            }
        }, err => {
            if (err) {
                reject(err);
            } else {
                resolve(names);
            }
        });
    });

};

exports.findAllCityNames = function (callback) {
    let citynames = [];
    cities.find().project({ 'properties.cityname': 1, _id: 0 }).forEach(function (res) {
        citynames.push(res.properties.cityname);
    }, function (error) {
        callback(error, citynames);
    });
};

exports.findParkingsByCityName = async (cityName, lang, skip = 0, limit = Number.MAX_SAFE_INTEGER, idFilter = '', nameFilter = '', regionFilter, sort = -1) => {
    let city = null;

    if (regionFilter) {
        city = await cities.findOne({ 'properties.cityname': cityName });
        let reader = new jsts.io.GeoJSONReader();
        let filter = null;

        if (lang === 'en') {
            filter = await cities.findOne({ 'properties.name_EN': regionFilter, 'properties.adminLevel': 4 });
        } else if (lang === 'fr') {
            filter = await cities.findOne({ 'properties.name_FR': regionFilter, 'properties.adminLevel': 4 });
        } else if (lang === 'de') {
            filter = await cities.findOne({ 'properties.name_DE': regionFilter, 'properties.adminLevel': 4 });
        } else if (lang === 'nl') {
            filter = await cities.findOne({ 'properties.name_NL': regionFilter, 'properties.adminLevel': 4 });
        } else {
            filter = await cities.findOne({ 'properties.cityname': regionFilter, 'properties.adminLevel': 4 });
        }

        let mainGeom = reader.read(city.geometry);
        let filterGeom = reader.read(filter.geometry);

        if (filterGeom.intersects(mainGeom)) {
            city = filter;
        } else {
            return [];
        }
    } else {
        if (lang === 'en') {
            city = await cities.findOne({ 'properties.name_EN': cityName });
        } else if (lang === 'fr') {
            city = await cities.findOne({ 'properties.name_FR': cityName });
        } else if (lang === 'de') {
            city = await cities.findOne({ 'properties.name_DE': cityName });
        } else if (lang === 'nl') {
            city = await cities.findOne({ 'properties.name_NL': cityName });
        } else {
            city = await cities.findOne({ 'properties.cityname': cityName });
        }

        if (city === null) {
            city = await cities.findOne({ 'properties.cityname': cityName });
        }
    }

    if (city) {
        return parkings.find({
            'parkingID': { $regex: ".*" + idFilter + ".*" },
            'name': { $regex: ".*" + nameFilter + ".*" },
            'location': {
                '$geoWithin': {
                    '$geometry': city.geometry
                }
            }
        })
            .sort({ 'lastModified': sort })
            .skip(skip)
            .limit(limit)
            .toArray();

    } else {
        throw new Error(`The municipality ${cityName} does not exist`);
    }
};

exports.findCitiesByLocation = function (lat, lng, lang, callback) {
    return new Promise((resolve, reject) => {
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
        }, {
            sort: { "properties.adminLevel": 1 },
            projection: { "properties": 1 }
        }).forEach(function (res) {
            cityNames.push(res.properties[propertyName] || res.properties["cityname"]);
        }, function (error) {
            if (callback) {
                callback(error, cityNames);
            }
            if (error) {
                reject(error);
            } else {
                resolve(cityNames);
            }
        });
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
    }, { projection: { "properties": 1 } }).forEach(function (res) {
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
    ==== regionHierachy ====
*/

/*
    regionHierarchy: lookup
*/

exports.getRegionHierarchy = function () {
    return regionHierarchy.find().toArray();
};

/*
    regionHierarchy: insert
*/

exports.insertRegionHierarchy = function (hierarchy) {
    regionHierarchy.insertOne(hierarchy);
};


/*
    ==== Mixed ====
*/

/*
    Mixed: lookup
*/

exports.isAccountCityRepForParkingID = async function (email, parkingID, callback) {
    let parking = await parkings.findOne({ "parkingID": parkingID });
    let parkingRegions = await cities.find({
        'geometry': {
            '$geoIntersects': {
                '$geometry': {
                    type: "Point",
                    coordinates: parking.location.coordinates
                }
            }
        }
    }).toArray();

    let accountRegions = await accounts.aggregate([
        {
            $match: { email: email }
        },
        {
            $unwind: "$cityNames"
        },
        {
            $match: { "cityNames.enabled": true }
        },
        {
            $lookup: {
                from: "geocities",
                localField: "cityNames.name",
                foreignField: "properties.cityname",
                as: "city"
            }
        }
    ]).toArray();

    for (let i in parkingRegions) {
        for (let j in accountRegions) {
            if (parkingRegions[i]['properties']['NIS_CODE'] === accountRegions[j]['city'][0]['properties']['NIS_CODE']) {
                return true;
            }
        }
    }
    return false;
};