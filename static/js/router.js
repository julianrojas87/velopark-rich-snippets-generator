($ => {

    $('#main-title').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/';
    });

    $('#myParkings').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        let username = $('#user-email').text().trim();
        window.location.href = domain + '/parkings?username=' + username;
    });

    $('#myAdminOverview').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        let username = $('#user-email').text().trim();
        window.location.href = domain + '/admin?username=' + username;
    });

})(jQuery);