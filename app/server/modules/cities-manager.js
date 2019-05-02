const dbAdapter = require('./database-adapter');

exports.listAllCities = function(callback){
    dbAdapter.findAllCityNames(callback);
};

exports.isLocationWithinCities = function (lat, lon, cityNames, callback) {
    dbAdapter.findCitiesByLocation(lat, lon,function (error, res) {
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