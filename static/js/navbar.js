($ => {

    /*==================================================================
    [ Make the navigation bar sticky ]*/

    // When the user scrolls the page, execute sticky function
    window.onscroll = function () { sticky() };

    // Get the navbar
    var navbar = document.getElementById("navbar");

    // Get the offset position of the navbar
    var pos = navbar.offsetTop;

    // Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
    function sticky() {
        if (window.pageYOffset >= pos) {
            navbar.classList.add("sticky")
        } else {
            navbar.classList.remove("sticky");
        }
    }

    // Hover function for user dropdown menu
    $('#user-email').hover(() => {
        $('#drop-menu').show();
    });

    $('#language-selector').hover(() => {
        $('#drop-menu-lang').show();
    });

    $('#myParkings').click(e => {
        e.stopPropagation();
    });

    $('#myAdminOverview').click(e => {
        e.stopPropagation();
    });

    $('body,html').click(e => {
        $('#drop-menu').hide();
        $('#drop-menu-lang').hide();
    });

    $('.lang-selector').on('click', function() {
        let lang = $(this).attr('lang-select');
        translate(lang);
    });

    $('.plus_button_city_select').on('click', function () {
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

    $(window).on('resize', handleResize);

    handleResize();

    
    
})(jQuery);

$(window).on('load', function() {
    handleResize();
});

function handleResize() {
    // Adjust position of dropdown menus
    var logoPos = $('#page-logo-helper').position();
    $('#language-selector').css('float', 'left');
    $('#language-selector').css('left', (logoPos.left + 143 + 80) + 'px');
    var langPos = $('#language-selector').position();
    var dropPos = $('#user-email').position();
    $('#drop-menu-lang').css('left', (langPos.left + 10) + 'px');
    $('#drop-menu').css('left', (dropPos.left + 20) + 'px');
}