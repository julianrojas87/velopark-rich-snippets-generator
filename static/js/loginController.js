let signinformcompaniesloaded = false;
let signinformcitiesloaded = false;
let currentLang = 'nl';

($ => {

    translate();

    if (user && user.name && user.name !== '') {
        $('#signin').hide();
        $('#login').hide();
        $('#logout').show();
        $('#user-email').text(user.name).show();
    } else {
        $('#logout').hide();
        $('#user-email').hide();
        $('#signin').show();
        $('#login').show();
    }

    if (!user || user.superAdmin !== "true") {
        $('#myAdminOverview').remove();
    }

    if (!user || !user.cityrep || user.cityrep !== "true") {
        $('#myCityOverview').remove();
    } else {
        $('#point-map').after('<svg class="city-rep-location-loading-icon lds-dual-ring" width="15px" style="display:block; visibility: hidden;"\n' +
            '                         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid">\n' +
            '                        <circle cx="50" cy="50" ng-attr-r="{{config.radius}}" ng-attr-stroke-width="{{config.width}}"\n' +
            '                                ng-attr-stroke="{{config.stroke}}" ng-attr-stroke-dasharray="{{config.dasharray}}"\n' +
            '                                fill="none" stroke-linecap="round" r="40" stroke-width="20" stroke="#1c4595"\n' +
            '                                stroke-dasharray="62.83185307179586 62.83185307179586"\n' +
            '                                transform="rotate(244.478 50 50)">\n' +
            '                            <animateTransform attributeName="transform" type="rotate" calcMode="linear"\n' +
            '                                              values="0 50 50;360 50 50" keyTimes="0;1" dur="1s" begin="0s"\n' +
            '                                              repeatCount="indefinite"></animateTransform>\n' +
            '                        </circle>\n' +
            '                    </svg><span id="city-rep-location-status"></span>');
    }

    if (!user.company.name || user.company.enabled !== "true") {
        $('#myParkings').remove();
    }

    $('#cm-signin').on('click', function () {
        $(this).addClass('active');
        $('#cr-signin').removeClass('active');
        $('#signup-company').show();
        $('#signup-cities').hide();
    });

    $('#cr-signin').on('click', function () {
        $(this).addClass('active');
        $('#cm-signin').removeClass('active');
        $('#signup-company').hide();
        $('#signup-cities').show();
    });

    $('#signin').on('click', () => {
        $('#login-form').hide();
        $('#cm-signin').click();
        $('#signin-form').show();
        let domain = domainName != '' ? '/' + domainName : '';
        if (!signinformcompaniesloaded) {
            $.ajax({
                type: "GET",
                url: domain + '/companynames',
                success: data => {
                    signinformcompaniesloaded = true;
                    $('select[company-names="true"]').each(function () {
                        for (let i in data) {
                            $(this).append('<option value="' + data[i] + '">' + data[i] + '</option>');
                        }
                    });
                },
                error: e => {
                    alert('Error: ' + e.responseText);
                    reject(e);
                }
            });
        }
        if (!signinformcitiesloaded) {
            $.ajax({
                type: "GET",
                url: domain + '/citynames',
                success: data => {
                    signinformcitiesloaded = true;
                    $('select[city-names="true"]').each(function () {
                        for (let i in data) {
                            $(this).append('<option value="' + data[i] + '">' + data[i] + '</option>');
                        }
                    });
                },
                error: e => {
                    alert('Error: ' + e.responseText);
                    reject(e);
                }
            });
        }
    });

    $('#signin_close_button').on('click', () => {
        $('#signin-form').toggle();
    });

    $('#login').on('click', () => {
        $('#login-form').show();
        $('#signin-form').hide();
    });

    $('#login_close_button').on('click', () => {
        $('#login-form').toggle();
    });

    $('#logout').on('click', () => {
        let domain = domainName != '' ? '/' + domainName : '';
        $.ajax({
            type: "POST",
            url: domain + '/logout',
            success: () => {
                window.location.href = domain + '/';
            }
        });
        return false;
    });

    $('#signin-button').on('click', () => {
        let domain = domainName != '' ? '/' + domainName : '';
        let email = $('#signin-email').val();
        let pass = $('#signin-pass').val();
        let company = null;
        let cities = [];

        if ($('#cm-signin').hasClass('active')) {
            company = $('#signin-company').val();
        } else {
            $('.signin-city').each(function () {
                let city = $(this).val();
                if (city != "") {
                    cities.push(city);
                }
            });
        }

        $.ajax({
            type: "POST",
            url: domain + '/signup',
            data: { 'email': email, 'pass': pass, 'company': company, 'cities': cities },
            success: () => {
                alert('Your account request has been sent! Once the admins approve it you can login with your credentials.');
                $('#signin-form').toggle();
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });

    $('#login-button').on('click', () => {
        let domain = domainName != '' ? '/' + domainName : '';
        let email = $('#login-email').val();
        let pass = $('#login-pass').val();

        $.ajax({
            type: "POST",
            url: domain + '/login',
            data: { 'email': email, 'pass': pass },
            success: user => {
                console.log(user);
                if (user.superAdmin) {
                    window.location.href = domain + '/admin';
                } else if(user.companyName && user.companyName !== '') {
                    window.location.href = domain + '/parkings';
                } else {
                    window.location.href = domain + '/cityrep';
                }
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });

    $('#lost-password-button').on('click', () => {
        $('#password-reset-form').show();
        $('#login-form').hide();
    });

    $('#password-reset_close_button').on('click', () => {
        $('#password-reset-form').toggle();
    });

    $('#lost-password-submit-button').on('click', function(){
        $(this).siblings('.loading-icon').show();
        $(this).hide();
        let domain = domainName !== '' ? '/' + domainName : '';
        let email = $('#password-reset-email').val();
        $.ajax({
            type: "POST",
            url: domain + '/lost-password',
            data: { 'email': email },
            success: () => {
                $(this).parent().hide();
                $('#password-reset-mail-sent-message').show();
            },
            error: e => {
                alert(e.responseText);
            }
        });
        return false;
    });


    //insert regions in admin parking overview
    let domain = domainName !== '' ? '/' + domainName : '';
    $('.parking-region-dummy').each(function(){
        let lat = $(this).attr('data-lat');
        let lon = $(this).attr('data-long');
        $.ajax({
            type: "GET",
            url: domain + '/cityrep/get-regions/' + lat + '/' + lon,
            success: data => {
                $(this).parent().html(data.toString());
            },
            error: e => {
                $(this).html("[Error]");
            }
        });
    });
})(jQuery);

//if no lang parameter given, setting is loaded from localStorage
function translate(lang){
    if(lang && user && user.name){
        //send preference to the server (async)
        let domain = domainName !== '' ? '/' + domainName : '';
        $.ajax({
            type: "POST",
            url: domain + '/user/update-lang',
            data: {
                lang: lang
            },
            success: (data) => {
                //console.log("Language successfully updated! " + data);
            },
            error: e => {
                console.error('Error: ' + e.responseText);
            }
        });
    }
    if (typeof(Storage) !== "undefined" && lang) {
        localStorage.setItem("languagePref", lang);
    }
    if (lang || (typeof(Storage) !== "undefined" && localStorage.getItem("languagePref"))) {
        lang = localStorage.getItem("languagePref");
        currentLang = lang;
        let domain = domainName !== '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/static/lang/' + lang + '.json',
            data: {},
            success: (data) => {
                $('[transl-id]').each(function () {
                    let path;
                    try {
                        path = $(this).attr("transl-id").split(/[\.\[\]]/);
                        let dictObj = data;
                        for (i in path) {
                            if(path[i])
                                dictObj = dictObj[path[i]];
                        }
                        if(!dictObj){
                            throw "Missing translation";
                        }
                        $(this).html(dictObj);
                    } catch (e) {
                        console.warn("Missing translation! (" + lang + ')', path);
                    }
                });
                $('[transl-id-placeholder]').each(function () {
                    let path;
                    try {
                        path = $(this).attr("transl-id-placeholder").split(/[\.\[\]]/);
                        let dictObj = data;
                        for (i in path) {
                            if(path[i])
                                dictObj = dictObj[path[i]];
                        }
                        if(!dictObj){
                            throw "Missing translation";
                        }

                        $(this).attr('placeholder', dictObj);

                        // Deal with select2 elements
                        if($(this).is('select')) {
                            $(this).select2('destroy');
                            $(this).select2({
                                minimumResultsForSearch: 20,
                                dropdownParent: $(this).next('.dropDownSelect2'),
                                placeholder: $(this).attr('placeholder')
                            });
                        }
                    } catch (e) {
                        console.warn("Missing translation!! (" + lang + ')', path);
                    }
                });
                $('[transl-id-validate]').each(function () {
                    let path;
                    try {
                        path = $(this).attr("transl-id-validate").split(/[\.\[\]]/);
                        let dictObj = data;
                        for (i in path) {
                            if(path[i])
                                dictObj = dictObj[path[i]];
                        }
                        if(!dictObj){
                            throw "Missing translation";
                        }
                        $(this).attr('data-validate', dictObj);
                    } catch (e) {
                        console.warn("Missing translation!! (" + lang + ')', path);
                    }
                });
                $('[transl-id-option]').each(function() {
                    let optionType = $(this).attr('transl-id-option');
                    switch (optionType) {
                        case "securityfeature":
                            //find correct feature
                            for(i in mySecurityFeatures){
                                if($(this).attr('value') === mySecurityFeatures[i]['@id']){
                                    $(this).html(mySecurityFeatures[i]['label'][lang]);
                                }
                            }
                            break;
                        case "generalfeature":
                            //find correct feature
                            for(i in myGeneralFeatures){
                                if($(this).attr('value') === myGeneralFeatures[i]['@id']){
                                    $(this).html(myGeneralFeatures[i]['label'][lang]);
                                }
                            }
                            break;
                            case "biketypes":
                                //find correct type
                                for(i in myBikeTypes){
                                    if($(this).attr('value') === myBikeTypes[i]['@id']){
                                        $(this).html(myBikeTypes[i]['label'][lang]);
                                    }
                                }
                                break;
                        case "parkingtypes":
                            //find correct type
                            for(i in myParkingTypes){
                                if($(this).attr('value') === myParkingTypes[i]['@id']){
                                    $(this).html(myParkingTypes[i]['label'][lang]);
                                }
                            }
                            break;
                        default:
                            console.warn('Translation: Unknown option type "' + optionType + '"');
                            break;
                    }
                });

                // Trigger change on data input language to adapt languages names
                $('#language-selection-container #dutch').trigger('change');
                handleResize();

                //fix select2
                let select2El = $('.js-select2');
                select2El.each(function () {
                    $(this).select2('destroy');
                });
                select2El.each(function () {
                    $(this).select2({
                        minimumResultsForSearch: 20,
                        dropdownParent: $(this).next('.dropDownSelect2'),
                        placeholder: $(this).attr('placeholder')
                    });
                });
            },
            error: e => {
                console.error('Error: ' + e.responseText);
            }
        });
    } else {
        //Set standard language to dutch
        translate('nl');    //TODO: replace all text in html files to the dutch versions, since dutch should be default. This is a temporary hack.
    }
}

