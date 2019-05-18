($ => {

    $('#main-title').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/';
    });

    $('#addParkings').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/';
    });

    $('#myParkings').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/parkings';
    });

    $('#myAdminOverview').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/admin';
    });

    $('#adminParkings').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/admin-parkings';
    });

    $('#adminUsers').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/admin-users';
    });

    $('#adminCompanies').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/admin-companies';
    });

    $('#myCityOverview').click(() => {
        let domain = domainName != '' ? '/' + domainName : '';
        window.location.href = domain + '/cityrep';
    });

    $('.cityrep-parkings-button').on('click', function () {
        let domain = domainName != '' ? '/' + domainName : '';
        let cityName = $(this).attr('cityname');
        window.location.href = domain + '/cityrep-parkings?cityname=' + cityName;
    });

    $('.checkbox-companyUserEnabled').change(function () {
        $(this).hide();
        $(this).siblings('.loading-icon').show();
        let domain = domainName != '' ? '/' + domainName : '';
        let userEmail = $(this).attr('useremail');
        $.ajax({
            type: "POST",
            url: domain + '/admin-users/toggle-company-state/' + userEmail,
            data: {'companyEnabled': this.checked},
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

    $('.checkbox-cityUserEnabled').change(function () {
        $(this).hide();
        $(this).prev('.loading-icon').show();
        let domain = domainName != '' ? '/' + domainName : '';
        let userEmail = $(this).attr('useremail');
        let cityName = $(this).attr('cityName');
        $.ajax({
            type: "POST",
            url: domain + '/admin-users/toggle-city-state/' + userEmail,
            data: {'cityEnabled': this.checked, 'cityName': cityName},
            success: () => {
                $(this).show();
                $(this).prev('.loading-icon').hide();
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $(this).prop("checked", !$(this).prop("checked"));
                $(this).show();
                $(this).prev('.loading-icon').hide();
            }
        });
    });

    $('.checkbox-parkingEnabled').change(function () {
        $(this).hide();
        $(this).prev('.loading-icon').show();
        let domain = domainName != '' ? '/' + domainName : '';
        let parkingid = $(this).attr('parkingid');
        $.ajax({
            type: "POST",
            url: domain + '/parkings/toggle-parking-enabled',
            data: {
                'parkingId': parkingid,
                'parkingEnabled': this.checked
            },
            success: () => {
                $(this).show();
                $(this).prev('.loading-icon').hide();
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $(this).prop("checked", !$(this).prop("checked"));
                $(this).show();
                $(this).prev('.loading-icon').hide();
            }
        });
    });

    $('#parking-list input[title=Edit]').each(function () {
        $(this).on('click', function () {
            let domain = domainName !== '' ? '/' + domainName : '';
            let parkingId = encodeURIComponent($(this).parent().parent().find('a').text().trim());
            console.log(parkingId);
            window.location.href = domain + '/home?parkingId=' + parkingId;
        });
    });

    $('#parking-list input[title=Delete]').each(function () {
        $(this).on('click', function () {
            let domain = domainName !== '' ? '/' + domainName : '';
            let parkingId = encodeURIComponent($(this).parent().parent().find('a').text().trim());

            if (confirm('Are you sure to delete the ' + parkingId + ' parking facility?')) {
                $.ajax({
                    type: "DELETE",
                    url: domain + '/delete-parking?parkingId=' + parkingId,
                    success: () => {
                        if(user.superAdmin === 'true') {
                            window.location.href = domain + '/admin-parkings';
                        } else {
                            window.location.href = domain + '/parkings';
                        }
                    },
                    error: e => {
                        alert('Error: ' + e.responseText);
                    }
                });
            }
        });
    });

    $('#parking-list input[title=Download]').each(function () {
        $(this).on('click', function () {
            let domain = domainName !== '' ? '/' + domainName : '';
            let parkingId = encodeURIComponent($(this).parent().parent().find('a').text().trim());
            window.location.href = domain + '/download?parkingId=' + parkingId;
        });
    });

    $('#button-create-new-company').on('click', function () {
        $(this).hide();
        $(this).prev('.loading-icon').show();
        let domain = domainName !== '' ? '/' + domainName : '';
        let companyName = $('#new-company-name').val();
        $.ajax({
            type: "POST",
            url: domain + '/admin-companies/new-company/' + companyName,
            success: () => {
                $(this).show();
                $(this).prev('.loading-icon').hide();
                window.location.href = domain + '/admin-companies';
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $(this).prop("checked", !$(this).prop("checked"));
                $(this).show();
                $(this).prev('.loading-icon').hide();
            }
        });
    });

    let selectedParkingToTransfer = null;

    $('.transfer-parking').on('click', function() {
        selectedParkingToTransfer = encodeURIComponent($(this).attr('parkingid'));
        $('#transfer-parking-form').show();
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
    });

    $('#transfer-company-button').on('click', function () {
        let domain = domainName != '' ? '/' + domainName : '';
        let company = $('#transfer-parking-company').val();

        $.ajax({
            type: "POST",
            url: domain + '/admin-companies/transfer-parking',
            data: {'newcompany': company, 'parkingid': selectedParkingToTransfer},
            success: () => {
                window.location.href = domain + '/admin-parkings';
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
        return false;
    });

    $('#transfer-parking_close_button').on('click', () => {
        $('#transfer-parking-form').toggle();
    });

    $('#pswd-reset-button').on('click', function(){
        let domain = domainName !== '' ? '/' + domainName : '';
        let newPass = $('#pswd-reset-field').val();
        $.ajax({
            type: "POST",
            url: domain + '/reset-password',
            data: {
                pass: newPass
            },
            success: (data) => {
                console.log("Password successfully reset! " + data);
                $('#password-reset-area').hide();
                $('#pswd-reset-success-message').show();
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    });

})(jQuery);