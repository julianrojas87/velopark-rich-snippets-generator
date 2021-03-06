($ => {

    /*==================================================================
    [ Generate and show JSON-LD script ]*/
    $('#ld_generate').on('click', () => {
        var check = true;
        let wrongInput = null;
        let toValidate = $('.validate-input');

        for (let i = 0; i < toValidate.length; i++) {
            let inp = $(toValidate[i]).find('.input100, .js-select2');
            if ($(inp).is('select')) {
                $(toValidate[i]).click(function () {
                    $(this).removeClass('alert-validate');
                    $(this).find('.btn-hide-validate').remove();
                    $(this).find('.select2-selection__placeholder').show();
                    $(this).find('.select2-selection__arrow').show();
                });
            }
            if (inp.length > 0) {
                if (validate(inp) == false) {
                    wrongInput = inp;
                    showValidate(inp);
                    check = false;
                    break;
                }
            } else {
                let unchecked = true;
                $(toValidate[i]).find('input[type=checkbox]').each(function () {
                    if ($(this).is(':checked')) {
                        unchecked = false;
                    }
                });

                if (unchecked) {
                    check = false;
                    wrongInput = $(toValidate[i]);
                    if ($(toValidate[i]).find('#vld-close').length < 1) {
                        $(toValidate[i]).prepend('<span id="vld-close" style="color: red; cursor: pointer">X</span>');
                        $(toValidate[i]).prepend('<span id="vld-message" style="color: red;">' + $(toValidate[i]).attr('data-validate') + '</span>');
                        $(toValidate[i]).find('#vld-close').click(function () {
                            $(toValidate).find('#vld-message').remove();
                            $(this).remove();
                        });
                    }

                    $(toValidate[i]).find('input[type=checkbox]').each(function () {
                        $(this).change(function () {
                            $(toValidate).find('#vld-message').remove();
                            $(toValidate).find('#vld-close').remove();
                        });
                    });
                    //jump to the correct wizard page
                    $('#' + $(toValidate[i]).closest('fieldset').attr('id').replace("-p-", "-t-")).get(0).click();
                    //scroll the validation warning into view
                    setTimeout(function () {
                        $(toValidate[i])[0].scrollIntoViewIfNeeded();
                    }, 800);
                    break;
                }
            }
        }

        //validate free text languages
        let inputLang = new Set();
        $('.translatable-free-text').each(function () {
            inputLang.add($(this).parent());
        });
        inputLang.forEach(function (key, val, set) {
            let empties = validateLang(val);
            if (check && empties != null) {
                wrongInput = empties[0];
                empties.forEach(function (empty) {
                    showValidate(empty);
                });
                check = false;
            }
        });

        if (check) {
            // JSON-LD skeleton already containing the predefined @context and data structure
            loadAPSkeleton().then(jsonld => {
                mapData(jsonld).then(() => {
                    resultingObject = jsonld;
                    $('#ld-script').html(JSON.stringify(jsonld, null, 4));
                    hljs.highlightBlock(document.querySelectorAll('pre code')[0]);
                    $('.overlay').toggle();
                    $('.jsonld').css("display", "flex");

                    let userName = $('#user-email').text();
                    if (userName && userName !== '') {
                        saveJSONLD();
                    }

                }).catch(error => {
                    console.log(error);
                });
            });
        } else {
            $('html, body').animate({
                scrollTop: $(wrongInput).offset().top - 200
            }, 500);
        }

        return false;
    });

    $('#close_button').on('click', () => {
        $('.overlay').toggle();
        $('.jsonld').toggle();
        resultingObject = null;
        $('#json-ld-saved-status>.saved-icon, #save_button').hide();
        $('#json-ld-saved-status>.loading-icon').show();
        $('#json-ld-saved-status>.error-icon').hide();
    });

    $('#save_button').on('click', () => {
        let domain = domainName !== '' ? domainName : '';
        window.location.href = domain + '/download?parkingId=' + originalId;

    });

})(jQuery);

function fetchLiveAPI(url) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "GET",
            url: url,
            success: data => resolve(data),
            error: e => reject(new Error(`Live API request failed at ${url}`))
        });
    });
}

