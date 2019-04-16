const dbAdapter = require('./database-adapter');

exports.listAllCompanies = function(callback){
    dbAdapter.findAllCompanyNames(callback);
};