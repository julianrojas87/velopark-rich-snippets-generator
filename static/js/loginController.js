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

    if (!user || !user.cityrep || user.cityrep!=="true") {
        $('#myCityOverview').remove();
    }

    if(!user.company.name || user.company.enabled!=="true"){
        $('#myParkings').remove();
    }

    $('#signin').on('click', () => {
        $('#signin-form').show();
        let domain = domainName != '' ? '/' + domainName : '';
        if(!signinformcompaniesloaded) {
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
        if(!signinformcitiesloaded) {
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
        let company = $('#signin-company').val();
        let cities = [];
        $('.signin-city').each(function(){
            let city = $(this).val();
            if(city != "") {
                cities.push(city);
            }
        });

        $.ajax({
            type: "POST",
            url: domain + '/signup',
            data: {'email': email, 'pass': pass, 'company': company, 'cities': cities},
            success: () => {
                $.ajax({
                    type: "POST",
                    url: domain + '/login',
                    data: {'email': email, 'pass': pass },
                    success: () => {
                        window.location.href = domain + '/home';
                    },
                    error: e => {
                        alert('Error: ' + e.responseText);
                    }
                });
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
            data: {'email': email, 'pass': pass},
            success: () => {
                window.location.href = domain + '/home';
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });
})(jQuery);


