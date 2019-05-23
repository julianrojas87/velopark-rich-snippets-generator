let parkingDataLoaded = false;
var loadingPromises = [];
var context = null;
const startStepNumberFacilitySection = 4;
const numStepsFacilitySection = 5;
var currentNumFacilitySections = 1;

const stepOverviewFacilityTitleFormat = '<div class="steps-overview-facility-title" facilitynum="{0}"><h4 >Facility Section {0}</h4><button type="button" class="minus_button steps-overview-remove-facility-button" facilitynum="{0}"><i class="fas fa-trash-alt"></i></button></div>';

if (!String.format) {
    String.format = function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

function loadAPSkeleton() {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: vocabURI + '/openvelopark/application-profile',
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
    if (!userName || userName === '') {
        // Hide JSON-LD view features
        $('#save_button').remove();
        $('#json-ld-saved-status>.saved-icon').remove();
        $('#json-ld-saved-status>.loading-icon').remove();
        $('#json-ld-saved-status>.error-icon').show();
    }
}

(function ($) {
    "use strict";

    make_wizard();

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

    $('#form-velopark-data-t-' + startStepNumberFacilitySection).parent().before(String.format(stepOverviewFacilityTitleFormat, 1));

    let availableLang = ["nl", "en", "de", "fr"];

    function getLangDisplayMap() {
        let nl = 'Nederlands';
        let en = 'Engels';
        let fr = 'Frans';
        let de = 'Duits';

        let lang = localStorage.getItem("languagePref");
        if (lang && lang === 'en') {
            nl = 'Dutch';
            en = 'English';
            fr = 'French';
            de = 'German';
        }

        if (lang && lang === 'fr') {
            nl = 'Néerlandais';
            en = 'Anglais';
            fr = 'Français';
            de = 'Allemand';
        }

        if (lang && lang === 'de') {
            nl = 'Niederländisch';
            en = 'English';
            fr = 'Französisch';
            de = 'Deutsche';
        }
        return {
            "nl": nl,
            "en": en,
            "de": de,
            "fr": fr
        };
    }

    $('#language-selection-container input').change(function () {
        let langDisplayMap = getLangDisplayMap();
        let oneSelected = false;
        $('#language-selection-container input').each(function () {
            if ($(this).prop('checked')) {
                oneSelected = true;
            }
        });
        if (parkingDataLoaded && !oneSelected) {
            //Not allowed, at least one needs to be selected.
            $(this).prop('checked', true);
            $('#at-least-one-language').slideDown();
            setTimeout(function () {
                $('#at-least-one-language').slideUp();
            }, 2000);
        } else {
            let langs = [];
            $('#language-selection-container input').each(function () {
                if ($(this).prop("checked")) {
                    langs.push($(this).val());
                }
            });
            let langsToRemove = new Set(availableLang);
            [...langs].forEach(function (v) {
                langsToRemove.delete(v);
            });
            let setInputsToHandle = new Set();

            $('.translatable-free-text').each(function (index, element) {
                let siblingLangs = new Set();
                let thisLang = $(this).attr('lang');
                if (thisLang) {
                    $(this).find('span').text(langDisplayMap[thisLang]);
                    siblingLangs.add(thisLang);
                }
                $(this).siblings().each(function () {
                    thisLang = $(this).attr('lang');
                    if (thisLang) {
                        siblingLangs.add(thisLang);
                    }
                });

                for (let i in langs) {
                    if (!siblingLangs.has(langs[i])) {
                        let newField;
                        if (!$(this).attr('lang')) {
                            newField = $(this);
                        } else {
                            newField = $(this).clone();
                            newField.find('.input100').val('');
                            $(this).after(newField);
                            setInputsToHandle.add(newField.find('.input100'));
                        }
                        newField.find('.input100').attr('lang', langs[i]);
                        newField.attr('lang', langs[i]);
                        newField.find('span').text(langDisplayMap[langs[i]]);


                        /*let input = newField.find('.input100');
                        input.unbind(focus);
                        input.focus(function () {
                            hideValidate(this);
                            $(this).parent().removeClass('true-validate');
                        });*/
                    }
                }
            });

            $('.translatable-free-text').each(function () {
                let fieldLang = $(this).attr('lang');
                if (langsToRemove.has(fieldLang) || fieldLang === '') {
                    if ($(this).siblings().length > 0) {
                        $(this).remove();
                        setInputsToHandle.delete($(this).find('.input100'));
                    } else {
                        $(this).find('.input100').attr('lang', '');
                        $(this).attr('lang', '');
                        $(this).find('span').text('');
                    }
                }
            });

            setInputsToHandle.forEach(function (input) {
                input.unbind(focus);
                input.focus(function () {
                    hideValidate(this);
                    $(this).parent().removeClass('true-validate');
                });
            });
        }
    });

    //Default language
    $('#language-selection-container #dutch').prop('checked', true).trigger("change");

    $(".js-select2").each(function () {
        $(this).select2({
            minimumResultsForSearch: 20,
            dropdownParent: $(this).next('.dropDownSelect2'),
            placeholder: $(this).attr('placeholder')
        });
    });

    $('.js-select2[name="priceSpecification._PriceSpecification.freeOfCharge"]').change(function () {
        let priceField = $(this).parent().parent().next().find('input[name="priceSpecification._PriceSpecification.price"]');
        let free = $(this).val() === "true";
        priceField.prop('disabled', free);
        if (free) {
            priceField.val('');
            priceField.attr('placeholder', 'This parking section is free');
        } else {
            priceField.attr('placeholder', 'Enter the price');
        }
    });

    $('.minus_button_input').on('click', function () {
        let myParent = $(this).parent();

        let photoURI = myParent.find('.input100[name="photos._Photograph.image"]').val();
        myParent.find('img.imgPreview').attr('src', '');
        if(photoURI.indexOf('velopark.ilabt.imec.be') > 0 || photoURI.indexOf('localhost') > 0){    //TODO: find better way to detect local images
            //delete photo from server
            let url = myParent.find('input[name="photos._Photograph.image"]').val();
            let filename = url.split('/')[url.split('/').length-1];
            let domain = domainName !== '' ? '/' + domainName : '';
            jQuery.ajax({
                url: domain + '/photo/' + filename,
                method: 'DELETE',
                type: 'DELETE', // For jQuery < 1.9
            });
        }

        myParent.find("input, textarea").each(function () {
            if ($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', false);
            } else if (($(this).attr('type') !== 'button')) {
                $(this).val('');
            }
        });
        myParent.find('.js-select2').each(function () {
            $(this).val('');
        });

        myParent.slideUp("slow", function () {
            if (myParent.siblings("div").length > 0) {
                myParent.remove();
            } else {
                $(this).siblings(".input100").val("");
                myParent.find('.js-select2').each(function () {
                    $(this).select2('destroy');
                });
                myParent.parent().siblings('p.no-items-error').show();
            }
        });
    });

    $('.minus-button-facility').on('click', function () {
        let stepId = $(this).parent().attr('id');
        const regExp = /step-facility-section-(\d)(?:-(\d))?/g;
        let myArray = regExp.exec(stepId);
        let facilityNum = parseInt(myArray[2]);

        removeFacilitySection(facilityNum);
    });

    $('.steps-overview-remove-facility-button').on('click', function () {
        let facilitynum = parseInt($(this).attr('facilitynum'));
        removeFacilitySection(facilitynum);
    });


    $('.plus_button_input').on('click', function () {
        var newCopy;
        var originalInput = $(this).siblings('div:first');

        if (originalInput.css('display') === 'none') {
            newCopy = originalInput;
            originalInput.parent().siblings('p.no-items-error').hide();
        } else {
            newCopy = originalInput.clone(true);
        }
        newCopy.find("input").val("");
        newCopy.hide();          //for animation
        $(this).before(newCopy);
        newCopy.slideDown('slow');    //animate
        return false;
    });

    $('.plus_button_select').on('click', function () {
        var originalInput = $(this).siblings('div:first');

        var newSelect;

        if (originalInput.css('display') === 'none') {
            newSelect = originalInput;
            originalInput.parent().siblings('p.no-items-error').hide();
        } else {
            originalInput.find('.js-select2').each(function () {
                $(this).select2('destroy');
            });

            newSelect = originalInput.clone(true);

            newSelect.find("input").val("");
            newSelect.hide();          //for animation
            $(this).before(newSelect);

            originalInput.find('.js-select2').each(function () {
                $(this).select2({
                    minimumResultsForSearch: 20,
                    dropdownParent: $(this).next('.dropDownSelect2'),
                    placeholder: $(this).attr('placeholder')
                });
            });
        }
        newSelect.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2',),
                val: '',
                placeholder: $(this).attr('placeholder')
            });
        });
        newSelect.slideDown('slow');    //animate
        return false;
    });

    $('.plus_button_section').on('click', function () {
        let section = $(this).siblings('div:first');

        var newSection;

        if (section.css('display') === 'none') {
            newSection = section;
            section.parent().siblings('p.no-items-error').hide();
            newSection.find('.photo-selector').show();
        } else {

            section.find('.js-select2').each(function () {
                $(this).select2('destroy');
            });

            newSection = section.clone(true);

            //Fix and remove extra sections
            newSection.find("button.plus_button_section").each(function () {
                $(this).siblings("div").slice(1).remove();
            });

            newSection.find('input, textarea').each(function () {
                if ($(this).attr('type') === 'checkbox') {
                    $(this).prop('checked', false);
                } else if (($(this).attr('type') !== 'button')) {
                    $(this).val('');
                    $(this).prop('disabled', false);
                    if ($(this).attr('name') === "priceSpecification._PriceSpecification.price") {
                        $(this).attr('placeholder', 'Enter the price');
                    }
                }
            });

            newSection.find('.imgPreview').attr("src","");
            newSection.find('.photo-selector').show();

            if (parkingDataLoaded) {
                newSection.hide();      //for animation
            }

            $(this).before(newSection);
        }

        section.parent().find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2'),
                placeholder: $(this).attr('placeholder')
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

    $('.always-open-selector button').on('click', function () {
        $(this).parent().siblings('.week-day-selector').find('input[type=checkbox]').prop("checked", !$(this).prop("checked"));
        $(this).parent().parent().parent().find('input[type=time]:first').val("00:00");
        $(this).parent().parent().parent().find('input[type=time]:last').val("23:59");
    });

    $('input.photo-selector').on('change', function(){
        let parent = $(this).parent();
        /*loadPhotoFromDisk($(this)[0].files[0]).then(result => {
            parent.find('img')[0].src = result;
        });*/
        parent.find('input[type=file]').hide();
        parent.find('img')[0].src = "static/images/icons/loading.gif";

        let domain = domainName !== '' ? '/' + domainName : '';
        var data = new FormData();
        data.append('imgFile', $(this)[0].files[0]);
        jQuery.ajax({
            url: domain + '/upload-photo',
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            method: 'POST',
            type: 'POST', // For jQuery < 1.9
            success: function(data){
                let locationPath = location.pathname.substr(0, location.pathname.lastIndexOf('/'));
                var url = [location.protocol, '//', location.host, locationPath].join('');
                let uriInput = parent.find('input[name="photos._Photograph.image"]');
                uriInput.val(url + data);
                uriInput.prop('disabled', true);
                parent.find('img')[0].src = url + data;
                //parent.find('input[type=file]').hide();
            },
            error: function(e) {
                if(e.status === 401) {
                    alert('Please log in first before uploading photos');
                    parent.find('img')[0].src = parent.find('input[name="photos._Photograph.image"]').val();
                    parent.find('input[type=file]').show();
                }
            }
        });
    });

    $('input[name="photos._Photograph.image"]').on('blur', function() {
        let parent = $(this).parent();
        parent.find('img')[0].src = $(this).val();
        if($(this).val()) {
            parent.find('.photo-selector').hide();
        }
    });

    $('input[name="photos._Photograph.image"]').on('change', function() {
        let parent = $(this).parent();
        parent.find('img')[0].src = $(this).val();
        if($(this).val()) {
            parent.find('.photo-selector').hide();
        }
    });

})(jQuery);


