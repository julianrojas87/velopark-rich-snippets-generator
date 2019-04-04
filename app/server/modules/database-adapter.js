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
=======================
*/

/*
    ==== Accounts ====
*/

/*
    Accounts: lookup
*/

exports.findAccountByEmail = function (email, callback) {
    accounts.findOne({email: email}, callback(e, o));
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
    console.log("finding " + email);
    accounts.findOne({email: email}, function (e, o) {
        if (o != null) {
            console.log(o);
            if (o.companyName != null) {
                //User is part of a company, the parkings of this company are to be returned
                console.log("User is part of a company.");
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
                            o.next(function (error, res) {
                                if (error != null) {
                                    callback(error);
                                } else {
                                    callback(null, res.parking);
                                }
                            });
                            o.hasNext(function(error, res){
                                if(res) {
                                    console.error("More than one company was found with the same name. using only the first one.");
                                }
                            });


                        }
                    }
                )
                ;
            } else {
                //User does no belong to a company, he lists his own parkings
                if (o.parkingIDs != null) {
                    console.log(o.parkingIDs);
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

/*
    Parkings: save
*/

exports.saveParking = function (id, filename, approvedStatus, email, callback) {
    accounts.findOneAndUpdate(
        {
            email: email
        },
        {
            $addToSet: {
                parkingIDs: id
            }
        },
        {
            returnOriginal: false
        },
        function (e, res) {
            if (e != null) {
                //parkingID added successfully to the user
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
            } else {
                callback(e);
            }
        }
    )
};


















