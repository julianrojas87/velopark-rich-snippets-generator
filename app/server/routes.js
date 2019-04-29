const fs = require('fs');
const AM = require('./modules/account-manager');
const EM = require('./modules/email-dispatcher');
const CoM = require('./modules/company-manager');
const CiM = require('./modules/cities-manager');
const PM = require('./modules/parkings-manager');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const domainName = config['domain'] || '';
const vocabURI = config['vocabulary'] || 'https://velopark.ilabt.imec.be';

module.exports = app => {


    /*
        index
    */

    app.get('/', function (req, res) {
        // check if the user has an auto login key saved in a cookie //
        if (req.cookies.login == undefined) {
            res.render('index.html', {
                domainName: domainName,
                vocabURI: vocabURI,
                username: null,
                superAdmin: false,
                company: {name: null, enabled: false},
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
                        company: {name: null, enabled: false},
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
                req.session.user = o;
                AM.generateLoginKey(o.email, req.ip, function (key) {
                    res.cookie('login', key, {maxAge: 900000});
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
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            let parkingData = null;
            if (req.query.parkingId) {
                PM.getParking(req.session.user.email, req.query.parkingId, function (error, result, accountEmail, companyName) {
                    if (error != null) {
                        console.error(error);
                        res.status(500).send();
                    } else {
                        parkingData = result;
                        res.render('home.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.session.user.email,
                            loadedParking: parkingData,
                            superAdmin: req.session.user.superAdmin,
                            company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
                            cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                            emailParkingOwner: accountEmail,
                            nameCompanyParkingOwner: companyName
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
                    company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
                    cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                    emailParkingOwner: null,
                    nameCompanyParkingOwner: null
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
                            company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
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
                    if (value === true) {
                        PM.listAllParkings(function (error, parkings) {
                            if(error != null){
                                console.error(error);
                                res.status(500).send();
                            } else {
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
                                    company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
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
                                    company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
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
                if (result.length > 0) {
                    res.render('city-home.html', {
                        domainName: domainName,
                        vocabURI: vocabURI,
                        username: req.session.user.email,
                        cityNames: result,
                        superAdmin: req.session.user.superAdmin,
                        company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
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
                        PM.listParkingsInCity(cityname, function (error, parkings) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send('failed');
                            } else {
                                res.render('city-parkings.html', {
                                    domainName: domainName,
                                    vocabURI: vocabURI,
                                    username: req.session.user.email,
                                    cityName: cityname,
                                    parkings: parkings ? parkings : {},
                                    superAdmin: req.session.user.superAdmin,
                                    company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
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
            PM.listParkingsByEmail(req.session.user.email, function (error, parkings) {
                if(error != null){
                    res.status(500).send("Could not get parkings for this user.");
                } else {
                    res.render('parkings.html', {
                        domainName: domainName,
                        vocabURI: vocabURI,
                        username: req.session.user.email,
                        parkings: parkings ? parkings : {},
                        superAdmin: req.session.user.superAdmin,
                        company: {name: req.session.user.companyName, enabled: req.session.user.companyEnabled},
                        cityrep: req.session.user.cityNames && req.session.user.cityNames.length > 0,
                    });
                }
            });
        }
    });


    app.post('/parkings/toggle-parking-enabled/:parkingid', function (req, res) {
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
                        PM.toggleParkingEnabled(req.params.parkingid, req.body['parkingEnabled'] === "true", function (error, result) {
                            if (error != null) {
                                console.error(error);
                                res.status(500).send();
                            } else {
                                if (result.value != null) {
                                    res.status(200).json(result);
                                } else {
                                    res.status(409).send('Could not enable/disable parking.');
                                }
                            }
                        });
                    } else {
                        //User is not superAdmin, maybe he is cityrep for the region of this parking?
                        AM.isAccountCityRepForParkingID(req.session.user.email, req.params.parkingid, function (error, value) {
                            if (value === true) {
                                PM.toggleParkingEnabled(req.params.parkingid, req.body['parkingEnabled'] === "true", function (error, result) {
                                    if (error != null) {
                                        console.error(error);
                                        res.status(500).send();
                                    } else {
                                        if (result.value != null) {
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
            if (req.session.user.email !== req.body['user']) {
                saveParkingAsAdminOrCityRep(req, res);
            } else {
                if (req.body['jsonld'] && req.body['user']) {
                    PM.saveParking(req.session.user.email, null, req.body['jsonld'], function (error, result) {
                        if (error != null) {
                            res.status(500).send('Database error');
                        } else {
                            if(result != null) {
                                res.status(200).send('ok');
                            } else {
                                //user could still be a city representative for his own parkings (or even superadmin), even if his company is disabled.. This would be an awkward thing, but he should still be able to edit the parkings
                                saveParkingAsAdminOrCityRep(req, res);
                            }
                        }
                    });
                } else {
                    res.status(400).send('Oops! We can\'t understand your request.');
                }
            }
        }
    });

    let saveParkingAsAdminOrCityRep = function(req, res){
        AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
            if (value) {
                if (req.body['jsonld']) {
                    if (req.body['company']) {
                        //save straight to company
                        PM.saveParking(null, req.body['company'], req.body['jsonld'], function (error, result) {
                            if (error != null) {
                                res.status(500).send('Database error');
                            } else {
                                res.status(200).send('ok');
                            }
                        });
                    } else if (req.body['user']) {
                        //we don't know the company, we should be able to get the company via the username
                        PM.saveParking(req.body['user'], null, req.body['jsonld'], function (error, result) {
                            if (error != null) {
                                res.status(500).send('Database error');
                            } else {
                                res.status(200).send('ok');
                            }
                        });
                    } else {
                        res.status(400).send('Oops! We can\'t understand your request.');
                    }
                } else {
                    res.status(400).send('Oops! We can\'t understand your request.');
                }
            } else {
                //User is not superAdmin, maybe he is city rep?
                PM.saveParkingAsCityRep(req.body['company'], req.body['jsonld'], function (error, result) {
                    if (error != null) {
                        res.status(500).send('Failed');
                    } else {
                        res.status(200).send('ok');
                    }
                });
                //res.status(401).send('You are not allowed to save this to another company.');
            }
        });
    };

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

    app.delete('/delete-parking', async function (req, res) {
        // check if the user is logged in
        if (req.session.user == null) {
            let domain = domainName != '' ? '/' + domainName : '';
            res.redirect(domain + '/');
        } else {
            await PM.deleteParking(req.session.user.email, req.query.parkingId, function (error) {
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
            PM.downloadParking(req.session.user.email, req.query.parkingId, res);
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


    /*
        password reset
    */

    app.post('/lost-password', function (req, res) {
        let email = req.body['email'];
        AM.generatePasswordKey(email, req.ip, function (e, account) {
            if (e) {
                res.status(400).send(e);
            } else {
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
        AM.validatePasswordKey(req.query['key'], req.ip, function (e, o) {
            if (e || o == null) {
                res.redirect('/');
            } else {
                req.session.passKey = req.query['key'];
                res.render('reset', {title: 'Reset Password'});
            }
        })
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
        view, delete & reset accounts
    */

    app.get('/print', function (req, res) {
        AM.getAllRecords(function (e, accounts) {
            res.render('print', {title: 'Account List', accts: accounts});
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
