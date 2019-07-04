const dbAdapter = require('./database-adapter');
const fs = require('fs');
const email = require("emailjs/email");

let EM = {};
const config_secret = JSON.parse(fs.readFileSync('./config_secret.json', 'utf-8'));
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const domainName = config['domain'] || '';
let activatedAccounts = {};

var server = email.server.connect({
    user:  config_secret.NL_EMAIL_USER,
    password:  config_secret.NL_EMAIL_PASS,
    host: config_secret.NL_EMAIL_HOST,
    ssl: true
});

setInterval(sendRecentAccountActivatedEmails, 1 * 10 * 1000);	//send mails every 10 seconds

function sendRecentAccountActivatedEmails() {
    if (Object.keys(activatedAccounts).length) {
        let emailsToSendTo = [];
        for (let email in activatedAccounts) {
            //Only send email if account was disabled at the beginning of this timers period
            if (!activatedAccounts[email].initialStateEnabled && activatedAccounts[email].mail) {
                emailsToSendTo.push(email);
            }
        }
        dbAdapter.findAccountsByEmails(emailsToSendTo)
            .then(accountArray => {
                accountArray.forEach(function (account) {
                    EM.dispatchAccountActivated(account, function (e, m) {
                        if (!e) {
                            console.log("Mail sent: account activated", account.email);
                        } else {
                            for (k in e) console.error('ERROR : ', k, e[k]);
                            console.error(e);
                        }
                    });
                });
            })
            .catch(reason => {
                console.error("Failed to send activation mails to", emailsToSendTo.toString(), "Reason:", reason);
            });
        activatedAccounts = {};
    }
}

EM.dispatchResetPasswordLink = function (account, callback) {
    server.send({
        from: config_secret.NL_EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
        to: account.email,
        subject: 'Password Reset',
        text: 'something went wrong... :(',
        attachment: EM.composePasswordResetEmail(account.passKeyToken, account.lang)
    }, callback);
};

EM.addActivatedAccountToBeMailed = function (account) {
    if (!activatedAccounts[account.email]) {
        //If the email is not in the list yet, it means we are about to enable an account that was previously disabled.
        activatedAccounts[account.email] = { initialStateEnabled : false };
    }
    activatedAccounts[account.email].mail = true;
};

EM.removeActivatedAccountToBeMailed = function (account) {
    if (!activatedAccounts[account.email]) {
        //If the email is not in the list yet, it means we are about to disable an account that was previously enabled.
        //In no case an email will be sent to this person, even not after re-enabling the account (as long as it is done within the scheduler period)
        activatedAccounts[account.email] = { initialStateEnabled : true };
    }
    activatedAccounts[account.email].mail = false;
};

EM.dispatchAccountActivated = function (account, callback) {
    server.send({
        from: config_secret.NL_EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
        to: account.email,
        subject: 'Account activated',
        text: 'something went wrong... :(',
        attachment: EM.composeAccountEnabledEmail(account.email, account.lang)
    }, callback);
};

EM.dispatchUserSignedUp = function(newUser, adminEmails){
    for(i in adminEmails) {
        server.send({
            from: config_secret.NL_EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
            to: adminEmails[i].email,
            subject: 'New User Registration',
            text: 'something went wrong... :(',
            attachment: EM.composeUserSignedUp(newUser, adminEmails[i].lang)
        }, function (e, m) {
            if (!e) {
                console.log("Mail sent to SuperAdmin: new account registered", m.header.to);
            } else {
                for (k in e) console.error('ERROR : ', k, e[k]);
                console.error(e);
            }
        });
    }
};

