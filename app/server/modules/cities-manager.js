const dbAdapter = require('./database-adapter');

exports.listAllCities = function(callback){
    dbAdapter.findAllCityNames(callback);
};