($ => {

    $('#main-title').click(() => {
        window.location.href = '/rich-snippets-generator/';
    });

    $('#myParkings').click(() => {
        let username = $('#user-email').text().trim();
        window.location.href = '/rich-snippets-generator/parkings?username=' + username;
    });
})(jQuery);