EM.composePasswordResetEmail = function (passKey, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "You requested a password reset for your Velopark account.<br>";
        html += "<a href='https://velopark.ilabt.imec.be/rich-snippets-generator/reset-password?key=" +  passKey + "'>Click here to reset your password</a><br><br>";
        html += "If you did not request a password reset, you can safely ignore this email.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Sie haben ein Zurücksetzen des Passworts für Ihr Velopark-Konto angefordert.<br>";
        html += "<a href='https://velopark.ilabt.imec.be/rich-snippets-generator/reset-password?key=" +  passKey + "'>Klicken Sie hier, um ein neues Passwort festzulegen</a><br><br>";
        html += "Wenn Sie kein Zurücksetzen des Kennworts angefordert haben, können Sie diese E-Mail ignorieren.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Vous avez demandé une réinitialisation du mot de passe pour votre compte Velopark.<br>";
        html += "<a href='https://velopark.ilabt.imec.be/rich-snippets-generator/reset-password?key=" +  passKey + "'>Cliquez ici pour définir un nouveau mot de passe</a><br><br>";
        html += "Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet email en toute sécurité.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Usted solicitó un restablecimiento de contraseña para su cuenta Velopark.<br>";
        html += "<a href='https://velopark.ilabt.imec.be/rich-snippets-generator/reset-password?key=" +  passKey + "'>Haga clic aquí para establecer una nueva contraseña</a><br><br>";
        html += "Si no solicitó un restablecimiento de contraseña, puede ignorar este correo electrónico de forma segura.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Je hebt een wachtwoordreset aangevraagd voor je Velopark account.<br>";
        html += "<a href='https://velopark.ilabt.imec.be/rich-snippets-generator/reset-password?key=" +  passKey + "'>Klik hier om een nieuw wachtwoord in te stellen</a><br><br>";
        html += "Indien je deze reset niet zelf hebt aangevraagd kan je deze mail gewoon negeren.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{data: html, alternative: true}];
};

EM.composeAccountEnabledEmail = function (email, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "We are pleased to inform you that the registration of your Velopark account has been activated.<br>";
        html += "You can now <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/'>log in to your account</a> using <b>" + email + "</b> as your email address and the password you provided during the signup process.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Wir freuen uns, Ihnen mitteilen zu können, dass die Registrierung Ihres Velopark-Kontos aktiviert wurde.<br>";
        html += "Sie können sich jetzt mit <b>" + email + "</b> als E-Mail-Adresse und dem Kennwort, das Sie während des Anmeldevorgangs angegeben haben, <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/'>in Ihrem Konto anmelden</a>.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Nous avons le plaisir de vous informer que l'enregistrement de votre compte Velopark a été activé.<br>";
        html += "Vous pouvez maintenant <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/'>vous connecter à votre compte</a> en utilisant <b>" + email + "</b> comme adresse électronique et le mot de passe que vous avez fourni lors de la procédure d'inscription.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Nos complace informarle que el registro de su cuenta Velopark ha sido activado.<br>";
        html += "Ahora puede <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/'>iniciar sesión</a> en su cuenta utilizando <b>" + email + "</b> como su dirección de correo electrónico y la contraseña que proporcionó durante el proceso de registro.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "We zijn blij je te kunnen meedelen dat de registratie van je Velopark account geactiveerd werd.<br>";
        html += "Je kan je nu <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/'>aanmelden in je account</a> door gebruik te maken van  <b>" + email + "</b> als je email adres en het wachtwoord dat je tijdens het registratieprocess hebt opgegeven.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{data: html, alternative: true}];
};

EM.composeUserSignedUp = function (email, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "A new user (" + email + ") just signed up on Velopark!<br>";
        html += "You can review his membership through the <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/admin'>admin console</a>.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Ein neuer Benutzer (" + email + ") hat sich gerade bei Velopark angemeldet!<br>";
        html += "Sie können seine Mitgliedschaft über die <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/admin'>Administratorkonsole überprüfen</a>.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Un nouvel utilisateur (" + email + ") vient de s'inscrire sur Velopark!<br>";
        html += "Vous pouvez consulter son abonnement via <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/admin'>la console d'administration</a>.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Un nuevo usuario (" + email + ") acaba de registrarse en Velopark!<br>";
        html += "Puede revisar su membresía a través de <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/admin'>la consola de administración</a>.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Een nieuwe gebruiker (" + email + ") heeft zonet een account aangemaakt bij Velopark!<br>";
        html += "U kunt zijn lidmaatschap bekijken via de <a href='https://velopark.ilabt.imec.be/rich-snippets-generator/admin'>beheerdersconsole</a>.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{data: html, alternative: true}];
};

module.exports = EM;