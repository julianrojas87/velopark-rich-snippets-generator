
const crypto = require('crypto');
const moment = require('moment');
const dbAdapter = require('./database-adapter');

const guid = function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8; return v.toString(16); }); }

/*
	login validation methods
*/

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

exports.isUserSuperAdmin = function(email, callback){
	dbAdapter.findAccountByEmail(email, function(error, res){
		if(error != null){
			callback(error);
		} else {
			if(res.superAdmin){
				callback(null, true);
			} else {
				callback(null, false);
			}
		}
	});
};

exports.getAllEmails = function(callback){
	dbAdapter.findAllEmails(callback);
};

/*
	record insertion, update & deletion methods
*/

exports.addNewAccount = function (newData, callback) {
	dbAdapter.findAccountByEmail(newData.email, function (e, o) {
		if (o) {
			callback('There is already an account with this email address');
		} else {
			saltAndHash(newData.pass, function (hash) {
				newData.pass = hash;
				// append date stamp when record was created //
				newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
				newData.superAdmin = false;
				dbAdapter.insertAccount(newData, callback);
			});
		}
	});
};

exports.updateAccount = function (newData, callback) {
	if (!newData.pass || newData.pass === '') {
		dbAdapter.updateAccount(newData, callback);
	} else {
		saltAndHash(newData.pass, function (hash) {
			newData.pass = hash;
			dbAdapter.updateAccount(newData, callback);
		});
	}
};

exports.updatePassword = function (passKey, newPass, callback) {
	saltAndHash(newPass, function (hash) {
		newPass = hash;
		dbAdapter.updateAccountPassByPasskey(passKey, newPass, callback);
	});
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

exports.toggleCompanyEnabled = function(email, enabled, callback){
	dbAdapter.updateAccountEnableCompany(email, enabled, callback);
};

exports.toggleCityEnabled = function(email, cityName, enabled, callback){
	dbAdapter.updateAccountEnableCity(email, cityName, enabled, callback);
};

/*
	private encryption & validation methods
*/

var generateSalt = function () {
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
};

var md5 = function (str) {
	return crypto.createHash('md5').update(str).digest('hex');
};

var saltAndHash = function (pass, callback) {
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
};

var validatePassword = function (plainPass, hashedPass, callback) {
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
};

/*var listIndexes = function () {
	accounts.indexes(null, function (e, indexes) {
		for (var i = 0; i < indexes.length; i++) console.log('index:', i, indexes[i]);
	});
};*/

