Ibles.package("Ibles.views","Ibles.models");

Ibles.views.HeaderView = Backbone.View.extend({
    el: "#header",
    session: null,

    events: {
        'click #loginHeaderLink' : 'showLoginModal',
        'click #signupHeaderLink' : 'showSignupModal',
        'click #logoutHeaderLink' : 'logoutAction'
    },

    initialize: function () {
        // Listen for session logged_in state changes and re-render
        this.session = Ibles.session;
        this.template = Ibles.templateCache('#youMenuTemplate');
        this.listenTo(this.session, "change:logged_in change:tinyUrl", this.render);//render main dropdown menus
        this.render();
        this.renderEnCreateLinks()
    },

    //header click events - this will eventually belong in the header backbone view
    showLoginModal : function(e){
        e.preventDefault();
        Ibles.loginFlow.promptLogin();
    },
    
    showSignupModal : function(e){
        e.preventDefault();
        Ibles.loginFlow.promptSignup();
    },
    
    logoutAction : function(e){
        e.preventDefault();
        this.session.logout();
    },

    ajaxHeader: function(callbacks){
        var youURL = "/dynjsp/you-menu.jsp?showCreateCollection=false";
        $.ajax(youURL, {
            success: function(data) {
                if (typeof callbacks !== "undefined" && typeof callbacks['success'] === "function") {
                    callbacks['success'](data);
                }
            },
            error: function() {
                if (typeof callbacks !== "undefined" && typeof callbacks['error'] === "function") {
                    callbacks['error']();
                }
            }
        });
    },

    renderEnCreateLinks: function() {

        if (Ibles.pageContext.currentLocale === 'en_US') {
            var stepByStepLink = $('#nav-step-by-step-link'),
              photoLink = $('#nav-photo-link'),
              videoLink = $('#nav-video-link');

            if (this.session.authenticated()) {
                stepByStepLink.attr("href", "/id/edit");
                photoLink.attr("href", "/id/edit?type=photos");
                videoLink.attr("href", "/id/edit/?type=video");
            }
            else {
                stepByStepLink.attr("href", "/account/register?sourcea=submit_i&amp;nxtPgName=Submit+Step+by+Step&amp;nxtPg=%2Fid%2Fedit&amp;skipPro=true");
                photoLink.attr("href", "/account/register?sourcea=submit_s&amp;nxtPgName=Submit+Photos&amp;nxtPg=%2Fid%2Fedit%3Ftype%3Dphotos&amp;skipPro=true");
                videoLink.attr("href", "/account/register?sourcea=submit_v&amp;nxtPgName=Submit+Video&amp;nxtPg=%2Fid%2Fedit%3Ftype%3Dvideo&amp;skipPro=true");
            }
        }
    },

    renderDjangoYou:function (youMenuContainer, loginMenu) {
        if (this.session.authenticated()) {
            loginMenu.hide();
            youMenuContainer.html(this.template(Ibles.appendReverseUrls(this.session.toJSON())));
            youMenuContainer.show();
        } else {
            youMenuContainer.hide();
            loginMenu.show();
        }
    },

    render:function () {
        var youMenuContainer = $('#youMenu');
        var loginMenu = $('#loginMenu');
        var that = this;

        if (Ibles.pageContext.currentLocale === 'en_US') {
            this.ajaxHeader({success: function(data){
                if (that.session.authenticated()) {
                    loginMenu.hide();
                    youMenuContainer.html(data);
                    youMenuContainer.show();
                }
                else {
                    youMenuContainer.hide();
                    loginMenu.html(data);
                    loginMenu.show();
                }
            }, error: function(){
                // if the main site you menu is unavailable, use normal Django you menu
                that.renderDjangoYou(youMenuContainer, loginMenu);
            }});
        }
        else {
            that.renderDjangoYou(youMenuContainer, loginMenu);
        }
        return this;
    }
});
