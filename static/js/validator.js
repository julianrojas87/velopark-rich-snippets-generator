($ => {

    /*==================================================================
    [ Validate after type ]*/
    $('.validate-input .input100').each(function () {
        $(this).on('blur', function () {
            if (validate(this) == false) {
                showValidate(this);
            }
            else {
                $(this).parent().addClass('true-validate');
            }
        })
    });


    /*==================================================================
    [ Validate ]*/

    $('.validate-form .input100, .translatable-free-text .input100').each(function () {
        $(this).focus(function () {
            hideValidate(this);
            $(this).parent().removeClass('true-validate');
        });
    });

    $('.info_button').click(function() {
        let infobox = $(this).next();
        infobox.find('h2').text($(this).prev().text().trim());
        infobox.toggle();
        return false;
    });

    $('.info_button_div').click(function() {
        let infobox = $(this).next();
        infobox.find('h2').text($(this).parent().parent().parent().siblings('span:last').text().trim());
        infobox.toggle();
        return false;
    });

    $('.info_close_button').click(function() {
        $(this).parent().toggle();
        return false;
    });

})(jQuery);

//var input = $('.validate-input .input100');

function fullValidation(input) {
    if (validate(input) == false) {
        showValidate(input);
        return false;
    } else {
        hideValidate(input);
        $(input).parent().addClass('true-validate');
        return true;
    }
}

function validate(input) {
    if ($(input).attr('type') == 'email' || $(input).attr('name') == 'email') {
        if ($(input).val().trim().match(/^([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{1,5}|[0-9]{1,3})(\]?)$/) == null) {
            return false;
        }
    } else if ($(input).attr('type') == 'url') {
        if ($(input).val().trim().match(/^https?:\/\/([\w\d\-]+\.)+\w{2,}(\/.+)?$/) == null) {
            return false;
        }
    } else if ($(input).attr('type') == 'number') {
        if ($(input).val() == '' || parseInt($(input).val()) < parseInt($(input).attr('min')) || parseInt($(input).val()) > parseInt($(input).attr('max'))) {
            return false;
        }
    } else {
        if ($(input).val().trim() == '') {
            return false;
        }
    }
}

function validateLang(freeTextContainer){
    let empty = [];
    let filledIn = [];
    let inputs = freeTextContainer.find('.input100');
    inputs.each(function(){
        let input = $(this);
        if(input.val()){
            filledIn.push(input);
        } else {
            input.parent().attr('data-validate', "You need to fill in this field for each language.");
            empty.push(input);
        }
    });
    if(empty.length > 0 && filledIn.length > 0){
        return empty;
    } else {
        return null;
    }
}

function showValidate(input) {
    var thisAlert = $(input).parent();

    $(thisAlert).addClass('alert-validate');

    $(thisAlert).append('<span class="btn-hide-validate">&#xf136;</span>')
    $('.btn-hide-validate').each(function () {
        $(this).on('click', function () {
            hideValidate(this);
        });
    });

    //jump to the correct wizard page
    $('#' + $(thisAlert).closest('fieldset').attr('id').replace("-p-", "-t-")).get(0).click();
    //scroll the validation warning into view
    setTimeout(function(){
        $(thisAlert)[0].scrollIntoViewIfNeeded();
    }, 800);
}

function hideValidate(input) {
    var thisAlert = $(input).parent();
    $(thisAlert).removeClass('alert-validate');
    $(thisAlert).removeClass('true-validate');
    $(thisAlert).find('.btn-hide-validate').remove();
}