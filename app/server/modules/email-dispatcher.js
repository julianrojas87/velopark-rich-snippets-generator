
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
		attachment   : EM.composeEmail(account.passKeyToken, account.lang)
	}, callback );
};

EM.composeEmail = function(passKey, lang) {
	let baseurl = process.env.NL_SITE_URL || domainName || 'http://localhost:3000';
	let html;
	if(lang == 'en'){
		html = "<html><body>";
		html += "Hi!<br><br>";
		html += "You requested a password reset for your Velopark account.<br>";
		html += "<a href='" + baseurl + '/reset-password?key=' + passKey + "'>Click here to reset your password</a><br><br>";
		html += "If you did not request a password reset, you can safely ignore this email.<br><br>";
		html += "Greetings,<br>";
		html += "Velopark Team<br>";
		html += "</body></html>";
	} else if(lang == 'de') {
		html = "<html><body>";
		html += "Hallo!<br><br>";
		html += "Sie haben ein Zurücksetzen des Passworts für Ihr Velopark-Konto angefordert.<br>";
		html += "<a href='" + baseurl + '/reset-password?key=' + passKey + "'>Klicken Sie hier, um ein neues Passwort festzulegen</a><br><br>";
		html += "Wenn Sie kein Zurücksetzen des Kennworts angefordert haben, können Sie diese E-Mail ignorieren.<br><br>";
		html += "Schöne Grüße,<br>";
		html += "Velopark Team<br>";
		html += "</body></html>";
	} else if(lang == 'fr') {
		html = "<html><body>";
		html += "Bonjour!<br><br>";
		html += "Vous avez demandé une réinitialisation du mot de passe pour votre compte Velopark.<br>";
		html += "<a href='" + baseurl + '/reset-password?key=' + passKey + "'>Cliquez ici pour définir un nouveau mot de passe</a><br><br>";
		html += "Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet email en toute sécurité.<br><br>";
		html += "Salutations,<br>";
		html += "Velopark Team<br>";
		html += "</body></html>";
	} else if(lang == 'es') {
		html = "<html><body>";
		html += "¡Hola!<br><br>";
		html += "Usted solicitó un restablecimiento de contraseña para su cuenta Velopark.<br>";
		html += "<a href='" + baseurl + '/reset-password?key=' + passKey + "'>Haga clic aquí para establecer una nueva contraseña</a><br><br>";
		html += "Si no solicitó un restablecimiento de contraseña, puede ignorar este correo electrónico de forma segura.<br><br>";
		html += "Saludos,<br>";
		html += "Velopark Team<br>";
		html += "</body></html>";
	} else {
		//Dutch is default
		html = "<html><body>";
		html += "Hallo!<br><br>";
		html += "Je hebt een wachtwoordreset aangevraagd voor je Velopark account.<br>";
		html += "<a href='" + baseurl + '/reset-password?key=' + passKey + "'>Klik hier om een nieuw wachtwoord in te stellen</a><br><br>";
		html += "Indien je deze reset niet zelf hebt aangevraagd kan je deze mail gewoon negeren.<br><br>";
		html += "Vriendelijke groeten,<br>";
		html += "Velopark Team<br>";
		html += "</body></html>";
	}
	return [{data:html, alternative:true}];
};