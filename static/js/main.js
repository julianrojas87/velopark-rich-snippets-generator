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



    $('.plus_button_input').on('click', function () {
        var parent = $(this).parent().clone(true);
        if (parent.find('.minus_button').length <= 0) {
            var minus = $('<input type="image" class="minus_button" src="static/images/icons/minus.png" style="float: left; width: 40px; position: relative; bottom: 13px;">');
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

        // Fix and remove extra sections
        newSection.find('.minus_button').each(function() {
            $(this).off('click');
            $(this).on('click', function() {
                $(this).next().remove();
                $(this).prev().remove();
                $(this).prev().remove();
                $(this).remove();
            });
            $(this).click();
        });

        newSection.find('input').each(function() {
            if($(this).attr('type') == 'checkbox') {
                $(this).prop('checked', false);
            } else if(($(this).attr('type') != 'button')) {
                $(this).val('');
            }
        });

        newSection.find('textarea').each(function() {
            $(this).val('');
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

        return false;
    });

    $('#button-add-facility-section').on('click', function(){
        addFacilitySection();
        $('#form-velopark-data-t-' + (startStepNumberFacilitySection + (currentNumFacilitySections - 1) * numStepsFacilitySection)).get(0).click();
    });
    /*function(){
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
            newFacilitySection.find("[parking-section]").attr("parking-section", currentNumFacilitySections-1);
        }

        $('#form-velopark-data-t-' + currentStepNumberInsertPos).get(0).click();

*/

        /*$(".js-select2").each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2')
            });
        });*/

    //});

})(jQuery);


function addFacilitySection(){
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

        // Fix and remove extra sections
        newFacilitySection.find('.minus_button').each(function() {
            $(this).off('click');
            $(this).on('click', function() {
                $(this).next().remove();
                $(this).prev().remove();
                $(this).prev().remove();
                $(this).remove();
            });
            $(this).click();
        });

        newFacilitySection.find('input').each(function() {
            if($(this).attr('type') == 'checkbox') {
                $(this).prop('checked', false);
            } else if(($(this).attr('type') != 'button')) {
                $(this).val('');
            }
        });

        newFacilitySection.find('textarea').each(function() {
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
        newFacilitySection.find("[parking-section]").attr("parking-section", currentNumFacilitySections-1);
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