function saveJSONLD() {
    let domain = domainName != '' ? domainName : '';
    let username = $('#user-email').text().trim();

    if (originalId !== null) {
        $.ajax({
            type: "DELETE",
            url: domain + '/delete-parking?username=' + username + '&parkingId=' + encodeURIComponent(originalId),
            success: () => {
                originalId = null;
                $.ajax({
                    type: "POST",
                    url: domain + '/save-parking',
                    data: {
                        'user': parkingOwner.email ? parkingOwner.email : (parkingOwner.company ? null : username),
                        'jsonld': JSON.stringify(resultingObject),
                        'company': parkingOwner.company,
                        'approved': parkingOwner.approved,
                        'parkingCompany': parkingOwner.parkingCompany
                    },
                    success: () => {
                        if (photos2Delete.length > 0) {
                            for (let p in photos2Delete) {
                                jQuery.ajax({
                                    url: photos2Delete[p],
                                    method: 'DELETE',
                                    type: 'DELETE', // For jQuery < 1.9
                                });
                            }
                        }
                        originalId = resultingObject['@id'];
                        alert('Parking Facility \n' + resultingObject['@id'] + ' \nupdated successfully', 'Success!', 'success');
                        $('#json-ld-saved-status>.saved-icon, #save_button').show();
                        $('#json-ld-saved-status>.loading-icon').hide();
                        $('#json-ld-saved-status>.error-icon').hide();
                    },
                    error: e => {
                        alert('Error: ' + e.responseText);
                        $('#json-ld-saved-status>.saved-icon, #save_button').hide();
                        $('#json-ld-saved-status>.loading-icon').hide();
                        $('#json-ld-saved-status>.error-icon').show();
                    }
                });
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $('#json-ld-saved-status>.saved-icon, #save_button').hide();
                $('#json-ld-saved-status>.loading-icon').hide();
                $('#json-ld-saved-status>.error-icon').show();
            }
        });
    } else {
        // Approve new parkings by default for Region Managers
        let approved = false;
        if (user.cityrep) {
            approved = true;
        }
        $.ajax({
            type: "POST",
            url: domain + '/save-parking',
            data: {
                'user': parkingOwner.email ? parkingOwner.email : (parkingOwner.company ? null : username),
                'jsonld': JSON.stringify(resultingObject),
                'company': parkingOwner.company,
                'approved': approved
            },
            success: () => {
                originalId = resultingObject['@id'];
                alert('Parking Facility \n' + resultingObject['@id'] + ' \nstored successfully', 'Success!', 'success');
                $('#json-ld-saved-status>.saved-icon, #save_button').show();
                $('#json-ld-saved-status>.loading-icon').hide();
                $('#json-ld-saved-status>.error-icon').hide();
            },
            error: e => {
                alert('Error: ' + e.responseText);
                $('#json-ld-saved-status>.saved-icon, #save_button').hide();
                $('#json-ld-saved-status>.loading-icon').hide();
                $('#json-ld-saved-status>.error-icon').show();
            }
        });
    }
    return false;
}

var resultingObject = null;

async function mapData(jsonld) {
    let general = $('.general-information [name]');
    processGeneral(jsonld, general);
    let sections = [];
    sections[0] = $('div[parking-section=0]');
    for (let i = 1; i < currentNumFacilitySections; i++) {
        sections[i] = $('div[parking-section=' + i + ']');
    }
    await processSections(jsonld, sections);

    if (fillAutomaticData(jsonld)) {
        cleanEmptyValues(jsonld);
    } else {
        throw new Error('Malformed Parking URI');
    }

    // Validate live data API (if any)
    let url = $('#liveData').val().trim();
    if (url !== '') {
        let err = null;
        if (!validateURL(url)) {
            err = new Error('Invalid URI for the live data API');
        } else {
            try {
                /* TODO: Do validation using RDF */
                // Fetch data from API
                let data = await fetchLiveAPI(url);
                // Check it is valid JSON
                data = typeof data !== 'object' ? JSON.parse(data) : data;
                // Check it has data about this parking
                let obj = getObjectFromArray(data['@graph'], jsonld['@id']);
                if(!obj) {
                    throw new Error(`This API does not contain data about this parking or is not using the same @id: ${jsonld['@id']}`);
                }
                // Check if it has a lastObserved property
                if(!data['lastObserved']) {
                    throw new Error('This API does not provide a last observed date for this parking via the sosa:resultTime property');
                }
                // Check if it has current free places
                if(!obj['capacity']['freePlaces']) {
                    throw new Error('This API does not provide the number of free places for this parking');
                }
            } catch (error) {
                err = error;
            }
        }

        if (err) {
            alert(err.message);
            $('#liveData').css('color', 'red');
            $('#' + $('#liveData').closest('fieldset').attr('id').replace("-p-", "-t-")).get(0).click();
            $('html, body').animate({
                scrollTop: $('#liveData').offset().top - 200
            }, 500);
            throw err;
        } else {
            // Assign live api URI to the JSON-LD object
            jsonld['@graph'][0]['liveCapacity'] = url;
        }
    }
}

