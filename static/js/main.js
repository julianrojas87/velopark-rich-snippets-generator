const domainName = $('#domainName').text().trim();

function getListOfTerms(done) {
    let domain = domainName != '' ? '/' + domainName : '';
    $.ajax({
        type: "GET",
        url: domain + '/terms',
        success: data => {
            done(data);
        },
        error: e => {
            alert('Error: ' + e.responseText);
        }
    });
}

function getParkingTypes(done) {
    let domain = domainName != '' ? '/' + domainName : '';
    $.ajax({
        type: "GET",
        url: domain + '/parkingTypes',
        success: data => {
            done(data);
        },
        error: e => {
            alert('Error: ' + e.responseText);
        }
    });
}

function getBikeTypes(done) {
    let domain = domainName != '' ? '/' + domainName : '';
    $.ajax({
        type: "GET",
        url: domain + '/bikeTypes',
        success: data => {
            done(data);
        },
        error: e => {
            alert('Error: ' + e.responseText);
        }
    });
}

function getFeatures(done) {
    let domain = domainName != '' ? '/' + domainName : '';
    $.ajax({
        type: "GET",
        url: domain + '/features',
        success: data => {
            done(data);
        },
        error: e => {
            alert('Error: ' + e.responseText);
        }
    });
}

function handleLoginFeatures() {
    // Check if user is logged in
    let userName = $('#user-email').text();
    if (!userName || userName == '') {
        // Hide JSON-LD view features
        $('#save_button').remove();
    }
}

(function ($) {
    "use strict";

    handleLoginFeatures();

    getListOfTerms(listOfTerms => {
        $('select[terms = "true"]').each(function () {
            for (var i = 0; i < listOfTerms.length; i++) {
                $(this).append('<option value="' + listOfTerms[i]['@id'] + '">' + listOfTerms[i]['label'] + '</option>');
            }
        });
    });

    getParkingTypes(parkingTypes => {
        $('select[parking-types = "true"]').each(function () {
            for (var i = 0; i < parkingTypes.length; i++) {
                $(this).append('<option value="' + parkingTypes[i]['@id'] + '">' + parkingTypes[i]['label'] + '</option>');
            }
        });
    });

    getBikeTypes(bikeTypes => {
        $('select[bike-types = "true"]').each(function () {
            for (var i = 0; i < bikeTypes.length; i++) {
                $(this).append('<option value="' + bikeTypes[i]['@id'] + '">' + bikeTypes[i]['label'] + '</option>');
            }
        });
    });

    getFeatures(features => {
        $('select[feature-types = "true"]').each(function () {
            for (var i = 0; i < features.length; i++) {
                $(this).append('<option value="' + features[i]['@id'] + '">' + features[i]['label'] + '</option>');
            }
        });
    });

    $('.plus_button_input').on('click', function () {
        var parent = $(this).parent().clone(true);
        if (parent.find('.minus_button').length <= 0) {
            var minus = $('<input type="image" class="minus_button" src="static/images/icons/minus.png" style="float: left; width: 40px; position: relative; bottom: 4px;">');
            minus.on('click', function () {
                $(this).parent().remove();
                return false;
            });
            parent.append(minus);
        }
        $(this).parent().after(parent);
        return false;
    });

    $('.plus_button_select').on('click', function () {
        var parent = $(this).parent();
        parent.find('.js-select2').each(function () {
            $(this).select2('destroy');
        });

        var newSelect = $(this).prev().clone(true);
        var newPlus = $(this).clone(true);
        var minus = $('<input type="image" class="minus_button" src="static/images/icons/minus.png" style="float: left; width: 40px; position: relative; left: 35px;">');
        minus.on('click', function () {
            newSelect.remove();
            newPlus.remove();
            minus.remove();
            return false;
        });

        if ($(this).next('.minus_button').length > 0) {
            $(this).next().after(newSelect);
        } else {
            $(this).after(newSelect);
        }

        newSelect.after(newPlus);
        newPlus.after(minus);

        parent.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });

        return false;
    });

    $('.plus_button_section').on('click', function () {
        if ($(this).next().attr('class').indexOf('minus_button') >= 0) {
            var section = $(this).next().next();
        } else {
            var section = $(this).next();
        }

        var parent = $(this).parent();
        parent.find('.js-select2').each(function () {
            $(this).select2('destroy');
        });

        var newSection = section.clone(true);
        var newSpan = $(this).prev('span').clone(true);
        var newPlus = $(this).clone(true);

        var minus = $('<input type="image" class="minus_button" src="static/images/icons/minus.png" style="float: left; width: 40px; position: relative; bottom: 4px;">');
        minus.on('click', function () {
            newSection.remove();
            newPlus.remove();
            newSpan.remove();
            $(this).remove();
            return false;
        });

        section.after(newSection);
        section.after(minus);
        section.after(newPlus);
        section.after(newSpan);

        parent.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });

        newSection.find('.ol-point-map').each(function () {
            $(this).empty();
            let newMap = $(this).attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
            $(this).attr('id', newMap);
            let newClear = $(this).prev().attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
            $(this).prev().attr('id', newClear);
            $(this).prev().off('click');
            let newLat = $(this).next().find('input').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
            $(this).next().find('input').attr('id', newLat);
            let newLon = $(this).next().next().find('input').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
            $(this).next().next().find('input').attr('id', newLon);

            initPointMap(newMap, newLat, newLon, newClear);
        });

        newSection.find('.ol-polygon-map').each(function () {
            $(this).empty();
            let newMap = $(this).attr('id') + '_';
            $(this).attr('id', newMap);
            let newClear = $(this).prev().attr('id') + '_';
            $(this).prev().attr('id', newClear);
            let newPoly = $(this).next().find('input').attr('id') + '_';
            $(this).next().find('input').attr('id', newPoly);

            initPolygonMap(newMap, newPoly, newClear);
        });

        return false;
    });

})(jQuery);