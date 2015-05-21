(function($, _, Backbone) {    
    /* 
    Jquery plugin for photoset layout algorithm
    - Support for 3-level (small/medium/large) image sizes
    - Support for variable layout algorithm based on number of images, image aspect ratios, and container width
    - Support for photosets that resize to its container
    
    Photoset options:
     - width: container width
     - gutter: gutter width
     - layout: static layout string denoting how many images per row (at most 5 images per row)
     - variableLayout: boolean indicating whether to ignore the layout string and use the variable layout algorithm (at most 3 images per row)
     - maxRowsVisible: number of rows that's initially visible
     - aspectRatioRowOfOneThreshold: aspect ratio at which a photo is assigned its own row in the variable layout algorithm

    Photoset image size rules:
    - row size of 1, use medium image size, maintain aspect ratio, 600x600 max height or width
    - row size of 2, use small image sizes, maintain aspect ratio, max combined width of 600 (with 10px gutter) with equal height
    - row size of 3, use small image sizes, use aspect ratio of first image and apply to second and third, width equal height

    Variable layout algorithm w/ image size rules:
    - given a photo array of length n, here's the algorithm used for constructing photoset rows:
     A: if n <= 6, then create row1 using photo[0].
        - Use data-medium-image for this photo
        - If the image's width > image height, then the photo's rendered width should be forced to the
         smaller of its width and maxRowWidth, else the photo's rendered height should be forced to the
         smaller of it's original height and maxRowHeight
     B: if n == 2, create row2 using photo[1] (See A.)
     C: if n == 3, create row2 using photo[1] and photo[2]
        - Use data-small-image for these photos
        - Keep aspect ratios in tact, and constrain heights to match and total width to naxRowWidth
          - Let TotalWidth be the sum of each photo's natural width
          - Each photo's rendered width should be forced to a new width derived from assuming the total width has been
          scaled up/down to the maxRowWidth-gutterWidth  (newWidth = (naturalWidth/totalWidth)*(maxRowWidth-gutterWidth)
        - The forced/rendered height of the row should be the shorter of the heights of the two images based on their new widths
     D: if n == 4, create row2 using photo[1] and create row3 using photo[2] and photo[3],
     or create row2 using photo[1], photo[2], and photo[3]
        - Using data-medium-image for photo[1], if width to height ratio of photo[1] is greater than or equal to aspectRatioRowOfOneThreshold:
          - create row2 using just photo[1] and data-medium-image, and the photo's rendered width should be forced to the smaller of its width and maxRowWidth
          - create row3 using photo[2] and photo[3]. Use data-small-image for both
        - If width to height ratio of photo[1] is less than aspectRatioRowOfOneThreshold, then create row2 using photo[1], photo[2], and photo[3]
          - Use data-small-image for these photos
          - Partition the row into a column of 3 evenly (w/ consideration for gutter width)
          - Each photo's rendered width should be forced to the column width
          - The forced/rendered height of the row should be the height of the shortest photo
     E: if n == 5, create row2 using photo[1] and photo[2], and create row3 using photo[3] and photo[4] (See C.)
     F: if n == 6, create row2 using photo[1] and photo[2] (See C.), and create row3 using photo[3], photo[4] and photo[5] (See D.)
     G: if n > 6, then lets break it into groups of 6 and build the photoset rows for each group of 6, then build final photoset row for the remaining photos
     */
          
    var defaults = {
        width : '100%',
        gutter : '0px',
        layout : null,
        variableLayout: false,
        maxRowsVisible: null,
        aspectRatioRowOfOneThreshold : null
    };

    function Photoset(element, options) {
        this.$element = $(element);
        this.photosetItems = [];
        this.photosetRows = [];
        this.rows = []; // rows is an array of integers that denotes how many items are in each row
        this.options = $.extend({}, defaults, options);
        this.init();
    }

    Photoset.prototype = {

        init: function() {
            this.setupLayout(this.$element, this.options);
        },
        
        getRowCount: function() {
            return this.rows.length;
        },

        fillImage: function($imgItem, imageSize) {
            var $img = $imgItem.find("img");
            $img.attr('src', $img.data(imageSize));
        },

        fillImages: function($imgItems, beginIndex, endIndex, imageSize) {
            for (var i=beginIndex; i<=endIndex; i++) {
                this.fillImage($imgItems.eq(i), imageSize);
            }
        },

        getHeightProportionalToCellWidth: function($img, photosetWidth) {
            var parentCellPercentageWidth = $img.closest('.photoset-cell').width(),
                parentCellProportialWidth = ((parentCellPercentageWidth / 100) * (photosetWidth-10));
            return Math.floor(($img.data('orig-height') / $img.data('orig-width')) * parentCellProportialWidth);          
        },
        
        setupLayout: function($elem, options) {
            var self = this;
            
            // cache the array of photoset items
            this.photosetItems = $elem.find('.photoset-item'); 
                       
            if (options.variableLayout || $elem.data('variable-layout')) {
                this.setPhotosetRowsUsingVariableLayoutStrategy($elem, options);
            }
            this.setupRows($elem, options);
            this.setupColumns($elem, options);

            $elem.imagesLoaded(function(){
                // Call resize once to calibrate height of photoset rows and center images within a row
                self.resizePhotosetGrid();
                $(window).on("resize", function() {
                    self.resizePhotosetGrid();
                });
                self.showHiddenRowsUpToMaxRowsVisible();
                $elem.trigger("photoset.layoutComplete");
            });
        },

        setPhotosetRowsUsingVariableLayoutStrategy: function($elem, options) {
            var lastFileWasVideoEmbed = false,
                $tempItems = $(),
                rows = [],
                self = this;
            
            // loop through items and append photoset rows by contigous segments of video or image file types          
            this.photosetItems.each(function() {
                var $photosetItem = $(this);
                if ($photosetItem.hasClass('photoset-video')) {
                    if (!lastFileWasVideoEmbed && !_.isEmpty($tempItems)) {
                        self.appendPhotosetImageRows(rows, $tempItems, options);
                        $tempItems = $();                        
                    }
                    $tempItems.push(this);
                    lastFileWasVideoEmbed = true;
            
                } else if ($photosetItem.hasClass('photoset-image')) {
                    if (lastFileWasVideoEmbed && !_.isEmpty($tempItems)) {
                        self.appendPhotosetVideoRows(rows, $tempItems, options);
                        $tempItems = $();
                    }
                    $tempItems.push(this);
                    lastFileWasVideoEmbed = false;
                }
            });
            
            // append photoset rows for the remaining items of the same type
            if (!_.isEmpty($tempItems)) {
                if (lastFileWasVideoEmbed) {
                    self.appendPhotosetVideoRows(rows, $tempItems, options);
                } else {
                    self.appendPhotosetImageRows(rows, $tempItems, options);
                }
            }

            // rows is an array of integers that denotes how many items are in each row
            this.rows = rows;
        },
        
        appendPhotosetVideoRows: function(rows, videos, options) {
            var self = this;
            videos.each(function() {
                rows.push(1); // each video is in a row by itself
            });
        },

        appendPhotosetImageRows: function(rows, $imageItems, options) {
            // rows[i] is the number of images that will go in row i+1
            var numImages = $imageItems.length;

            if (numImages <= 6) {
                // first row has one image ($images[0])
                rows.push(1);
                this.fillImage($imageItems.eq(0), 'medium-image');

                if (numImages == 2) {
                    // second row has one image ($images[1])
                    rows.push(1);
                    this.fillImage($imageItems.eq(1), 'medium-image');

                } else if (numImages == 3) {
                    // second row has two images ($images[1] and $images[2])
                    rows.push(2);
                    this.fillImages($imageItems, 1, 2, 'small-image');

                } else if (numImages == 4) {
                    // based on $images[1]'s aspect ratio, we either have a row of 1 followed by a row of 2 or a row of 3
                    var rowOfThree = true,
                        $img1 = $imageItems.eq(1),
                        img1OrigWidth = $img1.data('orig-width'),
                        img1OrigHeight = $img1.data('orig-height');

                    if ((img1OrigWidth/img1OrigHeight) >= options.aspectRatioRowOfOneThreshold) {
                        // second row has one image, third row has 2 images
                        rows.push(1);
                        rows.push(2);
                        this.fillImages($imageItems, 1, 3, 'small-image');
                        rowOfThree = false;
                    }

                    if (rowOfThree) {
                        // second row has three images
                        rows.push(3);
                        this.fillImages($imageItems, 1, 3, 'small-image');
                    }

                } else if (numImages == 5) {
                    // second and third both have 2 images
                    rows.push(2);
                    rows.push(2);
                    this.fillImages($imageItems, 1, 4, 'small-image');

                } else if (numImages == 6) {
                    // second row has two images, third row has 3 images
                    rows.push(2);
                    rows.push(3);
                    this.fillImages($imageItems, 1, 5, 'small-image');
                }

            } else {
                // lets divide & conquer, and break the rest of images into groups of 6, building the rows for each
                // group of 6 using a recursive call, then building the final row for the remaining photos
                var partitions = parseInt($imageItems.length / 6);
                for (var i = 0; i < partitions; i++) {
                    this.appendPhotosetImageRows(rows, $imageItems.slice(i * 6, (i+1) * 6), options)
                }

                // build rows with the remaining rem photos
                var rem = $imageItems.length % 6;
                if (rem > 0) {
                    this.appendPhotosetImageRows(rows, $imageItems.slice($imageItems.length - rem), options);
                }
            }
        },

        setupRows: function($elem, options) {
            var $items = this.photosetItems,
                itemIndex = 0,
                self = this;
            

            if (!this.rows) {
                // Convert the layout string into an array to build the DOM structures
                if (options.layout) {
                    this.layout = options.layout;
                } else if ($elem.data('layout')) {
                    this.layout = $elem.data('layout');
                } else {
                    // Otherwise give it a stacked layout (no grids for you)
                    // Generate a layout string of all ones based on the number of items
                    var stackedLayout = "";
                    var defaultColumns = 1;
                    for (var numItems = 0; numItems < $items.length; numItems++ ) {
                        stackedLayout = stackedLayout + defaultColumns.toString();
                    }
                    this.layout = stackedLayout;
                }

                // Dump the layout into a rows array
                // Convert the array into all numbers vs. strings
                this.rows = this.layout.split('');
                for (var i in this.rows ) {
                    this.rows[i] = parseInt(this.rows[i], 10);
                }
            }
            
            // Wrap each set of items in a row into a container div
            $.each(this.rows, function(i, val){
                var rowStart = itemIndex,
                    rowEnd = itemIndex + val,
                    rowHidden = "",
                    $itemSlice = $items.slice(rowStart, rowEnd);
                
                // hide the row instead of keeping the items hidden
                if ($itemSlice.hasClass('hidden-item'))
                    rowHidden = ' hidden-row';
                    
                var $newRow = $itemSlice.wrapAll('<div class="photoset-row cols-' + val + rowHidden + '"></div>');
                $itemSlice.removeClass('hidden-item');
                itemIndex = rowEnd;
            });

            $elem.find('.photoset-row:not(:last-child)').css({
                'margin-bottom': options.gutter
            });
            
            // cache the array of photoset rows
            this.photosetRows = $elem.find('.photoset-row');
        },

        setupColumns: function($elem, options){
            var $rows = this.photosetRows,
                $items = this.photosetItems;

            $items.each(function(){
                $(this).wrapAll('<div class="photoset-cell" />');
            });

            var $cells = $elem.find('.photoset-cell'),
                $cols1 = $elem.find('.cols-1 .photoset-cell'),
                $cols2 = $elem.find('.cols-2 .photoset-cell'),
                $cols3 = $elem.find('.cols-3 .photoset-cell'),
                $cols4 = $elem.find('.cols-4 .photoset-cell'),
                $cols5 = $elem.find('.cols-5 .photoset-cell');

            // Apply initial structure styles to the grid
            $rows.css({
                'clear': 'left',
                'overflow': 'hidden'
            });
            $cells.css({
                'float': 'left',
                'display': 'block',
                'line-height': '0',
                '-webkit-box-sizing': 'border-box',
                '-moz-box-sizing': 'border-box',
                'box-sizing': 'border-box'
            });

            // Set the width of the cells based on the number of columns in the row.
            // Width of imgs are already defined in css to be 100%
            $cols1.css({ 'width': '100%' });
            $cols2.css({ 'width': '50%' });
            $cols3.css({ 'width': '33.3%' });
            $cols4.css({ 'width': '25%' });
            $cols5.css({ 'width': '20%' });

            var gutterVal = parseInt(options.gutter, 10);
            // Apply 50% gutter to photoset cells furthest left and right
            $elem.find('.photoset-cell:not(:last-child)').css({
                'padding-right': (gutterVal / 2) + 'px'
            });
            $elem.find('.photoset-cell:not(:first-child)').css({
                'padding-left': (gutterVal / 2) + 'px'
            });
        },

        resizePhotosetGrid: function() {
            var self = this,
                $elem = this.$element,
                photosetWidth = $elem.width().toString(),
                $rows = this.photosetRows;

            if (photosetWidth !== $elem.data('width')) {
                $elem.trigger("photoset.beforeResize");
                $rows.each(function(){

                    // Set a max width for row of 1's equal to the natural width of the item in the row
                    if ($(this).hasClass('cols-1')) {
                        var $img1 = $(this).find('img:eq(0)');
                        if ("none" === $img1.css('maxWidth')) {
                            $img1.css("maxWidth", $img1.data('orig-width') + "px");
                        }
                    }

                    // For row of 2, adjust the percentage width of columns within the row to be proportional to the width of images within the row
                    if ($(this).hasClass('cols-2')) {
                        var $img1 = $(this).find('img:eq(0)'),
                        $img2 = $(this).find('img:eq(1)');

                        var img1OrigWidth = $img1.data('orig-width'),
                            img2OrigWidth = $img2.data('orig-width'),
                            totalWidth = (img1OrigWidth + img2OrigWidth);
            
                        var img1ColPercent = Math.floor((img1OrigWidth/totalWidth)*100),
                            img2ColPercent = 100 - img1ColPercent;

                        var cells = $(this).find('.photoset-cell');
                        cells.eq(0).css({'width' : img1ColPercent+'%'});
                        cells.eq(1).css({'width' : img2ColPercent+'%'});
                    }

                    // If row has more than 1 columns, then set the height for each photoset row to equal the height of the shortest image as defined by the cell it's contained in
                    if (!$(this).hasClass('cols-1')) {
                        var shortestImgHeight = 100000,
                            $shortestImg;
                            
                        $(this).find('img').each(function(){
                            var $candidateImg = $(this),
                                candidateImgHeight = $candidateImg.data('orig-height');
                            if (candidateImgHeight < shortestImgHeight){
                                $shortestImg = $candidateImg;
                                shortestImgHeight = candidateImgHeight;
                            }
                        });

                        // set the row height be the proportional height of the shortest image as defined by its parent cell
                        var rowHeight = self.getHeightProportionalToCellWidth($shortestImg, photosetWidth);
                        $(this).height(rowHeight);

                        // Try to center each image in the row
                        $(this).find('img').each(function(){
                            var $img = $(this),
                                imgHeight = self.getHeightProportionalToCellWidth($img, photosetWidth);
                            var marginOffset = ((rowHeight - imgHeight)*0.5) + 'px';
                            $img.css({
                                'margin-top' : marginOffset
                            });
                        });            
                    }
                });

                $elem.data('width', photosetWidth);
                $elem.trigger("photoset.afterResize");
            }
        },

        showHiddenRowsUpToMaxRowsVisible: function() {
            var maxRowsVisible = this.options.maxRowsVisible,
                shouldHideRows = false,
                $elem = this.$element,
                $rows = null,
                self = this;
                
            if (maxRowsVisible && this.getRowCount() > maxRowsVisible)
                shouldHideRows = true;

            if (!shouldHideRows) {
                this.showAllRows();
            } else {
                $rows = $elem.find('.photoset-row');                   
                for (var i=0; i < maxRowsVisible; i++) {
                    $rows.eq(i).removeClass('hidden-row');
                }                
            }
        },
        
        showAllRows: function() {
            this.$element.find('.hidden-row').removeClass('hidden-row');
        }
    };

    $.fn.photoset = function(options) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data('photoset');
            if (!data) 
                $this.data("photoset", (data = new Photoset(this, options)));
            if (typeof options == 'string') 
                data[option].call($this); 
        });
    };
        
        
        
    /* 
    Backbone hooks to initialize photoset object, show overlay,
    render images notes, resize image notes on photoset resize,
    and allow viewing photosets in a fancybox using html5 history api.
    */
    
    var PhotosetManager = Backbone.View.extend({
        el: ".photoset", 
               
        initialize: function(options) {
            var self = this;
            if (!options.baseURL)
                throw new Error('base URL required for photoset');

            var options = _.extend({
                maxRowsVisible: 3,
                gutter: '5px',
                variableLayout: true
            }, options);
            
            $(function(){           
                _.each(self.$el, function($photosetElement){
                    new PhotosetView(_.extend({el: $photosetElement}, options));
                });
                Backbone.history.start({pushState: true, root: options.baseURL});                
            });
        }
    });
    
    
    var PhotosetView = Backbone.View.extend({
        events: {
            "click a.photoset-link" : "photosetLinkClicked",
            "click a.photoset-showmore" : "showAllPhotosetRows"
        },
        
        initialize: function(options) {
            this.$el.photoset(options);  
            this.photoset = this.$el.data("photoset");
            this.bindEvents();
        },
        
        bindEvents: function() {
            this.$el.on("photoset.layoutComplete", $.proxy(this.enableShowMoreToggle, this));
            this.$el.on("photoset.beforeResize", $.proxy(this.beforePhotosetResize, this));
            this.$el.on("photoset.afterResize", $.proxy(this.afterPhotosetResize, this));
        },
        
        enableShowMoreToggle: function() {
            var maxRowsVisible = this.maxRowsVisible;
            if (this.maxRowsVisible) {
                if (this.photoset.getRowCount() > maxRowsVisible) {
                    this.$el.find(".photoset-showmore").css({"display":"block"});                 
                }
            }  
        },        
        
        renderImageNotes: function() {
            this.$el.find("img").each(function() {
                var notesContainer = $(this).closest('.photoset-link'),
                    imageNotes = $(this).data("notes"),
                    imageId = $(this).data("image-id");
  
                if ($(this).closest('.photoset-row').children().size() === 1) {
                    if (imageNotes && imageNotes.length) {
                        // for some reason, image notes plugin requires the image to have a second class with an image ID that starts at substr(3)
                        $(this).addClass('photo img' + imageId);
                        $(this).notes(imageNotes, false, notesContainer);
                    }
                }
            });            
        },
        
        beforePhotosetResize: function() {
            this.$el.find('.note-holder').remove();            
        },
        
        afterPhotosetResize: function() {
            this.renderImageNotes();          
        },
        
        showAllPhotosetRows: function() {
            this.$el.find('.photoset-showmore').hide();
            this.photoset.showAllRows();
        },
        
        photosetLinkClicked: function(e) {
            e.preventDefault();
            new PhotosetOverlay({el: this.el});
        }
    });
    
    
    var PhotosetOverlay = Backbone.View.extend({
        initialize: function(){
            this.render();
        },
        
        render: function() {
            var $photosetLinks = this.$el.find('.photoset-link');            

            if (!this.processedPhotosetLinks) {        
                _.each($photosetLinks, function(link){
                    // Replace href attribute with value needed to display fancybox content
                    $(link).attr('href', $(link).data('fancybox-href'));
                });
                this.processedPhotosetLinks = true;
            }

            $photosetLinks.fancybox({
                afterShow: function() {
                    var notesContainer = $(".fancybox-inner");
                    if (notesContainer) {
                        var galleryImg = notesContainer.find("img:first"),
                            curPhotoLink = $(this.element),
                            notesJson = curPhotoLink.find("img:first").data("notes");
                        if (notesJson) {
                            galleryImg.notes(notesJson, false, notesContainer);
                        }
                    }
                }                
            });            
        }
    });
     
    window.PhotosetManager = PhotosetManager;
})(jQuery, _, Backbone);