const jwt = require('jsonwebtoken');
const fs = require('fs');
const config_secret = JSON.parse(fs.readFileSync('./config_secret.json', 'utf-8'));

exports.getStringForToken = function (token, callback) {
    if (!token)
        callback("No token found");
    else {
        jwt.verify(token, config_secret.tokenSecret, function (err, decoded) {
            if (err) {
                callback(err);
            } else {
                callback(null, decoded.name);
            }
        });
    }
};

exports.getTokenForString = function (username) {
    let token = jwt.sign({name: username}, config_secret.tokenSecret, {
        expiresIn: 24 * 60 * 60 * 1000 // 1 day
    });
    return token;
};