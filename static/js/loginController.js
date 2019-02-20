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
            url: '/rich-snippets-generator/logout',
            success: () => {
                window.location.href = '/rich-snippets-generator';
            }
        });
        return false;
    });

    $('#signin-button').on('click', () => {
        let email = $('#signin-email').val();
        let pass = $('#signin-pass').val();

        $.ajax({
            type: "POST",
            url: '/rich-snippets-generator/signup',
            data: { 'email': email, 'pass': pass },
            success: () => {
                $.ajax({
                    type: "POST",
                    url: '/rich-snippets-generator/login',
                    data: { 'email': email, 'pass': pass },
                    success: () => {
                        window.location.href = '/rich-snippets-generator/home?username=' + email;
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
        let email = $('#login-email').val();
        let pass = $('#login-pass').val();

        $.ajax({
            type: "POST",
            url: '/rich-snippets-generator/login',
            data: { 'email': email, 'pass': pass },
            success: () => {
                window.location.href = '/rich-snippets-generator/home?username=' + email;
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });
})(jQuery);