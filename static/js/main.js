const domainName = $('#domainName').text().trim();
var loadingPromises = [];
var context = null;
const startStepNumberFacilitySection = 3;
const numStepsFacilitySection = 5;
var currentNumFacilitySections = 1;

//var currentStepNumberInsertPos = 8;

function loadAPSkeleton() {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: $('#vocabURI').text().trim() + '/openvelopark/application-profile',
            success: data => resolve(data),
            error: e => reject(e)
        });
    });
}

function getListOfTerms() {
    return new Promise((resolve, reject) => {
        let domain = domainName != '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/terms',
            success: data => {
                resolve(data);
            },
            error: e => {
                alert('Error: ' + e.responseText);
                reject(e);
            }
        });
    });
}

function getParkingTypes() {
    return new Promise((resolve, reject) => {
        let domain = domainName != '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/parkingTypes',
            success: data => {
                resolve(data);
            },
            error: e => {
                alert('Error: ' + e.responseText);
                reject(e);
            }
        });
    });
}

function getBikeTypes(done) {
    return new Promise((resolve, reject) => {
        let domain = domainName != '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/bikeTypes',
            success: data => {
                resolve(data);
            },
            error: e => {
                alert('Error: ' + e.responseText);
                reject(e);
            }
        });
    });
}

function getFeatures(done) {
    return new Promise((resolve, reject) => {
        let domain = domainName != '' ? '/' + domainName : '';
        $.ajax({
            type: "GET",
            url: domain + '/features',
            success: data => {
                resolve(data);
            },
            error: e => {
                alert('Error: ' + e.responseText);
                reject(e);
            }
        });
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

    let terms = getListOfTerms();
    let parkingTypes = getParkingTypes();
    let bikeTypes = getBikeTypes();
    let features = getFeatures();
    let contextPromise = loadAPSkeleton();

    loadingPromises.push(terms);
    loadingPromises.push(parkingTypes);
    loadingPromises.push(bikeTypes);
    loadingPromises.push(features);
    loadingPromises.push(contextPromise);

    make_wizard();

    $(".js-select2").each(function () {
        $(this).select2({
            minimumResultsForSearch: 20,
            dropdownParent: $(this).next('.dropDownSelect2')
        });
    });

    terms.then(listOfTerms => {
        $('select[terms = "true"]').each(function () {
            for (var i = 0; i < listOfTerms.length; i++) {
                $(this).append('<option value="' + listOfTerms[i]['@id'] + '">' + listOfTerms[i]['label'] + '</option>');
            }
        });
    });

    parkingTypes.then(parkingTypes => {
        $('select[parking-types = "true"]').each(function () {
            for (var i = 0; i < parkingTypes.length; i++) {
                $(this).append('<option value="' + parkingTypes[i]['@id'] + '">' + parkingTypes[i]['label'] + '</option>');
                //console.log($(this));
            }
        });
    });

    bikeTypes.then(bikeTypes => {
        $('select[bike-types = "true"]').each(function () {
            for (var i = 0; i < bikeTypes.length; i++) {
                $(this).append('<option value="' + bikeTypes[i]['@id'] + '">' + bikeTypes[i]['label'] + '</option>');
            }
        });
    });

    features.then(features => {
        $('select[feature-types = "true"]').each(function () {
            for (var i = 0; i < features.length; i++) {
                $(this).append('<option value="' + features[i]['@id'] + '">' + features[i]['label'] + '</option>');
            }
        });
    });

    contextPromise.then(jsonld => {
        context = jsonld['@context'];
    });

    $('.minus_button_input').on('click', function () {
        let myParent = $(this).parent();

        myParent.find("input, textarea").each(function () {
            if ($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', false);
            } else if (($(this).attr('type') !== 'button')) {
                $(this).val('');
            }
        });
        myParent.find('.js-select2').each(function () {
            $(this).select2('data', null);
            //$(this).select2('destroy');
            $(this).val('');
        });

        myParent.slideUp("slow", function () {
            if (myParent.siblings("div").length > 0) {
                myParent.remove();
            } else {
                $(this).siblings(".input100").val("");
                myParent.find('.js-select2').each(function () {
                    $(this).select2('val', '');
                });
            }
        });
    });

    $('.plus_button_input').on('click', function () {
        var newCopy = $(this).siblings('div:first').clone(true);
        newCopy.find("input").val("");
        newCopy.hide();          //for animation
        $(this).before(newCopy);
        newCopy.slideDown('slow');    //animate
        return false;
    });

    $('.plus_button_select').on('click', function () {
        var originalInput = $(this).siblings('div:first');
        originalInput.find('.js-select2').each(function () {
            $(this).select2('destroy');
        });

        var newSelect = originalInput.clone(true);

        newSelect.find("input").val("");
        newSelect.hide();          //for animation
        $(this).before(newSelect);

        newSelect.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2',),
                val: ''
            });
        });
        originalInput.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });

        newSelect.slideDown('slow');    //animate

        return false;
    });

    $('.plus_button_section').on('click', function () {
        let section = $(this).siblings('div:first');

        section.find('.js-select2').each(function () {
            $(this).select2('destroy');
        });

        var newSection = section.clone(true);

        //Fix and remove extra sections
        newSection.find("button.plus_button_section").each(function () {
            $(this).siblings("div").slice(1).remove();
        });

        newSection.find('input, textarea').each(function () {
            if ($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', false);
            } else if (($(this).attr('type') !== 'button')) {
                $(this).val('');
            }
        });

        if (parkingDataLoaded) {
            newSection.hide();      //for animation
        }

        $(this).before(newSection);

        section.parent().find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });

        function showMaps() {
            newSection.find('.ol-point-map').each(function () {
                $(this).empty();
                let newMap = $(this).attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).attr('id', newMap);
                let newClear = $(this).prev().attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).prev().attr('id', newClear);
                $(this).prev().off('click');
                let newLat = $(this).next().find('input.input100').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).next().find('input.input100').attr('id', newLat);
                let newLon = $(this).next().next().find('input.input100').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).next().next().find('input.input100').attr('id', newLon);

                initPointMap(newMap, newLat, newLon, newClear);
            });

            newSection.find('.ol-polygon-map').each(function () {
                $(this).empty();
                let newMap = $(this).attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).attr('id', newMap);
                let newClear = $(this).prev().attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).prev().attr('id', newClear);
                $(this).prev().off('click');
                let newPoly = $(this).next().find('input.input100').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
                $(this).next().find('input.input100').attr('id', newPoly);

                initPolygonMap(newMap, newPoly, newClear);
            });
        }

        if (parkingDataLoaded) {
            newSection.show("slow", showMaps);
        } else {
            //showMaps();
        }
        return false;
    });

    $('#button-add-facility-section').on('click', function () {
        addFacilitySection();
        $('#form-velopark-data-t-' + (startStepNumberFacilitySection + (currentNumFacilitySections - 1) * numStepsFacilitySection)).get(0).click();
    });

})(jQuery);


