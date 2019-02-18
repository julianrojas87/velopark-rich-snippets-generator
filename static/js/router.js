($ => {

    $('#main-title').click(() => {
        window.location.href = '/';
    });

    $('#myParkings').click(() => {
        let username = $('#user-email').text().trim();
        window.location.href = '/parkings?username=' + username;
    });
})(jQuery);