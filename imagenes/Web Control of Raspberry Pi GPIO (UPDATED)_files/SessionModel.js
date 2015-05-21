Ibles.package("Ibles.models");

Ibles.models.SessionModel = Backbone.Model.extend({
    defaults : {     
        logged_in: false,
        login_type: null,        
        id: null,
        screenName: null,
        locale: null,
        pro: null,
        staff: null,
        admin: false,
        role: null,
        instructablesCount: null,
        draftsCount: null,
        publishedCollectionsCount: null,
        draftCollectionsCount: null,
        tinyUrl: "/static/defaultIMG/user.TINY.gif"
    },
    
    initialize: function() {
        this.checkAuth();
        this.on('change', this.serializeToCookie);
    },

    getCookieAttributes: function() {
        return _.omit(this.attributes, ["logged_in", "login_type"]);  
    },

    updateModel: function(data) {
        this.set(_.pick(data, _.keys(this.attributes)));
    },
    
    updateModelAndSerializeToCookie: function(data) {
        this.updateModel(data);
        this.serializeToCookie();        
    },  
    
    serializeToCookie: function() {
        $.cookie('ibleuser', JSON.stringify(this.getCookieAttributes()), {path: '/'});
    },

    cookieHasMissingUserInfo: function(ibleUserCookie) {
        var cookieAttributes = this.getCookieAttributes();
        var ibleUser = JSON.parse(ibleUserCookie);            
        for (var key in cookieAttributes) {
            if (typeof ibleUser[key] === "undefined"){
                return true;
            }
        }
        return false;
    },    

    removeCookies: function() {
        $.removeCookie('authy',{ path: '/' });
        $.removeCookie('ibleuser',{ path: '/' });
        $.removeCookie(Ibles.pageContext.fbatCookie, {path: '/'});
        $.removeCookie(Ibles.pageContext.fbllatCookie, {path: '/'});
    },
    
    authenticated: function() {
        return this.get("logged_in");
    },
    
    isAdmin: function() {
        return this.authenticated() && (this.get('admin') || this.get('role') === "ADMIN");
    },
    
    isFacebookLogin: function() {
        return this.get("login_type") === "facebook";
    },
     
    checkAuth: function() {
        this.loadUserByAuthyCookie() || this.loadUserByFbAccessToken();
    },
    
    loadUserByAuthyCookie: function() {
        var authyCookie = $.cookie('authy'),
            self = this;            
        if (authyCookie) {
            this.loadUser(function(){
                self.set({logged_in : true});                
            });
            return true;
        }
        return false;
    },
    
    loadUserByFbAccessToken: function() {
        var fbAccessToken = $.cookie(Ibles.pageContext.fbllatCookie) || $.cookie(Ibles.pageContext.fbatCookie),
            self = this;
        if (fbAccessToken) {
            this.checkFbAccessToken(fbAccessToken, {
                success: function() {
                    self.loadUser(function(){
                        self.set({logged_in: true, login_type: "facebook"});
                    });
                },
                error: $.proxy(this.removeCookies, this)
            });
        }
    },
    
    loadUser: function(cb) {
        var ibleUser = $.cookie('ibleuser');        
        if (!ibleUser || this.cookieHasMissingUserInfo(ibleUser)) {
            this.loadRemainingUserData(cb);
        } else {
            this.updateModel(JSON.parse(ibleUser));
            if (cb) cb();
        } 
    },
    
    checkFbAccessToken: function(token, opts) {
        $.ajax({
            method: "GET",
            url: "https://graph.facebook.com/me?access_token="+token,
            success: function(){
                if (opts && opts.success) opts.success();
            },
            error: function(){
                if (opts && opts.error) opts.error();
            }
        });
    },

    login: function(opts, callbacks){
        var self = this
        this.removeCookies();
        Ibles.API.postRequest("login", opts, {
            success: function(data) {      
                self.updateModelAndSerializeToCookie(data);
                self.loadRemainingUserData(function(){
                    self.set({logged_in: true});
                    var successCallback = callbacks.success;
                    if (successCallback) successCallback(data);                    
                });
            }, 
            error: function(data) {
                self.set(self.defaults);
                var errorCallback = callbacks.error;
                if (errorCallback) errorCallback(data);                
            },
            complete: function(data) {
                var completeCallback = callbacks.complete;
                if (completeCallback) completeCallback(data);                
            }
        });
    },

    fbLogin: function() {
        var self = this;
        this.removeCookies();
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                self.onFacebookLogin(response);
            } else {
                FB.login(function(response) {
                    self.onFacebookLogin(response);
                }, {
                    scope: "email,user_birthday,publish_stream"
                });
            }
        });
    },
    
    onFacebookLogin: function(response) {
        var self = this;
        if (response.authResponse) {
            $.cookie(Ibles.pageContext.fbatCookie, response.authResponse.accessToken, {path: '/'});
            Ibles.API.postRequest("login", {auth: 'facebook'}, {
                success: function(data){
                    self.updateModelAndSerializeToCookie(data);   
                    self.loadRemainingUserData(function(){
                        self.set({logged_in: true, login_type: "facebook"});                  
                    });
                },
                error: function(data){
                    self.removeCookies();                    
                },
                complete: function(data) {
                    window.location.reload(true);                    
                }
            });
        }
    },   

    register: function(opts, callback){
        this.removeCookies();
        Ibles.API.postRequest("register", opts, callback);
    },

    forgotPassword: function(opts, callback){
        Ibles.API.postRequest("forgotPassword", opts, callback);
    },

    logout: function(){  
        this.removeCookies();
        this.set(this.defaults);
        Ibles.API.postRequest("logout");        
    },

    resetPassword: function(opts, callback){
        this.removeCookies();
        Ibles.API.postRequest("resetPassword", opts, callback);
    },

    whoAmI : function() {
        var self = this;
        return Ibles.API.getRequest("whoAmI", {},
            {
                success: function(data){
                    self.updateModelAndSerializeToCookie(data);
                }
            }
        );
    },
    
    loadFullAuthor: function() {
        var self = this;
        return Ibles.API.getRequest("showAuthor", {lite: "true"},
            {
                success: function(data){
                    self.updateModelAndSerializeToCookie(data);
                }
            }
        );
    },
    
    loadRemainingUserData : function(cb) {
        var self = this;
        this.whoAmI().done(function(){
            self.loadFullAuthor().done(function(){
                if (cb) cb();
            })
        });
    }    
});
