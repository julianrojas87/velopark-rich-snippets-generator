const fs = require('fs');
const AM = require('./modules/account-manager');
const EM = require('./modules/email-dispatcher');
const Parkings = require('./modules/parkings-manager');

const domainName = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))['domain'] || '';
const vocabURI = JSON.parse(fs.readFileSync('./config.json', 'utf-8'))['vocabulary'] || 'http://velopark.ilabt.imec.be';

module.exports = app => {


	/*
		index
	*/

	app.get('/', function (req, res) {
		// check if the user has an auto login key saved in a cookie //
		if (req.cookies.login == undefined) {
			res.render('index.html', { domainName: domainName, vocabURI: vocabURI });
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
					res.render('index.html', { domainName: domainName, vocabURI: vocabURI });
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
				Parkings.initUser(req.body['email']);
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
					res.cookie('login', key, { maxAge: 900000 });
					res.status(200).send(o);
				});

			}
		});
	});

	app.post('/logout', function (req, res) {
		res.clearCookie('login');
		req.session.destroy(function (e) { res.status(200).send('ok'); });
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
			if(req.query.parkingId) {
				parkingData = await Parkings.getParking(req.query.username, req.query.parkingId);
			}
			res.render('home.html', {
				domainName: domainName,
				vocabURI: vocabURI,
				username: req.query.username,
				loadedParking: parkingData
			});
		}
	});

	/*
		secured parkings
	*/

	app.get('/parkings', async function (req, res) {
		// check if the user is logged in
		if (req.session.user == null) {
			let domain = domainName != '' ? '/' + domainName : '';
			res.redirect(domain + '/');
		} else {
			let parkings = await Parkings.listParkings(req.query.username);
			res.render('parkings.html', {
				domainName: domainName,
				vocabURI: vocabURI,
				username: req.query.username,
				parkings: parkings
			});
		}
	});

	app.post('/save-parking', async function (req, res) {
		// check if the user is logged in
		if (req.session.user == null) {
			let domain = domainName != '' ? '/' + domainName : '';
			res.redirect(domain + '/');
		} else {
			if (req.body['jsonld'] && req.body['user']) {
				await Parkings.saveParking(req.body['user'], req.body['jsonld']);
				res.status(200).send('ok');
			} else {
				res.status(400);
			}
		}
	});

	app.get('/get-parking', async function (req, res) {
		// check if the user is logged in
		if (req.session.user == null) {
			let domain = domainName != '' ? '/' + domainName : '';
			res.redirect(domain + '/');
		} else {
			let parking = await Parkings.getParking(req.query.username, req.query.parkingId);
			res.json(JSON.parse(parking));
		}
	});

	app.delete('/delete-parking', function (req, res) {
		// check if the user is logged in
		if (req.session.user == null) {
			let domain = domainName != '' ? '/' + domainName : '';
			res.redirect(domain + '/');
		} else {
			Parkings.deleteParking(req.query.username, req.query.parkingId);
			res.status(200).send('ok');
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
				res.render('reset', { title: 'Reset Password' });
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
			res.render('print', { title: 'Account List', accts: accounts });
		})
	});

	app.post('/delete', function (req, res) {
		AM.deleteAccount(req.session.user._id, function (e, obj) {
			if (!e) {
				res.clearCookie('login');
				req.session.destroy(function (e) { res.status(200).send('ok'); });
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
