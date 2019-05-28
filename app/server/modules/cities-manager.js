const dbAdapter = require('./database-adapter');

exports.listAllCities = function(callback){
    dbAdapter.findAllCityNames(callback);
};

exports.isLocationWithinCities = function (lat, lon, cityNames, callback) {
    dbAdapter.findCitiesByLocation(lat, lon, null,function (error, res) {
        if (error != null) {
            callback(error);
        } else if(res) {
            for(city in cityNames){
                if(res.includes(cityNames[city].name)){
                    callback(null, true);
                    return;
                }
            }
            callback(null, false);
        } else {
            callback(null, false); //No region entities found for this location.
        }
    });
};

exports.getMunicipalityForLocation = function(lat, lon, lang) {
    return new Promise((resolve, reject) => {
        dbAdapter.findMunicipalityByLocation(lat, lon, lang, function(error, res){
            if(error != null){
                reject(error);
            } else {
                resolve(res);
            }
        });
    }); 
}

exports.listCitiesForLocation = function(lat, lon, lang){
    return new Promise((resolve, reject) => {
        dbAdapter.findCitiesByLocation(lat, lon, lang, function(error, res){
            if(error != null){
                reject(error);
            } else {
                resolve(res);
            }
        });
    });
};