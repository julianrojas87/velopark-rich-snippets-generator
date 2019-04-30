
($ => {

    Promise.all(loadingPromises).then(() => {
        loadParkingValues();
        parkingDataLoaded = true;
    });

})(jQuery);

var originalId = null;

function loadParkingValues() {
    let parkingData = $('#loadedParking').text().trim();
    if (parkingData && parkingData !== '') {
        let parking = JSON.parse(parkingData);
        originalId = parking['@id'];
        //reset languages
        $('#language-selection-container input[type="checkbox"]').prop('checked', false).trigger("change");
        processObject(parking);
    }
}

function processObject(obj, oldPath, input) {
    let path = [];
    if (oldPath) {
        path = oldPath;
    }

    let keys = Object.keys(obj);
    for (let i in keys) {
        if (keys[i] !== '@context') {
            path.push(keys[i]);
            if (Array.isArray(obj[keys[i]])) {
                if (keys[i] === '@graph') {
                    loadSections(obj[keys[i]]);
                } else {
                    processArray(path, obj[keys[i]], input);
                }
            } else if (typeof obj[keys[i]] == 'object') {
                processObject(obj[keys[i]], path);
            } else {
                loadParkingValue(path, obj[keys[i]], false, input);
            }
            path.pop();
        }
    }
}

function loadSections(graph) {
    let section = $('div[parking-section=0]');
    for (let i in graph) {
        if (i > 0) {
            addFacilitySection();

            section = $('div[parking-section=' + i + ']');
        }
        let keys = Object.keys(graph[i]);
        let path = [];
        for (let j in keys) {
            path.push(keys[j]);
            let obj = graph[i][keys[j]];
            let input = section.find('[name^="' + keys[j] + '"]');
            if (Array.isArray(obj)) {
                processArray(path, obj, input);
            } else if (typeof obj !== 'object') {
                loadParkingValue(path, obj, true, input);
            } else {
                processObject(obj, path, input);
            }
            path.pop();
        }
    }
}

function processArray(path, arr, input) {
    //console.log(path);
    let lastPath = path[path.length - 1];
    // Handle div inputs
    if (['openingHoursSpecification', 'hoursAvailable'].indexOf(lastPath) >= 0) {
        loadParkingValue(path, arr, false, input);
    } else if (['photos', 'allows', 'entrance', 'exit', 'amenityFeature', 'priceSpecification'].indexOf(lastPath) >= 0) {
        // Handle arrays that map to UI sections with multiple inputs
        if (lastPath === 'amenityFeature') {
            path.push('_');
        } else {
            path.push('_' + arr[0]['@type']);
        }

        for (let i = 0; i < arr.length; i++) {
            let obj = arr[i];
            let keys = Object.keys(obj);
            if (i > 0) {
                let inputs = input || $('[name^="' + lastPath + '"]');
                let last = $(inputs[inputs.length - 1]);
                if (last.is('div')) {
                    last.parent().parent().next("button").click();
                } else {
                    last.closest('.wrap-contact100-subsection').next("button").click();
                }

                input = $('[name^="' + lastPath + '"]');
            }
            for (let j in keys) {
                let el = null;
                path.push(keys[j]);
                if (input) {
                    for (let k = input.length - 1; k >= 0; k--) {
                        if ($(input[k]).attr('name') == path.join('.')) {
                            el = $(input[k]);
                            break;
                        }
                    }
                }
                if (Array.isArray(obj[keys[j]])) {
                    processArray(path, obj[keys[j]], input);
                } else if (typeof obj[keys[j]] === 'object') {
                    processObject(obj[keys[j]], path, input);
                } else {
                    loadParkingValue(path, obj[keys[j]], true, el);
                }
                path.pop();
            }
        }

        path.pop();

    } else {
        // Normal object arrays that map to a single UI input (e.g closeTo or availableLanguages)
        for (let i = 0; i < arr.length; i++) {
            let obj = arr[i];
            if(obj["@language"]){
                let checkbox = $('#language-selection-container input[value="' + obj["@language"] + '"]');
                if(!checkbox[0].checked){
                    checkbox.prop('checked', true).trigger("change");
                }
                processObjectWithLanguage(obj, path, input);
            } else {
                path.push('_' + obj['@type']);
                processObject(obj, path, input);
                path.pop();
            }
        }
    }
}