function addFacilitySection() {
    currentNumFacilitySections++;
    let currentStepNumberInsertPos = (startStepNumberFacilitySection + (currentNumFacilitySections - 1) * numStepsFacilitySection);

    for (let i = numStepsFacilitySection; i > 0; i--) {
        var facilitySection = $('#step-facility-section-' + i + "-1");
        //destroy select2
        facilitySection.find('.js-select2').each(function () {
            $(this).select2('destroy');
        });

        //clone the section & section title
        let facilitySectionId = facilitySection.attr("id");
        var newFacilitySection = facilitySection.clone(true).attr("id", facilitySectionId.substr(0, facilitySectionId.lastIndexOf("-") + 1) + currentNumFacilitySections);
        var newFacilitySection1Title = facilitySection.parent().prev('h3').html();

        $("#form-velopark-data").steps("insert", currentStepNumberInsertPos, {
            title: newFacilitySection1Title,
            content: newFacilitySection
        });

        //Fix and remove extra sections
        newFacilitySection.find("button.plus_button_section").each(function () {
            $(this).siblings("div").slice(1).remove();
        });

        newFacilitySection.find('input').each(function () {
            if ($(this).attr('type') === 'checkbox') {
                $(this).prop('checked', false);
            } else if (($(this).attr('type') !== 'button')) {
                $(this).val('');
                $(this).prop('disabled', false);
                if ($(this).attr('name') === "priceSpecification._PriceSpecification.price") {
                    $(this).attr('placeholder', 'Enter the price');
                }
            }
        });

        newFacilitySection.find('textarea').each(function () {
            $(this).val('');
        });


        //re-enable select2 (original section and cloned section)
        facilitySection.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2'),
                placeholder: $(this).attr('placeholder')
            });
        });
        newFacilitySection.find('.js-select2').each(function () {
            $(this).select2({
                minimumResultsForSearch: 20,
                dropdownParent: $(this).next('.dropDownSelect2'),
                placeholder: $(this).attr('placeholder')
            });
        });
        newFacilitySection.find("[parking-section]").attr("parking-section", currentNumFacilitySections - 1);
    }

    //insert group title in step overview
    let lastNewStepTitle = $('#form-velopark-data-t-' + currentStepNumberInsertPos).parent();
    lastNewStepTitle.before(String.format(stepOverviewFacilityTitleFormat, currentNumFacilitySections));
    lastNewStepTitle.prev('.steps-overview-facility-title').find('.steps-overview-remove-facility-button').on('click', function () {
        let facilitynum = parseInt($(this).attr('facilitynum'));
        removeFacilitySection(facilitynum);
    });

    //fix maps
    let locationSection = $('#step-facility-section-2-' + currentNumFacilitySections);
    locationSection.find('.ol-point-map').each(function () {
        $(this).empty();
        let newMap = $(this).attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).attr('id', newMap);
        let newClear = $(this).prev().attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).prev().attr('id', newClear);
        $(this).prev().off('click');
        let newLat = $(this).parent().find('input[name*="latitude"]').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).parent().find('input[name*="latitude"]').attr('id', newLat);
        let newLon = $(this).parent().find('input[name*="longitude"]').attr('id') + '_' + Math.floor((Math.random() * 1000000) + 1);
        $(this).parent().find('input[name*="longitude"]').attr('id', newLon);

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

