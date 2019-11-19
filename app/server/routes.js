const fs = require('fs');
const path = require("path");
const multer = require("multer");
const AM = require('./modules/account-manager');
const EM = require('./modules/email-dispatcher');
const CoM = require('./modules/company-manager');
const CiM = require('./modules/cities-manager');
const PM = require('./modules/parkings-manager');
const ToM = require('./modules/token-manager');
const utils = require('./utils/utils');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const data = config['data'] || './data';
const domainName = config['domain'] || '';
const vocabURI = config['vocabulary'] || 'https://velopark.ilabt.imec.be';

module.exports = app => {


    /*
        index
    */

    app.options('/*', (req, res) => {
        res.set({ 
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
        });
        res.send(200);
    });

    app.get('/', function (req, res) {
        // check if the user has an auto login key saved in a cookie //
        if (req.cookies.login == undefined) {
            res.render('index.html', {
                domainName: domainName,
                vocabURI: vocabURI,
                username: null,
                superAdmin: false,
                company: { name: null, enabled: false },
                cityrep: false
            });
        } else {
            // attempt automatic login //
            AM.validateLoginKey(req.cookies.login, req.ip, function (e, o) {
                if (o) {
                    AM.autoLogin(o.email, o.pass, function (o) {
                        let domain = domainName != '' ? '/' + domainName : '';
                        req.session.user = o;
                        res.redirect(domain + '/home');
                    });
                } else {
                    res.render('index.html', {
                        domainName: domainName,
                        vocabURI: vocabURI,
                        username: null,
                        superAdmin: false,
                        company: { name: null, enabled: false },
                        cityrep: false
                    });
                }
            });
        }
    });

    /*
        new accounts
    */

    app.post('/signup', function (req, res) {
        AM.addNewAccount({
            email: req.body['email'],
            pass: req.body['pass'],
            companyName: req.body['company'],
            cityNames: req.body['cities']
        }, function (e) {
            if (e) {
                res.status(400).send(e);
            } else {
                //Parkings.initUser(req.body['email']);
                res.status(200).send('ok');
            }
        });
    });

    /*
        login & logout
    */

    app.post('/login', function (req, res) {
        AM.manualLogin(req.body['email'], req.body['pass'], function (e, o) {
            if (!o) {
                res.status(400).send(e);
            } else {
                if (o.companyName) {
                    if (!o.companyEnabled) {
                        res.status(403).send('Your account request for ' + o.companyName
                            + ' is yet to be approved by the admins');
                        return;
                    }
                } else if (o.cityNames && o.cityNames.length > 0) {
                    let enabled = false;
                    for (let i in o.cityNames) {
                        if (o.cityNames[i]['enabled']) {
                            enabled = true;
                            break;
                        }
                    }
                    if (!enabled) {
                        res.status(403).send('Your account request as a City Representative'
                            + ' is yet to be approved by the admins');
                        return;
                    }
                } else if (!o.superAdmin) {
                    res.status(403).send('Your account is not authorized to login. Please contact the admins.');
                    return;
                }

                delete o.pass;
                req.session.user = o;
                AM.generateLoginKey(o.email, req.ip, function (key) {
                    res.cookie('login', key, { maxAge: 90000000 });
                    res.status(200).send(o);
                });
            }
        });
    });

    app.post('/logout', function (req, res) {
        res.clearCookie('login');
        req.session.destroy(function (e) {
            res.status(200).send('ok');
        });
    });

    /*
        secured home
    */

    app.get('/home', async function (req, res) {
        // check if the user is logged in
        let domain = domainName != '' ? '/' + domainName : '';
        if (req.session.user == null) {
            res.redirect(domain + '/');
        } else {
            let parkingData = null;
            if (req.query.parkingId) {
                PM.getParking(req.session.user.email, encodeURIComponent(req.query.parkingId), (error, result, approved, company) => {
                    if (error != null) {
                        console.error(error);
                        res.status(401).redirect(domain + '/');
                    } else {
                        parkingData = result;
                        res.render('home.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.session.user.email,
                            loadedParking: parkingData,
                            superAdmin: req.session.user.superAdmin,
                            company: { name: req.session.user.companyName, enabled: req.session.user.companyEnabled },
                            cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                            emailParkingOwner: req.session.user.email,
                            nameCompanyParkingOwner: req.session.user.companyName,
                            parkingApproved: approved,
                            parkingCompany: company ? company.name : null
                        });
                    }
                });
            } else {
                res.render('home.html', {
                    domainName: domainName,
                    vocabURI: vocabURI,
                    username: req.session.user.email,
                    loadedParking: '',
                    superAdmin: req.session.user.superAdmin,
                    company: { name: req.session.user.companyName, enabled: req.session.user.companyEnabled },
                    cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                    emailParkingOwner: req.session.user.email,
                    nameCompanyParkingOwner: req.session.user.companyName,
                    parkingApproved: null,
                    parkingCompany: null
                });
            }
        }
    });

    app.get('/admin', async function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.status(401).redirect(domain + '/');
        } else {
            //check if user is superadmin
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.redirect(domain + '/home');
                } else {
                    if (value === true) {
                        res.render('admin-home.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.session.user.email,
                            superAdmin: req.session.user.superAdmin,
                            company: { name: req.session.user.companyName, enabled: req.session.user.companyEnabled },
                            cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                        });
                    } else {
                        let domain = domainName != '' ? '/' + domainName : '';
                        res.redirect(domain + '/home');
                    }
                }
            });

        }
    });

    /*
        secured parkings
    */

    app.get('/admin-parkings', async function (req, res) {
        // check if the user is logged in
        let domain = domainName != '' ? '/' + domainName : '';
        if (req.session.user == null) {
            res.status(401).redirect(domain + '/');
        } else {
            //check if user is superadmin
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.redirect(domain + '/home');
                } else {
                    // Parkings filters
                    let idFilter = req.query.idFilter;
                    let nameFilter = req.query.nameFilter;
                    if (value === true) {
                        let rangeHeader = req.header("range");
                        let rangeStart = 0;
                        let rangeEnd = 50;
                        if (rangeHeader) {
                            let matches = rangeHeader.match(/(.*)=(\d*)-(\d*)/);
                            rangeStart = parseInt(matches[2], 10);
                            if (rangeStart < 0) {
                                rangeStart = 0;
                            }
                            rangeEnd = parseInt(matches[3], 10);
                            if (rangeEnd <= 0) {
                                rangeEnd = 50;
                            }
                        }

                        PM.listAllParkings(rangeStart, rangeEnd - rangeStart, idFilter, nameFilter)
                            .then(parkings => {
                                if (!rangeHeader) {
                                    res.render('admin-parkings.html', {
                                        domainName: domainName,
                                        vocabURI: vocabURI,
                                        username: req.session.user.email,
                                        parkings: parkings ? parkings : {},
                                        superAdmin: req.session.user.superAdmin,
                                        company: {
                                            name: req.session.user.companyName,
                                            enabled: req.session.user.companyEnabled
                                        },
                                        cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                                        rangeStart: rangeStart,
                                        rangeEnd: rangeEnd,
                                        idFilter: '',
                                        nameFilter: ''
                                    });
                                } else {
                                    res.render('admin-parkings-part.html', {
                                        domainName: domainName,
                                        vocabURI: vocabURI,
                                        username: req.session.user.email,
                                        parkings: parkings ? parkings : {},
                                        superAdmin: req.session.user.superAdmin,
                                        company: {
                                            name: req.session.user.companyName,
                                            enabled: req.session.user.companyEnabled
                                        },
                                        cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                                        rangeStart: rangeStart,
                                        rangeEnd: rangeEnd,
                                        idFilter: idFilter,
                                        nameFilter: nameFilter
                                    });
                                }
                            })
                            .catch(error => {
                                console.error(error);
                                res.status(500).send();
                            });
                    } else {
                        res.redirect(domain + '/home');
                    }
                }
            });

        }
    });

    app.get('/admin-users', async function (req, res) {
        let domain = domainName != '' ? '/' + domainName : '';
        // check if the user is logged in
        if (req.session.user == null) {
            res.status(401).redirect(domain + '/');
        } else {
            //check if user is superadmin
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.redirect(domain + '/home');
                } else {
                    if (value === true) {
                        AM.getAllRecords(function (error, users) {
                            if (error != null) {
                                console.error(error);
                                res.redirect(domain + '/home');
                            } else {
                                res.render('admin-users.html', {
                                    domainName: domainName,
                                    vocabURI: vocabURI,
                                    username: req.session.user.email,
                                    users: users ? users : {},
                                    superAdmin: req.session.user.superAdmin,
                                    company: {
                                        name: req.session.user.companyName,
                                        enabled: req.session.user.companyEnabled
                                    },
                                    cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                                });
                            }
                        });
                    } else {
                        res.redirect(domain + '/home');
                    }
                }
            });

        }
    });

    app.post('/admin-users/toggle-company-state/:useremail', function (req, res) {
        if (req.session.user == null) {
            res.status(401).send();
        } else {
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.status(500).send();
                } else {
                    AM.toggleCompanyEnabled(req.params.useremail, req.body['companyEnabled'] === "true", function (error, result) {
                        if (error != null) {
                            console.error(error);
                            res.status(500).send();
                        } else {
                            if (result.value != null) {
                                res.status(200).json(result);
                            } else {
                                res.status(409).send('Could not enable/disable company because this user does not have a company.');
                            }
                        }
                    });
                }
            });
        }
    });

    app.post('/admin-users/toggle-city-state/:useremail', function (req, res) {
        if (req.session.user == null) {
            res.status(401).send();
        } else {
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.status(500).send();
                } else {
                    if (value === true) {
                        AM.toggleCityEnabled(req.params.useremail, req.body['cityName'], req.body['cityEnabled'] === "true", function (error, result) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send();
                            } else {
                                if (result.value != null) {
                                    res.status(200).json(result);
                                } else {
                                    res.status(409).send('Could not enable/disable city, probably because this user does not have this city in it\'s list.');
                                }
                            }
                        });
                    } else {
                        res.status(401).send('You are not allowed to do this.');
                    }
                }
            });
        }
    });

    app.get('/admin-companies', async function (req, res) {
        let domain = domainName != '' ? '/' + domainName : '';
        // check if the user is logged in
        if (req.session.user == null) {
            res.status(401).redirect(domain + '/');
        } else {
            //check if user is superadmin
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.redirect(domain + '/home');
                } else {
                    if (value === true) {
                        CoM.listAllCompaniesWithUsers(function (error, companies) {
                            if (error != null) {
                                console.error(error);
                                res.redirect(domain + '/home');
                            } else {
                                res.render('admin-companies.html', {
                                    domainName: domainName,
                                    vocabURI: vocabURI,
                                    username: req.session.user.email,
                                    companies: companies ? companies : [],
                                    superAdmin: req.session.user.superAdmin,
                                    company: {
                                        name: req.session.user.companyName,
                                        enabled: req.session.user.companyEnabled
                                    },
                                    cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                                });
                            }
                        });
                    } else {
                        res.redirect(domain + '/home');
                    }
                }
            });

        }
    });


    app.post('/admin-companies/new-company/:newcompanyname', function (req, res) {
        if (req.session.user == null) {
            res.status(401).send();
        } else {
            //Check for admin:
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.status(500).send();
                } else {
                    if (value === true) {
                        //User is admin, create company
                        CoM.createNewCompany(req.params.newcompanyname, function (error, result) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send(error);
                            } else {
                                if (result != null) {
                                    res.status(200).json(result);
                                } else {
                                    res.status(409).send('Could not create company.');
                                }
                            }
                        });
                    } else {
                        res.status(401).send();
                    }

                }
            });
        }
    });

    app.post('/admin-companies/transfer-parking', function (req, res) {
        if (req.session.user == null) {
            res.status(401).send();
        } else {
            //Check for admin:
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.status(500).send();
                } else {
                    if (value === true) {
                        //User is admin
                        let newCompany = req.body['newcompany'];
                        let parkingID = req.body['parkingid'];
                        CoM.transferParking(newCompany, parkingID, function (error, result) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send(error);
                            } else {
                                if (result != null) {
                                    res.status(200).send('Ok');
                                } else {
                                    res.status(409).send('Could not create company.');
                                }
                            }
                        });
                    } else {
                        res.status(401).send();
                    }

                }
            });
        }
    });

    /*
        City representatives
    */
    app.get('/cityrep', async function (req, res) {
        // check if the user is logged in
        let domain = domainName != '' ? '/' + domainName : '';
        if (req.session.user == null) {
            res.status(401).redirect(domain + '/');
        } else {
            //check if user is cityrep
            AM.getAccountCityNamesByEmail(req.session.user.email, function (error, result) {
                if (result && result.length > 0) {
                    res.render('city-home.html', {
                        domainName: domainName,
                        vocabURI: vocabURI,
                        username: req.session.user.email,
                        cityNames: result,
                        superAdmin: req.session.user.superAdmin,
                        company: { name: req.session.user.companyName, enabled: req.session.user.companyEnabled },
                        cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                    });
                } else {
                    let domain = domainName != '' ? '/' + domainName : '';
                    res.redirect(domain + '/home');
                }
            });

        }
    });

    app.get('/cityrep-parkings', async function (req, res) {
        // check if the user is logged in
        let domain = domainName != '' ? '/' + domainName : '';
        let cityname = req.query.cityname;
        if (cityname == null) {
            res.status(412).redirect(domain + '/');
        }
        if (req.session.user == null) {
            res.status(401).redirect(domain + '/');
        } else {
            //check if user is cityrep for this city
            AM.isUserCityRep(req.session.user.email, cityname, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.redirect(domain + '/home');
                } else {
                    if (value === true) {
                        let filter = req.query.filter;
                        let rangeHeader = req.header("range");
                        let rangeStart = 0;
                        let rangeEnd = 50;
                        if (rangeHeader) {
                            let matches = rangeHeader.match(/(.*)=(\d*)-(\d*)/);
                            rangeStart = parseInt(matches[2], 10);
                            if (rangeStart < 0) {
                                rangeStart = 0;
                            }
                            rangeEnd = parseInt(matches[3], 10);
                            if (rangeEnd <= 0) {
                                rangeEnd = 50;
                            }
                        }

                        PM.listParkingsInCity(cityname, rangeStart, rangeEnd - rangeStart, filter, function (error, parkings) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send('failed');
                            } else {
                                if (!rangeHeader) {
                                    res.render('city-parkings.html', {
                                        domainName: domainName,
                                        vocabURI: vocabURI,
                                        username: req.session.user.email,
                                        cityName: cityname,
                                        parkings: parkings ? parkings : {},
                                        superAdmin: req.session.user.superAdmin,
                                        company: {
                                            name: req.session.user.companyName,
                                            enabled: req.session.user.companyEnabled
                                        },
                                        cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                                        rangeStart: rangeStart,
                                        rangeEnd: rangeEnd,
                                        filter: ''
                                    });
                                } else {
                                    res.render('city-parkings-part.html', {
                                        domainName: domainName,
                                        vocabURI: vocabURI,
                                        username: req.session.user.email,
                                        cityName: cityname,
                                        parkings: parkings ? parkings : {},
                                        superAdmin: req.session.user.superAdmin,
                                        company: {
                                            name: req.session.user.companyName,
                                            enabled: req.session.user.companyEnabled
                                        },
                                        cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                                        rangeStart: rangeStart,
                                        rangeEnd: rangeEnd,
                                        filter: filter
                                    });
                                }
                            }
                        });
                    } else {
                        res.redirect(domain + '/home');
                    }
                }
            });

        }
    });

    app.post('/cityrep/check-location/:lat/:lng', async function (req, res) {
        if (req.session.user == null) {
            res.status(200).send(true);
        } else if (req.session.user.superAdmin || (req.session.user.companyName && req.session.user.companyName !== '')) {
            res.status(200).send(true);
        } else if (req.session.user.cityNames && req.session.user.cityNames.length > 0) {
            if (req.params.lat && req.params.lng) {
                try {
                    CiM.isLocationWithinCities(parseFloat(req.params.lat), parseFloat(req.params.lng), req.session.user.cityNames, function (error, result) {
                        if (error != null) {
                            console.error(error);
                            res.status(500).send(error);
                        } else {
                            res.status(200).send(result);   //result == true/false
                        }
                    });
                } catch (e) {
                    res.status(500).send("Could not process your request");
                }
            }
        } else {
            res.status(401).send('Unauthorized');
        }
    });

    app.get('/cityrep/get-regions/:lat/:lng', async function (req, res) {
        if (req.session.user == null) {
            res.status(401).send('Unauthorized');
        } else {
            if (req.params.lat && req.params.lng) {
                try {
                    CiM.getMunicipalityForLocation(parseFloat(req.params.lat), parseFloat(req.params.lng), req.session.user.lang)
                        .then(result => {
                            res.status(200).send(result);
                        })
                        .catch(error => {
                            console.error(error);
                            res.status(500).send(error);
                        });
                } catch (e) {
                    res.status(500).send("Could not process your request");
                }
            }
        }
    });

    app.get('/get-all-emails', async function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.status(401).redirect(domain + '/');
        } else {
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.redirect(domain + '/home');
                } else {
                    AM.getAllEmails(function (error, result) {
                        if (error != null) {
                            console.error(error);
                            res.status(500).send();
                        } else {
                            res.status(200).json(result);
                        }
                    });
                }
            });
        }
    });

    app.get('/parkings', async function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            let idFilter = req.query.idFilter;
            let nameFilter = req.query.nameFilter;
            let rangeHeader = req.header("range");
            let rangeStart = 0;
            let rangeEnd = 50;
            if (rangeHeader) {
                let matches = rangeHeader.match(/(.*)=(\d*)-(\d*)/);
                rangeStart = parseInt(matches[2], 10);
                if (rangeStart < 0) {
                    rangeStart = 0;
                }
                if (matches[3] !== "0") {
                    rangeEnd = parseInt(matches[3], 10);
                }
            }

            PM.listParkingsByEmail(req.session.user.email, rangeStart, rangeEnd - rangeStart, idFilter, nameFilter, function (error, parkings) {
                if (error != null) {
                    res.status(500).send("Could not get parkings for this user.");
                } else {
                    if (!rangeHeader) {
                        res.render('parkings.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.session.user.email,
                            parkings: parkings ? parkings : {},
                            superAdmin: req.session.user.superAdmin,
                            company: { name: req.session.user.companyName, enabled: req.session.user.companyEnabled },
                            cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                            rangeStart: rangeStart,
                            rangeEnd: rangeEnd,
                            idFilter: '',
                            nameFilter: ''
                        });
                    } else {
                        res.render('parkings-part.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.session.user.email,
                            parkings: parkings ? parkings : {},
                            superAdmin: req.session.user.superAdmin,
                            company: { name: req.session.user.companyName, enabled: req.session.user.companyEnabled },
                            cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                            rangeStart: rangeStart,
                            rangeEnd: rangeEnd,
                            idFilter: idFilter,
                            nameFilter: nameFilter
                        });
                    }
                }
            });
        }
    });


    app.post('/parkings/toggle-parking-enabled', function (req, res) {
        if (req.session.user == null) {
            res.status(401).send();
        } else {
            //2 valid possibilities: user is superadmin / user is cityrep for a region that contains this parking
            //First check for admin:
            AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                if (error != null) {
                    console.error(error);
                    res.status(500).send();
                } else {
                    if (value === true) {
                        PM.toggleParkingEnabled(encodeURIComponent(req.body['parkingId']), req.body['parkingEnabled'] === "true", function (error, result) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send();
                            } else {
                                if (result != null) {
                                    res.status(200).json(result);
                                } else {
                                    res.status(409).send('Could not enable/disable parking.');
                                }
                            }
                        });
                    } else {
                        //User is not superAdmin, maybe he is cityrep for the region of this parking?
                        AM.isAccountCityRepForParkingID(req.session.user.email, encodeURIComponent(req.body['parkingId']), function (error, value) {
                            if (value === true) {
                                PM.toggleParkingEnabled(encodeURIComponent(req.body['parkingId']), req.body['parkingEnabled'] === "true", function (error, result) {
                                    if (error != null) {
                                        console.error(error);
                                        res.status(500).send();
                                    } else {
                                        if (result != null) {
                                            res.status(200).json(result);
                                        } else {
                                            res.status(409).send('Could not enable/disable parking.');
                                        }
                                    }
                                });
                            } else {
                                res.status(401).send('You are not authorized to do that.');
                            }
                        });
                    }

                }
            });
        }
    });

    app.post('/save-parking', async function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            if (!req.body['jsonld']) {
                res.status(400).send('Oops! We can\'t understand your request.');
                return;
            }
            let user = req.session.user;
            if (user.superAdmin) {
                //save as admin
                PM.saveParkingAsSuperAdmin(req.body['parkingCompany'], req.body['jsonld'], req.body['approved'] === 'true', function (error, result) {
                    if (error != null) {
                        res.status(500).send(error);
                    } else {
                        res.status(200).send('ok');
                    }
                });
            } else if (user.companyName) {
                if (user.companyEnabled) {
                    //save as company user
                    PM.saveParkingAsCompanyUser(req.body['company'], req.body['jsonld'], req.body['approved'] === 'true', function (error, result) {
                        if (error != null) {
                            res.status(500).send(error);
                        } else {
                            res.status(200).send('ok');
                        }
                    });
                } else {
                    res.status(401).send("Your company membership has not been approved yet."); //should not happen, since this person is not allowed to log in
                }
            } else if (user.cityNames.length > 0) {
                //check if parking is within your regions
                PM.saveParkingAsCityRep(req.body['jsonld'], user.cityNames, req.body['approved'] === 'true', req.body['parkingCompany'], function (error, result) {
                    if (error != null) {
                        console.log(error);
                        res.status(500).send(error);
                    } else {
                        res.status(200).send('ok');
                    }
                });
            } else {
                //you cannot save parkings.
                res.status(401).send("you cannot save parkings."); //should not happen, since this person is not allowed to log in
            }
        }
    });

    const upload = multer({
        dest: data + '/photo'
        // you might also want to set some limits: https://github.com/expressjs/multer#limits
    });

    app.post('/upload-photo', upload.single("imgFile" /* name attribute of <file> element in the form */), (req, res) => {
        const myPath = req.file.path;

        // check if the user is logged in
        if (req.session.user == null) {
            res.status(401).send('You are not logged in.');
            fs.unlink(myPath, err => {
                if (err) {
                    console.error(err);
                }
            });
        } else {
            let guid = utils.guid();
            let newPath = data + '/photo/' + guid + path.extname(req.file.originalname).toLowerCase();
            fs.rename(myPath, newPath, err => {
                if (err) {
                    console.error(err);
                    res.status(500).send("Error while saving image.");
                } else {
                    res.status(200).send('/photo/' + guid + path.extname(req.file.originalname).toLowerCase());
                }
            });
        }
    });

    app.get("/photo/:id", (req, res) => {
        res.sendFile(path.normalize(data + '/photo/' + req.params.id));
    });

    app.delete("/photo/:id", function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            res.status(401).send('You are not logged in.');
        } else {
            if (req.params.id.indexOf("/") > 0 || req.params.id.indexOf("\\") > 0) {
                res.status(400).send("Some characters are not allowed in this filename.");
                return;
            }
            try {
                if (fs.existsSync(data + '/photo/' + req.params.id)) {
                    fs.unlinkSync(data + '/photo/' + req.params.id);
                    res.status(200).send("Deleted successfully.");
                } else {
                    res.status(404).send('Photo not found');
                }
            } catch (e) {
                console.error(e);
                res.status(500).send('Failed');
            }

        }
    });

    app.get('/get-parking', async function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else if (req.query.parkingId == null) {
            res.status(400).send('No parkingId found.');
        } else {
            PM.getParking(req.session.user.email, req.query.parkingId, function (error, result) {
                if (error != null) {
                    console.error(error);
                } else {
                    if (result != null) {
                        res.json(JSON.parse(result));
                    } else {
                        res.status(400).send("could not find this parking in your account.");
                    }
                }
            });
        }
    });

    app.delete('/delete-parking', function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            PM.deleteParking(req.session.user.email, encodeURIComponent(req.query.parkingId), function (error) {
                if (error != null) {
                    console.error(error);
                    res.status(500).send('fail');
                } else {
                    res.status(200).send('ok');
                }
            });
        }
    });

    app.get('/download', function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            PM.downloadParking(req.session.user.email, encodeURIComponent(req.query.parkingId), res);
        }
    });

    app.get('/companynames', async function (req, res) {
        CoM.listAllCompanyNames(function (error, result) {
            if (error != null) {
                res.status(500).send('failed');
            } else {
                res.status(200).json(result);
            }
        });
    });

    app.get('/citynames', async function (req, res) {
        CiM.listAllCities(function (error, result) {
            if (error != null) {
                res.status(500).send('failed');
            } else {
                res.status(200).json(result);
            }
        });
    });

    app.get('/regionhierarchy', async function (req, res) {
        CiM.listRegionHierarchy().then(result => {
            res.status(200).json(result);
        }).catch(error => {
            console.error(error);
            res.status(500).send('failed');
        });
    });

    /*
        list of terms
    */

    app.get('/terms', async function (req, res) {
        let list = await PM.getListOfTerms();
        res.status(200).json(list);
    });

    /*
        list of parking types
    */

    app.get('/parkingTypes', async function (req, res) {
        let list = await PM.getParkingTypes();
        res.status(200).json(list);
    });

    /*
        list of bike types
    */

    app.get('/bikeTypes', async function (req, res) {
        let list = await PM.getBikeTypes();
        res.status(200).json(list);
    });

    /*
        list of features
    */

    app.get('/features', async function (req, res) {
        let list = await PM.getFeatures();
        res.status(200).json(list);
    });

    app.get('/security-features', async function (req, res) {
        let list = await PM.getSecurityFeatures();
        res.status(200).json(list);
    });

    app.post('/user/update-lang', function (req, res) {
        if (req.session.user == null) {
            res.status(401).send();
        } else {
            if (req.body['lang']) {
                AM.updateLanguage(req.session.user.email, req.body['lang'])
                    .then((result) => {
                        req.session.user.lang = req.body['lang'];
                        res.status(200).send("OK");
                    })
                    .catch((reason) => {
                        console.error(reason);
                        res.status(400).send("Something went wrong :(");
                    });
            } else {
                res.status(400).send("No language preference given");
            }
        }
    });

    /*
        password reset
    */

    app.post('/lost-password', function (req, res) {
        let email = req.body['email'];
        AM.generatePasswordKey(email, req.ip, function (e, account) {
            if (e) {
                res.status(400).send(e);
            } else {
                account.passKeyToken = ToM.getTokenForString(account.passKey);
                EM.dispatchResetPasswordLink(account, function (e, m) {
                    // TODO this callback takes a moment to return, add a loader to give user feedback //
                    if (!e) {
                        res.status(200).send('ok');
                    } else {
                        for (k in e) console.log('ERROR : ', k, e[k]);
                        res.status(400).send('unable to dispatch password reset');
                    }
                });
            }
        });
    });

    app.get('/reset-password', function (req, res) {
        if (!req.query['key']) {
            let domain = domainName !== '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            let key = decodeURIComponent(req.query['key']);
            ToM.getStringForToken(key, function (error, result) {
                if (error != null) {
                    res.status(500).send(e);
                } else {
                    AM.validatePasswordKey(result, req.ip, function (e, o) {
                        if (e || o == null) {
                            res.status(400).send('ERROR: Invalid reset-token.');
                        } else {
                            req.session.passKey = result;
                            res.render('pswd-reset.html',
                                {
                                    title: 'Reset Password',
                                    domainName: domainName,
                                    username: null,
                                    lostusername: o.email,
                                    vocabURI: vocabURI,
                                    superAdmin: false,
                                    company: {
                                        name: null,
                                        enabled: false
                                    },
                                    cityrep: false,
                                });
                        }
                    });
                }
            });
        }
    });

    app.post('/reset-password', function (req, res) {
        let newPass = req.body['pass'];
        let passKey = req.session.passKey;
        // destroy the session immediately after retrieving the stored passkey //
        req.session.destroy();
        AM.updatePassword(passKey, newPass, function (e, o) {
            if (o) {
                res.status(200).send('ok');
            } else {
                res.status(400).send('unable to update password');
            }
        })
    });

    /*
        Email API for new parking and parking correction suggestions
    */

    app.post('/email/new-parking-suggestion', async (req, res) => {
        res.set({
            'accept': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*'
        });
        if (req.header('Content-Type') === 'application/json') {
            let reps = await PM.newParkingSuggestion(req.body.lat, req.body.lon, req.body.description);
            if (reps) {
                if (reps[0]) {
                    res.status(200).json({ msg: 'Email notification sent!', recipients: reps });
                } else {
                    res.status(500).json({ error: 'No registered Velopark users available for this region' });
                }
            } else {
                res.status(404).json({ error: 'This region is not supported yet by Velopark' });
            }
        } else {
            res.status('415').send();
        }
    });

    app.post('/email/parking-correction', async (req, res) => {
        res.set({
            'accept': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*'
        });
        if (req.header('Content-Type') === 'application/json') {
            let reps = await PM.parkingCorrectionSuggestion(req.body.parkingId, req.body.correction);
            if (reps) {
                if (reps[0]) {
                    res.status(200).json({ msg: 'Email notification sent!', recipients: reps });
                } else {
                    res.status(500).json({ error: 'No registered Velopark users available for this parking' });
                }
            } else {
                res.status(404).json({ error: 'Parking ' + req.body.parkingId + ' not found' });
            }
        } else {
            res.status('415').send();
        }
    });

    /*
        view, delete & reset accounts
    */

    app.get('/print', function (req, res) {
        AM.getAllRecords(function (e, accounts) {
            res.render('print', { title: 'Account List', accts: accounts });
        })
    });

    app.post('/delete', function (req, res) {
        AM.deleteAccount(req.session.user._id, function (e, obj) {
            if (!e) {
                res.clearCookie('login');
                req.session.destroy(function (e) {
                    res.status(200).send('ok');
                });
            } else {
                res.status(400).send('record not found');
            }
        });
    });

    app.get('/reset', function (req, res) {
        AM.deleteAllAccounts(function () {
            res.redirect('/print');
        });
    });
};
