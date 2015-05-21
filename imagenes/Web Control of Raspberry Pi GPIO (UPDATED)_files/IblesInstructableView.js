Ibles.package("Ibles.views");

Ibles.views.InstructableView = Backbone.View.extend({
    commentsManager: null,
    ibleModel:null,
    authorModel:null,
    session: null,

    events: {
        "click .favorite-btn": "attemptFave",
        "click .follow-btn": "attemptFollow",
        "click .steps-menu-toggle":"toggledStepsMenu"
    },

    initialize : function(opts) {
        var ibleData = Ibles.pageContext.ibleData;
        this.ibleId = ibleData.id;
        this.ibleAuthorScreenName = ibleData.author.screenName;
        this.session = Ibles.session;
        if (!opts || !opts.disableComments){
            this.commentsManager =  new Ibles.views.CommentsManager({ibleId:this.ibleId, ibleAuthor:this.ibleAuthorScreenName});
        }
        this.ibleModel = new Ibles.models.InstructableModel({ibleId:this.ibleId});
        this.authorModel = new Ibles.models.AuthorModel({'screenName':this.ibleAuthorScreenName});

        this.listenTo(this.ibleModel, "change:favorited", this.render);
        this.listenTo(this.authorModel, "change:following", this.render);
        this.listenTo(this.session, "change:logged_in change:role", this.handleAuthChange);
        this.handleAuthChange();
    },
    
    toggledStepsMenu: function(e){
        e.preventDefault();
        $(this).toggleClass('active');
        $('#ible-steps-nav').toggleClass('expanded');
    },

    attemptFave : function(e) {
        e.preventDefault();
        if (this.session.get('logged_in')) {
            this.ibleModel.favoriteAction().error(Ibles.views.AlertView.callbackFactory("error"));
        } else {
            Ibles.loginFlow.promptLogin();
        }
    },

    attemptFollow : function(e) {
        e.preventDefault();
        if (this.session.get('logged_in')) {
            this.authorModel.followAction().error(Ibles.views.AlertView.callbackFactory("error"));          
        } else {
            Ibles.loginFlow.promptLogin();
        }
    },

    handleAuthChange : function() {
        var loggedIn = this.session.get('logged_in'),
            isAdmin = loggedIn && this.session.isAdmin(),
            isIbleAuthor = loggedIn && this.session.get("screenName") === this.ibleAuthorScreenName;
        
        if (loggedIn) {
            this.ibleModel.isFavorite();
            this.authorModel.isFollowing();
        } else {
            this.authorModel.set({'following':false});
            this.ibleModel.set({'favorited':false});
        }
        $('.author-action').toggle(isAdmin || isIbleAuthor);
    },

    render : function () {
        var faveTxt = Ibles.locale.uiElements.fave;
        if (this.ibleModel.get('favorited')){
            faveTxt = Ibles.locale.uiElements.faved;
        }
        var followTxt = Ibles.locale.uiElements.follow;
        if (this.authorModel.get('following')) {
            followTxt = Ibles.locale.uiElements.following;
        }
        $(".fave-btn-txt").html(faveTxt);
        $(".follow-btn").html(followTxt);
    }
});