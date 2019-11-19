($ => {
    populateRegions().then(() => {
        registerFilters();
    });
})(jQuery);

function populateRegions() {
    return new Promise((resolve, reject) => {
        let domain = domainName != '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/municipalities',
            success: data => {
                let filter = $('#filterByRegion');
                for (var i = 0; i < data.length; i++) {
                    $(filter).append('<option value="' + data[i] + '">' + data[i] + '</option>');
                }
                $(filter).select2({
                    minimumResultsForSearch: 20,
                    allowClear: true,
                    dropdownParent: $(filter).next('.dropDownSelect2'),
                    placeholder: $(filter).attr('placeholder')
                });

                let selectedValue = $(filter).data('selected');
                if (selectedValue && selectedValue !== '') {
                    $(filter).val(selectedValue);
                    $(filter).change();
                }
                resolve();
            },
            error: e => {
                alert('Error: ' + e.responseText);
                reject(e);
            }
        });
    });
}

function registerFilters() {
    let filterById = $('#filterById');
    let filterByName = $('#filterByName');
    let filterByRegion = $('#filterByRegion');

    if (filterById.val() !== '') {
        let num = filterById.val();
        filterById.focus().val('').val(num);
        // Clean up the other filters
        filterByName.val('');
    } else if (filterByName.val() !== '') {
        let num = filterByName.val();
        filterByName.focus().val('').val(num);
        // Clean up the other filters
        filterById.val('');
    }

    filterById.keyup(function () {
        let filter = $(this).val();
        $.ajax({
            url: window.location.href,
            headers: { 'Range': 'pages=0-50' },
            data: { idFilter: filter },
            success: function (data) {
                $('#parkingsContainer').replaceWith(data);
                populateRegions().then(() => {
                    registerFilters();
                    registerParkingListButtons();
                    translate();
                });
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    });

    filterByName.keyup(function () {
        let filter = $(this).val();
        $.ajax({
            url: window.location.href,
            headers: { 'Range': 'pages=0-50' },
            data: { nameFilter: filter },
            success: function (data) {
                $('#parkingsContainer').replaceWith(data);
                populateRegions().then(() => {
                    registerFilters();
                    registerParkingListButtons();
                    translate();
                });
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    });

    filterByRegion.change(function () {
        let filter = $(this).val();
        $.ajax({
            url: window.location.href,
            headers: { 'Range': 'pages=0-50' },
            data: { regionFilter: filter },
            success: function (data) {
                $('#parkingsContainer').replaceWith(data);
                populateRegions().then(() => {
                    registerFilters();
                    registerParkingListButtons();
                    translate();
                });
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });

    });
}