function removeFacilitySection(facilityNum) {
    if (currentNumFacilitySections > 1) {
        let startstep = startStepNumberFacilitySection + (facilityNum - 1) * numStepsFacilitySection;
        let endstep = startstep + numStepsFacilitySection - 1;

        if (confirm("Are you sure you want to delete this section?\nAll data entered in steps " + (startstep + 1) + " to " + (endstep + 1) + " will be irretrievably lost.")) {
            $('#form-velopark-data-t-' + (endstep + 1)).get(0).click();
            setTimeout(function () {
                let formVeloparkData = $("#form-velopark-data");
                for (let removestep = endstep; removestep >= startstep; removestep--) {
                    formVeloparkData.steps("remove", removestep);
                }

                $('.steps-overview-facility-title[facilitynum=' + facilityNum + ']').remove();

                //rename following steps to keep the correct order
                for (let itFacilityNum = facilityNum + 1; itFacilityNum <= currentNumFacilitySections; itFacilityNum++) {
                    for (let stepnum = 1; stepnum <= numStepsFacilitySection; stepnum++) {
                        $('#step-facility-section-' + stepnum + '-' + itFacilityNum).attr('id', 'step-facility-section-' + stepnum + '-' + (itFacilityNum - 1));
                    }
                    $('.steps-overview-facility-title[facilitynum=' + itFacilityNum + ']').replaceWith(String.format(stepOverviewFacilityTitleFormat, itFacilityNum - 1));
                    $('.steps-overview-facility-title[facilitynum=' + (itFacilityNum - 1) + ']').find('.steps-overview-remove-facility-button').on('click', function () {
                        let facilitynum = parseInt($(this).attr('facilitynum'));
                        removeFacilitySection(facilitynum);
                    });
                }

                currentNumFacilitySections--;
            }, 400);
        }
    } else {
        alert("Your bicycle parking needs at least one facility. You can not remove this one.");
    }
}


function loadPhotoFromDisk(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();

        reader.addEventListener("load", function () {
            resolve(reader.result);
        });
        reader.onerror = function() {
            reject();
        };
        reader.onabort = function() {
            reject();
        };

        reader.readAsDataURL(file);
    });
}

function uploadPhoto(imgData){

}