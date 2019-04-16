const fs = require('fs');
const AM = require('./modules/account-manager');
const EM = require('./modules/email-dispatcher');
const Parkings = require('./modules/parkings-manager');

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
                superAdmin: false
            });
        } else {
            // attempt automatic login //
            AM.validateLoginKey(req.cookies.login, req.ip, function (e, o) {
                if (o) {
                    AM.autoLogin(o.email, o.pass, function (o) {
                        let domain = domainName != '' ? '/' + domainName : '';
                        req.session.user = o;
                        res.redirect(domain + '/home?username=' + o.email);
                    });
                } else {
                    res.render('index.html', {
                        domainName: domainName,
                        vocabURI: vocabURI,
                        username: null,
                        superAdmin: false
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
            pass: req.body['pass']
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
                Parkings.getParking(req.query.username, req.query.parkingId, function (error, result, accountEmail, companyName) {
                    if (error != null) {
                        res.status(500).send();
                    } else {
                        parkingData = result;
                        res.render('home.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.query.username,
                            loadedParking: parkingData,
                            superAdmin: req.session.user.superAdmin,
                            emailParkingOwner: accountEmail,
                            nameCompanyParkingOwner: companyName
                        });
                    }
                });
            } else {
                res.render('home.html', {
                    domainName: domainName,
                    vocabURI: vocabURI,
                    username: req.query.username,
                    loadedParking: {},
                    superAdmin: req.session.user.superAdmin,
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
                    res.redirect(domain + '/home?username=' + req.query.username);
                } else {
                    if (value === true) {
                        res.render('admin-home.html', {
                            domainName: domainName,
                            vocabURI: vocabURI,
                            username: req.query.username,
                            superAdmin: req.session.user.superAdmin
                        });
                    } else {
                        let domain = domainName != '' ? '/' + domainName : '';
                        res.redirect(domain + '/home?username=' + req.query.username);
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
                    res.redirect(domain + '/home?username=' + req.query.username);
                } else {
                    if (value === true) {
                        Parkings.listAllParkings(function (parkings) {
                            res.render('admin-parkings.html', {
                                domainName: domainName,
                                vocabURI: vocabURI,
                                username: req.query.username,
                                parkings: parkings ? parkings : {},
                                superAdmin: req.session.user.superAdmin
                            });
                        });
                    } else {
                        res.redirect(domain + '/home?username=' + req.query.username);
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
                    res.redirect(domain + '/home?username=' + req.query.username);
                } else {
                    if (value === true) {
                        AM.getAllRecords(function (error, users) {
                            if (error != null) {
                                console.error(error);
                                res.redirect(domain + '/home?username=' + req.query.username);
                            } else {
                                res.render('admin-users.html', {
                                    domainName: domainName,
                                    vocabURI: vocabURI,
                                    username: req.query.username,
                                    users: users ? users : {},
                                    superAdmin: req.session.user.superAdmin
                                });
                            }
                        });
                    } else {
                        res.redirect(domain + '/home?username=' + req.query.username);
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
                            if(result.value != null) {
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
                    AM.toggleCityEnabled(req.params.useremail, req.body['cityName'], req.body['cityEnabled'] === "true", function (error, result) {
                        if (error != null) {
                            console.error(error);
                            res.status(500).send();
                        } else {
                            if(result.value != null) {
                                res.status(200).json(result);
                            } else {
                                res.status(409).send('Could not enable/disable city, probably because this user does not have this city in it\'s list.');
                            }
                        }
                    });
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
                    res.redirect(domain + '/home?username=' + req.query.username);
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
            //let parkings = await
            Parkings.listParkingsByEmail(req.query.username, function (parkings) {
                res.render('parkings.html', {
                    domainName: domainName,
                    vocabURI: vocabURI,
                    username: req.query.username,
                    parkings: parkings ? parkings : {},
                    superAdmin: req.session.user.superAdmin
                });
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
                AM.isUserSuperAdmin(req.session.user.email, function (error, value) {
                    if (value) {
                        if (req.body['jsonld']) {
                            if (req.body['user']) {
                                Parkings.saveParking(req.body['user'], null, req.body['jsonld'], function (error, result) {
                                    if (error != null) {
                                        res.status(500).send('Database error');
                                    } else {
                                        res.status(200).send('ok');
                                    }
                                });
                            } else if (req.body['company']) {
                                Parkings.saveParking(null, req.body['company'], req.body['jsonld'], function (error, result) {
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
                        res.status(401).send('You are not allowed to save this to another user account.');
                    }
                });
            } else {
                if (req.body['jsonld'] && req.body['user']) {
                    Parkings.saveParking(req.body['user'], null, req.body['jsonld'], function (error, result) {
                        if (error != null) {
                            res.status(500).send('Database error');
                        } else {
                            res.status(200).send('ok');
                        }
                    });
                } else {
                    res.status(400).send('Oops! We can\'t understand your request.');
                }
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
            Parkings.getParking(req.query.username, req.query.parkingId, function (error, result) {
                if (error != null) {
                    console.error(error);
                } else {
                    res.json(JSON.parse(result));
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
            await Parkings.deleteParking(req.query.username, req.query.parkingId, function (error) {
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
            Parkings.downloadParking(req.query.username, req.query.parkingId, res);
        }
    });

    /*
        list of terms
    */

    app.get('/terms', async function (req, res) {
        let list = await Parkings.getListOfTerms();
        res.status(200).json(list);
    });

    /*
        list of parking types
    */

    app.get('/parkingTypes', async function (req, res) {
        let list = await Parkings.getParkingTypes();
        res.status(200).json(list);
    });

    /*
        list of bike types
    */

    app.get('/bikeTypes', async function (req, res) {
        let list = await Parkings.getBikeTypes();
        res.status(200).json(list);
    });

    /*
        list of features
    */

    app.get('/features', async function (req, res) {
        let list = await Parkings.getFeatures();
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
