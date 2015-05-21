head.ready(["jquery", "bootstrap"], function() {
    $('a.legal_link').on('click',function(e){
        e.preventDefault();
        var link = $(e.target).attr('href'),
        title = $(e.target).attr('title'),
        modalElement = $('#legalModal');

        $('#legalize_frame').attr('src',link);
        modalElement.find('.legal_modal_title').html(title);
        modalElement.modal();
    });

    $('#header-search-btn').click(function(e){
        e.preventDefault();
        $('#header-search-form').submit();
    });

     $('#404-search-btn').click(function(e){
        e.preventDefault();
        $('#404-search-form').submit();
    });
});
