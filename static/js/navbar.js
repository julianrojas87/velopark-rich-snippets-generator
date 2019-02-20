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

    $('#myParkings').click(e => {
        e.stopPropagation();
    });

    $('body,html').click(e => {
        $('#drop-menu').hide();
    });
    
})(jQuery);