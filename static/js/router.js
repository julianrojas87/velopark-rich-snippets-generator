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

    $('#adminParkings').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        let username = $('#user-email').text().trim();
        window.location.href = domain + '/admin-parkings?username=' + username;
    });

    $('#adminUsers').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        let username = $('#user-email').text().trim();
        window.location.href = domain + '/admin-users?username=' + username;
    });

    $('.checkbox-companyUserEnabled').change(function(){
        $(this).hide();
        $(this).siblings('.loading-icon').show();
        let domain = domainName != '' ? '/' + domainName : '';
        let userEmail = $(this).attr('useremail');
        $.ajax({
            type: "POST",
            url: domain + '/admin-users/toggle-company-state/' + userEmail,
            data: { 'companyEnabled': this.checked },
            success: () => {
                $(this).show();
                $(this).siblings('.loading-icon').hide();
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $(this).prop("checked", !$(this).prop("checked"));
                $(this).show();
                $(this).siblings('.loading-icon').hide();
            }
        });
    });

    $('.checkbox-cityUserEnabled').change(function(){
        $(this).hide();
        $(this).siblings('.loading-icon').show();
        let domain = domainName != '' ? '/' + domainName : '';
        let userEmail = $(this).attr('useremail');
        let cityName = $(this).attr('cityName');
        $.ajax({
            type: "POST",
            url: domain + '/admin-users/toggle-city-state/' + userEmail,
            data: { 'cityEnabled': this.checked, 'cityName': cityName },
            success: () => {
                $(this).show();
                $(this).siblings('.loading-icon').hide();
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $(this).prop("checked", !$(this).prop("checked"));
                $(this).show();
                $(this).siblings('.loading-icon').hide();
            }
        });
    });

})(jQuery);