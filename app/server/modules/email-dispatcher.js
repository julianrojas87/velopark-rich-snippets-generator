const dbAdapter = require('./database-adapter');
const fs = require('fs');
const email = require("emailjs/email");

let EM = {};
const domainName = process.env.BASE_URL || '';
let activatedAccounts = {};

var server = email.server.connect({
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.EMAIL_HOST,
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
        from: process.env.EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
        to: account.email,
        subject: 'Password Reset',
        text: 'something went wrong... :(',
        attachment: EM.composePasswordResetEmail(account.passKeyToken, account.lang)
    }, callback);
};

EM.addActivatedAccountToBeMailed = function (account) {
    if (!activatedAccounts[account.email]) {
        //If the email is not in the list yet, it means we are about to enable an account that was previously disabled.
        activatedAccounts[account.email] = { initialStateEnabled: false };
    }
    activatedAccounts[account.email].mail = true;
};

EM.removeActivatedAccountToBeMailed = function (account) {
    if (!activatedAccounts[account.email]) {
        //If the email is not in the list yet, it means we are about to disable an account that was previously enabled.
        //In no case an email will be sent to this person, even not after re-enabling the account (as long as it is done within the scheduler period)
        activatedAccounts[account.email] = { initialStateEnabled: true };
    }
    activatedAccounts[account.email].mail = false;
};

EM.dispatchAccountActivated = function (account, callback) {
    server.send({
        from: process.env.EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
        to: account.email,
        subject: 'Account activated',
        text: 'something went wrong... :(',
        attachment: EM.composeAccountEnabledEmail(account.email, account.lang)
    }, callback);
};

