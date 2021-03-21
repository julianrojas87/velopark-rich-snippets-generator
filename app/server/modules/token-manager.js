const jwt = require('jsonwebtoken');
const fs = require('fs');

exports.getStringForToken = function (token, callback) {
    if (!token)
        callback("No token found");
    else {
        jwt.verify(token, process.env.SECRET_TOKEN, function (err, decoded) {
            if (err) {
                callback(err);
            } else {
                callback(null, decoded.name);
            }
        });
    }
};

exports.getTokenForString = function (username) {
    let token = jwt.sign({name: username}, process.env.SECRET_TOKEN, {
        expiresIn: 24 * 60 * 60 * 1000 // 1 day
    });
    return token;
};