const MongoClient = require('mongodb').MongoClient;

var db, accounts;
MongoClient.connect(process.env.DB_URL, {useNewUrlParser: true}, function (e, client) {
    if (e) {
        console.log(e);
    } else {
        db = client.db(process.env.DB_NAME);
        accounts = db.collection('accounts');
        parkings = db.collection('parkings');
        companies = db.collection('companies');
        cities = db.collection('geocities');

        cities.estimatedDocumentCount({}, function (error, result) {
            if (result < 5) {
                const dookie = require('dookie');
                const fs = require('fs');
                const data = JSON.parse(fs.readFileSync('./geocities.json', 'utf8'));
                dookie.push('mongodb://localhost:27017/node-login', data).then(function () {
                    console.log('Importing geocities done!');
                });
            }
        });

        accounts.createIndex({location: "2dsphere"});
        cities.createIndex({geometry: "2dsphere"});
        // index fields 'user' & 'email' for faster new account validation //
        accounts.createIndex({user: 1, email: 1});
        console.log('mongo :: connected to database :: "' + process.env.DB_NAME + '"');
    }
});

let getObjectId = function (id) {
    return new require('mongodb').ObjectID(id);
};

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
    accounts.findOne({passKey: passKey, ip: ipAddress}, callback);
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

exports.findAllEmails = function (callback) {
    let emails = [];
    accounts.find().project({email: 1, _id: 0}).forEach(function (res) {
        emails.push(res.email);
    }, function (error) {
        callback(error, emails);
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
        country: data.country
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

exports.updateAccountEnableCompany = function (email, enabled, callback) {
    accounts.findOneAndUpdate(
        {
            email: email,
            companyName: {$not: {$type: 10}, $exists: true}
        },
        {
            $set: {companyEnabled: enabled}
        },
        {
            returnOriginal: false
        },
        callback
    );
};

exports.updateAccountEnableCity = function (email, cityName, enabled, callback) {
    accounts.findOneAndUpdate(
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
            returnOriginal: false
        },
        callback
    );
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

exports.findParkingsWithAccountsAndCompanies = function (callback) {
    parkings.aggregate(
        [
            {
                $lookup:
                    {
                        from: "accounts",
                        localField: "parkingID",
                        foreignField: "parkingIDs",
                        as: "account"
                    }
            },
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
                callback(error);
            } else {
                if (res != null) {
                    res.toArray(function (error, documents) {
                        if (error != null) {
                            callback(error);
                        } else {
                            callback(null, documents);
                        }
                    })
                } else {
                    callback();
                }
            }
        }
    )
};

exports.findParkings = function (callback) {
    parkings.find().toArray(callback);
};

exports.findParkingByID = function (id, callback) {
    parkings.findOne({parkingID: id}, callback);
};

exports.findParkingsByEmail = function (email, callback) {
    accounts.findOne({email: email}, function (e, o) {
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
                                        //callback(null, res ? res.parking : {});
                                    }
                                });
                            };
                            processNextParking([], o);
                        }
                    }
                )
                ;
            } else {
                //User does not belong to a company, he lists his own parkings
                if (o.parkingIDs != null) {
                    parkings.find(
                        {
                            parkingID: {
                                $in: o.parkingIDs
                            }
                        }
                    ).toArray(function (e, res) {
                        if (e) {
                            callback(e);
                        } else {
                            callback(null, res);
                        }
                    });
                } else {
                    callback(null);
                }
            }
        } else {
            callback(e || "could not find user with this email address");
        }
    });
};

exports.findParkingByEmailAndParkingId = function (email, parkingId, callback) {
    accounts.findOne({email: email}, function (e, o) {
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
                                            //callback(null, res ? res.parking : {});
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
                //User does not belong to a company, he lists his own parkings
                if (o.parkingIDs != null) {
                    parkings.find(
                        {
                            parkingID: parkingId
                        }
                    ).toArray(function (e, res) {
                        if (e) {
                            callback(e);
                        } else {
                            callback(null, res);
                        }
                    });
                } else {
                    callback(null, []);
                }
            }
        } else {
            callback(e || "could not find user with this email address");
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

exports.saveParking = function (id, filename, approvedStatus, location, email, callback) {
    accounts.findOne(
        {
            email: email
        },
        {maxTimeMS: 10000},
        function (e, res) {
            if (e != null) {
                callback(e);
            } else {
                if (res.companyName != null && res.companyName !== '') {
                    //User is part of a company, parking will be linked to this company instead of this user
                    exports.updateCompanyParkingIDs(res.companyName, id, function (error, result) {
                        if (error != null) {
                            callback(error);
                        } else {
                            updateOrCreateParking(id, filename, approvedStatus, location, callback);
                        }
                    });

                } else {
                    //User is not part of a company, he manages his own parkings
                    exports.updateAccountParkingIDs(email, id, function (error, result) {
                        if (error != null) {
                            callback(error);
                        } else {
                            updateOrCreateParking(id, filename, approvedStatus, location, callback);
                        }
                    })
                }
            }
        }
    );
};

exports.saveParkingToCompany = function (id, filename, approvedStatus, location, companyName, callback) {
    //User is part of a company, parking will be linked to this company instead of user
    exports.updateCompanyParkingIDs(companyName, id, function (error, result) {
        if (error != null) {
            callback(error);
        } else {
            updateOrCreateParking(id, filename, approvedStatus, location, callback);
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
            } else if(res == null) {
                callback("user not found");
            } else {
                //looking for a company now
                companies.findOneAndUpdate({
                        parkingIDs: parkingId,
                        name: res.value.companyName
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
    accounts.findOneAndUpdate({
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
                    //One document has been updated. The user was managing this parking by himself (not trough a company)
                    deleteParkingFromParkingsTable(parkingId, function (error, res) {
                        if (error != null) {
                            callback(error);
                        } else {
                            callback(null, true);
                        }
                    });
                } else {
                    //did not find a user with this parkingId, looking for a company now
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
                                    //did not find a company or user with this parkingId
                                    callback(null, false);
                                }
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
        function(error, cursor){
            if(error != null){
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

exports.insertCompany = function(companyName, callback){
    companies.findOneAndUpdate(
        { name: companyName },
        {
            $set: {
                name: companyName
            }
        },
        { upsert: true },
        function(error, result){
            if(error != null){
                callback(error);
            } else if( result.value == null){
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

exports.findParkingsByCityName = function (cityName, callback) {
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
            }).toArray(function (error, result) {
                if (error != null) {
                    callback(error);
                } else {
                    callback(null, result);
                }
            });
        }
    });
};


/*
    ==== Mixed ====
*/

/*
    Mixed: lookup
*/

exports.findAccountOrCompanyByParkingId = function (parkingId, callback) {
    //try to find an account first
    accounts.findOne(
        {parkingIDs: parkingId},
        {},
        function (error, res) {
            if (error != null) {
                callback(error);
            } else {
                if (res != null) {
                    callback(null, res);
                } else {
                    //No user found with this parking, find a company now
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
                }
            }
        }
    )
};

exports.isAccountCityRepForParkingID = function (email, parkingID, callback) {
    accounts.aggregate([
            {
                $match: {email: email}
            },
            {
                $unwind: "$cityNames"
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