EM.dispatchUserSignedUp = function (newUser, adminEmails) {
    for (i in adminEmails) {
        server.send({
            from: process.env.EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
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

EM.dispatchNewParkingToRegionReps = function (regionReps, parkingId) {
    for (i in regionReps) {
        server.send({
            from: process.env.EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
            to: regionReps[i].email,
            subject: 'New Bicycle Parking',
            text: 'something went wrong... :(',
            attachment: EM.composeNewParkingEmail(parkingId, regionReps[i].lang)
        }, function (e, m) {
            if (!e) {
                console.log("Mail sent to Region rep: new parking added", m.header.to);
            } else {
                for (k in e) console.error('ERROR : ', k, e[k]);
                console.error(e);
            }
        });
    }
};

EM.dispatchNewParkingSuggestionToRegionReps = function (reps, location, region, name, freeText, userEmail) {
    return new Promise((resolve, reject) => {
        for (i in reps) {
            server.send({
                from: process.env.EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
                to: reps[i].email,
                subject: 'New Bicycle Parking suggestion',
                text: 'something went wrong... :(',
                attachment: EM.composeNewParkingSuggestionEmail(location, region, name, freeText, userEmail, reps[i].lang)
            }, function (e, m) {
                if (!e) {
                    console.log("Mail sent to Region rep: new parking suggestion", m.header.to);
                    resolve();
                } else {
                    for (k in e) console.error('ERROR : ', k, e[k]);
                    console.error(e);
                    reject();
                }
            });
        }
    });
};

EM.dispatchParkingCorrectionSuggestion = (reps, parkingUri, localId, freeText, userEmail) => {
    return new Promise((resolve, reject) => {
        for (i in reps) {
            server.send({
                from: process.env.EMAIL_FROM || 'Velopark <do-not-reply@gmail.com>',
                to: reps[i].email,
                subject: 'New Bicycle Parking suggestion',
                text: 'something went wrong... :(',
                attachment: EM.composeParkingCorrectionEmail(parkingUri, localId, freeText, userEmail, reps[i].lang)
            }, function (e, m) {
                if (!e) {
                    console.log("Mail sent to Region rep: new parking suggestion", m.header.to);
                    resolve();
                } else {
                    for (k in e) console.error('ERROR : ', k, e[k]);
                    console.error(e);
                    reject();
                }
            });
        }
    });
};

EM.composePasswordResetEmail = function (passKey, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "You requested a password reset for your Velopark account.<br>";
        html += "<a href='" + domainName + "/reset-password?key=" + passKey + "'>Click here to reset your password</a><br><br>";
        html += "If you did not request a password reset, you can safely ignore this email.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Sie haben ein Zurücksetzen des Passworts für Ihr Velopark-Konto angefordert.<br>";
        html += "<a href='" + domainName + "/reset-password?key=" + passKey + "'>Klicken Sie hier, um ein neues Passwort festzulegen</a><br><br>";
        html += "Wenn Sie kein Zurücksetzen des Kennworts angefordert haben, können Sie diese E-Mail ignorieren.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Vous avez demandé une réinitialisation du mot de passe pour votre compte Velopark.<br>";
        html += "<a href='" + domainName + "/reset-password?key=" + passKey + "'>Cliquez ici pour définir un nouveau mot de passe</a><br><br>";
        html += "Si vous n'avez pas demandé de réinitialisation de mot de passe, vous pouvez ignorer cet email en toute sécurité.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Usted solicitó un restablecimiento de contraseña para su cuenta Velopark.<br>";
        html += "<a href='" + domainName + "/reset-password?key=" + passKey + "'>Haga clic aquí para establecer una nueva contraseña</a><br><br>";
        html += "Si no solicitó un restablecimiento de contraseña, puede ignorar este correo electrónico de forma segura.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Je hebt een wachtwoordreset aangevraagd voor je Velopark account.<br>";
        html += "<a href='" + domainName + "/reset-password?key=" + passKey + "'>Klik hier om een nieuw wachtwoord in te stellen</a><br><br>";
        html += "Indien je deze reset niet zelf hebt aangevraagd kan je deze mail gewoon negeren.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{ data: html, alternative: true }];
};

EM.composeAccountEnabledEmail = function (email, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "We are pleased to inform you that the registration of your Velopark account has been activated.<br>";
        html += "You can now <a href='" + domainName + "'>log in to your account</a> using <b>" + email + "</b> as your email address and the password you provided during the signup process.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Wir freuen uns, Ihnen mitteilen zu können, dass die Registrierung Ihres Velopark-Kontos aktiviert wurde.<br>";
        html += "Sie können sich jetzt mit <b>" + email + "</b> als E-Mail-Adresse und dem Kennwort, das Sie während des Anmeldevorgangs angegeben haben, <a href='" + domainName + "'>in Ihrem Konto anmelden</a>.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Nous avons le plaisir de vous informer que l'enregistrement de votre compte Velopark a été activé.<br>";
        html += "Vous pouvez maintenant <a href='" + domainName + "'>vous connecter à votre compte</a> en utilisant <b>" + email + "</b> comme adresse électronique et le mot de passe que vous avez fourni lors de la procédure d'inscription.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Nos complace informarle que el registro de su cuenta Velopark ha sido activado.<br>";
        html += "Ahora puede <a href='" + domainName + "'>iniciar sesión</a> en su cuenta utilizando <b>" + email + "</b> como su dirección de correo electrónico y la contraseña que proporcionó durante el proceso de registro.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "We zijn blij je te kunnen meedelen dat de registratie van je Velopark account geactiveerd werd.<br>";
        html += "Je kan je nu <a href='" + domainName + "'>aanmelden in je account</a> door gebruik te maken van  <b>" + email + "</b> als je email adres en het wachtwoord dat je tijdens het registratieprocess hebt opgegeven.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{ data: html, alternative: true }];
};

EM.composeUserSignedUp = function (email, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "A new user (" + email + ") just signed up on Velopark!<br>";
        html += "You can review her/his membership through the <a href='" + domainName + "/admin'>admin console</a>.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Ein neuer Benutzer (" + email + ") hat sich gerade bei Velopark angemeldet!<br>";
        html += "Sie können seine Mitgliedschaft über die <a href='" + domainName + "/admin'>Administratorkonsole überprüfen</a>.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Un nouvel utilisateur (" + email + ") vient de s'inscrire sur Velopark!<br>";
        html += "Vous pouvez consulter son abonnement via <a href='" + domainName + "/admin'>la console d'administration</a>.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Un nuevo usuario (" + email + ") acaba de registrarse en Velopark!<br>";
        html += "Puede revisar su membresía a través de <a href='" + domainName + "/admin'>la consola de administración</a>.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Een nieuwe gebruiker (" + email + ") heeft zonet een account aangemaakt bij Velopark!<br>";
        html += "U kunt haar/zijn lidmaatschap bekijken via de <a href='" + domainName + "/admin'>beheerdersconsole</a>.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{ data: html, alternative: true }];
};


EM.composeNewParkingEmail = function (parkingId, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "We would like you to know that a new parking has been added in a region you are managing.<br>";
        html += "The URI of this new parking is <b>" + decodeURIComponent(parkingId) + "</b></b>. You can find it in the <i><a href='" + domainName + "/cityrep'>Regions Dashboard</a></i> where you can edit or approve this parking.<br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Wir möchten Sie darüber informieren, dass in der von Ihnen verwalteten Region ein neuer Parkplatz hinzugefügt wurde.<br>";
        html += "Die URI dieses neuen Parkplatzes lautet <b>" + decodeURIComponent(parkingId) + "</b></b>. Sie finden es im <i><a href='" + domainName + "/cityrep'>Regions-Dashboard</a></i>, in dem Sie diesen Parkplatz bearbeiten oder genehmigen können.<br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Nous aimerions que vous sachiez qu'un nouveau parking a été ajouté dans une région que vous gérez.<br>";
        html += "L'URI de ce nouveau parking est <b>" + decodeURIComponent(parkingId) + "</b></b>. Vous pouvez le trouver dans <i><a href='" + domainName + "/cityrep'>le Tableau de Bord Régions</a></i> où vous pouvez éditer ou approuver ce parking.<br><br>";
        html += "Salutations,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Nos gustaría que sepa que se agregó un nuevo estacionamiento en la región que está administrando.<br>";
        html += "La URI de este nuevo aparcamiento es <b>" + decodeURIComponent(parkingId) + "</b></b>. Puede encontrarlo en <i><a href='" + domainName + "/cityrep'>el Panel de Regiones</a></i> donde puede editar o aprobar este estacionamiento.<br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "We willen u graag laten weten dat er een nieuwe parking is toegevoegd in een regio die u beheert.<br>";
        html += "De URI van deze nieuwe parking is <b>" + decodeURIComponent(parkingId) + "</b></b>. U kan ze terugvinden in het <i><a href='" + domainName + "/cityrep'>Regio's Dashboard</a></i> waar u de parking kan aanpassen en goedkeuren.<br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{ data: html, alternative: true }];
};

EM.composeNewParkingSuggestionEmail = function (location, region, name, freeText, userEmail, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "A user has suggested to include a new bike parking in one of the regions you are managing.<br><br>";
        html += "<ul>";
        html += "<li>Name: <i>" + name + "</i></li>";
        html += "<li>Region: " + region + "</li>";
        html += '<li>Suggested Location: <a href="' + location + '" target="_blank">See in OpenStreetMap</a></li>';
        html += "<li>Description: <em>" + freeText + "</em></li>";
        if (userEmail) { html += "<li>User email: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Ein Benutzer hat vorgeschlagen, in eine der von Ihnen verwalteten Regionen einen neuen Fahrradparkplatz aufzunehmen.<br><br>";
        html += "<ul>";
        html += "<li>Name: <i>" + name + "</i></li>";
        html += "<li>Regio: " + region + "</li>";
        html += '<li>Vorgeschlagener Standort: <a href="' + location + '" target="_blank">Siehe in OpenStreetMap</a></li>';
        html += "<li>Beschreibung: <em>" + freeText + "</em></li>";
        if (userEmail) { html += "<li>Benutzer Email: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Un utilisateur a suggéré d’inclure un nouveau parking pour vélos dans l’une des régions que vous gérez.<br><br>";
        html += "<ul>";
        html += "<li>Prénom: <i>" + name + "</i></li>";
        html += "<li>Region: " + region + "</li>";
        html += '<li>Suggested Location: <a href="' + location + '" target="_blank">Voir dans OpenStreetMap</a></li>';
        html += "<li>Description: <em>" + freeText + "</em></li>";
        if (userEmail) { html += "<li>Email d'utilisateur: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Un usuario ha sugerido incluir un nuevo parqueadero de bicicletas en una de las regiones que administras.<br><br>";
        html += "<ul>";
        html += "<li>Nombre: <i>" + name + "</i></li>";
        html += "<li>Región: " + region + "</li>";
        html += '<li>Ubicación sugerida: <a href="' + location + '" target="_blank">Ver en OpenStreetMap</a></li>';
        html += "<li>Descripción: <em>" + freeText + "</em></li>";
        if (userEmail) { html += "<li>Email de Usuario: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Een gebruiker heeft voorgesteld om een ​​nieuwe fietsenstalling op te nemen in een van de regio's die u beheert.<br><br>";
        html += "<ul>";
        html += "<li>Naam: <i>" + name + "</i></li>";
        html += "<li>Regio: " + region + "</li>";
        html += '<li>Voorgestelde locatie: <a href="' + location + '" target="_blank">Zie in OpenStreetMap</a></li>';
        html += "<li>Omschrijving: <em>" + freeText + "</em></li>";
        if (userEmail) { html += "<li>E-mailadres Gebruiker: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{ data: html, alternative: true }];
};

EM.composeParkingCorrectionEmail = function (parkingUri, parkingLocalId, freeText, userEmail, lang) {
    let html;
    if (lang === 'en') {
        html = "<html><body>";
        html += "Hello!<br><br>";
        html += "A user has suggested a correction/addition to the information about a bike parking you are managing:<br><br>";
        html += "<ul>";
        html += '<li>Bike parking: <a href="https://www.velopark.be/static/data/' + parkingLocalId + '" target="_blank">' + parkingLocalId + '</a></li>';
        html += "<li>Suggestion: <em>" + freeText + "</em></li>";
        html += '<li><a href="' + domainName + '/home?parkingId=' + encodeURIComponent(parkingUri) + '" target="_blank">Edit in Velopark tool</a></li>';
        if (userEmail) { html += "<li>User email: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'de') {
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Ein Benutzer hat eine Korrektur/Ergänzung der Informationen zu einem von Ihnen verwalteten Fahrradparkplatz vorgeschlagen:<br><br>";
        html += "<ul>";
        html += '<li>Fahrradabstellplatz: <a href="https://www.velopark.be/static/data/' + parkingLocalId + '" target="_blank">' + parkingLocalId + '</a></li>';
        html += "<li>Vorschlag: <em>" + freeText + "</em></li>";
        html += '<li><a href="' + domainName + '/home?parkingId=' + encodeURIComponent(parkingUri) + '" target="_blank">Edit in Velopark tool</a></li>';
        if (userEmail) { html += "<li>Benutzer Email: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Schöne Grüße,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'fr') {
        html = "<html><body>";
        html += "Bonjour!<br><br>";
        html += "Un utilisateur a suggéré une correction/un ajout aux informations sur un parking pour vélo que vous gérez:<br><br>";
        html += "<ul>";
        html += '<li>Parking à vélos: <a href="https://www.velopark.be/static/data/' + parkingLocalId + '" target="_blank">' + parkingLocalId + '</a></li>';
        html += "<li>Suggestion: <em>" + freeText + "</em></li>";
        html += '<li><a href="' + domainName + '/home?parkingId=' + encodeURIComponent(parkingUri) + '" target="_blank">Edit in Velopark tool</a></li>';
        if (userEmail) { html += "<li>Email d'utilisateur: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Greetings,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else if (lang === 'es') {
        html = "<html><body>";
        html += "¡Hola!<br><br>";
        html += "Un usuario ha sugerido una correción/adición a la información acerca de uno de los parqueaderos de bicicletas que estan a tu cargo:<br><br>";
        html += "<ul>";
        html += '<li>Parqueadero: <a href="https://www.velopark.be/static/data/' + parkingLocalId + '" target="_blank">' + parkingLocalId + '</a></li>';
        html += "<li>Sugerencia: <em>" + freeText + "</em></li>";
        html += '<li><a href="' + domainName + '/home?parkingId=' + encodeURIComponent(parkingUri) + '" target="_blank">Edit in Velopark tool</a></li>';
        if (userEmail) { html += "<li>Email de Usuario: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Saludos,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    } else {
        //Dutch is default
        html = "<html><body>";
        html += "Hallo!<br><br>";
        html += "Een gebruiker heeft een correctie/aanvulling voorgesteld op de informatie over een fietsenstalling die u beheert:<br><br>";
        html += "<ul>";
        html += '<li>Fietsenstalling: <a href="https://www.velopark.be/static/data/' + parkingLocalId + '" target="_blank">' + parkingLocalId + '</a></li>';
        html += "<li>Suggestie: <em>" + freeText + "</em></li>";
        html += '<li><a href="' + domainName + '/home?parkingId=' + encodeURIComponent(parkingUri) + '" target="_blank">Edit in Velopark tool</a></li>';
        if (userEmail) { html += "<li>E-mailadres Gebruiker: " + userEmail + "</li>" };
        html += "</ul><br><br>";
        html += "Vriendelijke groeten,<br>";
        html += "Velopark Team<br>";
        html += "</body></html>";
    }
    return [{ data: html, alternative: true }];
};

module.exports = EM;