function addFacilitySection() {
    currentNumFacilitySections++;
    let currentStepNumberInsertPos = (startStepNumberFacilitySection + (currentNumFacilitySections - 1) * numStepsFacilitySection);

    for (let i = numStepsFacilitySection; i > 0; i--) {
        var facilitySection = $('#step-facility-section-' + i);
        //destroy select2
        facilitySection.find('.js-select2').each(function () {
            $(this).select2('destroy');
        });

        //clone the section & section title
        var newFacilitySection = facilitySection.clone(true).attr("id", facilitySection.attr("id") + "-" + currentNumFacilitySections);
        var newFacilitySection1Title = $('.step-facility-section-' + i + '-title').html();

        $("#form-velopark-data").steps("insert", currentStepNumberInsertPos, {
            title: newFacilitySection1Title,
            content: newFacilitySection
        });

        //Fix and remove extra sections
        newFacilitySection.find("button.plus_button_section").each(function () {
            $(this).siblings("div").slice(1).remove();
        });

        newFacilitySection.find('input').each(function () {
            if ($(this).attr('type') == 'checkbox') {
                $(this).prop('checked', false);
            } else if (($(this).attr('type') != 'button')) {
                $(this).val('');
            }
        });

        newFacilitySection.find('textarea').each(function () {
            $(this).val('');
        });


        //re-enable select2 (original section and cloned section)
        facilitySection.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });
        newFacilitySection.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });
        newFacilitySection.find("[parking-section]").attr("parking-section", currentNumFacilitySections - 1);
    }
    let locationSection = $('#step-facility-section-2-' + currentNumFacilitySections);
    locationSection.find('.ol-point-map').each(function () {
        $(this).empty();
        let newMap = $(this).attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).attr('id', newMap);
        let newClear = $(this).prev().attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).prev().attr('id', newClear);
        $(this).prev().off('click');
        let newLat = $(this).next().find('input.input100').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).next().find('input.input100').attr('id', newLat);
        let newLon = $(this).next().next().find('input.input100').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).next().next().find('input.input100').attr('id', newLon);

        initPointMap(newMap, newLat, newLon, newClear);
    });

    locationSection.find('.ol-polygon-map').each(function () {
        $(this).empty();
        let newMap = $(this).attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).attr('id', newMap);
        let newClear = $(this).prev().attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).prev().attr('id', newClear);
        $(this).prev().off('click');
        let newPoly = $(this).next().find('input.input100').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).next().find('input.input100').attr('id', newPoly);

        initPolygonMap(newMap, newPoly, newClear);
    });

}