function processObjectWithLanguage(obj, path, inputs){
    let name = path.join('.');
    let lang = obj["@language"];
    let value = obj["@value"];
    if(inputs) {
        inputs.filter('[name="' + name + '"][lang="' + lang + '"]').val(value);
    } else {
        $('.input100[name="' + name + '"][lang="' + lang + '"]').val(value);
    }
}

function loadParkingValue(path, value, override, inpt) {
    let name = path.join('.');
    let input = null;
    if (inpt) {
        for (let k = inpt.length - 1; k >= 0; k--) {
            if ($(inpt[k]).attr('name') === name) {
                input = $(inpt[k]);
                break;
            }
        }
    } else {
        input = $('[name="' + name + '"]');
    }

    // Format values according to data type
    value = reverseFormatValue(path[path.length - 1], value);

    if (input && input.length > 0) {
        input = $(input[input.length - 1]);
        // Handle select inputs and clone if necessary
        if (input.is('select') && input.find('option[value="' + value + '"]').length > 0) {
            if (input.val() === '' || override) {
                input.val(value).trigger('change');
            } else {
                input.closest('div.wrap-contact100-subsection').find('.plus_button_select').click();
                let inputs = $('[name="' + name + '"]');
                let newInput = $(inputs[inputs.length - 1]);
                newInput.val(value).trigger('change');
            }
        } else if (input.is('input') || input.is('textarea')) {
            // Handle text inputs and clone if necessary
            if (input.val() === '' || override) {
                input.val(value);
                input.change();
            } else {
                input.parent().next('.plus_button_input').click();
                let inputs = $('[name="' + name + '"]');
                let newInput = $(inputs[inputs.length - 1]);
                newInput.val(value);
            }
        } else if (input.is('div')) {
            // Handle div inputs and clone if necessary
            let usedDays = new Set();
            let lastOpens = null;
            let lastCloses = null;

            input.find('input[type="checkbox"]').each(function () {
                $(this).prop('checked', false);
            });

            for (let i in value) {
                let currentDay = value[i];
                if (usedDays.has(currentDay['dayOfWeek']) || (lastOpens && currentDay['opens'] !== lastOpens)
                    || (lastCloses && currentDay['closes'] !== lastCloses)) {
                    usedDays.clear();
                    input.next().click();
                    let inputs = $('[name="' + name + '"]');
                    input = $(inputs[inputs.length - 1]);
                    input.find('input[type="checkbox"]').each(function () {
                        $(this).prop('checked', false);
                    });
                }

                input.find('input[value="' + currentDay['dayOfWeek'] + '"]').prop('checked', true);
                let time = input.find('input[type="time"]');
                $(time[0]).val(currentDay['opens']);
                $(time[1]).val(currentDay['closes']);

                usedDays.add(currentDay['dayOfWeek']);
                lastOpens = currentDay['opens'];
                lastCloses = currentDay['closes'];
            }
        }
    }
}

function valueToString(value) {
    switch (typeof value) {
        case 'boolean':
            value = Boolean(value).toString();
            break;
        case 'number':
            value = Number(value).toString();
            break;
    }
    return value;
}

function reverseFormatValue(name, value) {
    if (context[`${name}`]) {
        let type = context[`${name}`]['@type'];
        if (type) {
            if (type === 'xsd:dateTime') {
                return moment(value).format('YYYY-MM-DD');
            }
            if (type === 'xsd:integer') {
                return Number(value).toString();
            }
            if (type === 'xsd:double') {
                return Number(value).toString();
            }
            if (type === 'xsd:boolean') {
                return Boolean(value).toString();
            }
            if (type === 'xsd:duration') {
                if (name === 'maximumStorageTime') {
                    return value.substring(1).slice(0, -1);
                }
                if (name === 'minimumStorageTime') {
                    return value.substring(2).slice(0, -1);
                }
            }
        }
    }
    return value;
}