function getObjectFromArray(arr, objId) {
    if (arr) {
        for (let i in arr) {
            if (arr[i]['@id'] === objId) {
                return arr[i];
            }
        }
    }
    return null;
}

function processGeneral(jsonld, general) {
    for (let i = 0; i < general.length; i++) {
        let element = $(general[i]);
        processElement(jsonld, element);
    }
}

let last_price_spec_inverval_end = 0;

async function processSections(jsonld, sections) {
    for (let i = 0; i < sections.length; i++) {
        last_price_spec_inverval_end = 0;
        let inputs = $(sections[i]).find('[name]');
        if (i > 0) {
            jsonld['@graph'].push((await loadAPSkeleton())['@graph'][0]);
        }
        for (let j = 0; j < inputs.length; j++) {
            processElement(jsonld['@graph'][i], $(inputs[j]));
        }
    }
}

function fillAutomaticData(jsonld) {
    // Handle @id
    if (jsonld['@id'] != '') {
        let idInput = $('input[name="@id"]');
        if (!fullValidation(idInput[0])) {
            $('html, body').animate({
                scrollTop: idInput.offset().top - 200
            }, 500);

            return false;
        }
    } else {
        // Generate automatic @id
        jsonld['@id'] = 'https://velopark.ilabt.imec.be/data/' + (jsonld['ownedBy']['companyName'] + '_' + jsonld['identifier']).replace(/\s/g, '-');
    }

    // Set dateModified
    jsonld['dateModified'] = (new Date()).toISOString();

    // Set values for each parking section
    for (let i = 0; i < jsonld['@graph'].length; i++) {
        // Set section @id
        jsonld['@graph'][i]['@id'] = `${jsonld['@id']}#section${i + 1}`;
        // Calculate and set totalCapacity
        let tc = 0;
        for (let j = 0; j < jsonld['@graph'][i]['allows'].length; j++) {
            tc += jsonld['@graph'][i]['allows'][j]['bicyclesAmount'] != '' ? parseInt(jsonld['@graph'][i]['allows'][j]['bicyclesAmount']) : 0;
        }
        jsonld['@graph'][i]['totalCapacity'] = tc;

        // Assign the same opening hours as the section to features that don't have any
        for (let j in jsonld['@graph'][i]['amenityFeature']) {
            let feature = jsonld['@graph'][i]['amenityFeature'][j];

            if (feature['@type'] !== '' && (!feature['hoursAvailable'] || feature['hoursAvailable'].length < 1)) {
                jsonld['@graph'][i]['amenityFeature'][j]['hoursAvailable'] = jsonld['@graph'][i]['openingHoursSpecification'];
            }

            // Delete any unspecified amenities 
            if (!feature['@type'] || feature['@type'] === '') {
                jsonld['@graph'][i]['amenityFeature'].splice(j, 1);
            }
        }
    }

    // Set hasMap attribute using the main entrance location of the first section
    let lonlat = [jsonld['@graph'][0]['geo'][0]['longitude'], jsonld['@graph'][0]['geo'][0]['latitude']];
    jsonld['hasMap'] = {
        "@type": "Map",
        "url": 'https://www.openstreetmap.org/#map=18/' + lonlat[1] + '/' + lonlat[0]
    };

    // Deal with the address description that is entered in the sections. Take only the first section.
    let desc = $('div[parking-section=0]').find('#address_description');
    let tas = $(desc).find('textarea');
    for (let i = 0; i < tas.length; i++) {
        $(tas[i]).attr('name', 'address.description');
        processElement(jsonld, $(tas[i]));
        $(tas[i]).removeAttr('name');
    }

    return true;
}

