($ => {

    addClickListeners();

    Promise.all(loadingPromises).then(() => {
        loadParkingValues();
    });

})(jQuery);

function loadParkingValues() {
    let parkingData = $('#loadedParking').text().trim();
    if (parkingData && parkingData != '') {
        let parking = JSON.parse(parkingData);
        console.log(parking)
        processObject(parking);
    }
}

function processObject(obj, oldPath) {
    let path = [];
    if (oldPath) {
        path = oldPath;
    }

    let keys = Object.keys(obj);
    for (let i in keys) {
        if (keys[i] != '@context') {
            path.push(keys[i]);
            if (Array.isArray(obj[keys[i]])) {
                if (keys[i] != '@graph') {
                    processArray(path, obj[keys[i]]);
                }
                path.pop();
            } else if (typeof obj[keys[i]] == 'object') {
                processObject(obj[keys[i]], path);
                path.pop();
            } else {
                loadParkingValue(path, obj[keys[i]]);
                path.pop();
            }
        }
    }
}

function processArray(path, arr) {
    let lastPath = path[path.length - 1];
    if (['OpeningHoursSpecification', 'hoursAvailable'].indexOf(lastPath) >= 0) {
        loadParkingValue(path, arr);
    } else if (['photos'].indexOf(lastPath) >= 0) {
        path.push('_' + arr[0]['@type']);
        for (let i = 0; i < arr.length; i++) {
            let obj = arr[i];
            let keys = Object.keys(obj);
            if (i > 0) {
                let inputs = $('[name^="' + lastPath + '"]');
                let last = $(inputs[inputs.length - 1]);
                if (last.closest('.wrap-contact100-subsection').prev().hasClass('minus_button')) {
                    last.closest('.wrap-contact100-subsection').prev().prev().click();
                } else {
                    last.closest('.wrap-contact100-subsection').prev().click();
                }
            }
            for (let j in keys) {
                path.push(keys[j]);
                loadParkingValue(path, obj[keys[j]], true);
                path.pop();
            }
        }
    } else {
        for (let i = 0; i < arr.length; i++) {
            let obj = arr[i];
            path.push('_' + obj['@type']);
            processObject(obj, path);
            path.pop();
        }
    }
}

function loadParkingValue(path, value, override) {
    let name = path.join('.');
    let input = $('[name="' + name + '"]');
    if (input.length > 0) {
        input = $(input[input.length - 1]);
        if (input.is('select') && input.find('option[value="' + value + '"]').length > 0) { // PROBLEM IS HERE: OPTION SELECTED NOT PRESENT FOR SOME REASON(?)
            if (input.val() === '' || override) {
                input.val(value).trigger('change');
            } else {
                input.closest('div.wrap-contact100-subsection').find('.plus_button_select').click();
                let inputs = $('[name="' + name + '"]');
                let newInput = $(inputs[inputs.length - 1]);
                newInput.val(value).trigger('change');
            }
        } else if (input.is('input')) {
            if (input.val() === '' || override) {
                input.val(value);
            } else {
                input.next('.plus_button_input').click();
                let inputs = $('[name="' + name + '"]');
                let newInput = $(inputs[inputs.length - 1]);
                newInput.val(value);
            }
        } else if (input.is('div')) {
            let usedDays = new Set();
            let lastOpens = null;
            let lastCloses = null;

            for (let i in value) {
                let currentDay = value[i];
                if (usedDays.has(currentDay['dayOfWeek']) || (lastOpens && currentDay['opens'] != lastOpens)
                    || (lastCloses && currentDay['closes'] != lastCloses)) {
                    usedDays.clear();
                    if (input.prev().hasClass('minus_button')) {
                        input.prev().prev().click();
                    } else {
                        input.prev().click();
                    }
                    let inputs = $('[name="' + name + '"]');
                    input = $(inputs[inputs.length - 1]);
                    input.find('input[type="checkbox"]').each(function () {
                        $(this).prop('checked', false);
                    });
                }

                input.find('input[value="' + currentDay['dayOfWeek'] + '"]').prop('checked', true);
                let time = input.find('input[type="time"]');
                $(time[0]).val(currentDay['opens']);
                $(time[1]).val(currentDay['closes']);

                usedDays.add(currentDay['dayOfWeek']);
                lastOpens = currentDay['opens'];
                lastCloses = currentDay['closes'];
            }
        }
    }
}

function addClickListeners() {
    $('#parking-list input[title=Edit]').each(function () {
        $(this).on('click', editClick);
    });

    $('#parking-list input[title=Delete]').each(function () {
        $(this).on('click', deleteClick);
    });

    $('#parking-list input[title=Download]').each(function () {
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