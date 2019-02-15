($ => {

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
        $.ajax({
            type: "POST",
            url: '/logout',
            success: () => {
                window.location.href = '/';
            }
        });
        return false;
    });

    $('#signin-button').on('click', () => {
        let email = $('#signin-email').val();
        let pass = $('#signin-pass').val();

        $.ajax({
            type: "POST",
            url: '/signup',
            data: { 'email': email, 'pass': pass },
            success: () => {
                alert('Account created correctly!!');
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });

    $('#login-button').on('click', () => {
        let email = $('#login-email').val();
        let pass = $('#login-pass').val();

        $.ajax({
            type: "POST",
            url: '/login',
            data: { 'email': email, 'pass': pass },
            success: () => {
                window.location.href = '/home?username=' + email;
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });
})(jQuery);