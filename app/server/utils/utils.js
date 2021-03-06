const crypto = require('crypto');

/*
	encryption methods
*/
exports.saltAndHash = function (pass, callback) {
    var salt = generateSalt();
    return salt + md5(pass + salt);
};

exports.md5 = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
};

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
};

function generateSalt() {
    var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
    var salt = '';
    for (var i = 0; i < 10; i++) {
        var p = Math.floor(Math.random() * set.length);
        salt += set[p];
    }
    return salt;
}

exports.guid = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
        c => {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
};