function cleanEmptyValues(obj) {
    let keys = Object.keys(obj);
    for (let i in keys) {
        if (Array.isArray(obj[`${keys[i]}`])) {
            for (let j = obj[`${keys[i]}`].length - 1; j >= 0; j--) {
                cleanEmptyValues(obj[`${keys[i]}`][j]);
                let l = Object.keys(obj[`${keys[i]}`][j]);
                if (l.length == 0 || (l.length == 1 && l[0] == '@type' && keys[i] != 'amenityFeature')) {
                    obj[`${keys[i]}`].splice(j, 1);
                }
            }
            if (obj[`${keys[i]}`].length == 1) {
                let l = Object.keys(obj[`${keys[i]}`][0]);
                if (l.length == 0 || (l.length == 1 && l[0] == '@type' && keys[i] != 'amenityFeature')) {
                    delete obj[`${keys[i]}`];
                }
            } else if (obj[`${keys[i]}`].length == 0) {
                delete obj[`${keys[i]}`];
            }
        } else if (typeof obj[`${keys[i]}`] == 'object') {
            cleanEmptyValues(obj[`${keys[i]}`]);
            let k = Object.keys(obj[`${keys[i]}`]);
            if (k.length == 0 || (k.length == 1 && k[0] == '@type')) {
                delete obj[`${keys[i]}`];
            }
        } else {
            if (obj[`${keys[i]}`] === '') {
                delete obj[`${keys[i]}`];
            }
        }
    }
}


function processElement(jsonld, element) {
    let dName = element.attr('name').split('.');
    if (dName.length < 2) {
        if (element.attr('lang')) {
            if (jsonld[`${dName[0]}`] === undefined || jsonld[`${dName[0]}`] === '') {
                jsonld[`${dName[0]}`] = [];
            }
            jsonld[`${dName[0]}`].push(setElementWithLanguageValue(element, jsonld[`${dName[0]}`]));
        } else {
            jsonld[`${dName[0]}`] = setElementValue(element, jsonld[`${dName[0]}`], dName[0]);
        }
    } else {
        let temp_obj = jsonld;
        let timeUnit;

        for (let i = 0; i < dName.length; i++) {
            // If last element of dName proceed to assign value
            if (i == dName.length - 1) {
                // Handle special case for geo array
                if (dName[i - 1] == '_GeoCoordinates') {
                    temp_obj[0][`${dName[i]}`] = setElementValue(element, temp_obj[0][`${dName[i]}`], dName[i]);
                } else if (dName[i - 1].startsWith('_')) {
                    // Check if it is an array (name starts with _)
                    let length = temp_obj.length - 1;
                    if (temp_obj[length][`${dName[i]}`] === undefined || temp_obj[length][`${dName[i]}`] === '' || element.is('div')) {
                        if (element.attr('lang')) {
                            temp_obj[length][`${dName[i]}`] = [];
                            temp_obj[length][`${dName[i]}`][0] = setElementWithLanguageValue(element, temp_obj[length][`${dName[i]}`] || []);
                        } else {
                            temp_obj[length][`${dName[i]}`] = setElementValue(element, temp_obj[length][`${dName[i]}`] || [], dName[i]);
                        }
                    } else {
                        if (element.attr('lang')) {
                            temp_obj[length][`${dName[i]}`].push(setElementWithLanguageValue(element, {}));
                        } else {
                            let newObj = {};
                            newObj['@type'] = dName[i - 1].substring(1);
                            newObj[`${dName[i]}`] = setElementValue(element, newObj[`${dName[i]}`], dName[i]);
                            temp_obj.push(newObj);
                        }
                    }
                } else if (element.attr('lang')) {
                    //element exists in different languages and will therefore also generate an array
                    if (temp_obj[`${dName[i]}`] === undefined || temp_obj[`${dName[i]}`] === '') {
                        temp_obj[`${dName[i]}`] = [];
                        temp_obj[`${dName[i]}`][0] = setElementWithLanguageValue(element, temp_obj[`${dName[i]}`] || []);
                    } else {
                        let newObj = {};
                        newObj = setElementWithLanguageValue(element, newObj[`${dName[i]}`]);
                        temp_obj[`${dName[i]}`].push(newObj);
                    }
                } else {
                    //Is not an array. Add value to referenced object
                    if (dName[i] === "timeIntervalDuration") {
                        temp_obj[`timeStartValue`] = last_price_spec_inverval_end;
                        temp_obj[`timeEndValue`] = last_price_spec_inverval_end + Number(element.val());
                        if (timeUnit) {
                            temp_obj["timeUnit"] = timeUnit;
                        }
                        last_price_spec_inverval_end = last_price_spec_inverval_end + Number(element.val());
                    } else {
                        temp_obj[`${dName[i]}`] = setElementValue(element, temp_obj[`${dName[i]}`], dName[i]);
                    }

                }
            } else {
                // Ignore if current name starts with _
                if (!dName[i].startsWith('_')) {
                    // Check if current name exists already
                    if (!temp_obj[`${dName[i]}`]) {
                        if (dName[i + 1].startsWith('_')) {
                            // It does not exist and it's an array. Create it and add an empty object
                            temp_obj[`${dName[i]}`] = [];
                            temp_obj[`${dName[i]}`].push({
                                '@type': dName[i + 1].substring(1)
                            });
                        } else {
                            // It does not exist and is not an array. Create a new empty object
                            if (!dName[i - 1].startsWith('_')) {
                                temp_obj[`${dName[i]}`] = {};
                            }
                        }
                    }

                    if (i > 0 && dName[i - 1].startsWith('_')) {
                        let x = temp_obj[temp_obj.length - 1][`${dName[i]}`];
                        if (x) {
                            let nextName = `${dName[i + 1]}`;
                            if (nextName === "timeIntervalDuration") {
                                nextName = "timeEndValue";
                            }
                            if (x[nextName] && x[nextName] !== '') {
                                let type = temp_obj[temp_obj.length - 1][`${dName[i]}`]['@type'];
                                temp_obj.push({
                                    '@type': dName[i - 1].substring(1),
                                    [dName[i]]: {
                                        "@type": type
                                    }
                                });
                                if (x["timeUnit"]) {
                                    timeUnit = x["timeUnit"];
                                }
                            }
                            temp_obj = temp_obj[temp_obj.length - 1][`${dName[i]}`];
                        } else {
                            let type = temp_obj[temp_obj.length - 2][`${dName[i]}`]['@type'];
                            temp_obj[temp_obj.length - 1][`${dName[i]}`] = {
                                "@type": type
                            };
                            temp_obj = temp_obj[temp_obj.length - 1][`${dName[i]}`];
                        }
                    } else {
                        // It already exists and is not an array. Keep a reference of this object for next iteration
                        temp_obj = temp_obj[`${dName[i]}`];
                    }
                }
            }
        }
    }
}

