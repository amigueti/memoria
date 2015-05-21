/*!
* overides fancybox jquery plugin to provide horizontal transition
* and w/ a new overlay helper that's fixed positioned
* <div id="photoset-overlay"></div>
*/
(function ($, F) {
  	var W = $(window),
  		D = $(document),
  		isMobile = typeof document.createTouch !== "undefined";
  		
	  $.extend(F.defaults, {
		  wrapCSS: 'photoset-fancybox',
      scrolling: 'visible',
      aspectRatio: true,
      loop: false,
      prevSpeed: 600,
      nextSpeed: 600,
			keys: {
				next: [13,32,39], // enter, space, page down, right arrow, down arrow
				prev: [37], // backspace, page up, left arrow, up arrow
				close: [27] // escape key
			},        
      helpers: {
        overlay: null,
        PhotosetOverlay: {}
      }
    });
    
    F.transitions.changeIn = function() {
			var wrap = F.wrap,
				current = F.current,
				startPos = F._getPosition(true);
				        
      if(!F.isForward){
        startPos.left = (parseInt(startPos.left, 10) - 1500) + 'px';
        wrap.css(startPos).show().animate({
          left: '+=1500px'
        }, {
          duration: current.nextSpeed,
          complete: F._afterZoomIn
        });
        
      } else {
        startPos.left = (parseInt(startPos.left, 10) + 1500) + 'px';
        wrap.css(startPos).show().animate({
          left: '-=1500px'
        }, {
          duration: current.nextSpeed,
          complete: F._afterZoomIn
        });
      }        
    };
    
    F.transitions.changeOut = function() {
      var wrap = F.wrap,
          current = F.current,
  				cleanUp = function () {
  					$(this).trigger('onReset').remove();
  				},            
          leftAmt;
      
      wrap.removeClass('fancybox-opened');

      if (F.isForward){
        leftAmt = '-=1500px';
      } else {
        leftAmt = '+=1500px';
      }

      if (current.prevEffect === 'elastic') {
        wrap.animate({
          'opacity': 0.4,
          left: leftAmt
        }, {
          duration: current.prevSpeed,
          complete: cleanUp
        });
      }        
    };
    
    F.next = function() {
      if (F.current) {
          F.isForward = true;
          F.jumpto(F.current.index + 1);
      }        
    };
    
    F.prev = function() {
      if (F.current) {
          F.isForward = false;
          F.jumpto(F.current.index - 1);
      }        
    };
		
    F.closeOrig = F.close;
    F.close = function(a) {
      if (typeof a === "object" && a.target) {
        var target = $(a.target);
        if (target.attr('id') === F.overlayId || (target.hasClass('fancybox-close') && $(this).attr('id') !== F.overlayId) || target.hasClass('transparency'))
          F.closeOrig(a);
        return;
      }
      F.closeOrig(a);
    };
		
		F._afterZoomOut = function() {
      F.trigger('afterClose');
		};
		
		F.getViewport = function() {
			return {
				x: W.scrollLeft(),
				y: 0,
				w: W.width(),
				h: W.height()
			};
		};  		
			  		
		F.originalUrl = window.location.href;
    F.overlayId = "photoset-overlay";
    F.overlayWrap = '<div id="'+F.overlayId+'"><div class="transparency"></div></div>';

		// we want to create an overlay that contains the overlay contents
    F.helpers.PhotosetOverlay = {
      overlay: null,
      	      	  
  		beforeLoad: function (opts) {
  			if (this.overlay) {
  				return;
  			}
  			opts = $.extend(true, {
  				speedIn : 'fast',
  				closeClick : true
  			}, opts);
  			
  			this.overlay = $(F.overlayWrap).appendTo('body');
  			if (opts.closeClick) {
  			  this.overlay.bind('click.fb', F.close);
  			}
  			this.overlay.fadeTo(opts.speedIn, opts.opacity);
  		},

      beforeShow: function(opts) {
        F.wrap.detach().appendTo('div#'+F.overlayId);
      },
          		
  		afterClose: function (opts) {
  		  F.wrap.trigger('onReset').remove();
  			if (this.overlay) {
  			  this.overlay.remove();
  			  this.overlay = null;    			  
  			}  			  			
  			$.extend(F, {
  				group: {},
  				opts: {},
  				current: null,
  				isActive: false,
  				isOpened: false,
  				isOpen: false,
  				wrap: null,
  				outer: null,
  				inner: null
  			});  			
  		}      
    };
}(jQuery, jQuery.fancybox));