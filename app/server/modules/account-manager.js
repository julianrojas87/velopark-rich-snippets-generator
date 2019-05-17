const crypto = require('crypto');
const moment = require('moment');
const utils = require('../utils/utils');
const dbAdapter = require('./database-adapter');
const EM = require('./email-dispatcher');

const guid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
        c => {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
}

/*
	login validation methods
*/

exports.getAccountByEmail = function (email) {
    return new Promise((resolve, reject) => {
        dbAdapter.findAccountByEmail(email, (err, acc) => {
            if (err) {
                reject(err);
            } else {
                resolve(acc);
            }
        });
    });
};

let availableLanguages = new Set(['nl', 'en', 'fr', 'de', 'es']);
exports.updateLanguage = function (email, lang) {
    return new Promise((resolve, reject) => {
        if (availableLanguages.has(lang)) {
            dbAdapter.updateAccountLanguage(email, lang)
                .then(function (result) {
                    resolve(result);
                }).catch(function (reason) {
                reject(reason);
            })
        } else {
            reject("Unknown language");
        }
    });
};

exports.autoLogin = function (email, pass, callback) {
    dbAdapter.findAccountByEmail(email, function (e, o) {
        if (o) {
            o.pass === pass ? callback(o) : callback(null);
        } else {
            callback(null);
        }
    });
};

exports.manualLogin = function (email, pass, callback) {
    dbAdapter.findAccountByEmail(email, function (e, o) {
        if (o == null) {
            callback('User not found');
        } else {
            validatePassword(pass, o.pass, function (err, res) {
                if (res) {
                    callback(null, o);
                } else {
                    callback('Invalid Password');
                }
            });
        }
    });
};

exports.generateLoginKey = function (email, ipAddress, callback) {
    let cookie = guid();
    dbAdapter.updateAccountCookie(email, ipAddress, cookie, callback);
};

exports.validateLoginKey = function (cookie, ipAddress, callback) {
    dbAdapter.findAccountByCookie(cookie, callback);
};

exports.generatePasswordKey = function (email, ipAddress, callback) {
    let passKey = guid();
    dbAdapter.updateAccountPasskey(email, ipAddress, passKey, callback);
};

exports.validatePasswordKey = function (passKey, ipAddress, callback) {
    // ensure the passKey maps to the user's last recorded ip address //
    dbAdapter.findAccountByPasskey(passKey, ipAddress, callback);
};

exports.isUserSuperAdmin = function (email, callback) {
    dbAdapter.findAccountByEmail(email, function (error, res) {
        if (error != null) {
            callback(error);
        } else {
            if (res.superAdmin) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        }
    });
};

exports.getAccountCityNamesByEmail = function (email, callback) {
    dbAdapter.findAccountByEmail(email, function (error, res) {
        if (error != null) {
            callback(error);
        } else {
            callback(null, res.cityNames);
        }
    });
};

exports.isUserCityRep = function (email, cityName, callback) {
    dbAdapter.findAccountByEmail(email, function (error, res) {
        if (error != null) {
            callback(error);
        } else {

            if (cityName === '') {	//if city is not specified, return whether or not there are cities linked to this account
                callback(null, res.cityNames.length > 0);
            } else {	//if city is specified, return whether this city is managed by this user
                let found = false;
                let i = 0;
                while (!found && i < res.cityNames.length) {
                    if (res.cityNames[i].name === cityName && res.cityNames[i].enabled === true) {
                        found = true;
                    }
                    i++;
                }
                if (found) {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            }
        }
    });
};

exports.isAccountCityRepForParkingID = function (email, parkingID, callback) {
    dbAdapter.isAccountCityRepForParkingID(email, parkingID, callback);
};

exports.getAllEmails = function (callback) {
    dbAdapter.findAllEmails(callback);
};

/*
	record insertion, update & deletion methods
*/

exports.addNewAccount = function (newData, callback) {
    let pass = newData.pass;
    let email = newData.email;
    let companyName = newData.companyName;
    let cityNames = [];
    for (let city in newData.cityNames) {
        cityNames.push({name: newData.cityNames[city], enabled: false});
    }

    //TODO: validate city names

    if (!email.includes("@")) {
        callback("Invalid email address.");
    } else if ((companyName == null || companyName === '') && cityNames.length === 0) {
        callback("No valid company or region given.");
    } else {
        if (companyName === '') {
            companyName = null;
        }
        dbAdapter.findAccountByEmail(email, function (e, o) {
            if (o) {
                callback('There is already an account with this email address');
            } else {
                //copy data to prevent unwanted data fields in database in case of misuse.
                let insertData = {
                    email: email,
                    pass: utils.saltAndHash(pass),
                    date: new Date(),
                    companyName: companyName,
                    cityNames: cityNames,
                    superAdmin: false
                };
                dbAdapter.insertAccount(insertData, callback);
            }
        });
    }
};

exports.updateAccount = function (newData, callback) {
    if (!newData.pass || newData.pass === '') {
        dbAdapter.updateAccount(newData, callback);
    } else {
        newData.pass = utils.saltAndHash(newData.pass);
        dbAdapter.updateAccount(newData, callback);
    }
};

exports.updatePassword = function (passKey, newPass, callback) {
    newPass = utils.saltAndHash(newPass);
    dbAdapter.updateAccountPassByPasskey(passKey, newPass, callback);
};

/*
	account lookup methods
*/

exports.getAllRecords = function (callback) {
    dbAdapter.findAccounts(callback);
};

exports.deleteAccount = function (id, callback) {
    dbAdapter.deleteAccount(id, callback);
};

exports.deleteAllAccounts = function (callback) {
    dbAdapter.deleteAccounts(callback);
};

exports.toggleCompanyEnabled = function (email, enabled, callback) {
    dbAdapter.updateAccountEnableCompany(email, enabled)
        .then(result => {
            callback(null, result);
            if(enabled){
                EM.addActivatedAccountToBeMailed(result.value);
            } else {
                EM.removeActivatedAccountToBeMailed(result.value);
            }
        })
        .catch(error => {
            callback(error)
        });
};

exports.toggleCityEnabled = function (email, cityName, enabled, callback) {
    dbAdapter.updateAccountEnableCity(email, cityName, enabled)
        .then(result => {
            callback(null, result);
            if (result.value && result.value.cityNames && result.value.cityNames.length > 0) {
                let previouslyEnabled = 0;
                for (let i in result.value.cityNames) {
                    if (result.value.cityNames[i]['enabled']) {
                        previouslyEnabled++;
                    }
                }
                if(!previouslyEnabled && enabled){
                    EM.addActivatedAccountToBeMailed(result.value);
                } else if(previouslyEnabled <= 1 && !enabled){
                    EM.removeActivatedAccountToBeMailed(result.value);
                }
            }
        })
        .catch(error => {
            callback(error)
        });
};

/*
	validation methods
*/

var validatePassword = function (plainPass, hashedPass, callback) {
    var salt = hashedPass.substr(0, 10);
    var validHash = salt + utils.md5(plainPass + salt);
    callback(null, hashedPass === validHash);
};

/*var listIndexes = function () {
	accounts.indexes(null, function (e, indexes) {
		for (var i = 0; i < indexes.length; i++) console.log('index:', i, indexes[i]);
	});
};*/

