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
            data: { lang: localStorage.languagePref },
            success: data => {
                let filter = $('#filterByRegion');
                // Clean and restore
                if ($(filter).hasClass('select2-hidden-accessible')) {
                    $(filter).select2('destroy');
                }
                $(filter).empty();
                $(filter).append('<option value=""></option>');
                // Add new values
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

function sortByDate(sort) {
    $.ajax({
        url: window.location.href,
        headers: { 'Range': 'pages=0-50' },
        data: { dateSort: sort },
        success: function (data) {
            $('#parkingsContainer').replaceWith(data);
            populateRegions().then(() => {
                registerFilters();
                registerParkingListButtons();
            });
        },
        error: e => {
            alert('Error: ' + e.responseText);
        }
    });
}

function registerFilters() {
    let filterById = $('#filterById');
    let filterByName = $('#filterByName');
    let filterByRegion = $('#filterByRegion');
    let dateSort = $('#sort-des').data('sort');

    if(dateSort === -1) {
        $('#sort-des').show();
        $('#sort-asc').hide();
    } else {
        $('#sort-des').hide();
        $('#sort-asc').show();
    }

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
            data: { idFilter: filter, dateSort: dateSort },
            success: function (data) {
                $('#parkingsContainer').replaceWith(data);
                populateRegions().then(() => {
                    registerFilters();
                    registerParkingListButtons();
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
            data: { nameFilter: filter, dateSort: dateSort },
            success: function (data) {
                $('#parkingsContainer').replaceWith(data);
                populateRegions().then(() => {
                    registerFilters();
                    registerParkingListButtons();
                });
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    });

    filterByRegion.change(function () {
        let filter = $(this).val();
        let lang = localStorage.languagePref;
        if ((!filter || filter === '') && window.location.href.indexOf('cityname=') > 0) {
            lang = undefined;
        }
        $.ajax({
            url: window.location.href,
            headers: { 'Range': 'pages=0-50' },
            data: { 
                regionFilter: filter, 
                lang: lang,
                dateSort: dateSort
            },
            success: function (data) {
                $('#parkingsContainer').replaceWith(data);
                populateRegions().then(() => {
                    registerFilters();
                    registerParkingListButtons();
                });

                if (filter === '') {
                    translate(undefined, true);
                }
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    });

    $('#sort-des').click(function () {
        $(this).toggle();
        $('#sort-asc').toggle();
        sortByDate(1);
    });

    $('#sort-asc').click(function () {
        $(this).toggle();
        $('#sort-des').toggle();
        sortByDate(-1);
    });
}