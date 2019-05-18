function make_wizard(){
    var form = $("#form-velopark-data");

    form.steps({
        headerTag: "h3",
        bodyTag: "fieldset",
        transitionEffect: "fade",
        stepsOrientation: "vertical",
        enableAllSteps: true,
        enableFinishButton: false,
        titleTemplate:
            '<div class="title-step-#index#">' +
                '<span class="step-number">#index#.&nbsp;</span>' +
                '<span class="step-text">#title#</span>' +
            '</div>',
        labels: {
            previous: '<span transl-id="home.buttons.prev">Previous</span>',
            next: '<span transl-id="home.buttons.next">Next</span>'
        },
        /*onStepChanging: function(event, currentIndex, newIndex) {
            if (currentIndex === 0) {
                form.parent().parent().parent().append('<div class="footer footer-' + currentIndex + '"></div>');
            }
            if (currentIndex === 1) {
                form.parent().parent().parent().find('.footer').removeClass('footer-0').addClass('footer-' + currentIndex + '');
            }
            if (currentIndex === 2) {
                form.parent().parent().parent().find('.footer').removeClass('footer-1').addClass('footer-' + currentIndex + '');
            }
            if (currentIndex === 3) {
                form.parent().parent().parent().find('.footer').removeClass('footer-2').addClass('footer-' + currentIndex + '');
            }
            // if(currentIndex === 4) {
            //     form.parent().parent().parent().append('<div class="footer" style="height:752px;"></div>');
            // }
            //form.validate().settings.ignore = ":disabled,:hidden";
            //return form.valid();
        },*/
        /*onFinishing: function(event, currentIndex) {
            form.validate().settings.ignore = ":disabled";
            return form.valid();
        },
        onFinished: function(event, currentIndex) {
            alert('Submited');
        },*/
        onStepChanged: function(event, currentIndex, priorIndex) {
            $('.ol-point-map, .ol-polygon-map').each(function(){
                $(this).data('openlayers-map').updateSize();
            });

            $("html, body").animate({ scrollTop: 0 }, "fast");

            return true;
        }
    });
}