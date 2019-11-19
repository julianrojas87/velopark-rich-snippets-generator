($ => {
    registerFilters();
})(jQuery);

function registerFilters() {
    let filterById = $('#filterById');
    let filterByName = $('#filterByName');

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
                registerFilters();
                registerParkingListButtons();
                translate();
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
                registerFilters();
                registerParkingListButtons();
                translate();
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });
    });
}