function setElementValue(el, jsonEl, name) {
    if (el.is('input') || el.is('textarea')) {
        jsonEl = formatValue(name, el.val());
        return jsonEl;
    } else if (el.is('select')) {
        jsonEl = formatValue(name, el.find(':selected').val());
        return jsonEl;
    } else if (el.is('div')) {
        let options = el.find('input[type="checkbox"]:checked');
        let opcl = el.find('input[type="time"]');
        let weekDays = [
            'http://schema.org/Monday',
            'http://schema.org/Tuesday',
            'http://schema.org/Wednesday',
            'http://schema.org/Thursday',
            'http://schema.org/Friday',
            'http://schema.org/Saturday',
            'http://schema.org/Sunday'
        ];

        for (let i = 0; i < options.length; i++) {
            let day = $(options[i]).val();
            let ohs = [];
            if ($(opcl[0]).val() >= $(opcl[1]).val()) {
                ohs.push({
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": day,
                    "opens": $(opcl[0]).val(),
                    "closes": "23:59"
                });

                let di = weekDays.indexOf(day);

                ohs.push({
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": di >= 6 ? weekDays[0] : weekDays[di + 1],
                    "opens": "00:00",
                    "closes": $(opcl[1]).val()
                });
            } else {
                ohs.push({
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": day,
                    "opens": $(opcl[0]).val(),
                    "closes": $(opcl[1]).val()
                });
            }

            jsonEl = jsonEl.concat(ohs);
        }

        // Delete empty example object from application profile
        if (jsonEl.length === 1 && jsonEl[0]['dayOfWeek'] === "") {
            jsonEl.pop();
        }
        return jsonEl;
    }
}

function setElementWithLanguageValue(el, jsonEl) {
    if (el.val()) {
        jsonEl = {
            "@value": el.val(),
            "@language": el.attr('lang')
        };
    } else {
        jsonEl = {};
    }
    return jsonEl;
}

function formatValue(name, value) {
    if (context[`${name}`]) {
        let type = context[`${name}`]['@type'];
        if (type) {
            if (type == 'xsd:dateTime' && value) {
                return (new Date(value)).toISOString();
            }
            if (type == 'xsd:integer' && value) {
                try {
                    return parseInt(value);
                } catch (e) {
                    return 0;
                }
            }
            if (type == 'xsd:double' && value) {
                try {
                    return parseFloat(value);
                } catch (e) {
                    return 0.0;
                }
            }
            if (type == 'xsd:boolean' && value !== '') {
                if (value == 'true') {
                    return true;
                } else {
                    return false;
                }
            }
            if (type = 'xsd:duration' && value) {
                if (name == 'maximumParkingDuration') {
                    return 'P' + value + 'D';
                }
                if (name == 'minimumStorageTime') {
                    return 'PT' + value + 'M';
                }
            }
        }
    }
    return value;
}