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
        cities = db.collection('cities');
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
    - Companies
        * update
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
                    callback("User has no parkings defined.", {});
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
                    callback("User has no parkings defined.", {});
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

let updateOrCreateParking = function (id, filename, approvedStatus, callback) {
    parkings.findOneAndUpdate(
        {
            parkingID: id
        },
        {
            $set: {
                filename: filename,
                approvedstatus: approvedStatus
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

exports.saveParking = function (id, filename, approvedStatus, email, callback) {
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
                            updateOrCreateParking(id, filename, approvedStatus, callback);
                        }
                    });

                } else {
                    //User is not part of a company, he manages his own parkings
                    exports.updateAccountParkingIDs(email, id, function (error, result) {
                        if (error != null) {
                            callback(error);
                        } else {
                            updateOrCreateParking(id, filename, approvedStatus, callback);
                        }
                    })
                }
            }
        }
    );
};

/*
    Parkings: Delete
*/

let deleteParkingById = function(id, callback){
    parkings.deleteOne({parkingID: id}, {}, callback);
};

exports.deleteParkingByIdAndEmail = function (parkingId, email, callback) {
    console.log("email: " + email);
    console.log("parkingId: " + parkingId);
    accounts.findOneAndUpdate({
            email: email,
            parkingIDs: parkingId
        }, {
            $pull: {parkingIDs: parkingId}
        },
        {},
        function (error, res) {
            console.log(res);
            if (error != null) {
                callback(error);
            } else {
                if (res.value) {
                    //One document has been updated. The user was managing this parking by himself (not trough a company)
                    deleteParkingById(parkingId, function(error, res){
                        if(error != null){
                            callback(error);
                        } else {
                            callback(null, "success");
                        }
                    });
                } else {
                    //did not find a user with this parkingId, looking for a company now
                    companies.findOneAndUpdate({
                            parkingIDs: parkingId,
                            email: email
                        }, {
                            $pull: {parkingIDs: parkingId}
                        },
                        {},
                        function (error, res) {
                            if (error != null) {
                                callback(error);
                            } else {
                                if (res.value) {
                                    //console.log(res.value);
                                    deleteParkingById(parkingId, function(error, res){
                                        if(error != null){
                                            callback(error);
                                        } else {
                                            callback(null, "success");
                                        }
                                    });
                                } else {
                                    //did not find a company with this parkingId, that's an error
                                    callback("Could not find an entity that owns this parking.");
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











