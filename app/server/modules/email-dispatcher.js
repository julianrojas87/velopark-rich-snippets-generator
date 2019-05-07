
var EM = {};
module.exports = EM;

const fs = require('fs');
const config_secret = JSON.parse(fs.readFileSync('./config_secret.json', 'utf-8'));
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const domainName = config['domain'] || '';

EM.server = require("emailjs/email").server.connect(
{
	host 	    : config_secret.NL_EMAIL_HOST || 'smtp.gmail.com',
	user 	    : config_secret.NL_EMAIL_USER || 'your-email-address@gmail.com',
	password    : config_secret.NL_EMAIL_PASS || '1234',
	ssl		    : true
});

EM.dispatchResetPasswordLink = function(account, callback){
	EM.server.send({
		from         : config_secret.NL_EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
		to           : account.email,
		subject      : 'Password Reset',
		text         : 'something went wrong... :(',
		attachment   : EM.composeEmail(account.passKeyToken)
	}, callback );
};

EM.composeEmail = function(passKey) {
	let baseurl = process.env.NL_SITE_URL || domainName || 'http://localhost:3000';
	var html = "<html><body>";
		html += "Hi!<br><br>";
		html += "You requested a password reset for your Velopark account.<br>";
		html += "<a href='" + baseurl + '/reset-password?key=' + passKey + "'>Click here to reset your password</a><br><br>";
		html += "If you did not request a password reset, you can safely ignore this email.<br><br>";
		html += "Greetings,<br>";
		html += "Velopark Team<br>";
		html += "</body></html>";
	return [{data:html, alternative:true}];
};