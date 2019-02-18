var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');

module.exports = app => {


	/*
		index
	*/

	app.get('/', function (req, res) {
		// check if the user has an auto login key saved in a cookie //
		if (req.cookies.login == undefined) {
			res.render('index.html');
		} else {
			// attempt automatic login //
			AM.validateLoginKey(req.cookies.login, req.ip, function (e, o) {
				if (o) {
					AM.autoLogin(o.email, o.pass, function (o) {
						req.session.user = o;
						res.redirect('/home?username=' + o.email);
					});
				} else {
					res.render('index.html');
				}
			});
		}
	});

	/*
		secured home
	*/

	app.get('/home', function (req, res) {
		// check if the user is logged in
		if (req.session.user == null) {
			res.redirect('/');
		} else {
			res.render('home.html', { username: req.query.username })
		}
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
	})

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
				res.status(200).send('ok');
			}
		});
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
		// destory the session immediately after retrieving the stored passkey //
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
