let signinformcompaniesloaded = false;
let signinformcitiesloaded = false;
let currentLang = 'nl';

($ => {

    if (user && user.name && user.name !== '') {
        $('#signin').hide();
        $('#login').hide();
        $('#logout').css('display', 'inline-block');
        $('#user-email').text(user.name).css('display', 'inline-block');
    } else {
        $('#logout').hide();
        $('#user-email').hide();
        $('#signin').css('display', 'inline-block');
        $('#login').css('display', 'inline-block');
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
                    //reject(e);
                }
            });
        }
        if (!signinformcitiesloaded) {
            $.ajax({
                type: "GET",
                url: domain + '/regionhierarchy',
                success: data => {
                    signinformcitiesloaded = true;

                    var style = document.createElement('style');
                    style.type = 'text/css';
                    style.innerHTML = 'content';



                    function addChildLevel(select, childObject){

                        function getColorForAdminLevel(level){
                            switch (level) {
                                case "0":
                                case 0:
                                    return "dodgerblue";
                                    break;
                                case "1":
                                case 1:
                                    return "cornflowerblue";
                                    break;
                                case "2":
                                case 2:
                                    return "lightskyblue";
                                    break;
                                case "3":
                                case 3:
                                    return "lightblue";
                                    break;
                                case "4":
                                case 4:
                                    return "aliceblue";
                                    break;
                            }
                        }
                        select.each(function() {
                            $(this).append('<option class="region-level-' + childObject['adminLevel'] +'" value="' + childObject['name_NL'] + '">' + "&nbsp;&nbsp;&nbsp;".repeat(Number(childObject['adminLevel'])) + childObject['name_NL'] + '</option>');
                        });
                        style.innerHTML = '.select2-results__option[id*="-' + childObject['name_NL'] + '"] {' +
                            ' background-color: ' + getColorForAdminLevel(childObject['adminLevel']) + ";" +
                            '}' + style.innerHTML;
                        for(let i in childObject.childAreas){
                            addChildLevel(select, childObject.childAreas[i]);
                        }
                    }

                    for(let j in data) {
                        addChildLevel($('select[city-names="true"]'), data[j]);
                    }
                    document.getElementsByTagName('head')[0].appendChild(style);
                },
                error: e => {
                    alert('Error: ' + e.responseText);
                    //reject(e);
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
                alert('Your account request has been sent! Once the admins approve it you can login with your credentials.', 'Success!', 'success');
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

    let regionTrees = $('.region-tree[state="flat"]');
    if (regionTrees.length) {
        let domain = domainName !== '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/regionhierarchy',
            success: data => {
                regionTrees.each(function () {
                    let regions = [];
                    $(this).find('.region-allowed-to-represent').each(function () {
                        regions.push($(this).attr('region'));
                    });
                    console.log(regions);
                    function isPresent(object){
                        let returnObject = {};
                        let children = [];
                        //Ask your children
                        if(object.childAreas){
                            for(let i in object.childAreas){
                                let child = isPresent(object.childAreas[i]);
                                if(!child.name_NL && child.children && child.children.length){
                                    children = children.concat(child.children);
                                } else if(!jQuery.isEmptyObject(child)){
                                    children.push(child);
                                }
                            }
                        }
                        if(children.length){
                            returnObject.children = children;
                        }
                        //Am I part of the list?
                        if(regions.includes(object['name_NL'])){
                            returnObject['name_NL'] = object['name_NL'];
                            returnObject['adminLevel'] = object['adminLevel'];

                        }
                        return returnObject;
                    }
                    let globalChildren = [];
                    for(let k in data) {
                        globalChildren = globalChildren.concat(isPresent(data[k]));
                    }
                    console.log(globalChildren);

                    function visitTreeTopDown(tableCell, object, element){
                        if(object.name_NL){
                            let elementToMove = tableCell.find('.region-allowed-to-represent[region="' + object.name_NL + '"]');
                            elementToMove.addClass("admin-level-"+object.adminLevel);
                            element.append(elementToMove);
                        }
                        if(object.children){
                            let newElement = tableCell.find('.region-allowed-to-represent[region="' + object.name_NL + '"]');
                            for( let i in object.children) {
                                visitTreeTopDown(tableCell, object.children[i], newElement);
                            }
                        }
                    }
                    for( let h in globalChildren) {
                        visitTreeTopDown($(this), globalChildren[h], $(this));
                    }

                });
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    }



})(jQuery);

//if no lang parameter given, setting is loaded from localStorage
function translate(lang, first){
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
                            if($(this).hasClass('select2-hidden-accessible')) {
                                $(this).select2('destroy');
                            }
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
                select2El.change();

                // Regions filter translation
                if($('#filterByRegion').length > 0 && !first) {
                    populateRegions().then(() => {
                        insertParkingRegions();
                    });
                }
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

