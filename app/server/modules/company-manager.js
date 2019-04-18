const dbAdapter = require('./database-adapter');

exports.listAllCompanies = function(callback){
    dbAdapter.findAllCompanies(callback);
};

exports.listAllCompaniesWithUsers = function(callback){
    dbAdapter.findAllCompaniesWithUsers(callback);
};

exports.listAllCompanyNames = function(callback){
    dbAdapter.findAllCompanyNames(callback);
};

exports.createNewCompany = function(companyName, callback){
    dbAdapter.insertCompany(companyName, callback);
};