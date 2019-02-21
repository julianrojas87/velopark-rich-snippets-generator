const domainName = $('#domainName').text();

(function ($) {
    "use strict";

    document.addEventListener('DOMContentLoaded', (event) => {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
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

        return false;
    });

})(jQuery);