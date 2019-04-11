($ => {
    console.log(user);

    if(user && user.name && user.name !== ''){
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

    if(!user || user.superAdmin !== "true"){
        $('#myAdminOverview').remove();
    }

    $('#signin').on('click', () => {
        $('#signin-form').show();
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

        $.ajax({
            type: "POST",
            url: domain + '/signup',
            data: { 'email': email, 'pass': pass },
            success: () => {
                $.ajax({
                    type: "POST",
                    url: domain + '/login',
                    data: { 'email': email, 'pass': pass },
                    success: () => {
                        window.location.href = domain + '/home?username=' + email;
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
            data: { 'email': email, 'pass': pass },
            success: () => {
                window.location.href = domain + '/home?username=' + email;
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });
})(jQuery);