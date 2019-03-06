($ => {

    addClickListeners();

    loadParkingValues();

})(jQuery);

function loadParkingValues() {
    let parkingData = $('#loadedParking').text().trim();
    if(parkingData && parkingData != '') {
        let parking = JSON.parse(parkingData);
        console.log(parking);
    }
}

function addClickListeners() {
    $('#parking-list input[title=Edit]').each(function() {
        $(this).on('click', editClick);
    });

    $('#parking-list input[title=Delete]').each(function() {
        $(this).on('click', deleteClick);
    });

    $('#parking-list input[title=Download]').each(function() {
        $(this).on('click', downloadClick);
    });
}

function editClick() {
    let domain = domainName != '' ? '/' + domainName : '';
    let parkingId = $(this).parent().parent().find('a').text();
    let userName = $('#user-email').text().trim();
    window.location.href = domain + '/home?username=' + userName + '&parkingId=' + parkingId;
}

function deleteClick() {
    
}

function downloadClick() {
    
}