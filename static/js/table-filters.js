($ => {
    registerFilters();
})(jQuery);

function registerFilters() {
    let filterById = $('#filterById');

    if (filterById.val() !== '') {
        let num = filterById.val();
        filterById.focus().val('').val(num); 
    }

    filterById.keyup(function () {
        let filter = $(this).val();
        $.ajax({
            url: window.location.href,
            headers: { 'Range': 'pages=0-50' },
            data: { filter: filter },
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