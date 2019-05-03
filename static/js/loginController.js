let signinformcompaniesloaded = false;
let signinformcitiesloaded = false;

($ => {

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
            success: () => {
                if (user.superAdmin) {
                    window.location.href = domain + '/admin';
                } else {
                    window.location.href = domain + '/home';
                }
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });
})(jQuery);


