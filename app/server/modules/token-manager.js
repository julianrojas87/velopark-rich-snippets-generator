const jwt = require('jsonwebtoken');
const fs = require('fs');
const secretToken = 'ohpWbDrlp7WXpgHKsMWBzGaMq0mdHz2UlvVk7wPaWlqTeT6Obk396UmSlhuwh84';

exports.getStringForToken = function (token, callback) {
    if (!token)
        callback("No token found");
    else {
        jwt.verify(token, secretToken, function (err, decoded) {
            if (err) {
                callback(err);
            } else {
                callback(null, decoded.name);
            }
        });
    }
};

exports.getTokenForString = function (username) {
    let token = jwt.sign({name: username}, secretToken, {
        expiresIn: 24 * 60 * 60 * 1000 // 1 day
    });
    return token;
};