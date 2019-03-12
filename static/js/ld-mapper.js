($ => {

    /*==================================================================
    [ Generate and show JSON-LD script ]*/
    $('#ld_generate').on('click', () => {
        var check = true;
        let wrongInput = null;

        for (var i = 0; i < input.length; i++) {
            if (validate(input[i]) == false) {
                wrongInput = input[i];
                showValidate(input[i]);
                check = false;
                break;
            }
        }

        if (check) {
            // JSON-LD skeleton already containing the predefined @context and data structure
            loadAPSkeleton().then(jsonld => {
                mapData(jsonld).then(() => {
                    resultingObject = jsonld;
                    $('#ld-script').html(JSON.stringify(jsonld, null, 4));
                    hljs.highlightBlock(document.querySelectorAll('pre code')[0]);
                    $('.overlay').toggle();
                    $('.jsonld').toggle();
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
    });

    $('#save_button').on('click', () => {
        let domain = domainName != '' ? '/' + domainName : '';
        let username = $('#user-email').text().trim();

        if (originalId != null && originalId != resultingObject['@id']) {
            $.ajax({
                type: "DELETE",
                url: domain + '/delete-parking?username=' + username + '&parkingId=' + originalId,
                success: () => {
                    originalId = null;
                },
                error: e => {
                    alert('Error: ' + e.responseText);
                }
            });
        }

        $.ajax({
            type: "POST",
            url: domain + '/save-parking',
            data: { 'user': username, 'jsonld': JSON.stringify(resultingObject) },
            success: () => {
                alert('Parking Facility \n' + resultingObject['@id'] + ' \nstored successfully!!');
            },
            error: e => {
                alert('Error: ' + e.responseText);
            }
        });

        return false;
    });

})(jQuery);

var resultingObject = null;

async function mapData(jsonld) {
    let general = $('#general-information').find('[name]');
    processGeneral(jsonld, general);
    let sections = $('div[parking-section="true"]');
    await processSections(jsonld, sections);
    if(fillAutomaticData(jsonld)) {
        cleanEmptyValues(jsonld);
    } else {
        throw new Error('Malformed Parking URI');
    }
}

function processGeneral(jsonld, general) {
    for (let i = 0; i < general.length; i++) {
        let element = $(general[i]);
        processElement(jsonld, element);
    }
}

async function processSections(jsonld, sections) {
    for (let i = 0; i < sections.length; i++) {
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
    if(jsonld['@id'] != '') {
        let idInput = $('input[name="@id"]');
        if(!fullValidation(idInput[0])) {
            $('html, body').animate({
                scrollTop: idInput.offset().top - 200
            }, 500);

            return false;
        }
    } else {
        // Generate automatic @id
        jsonld['@id'] = 'https://velopark.ilabt.imec.be/data/' + encodeURIComponent(jsonld['dataOwner']['companyName'].replace(/\s/g, '-')) 
            + '_' + encodeURIComponent(jsonld['identifier'].replace(/\s/g, '-'));
    }

    // Set dateModified
    jsonld['dateModified'] = (new Date()).toISOString();

    // Set values for each parking section
    for (let i = 0; i < jsonld['@graph'].length; i++) {
        // Calculate and set totalCapacity
        let tc = 0;
        for (let j = 0; j < jsonld['@graph'][i]['allows'].length; j++) {
            tc += jsonld['@graph'][i]['allows'][j]['bicyclesAmount'] != '' ? parseInt(jsonld['@graph'][i]['allows'][j]['bicyclesAmount']) : 0;
        }
        jsonld['@graph'][i]['totalCapacity'] = tc;

        // Set amenityFeature names
        for (let j = 0; j < jsonld['@graph'][i]['amenityFeature'].length; j++) {
            let currObj = jsonld['@graph'][i]['amenityFeature'][j];
            if (currObj['@type']) {
                currObj['value'] = true;
                currObj['name'] = $('option[value="' + currObj['@type'] + '"]')[0].innerHTML.trim();
            }
        }
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
        jsonld[`${dName[0]}`] = setElementValue(element, jsonld[`${dName[0]}`], dName[0]);
    } else {
        let temp_obj = jsonld;

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
                        temp_obj[length][`${dName[i]}`] = setElementValue(element, temp_obj[length][`${dName[i]}`] || [], dName[i]);
                    } else {
                        let newObj = {};
                        newObj['@type'] = dName[i - 1].substring(1);
                        newObj[`${dName[i]}`] = setElementValue(element, newObj[`${dName[i]}`], dName[i]);
                        temp_obj.push(newObj);
                    }
                } else {
                    //Is not an array. Add value to referenced object
                    temp_obj[`${dName[i]}`] = setElementValue(element, temp_obj[`${dName[i]}`], dName[i]);
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
                            if (x[`${dName[i + 1]}`] && x[`${dName[i + 1]}`] != '') {
                                let type = temp_obj[temp_obj.length - 1][`${dName[i]}`]['@type'];
                                temp_obj.push({
                                    '@type': dName[i - 1].substring(1),
                                    [dName[i]]: {
                                        "@type": type
                                    }
                                })

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
        for (let i = 0; i < options.length; i++) {
            let day = $(options[i]).val();
            let newObj = {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": day,
                "opens": $(opcl[0]).val(),
                "closes": $(opcl[1]).val()
            };
            if (jsonEl.length == 1 && jsonEl[0]['opens'] == '' && jsonEl[0]['closes'] == '') {
                jsonEl[0] = newObj;
            } else {
                jsonEl.push(newObj);
            }
        }

        return jsonEl;
    }
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
                if (name == 'maximumStorageTime') {
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