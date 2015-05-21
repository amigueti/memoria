Ibles.package("Ibles.login");

Ibles.login.LoginFlowModalView = Backbone.View.extend({
    el: $('#loginModals'),
    'loginModal' : $('#loginModal'),
    'signupModal' : $('#signUpModal'),
    'forgotModal' : $('#forgotPassModal'),
    'resetModal' : $('#resetPassModal'),

    events : {
        'click #loginBtnModal' : 'submitLogin',
        'click #signupBtnModal' : 'submitSignup',
        'click #forgotBtnModal' : 'submitForgot',
        'click #resetBtnModal' : 'submitReset',
        'click .modal-body .forgotLink' : 'showForgotModal',
        'click .switchToSignup' : 'showSignupModal',
        'click .switchToLogin' : 'showLoginModal',
        'keyup .modal-body .submitFormOnEnter' : 'submitModal'
    },

    submitModal : function (e) {
        var button = $(e.currentTarget).parents('.modal').find('.submitModalButton');
        Ibles.loginFlow.enterClick(button,e);
    },
    submitLogin : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.loginAction($('#loginBtnModal'), ".modal-body", function(){
            self.loginModal.modal('hide');
        });
    },
    submitSignup : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.signupAction($('#signupBtnModal'), ".modal-body", function(){
            self.signupModal.modal('hide');
        });
    },
    submitForgot : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.forgotAction($('#forgotBtnModal'), ".modal-body", function(){
            self.showNextModal(self.forgotModal,self.resetModal);
            var email = $('.modal-body input[name="forgotEmail"]').val();
            $('.modal-body input[name="resetEmail"]').val(email);
        });
    },
    submitReset : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.resetAction($('#resetBtnModal'), ".modal-body", function(){
            self.resetModal.modal('hide');
        });
    },
    //switching between modals
    showForgotModal : function(e) {
        e.preventDefault();
        this.showNextModal(this.loginModal, this.forgotModal);
    },
    showSignupModal : function(e) {
        e.preventDefault();
        this.showNextModal($(e.currentTarget).parents('.modal'), this.signupModal);
    },
    showLoginModal : function(e) {
        e.preventDefault();
        this.showNextModal(this.signupModal, this.loginModal);
    },
    showNextModal : function(currentModal, nextModal){
        currentModal.modal('hide');
        $(".modal-body .inlineErrorMessage").hide();
        nextModal.modal('show');
    }
});

Ibles.login.LoginFlowFullPageView = Backbone.View.extend({
    el: $('body'),
    events : {
        'click #loginBtnNonModal' : 'submitLogin',
        'click #signupBtnNonModal' : 'submitSignup',
        'click #forgotBtnNonModal' : 'submitForgot',
        'click #resetBtnNonModal' : 'submitReset',
        'keyup .fullPage .submitFormOnEnter' : 'submitForm'
    },

    submitForm : function(e) {
        var button = $(e.currentTarget).parents('.fullPage').find('.submitFormButton');
        Ibles.loginFlow.enterClick(button,e);
    },
    submitLogin : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.loginAction($('#loginBtnNonModal'), ".fullPage", function(){
            var nextUrl = Ibles.getQueryStringParam("next") || Ibles.reverseUrls.memberUrl(Ibles.session.get("screenName"));            
            Ibles.loginFlow.redirectToPage(nextUrl);
        });
    },
    submitSignup : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.signupAction($('#signupBtnNonModal'), ".fullPage", function(){
            Ibles.loginFlow.redirectToPage(Ibles.reverseUrls.memberUrl(Ibles.session.get("screenName")));
        });
    },
    submitForgot : function(e){
        e.preventDefault();
        Ibles.loginFlow.forgotAction($('#forgotBtnNonModal'), ".fullPage", function(){
            Ibles.loginFlow.redirectToPage(Ibles.reverseUrls.resetPasswordUrl());
        });
    },
    submitReset : function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.resetAction($('#resetBtnNonModal'), ".fullPage", function(){
            Ibles.loginFlow.redirectToPage(Ibles.reverseUrls.memberUrl(Ibles.session.get("screenName")));
        });
    }

});

Ibles.login.LoginFlow = function() {

    Ibles.loginFlowModal = new Ibles.login.LoginFlowModalView();
    Ibles.loginFlowFullPage = new Ibles.login.LoginFlowFullPageView();

    var T = Ibles.attemptTranslationOfString;

    $('.login-required').click(function(e) {
        if (!Ibles.session.authenticated()) {
            e.preventDefault();
            e.stopPropagation();
            promptLogin();
            return false;
        }
    });
    
    $('.btn-facebook').click(function(e) {
        e.preventDefault();
        Ibles.session.fbLogin();
    });
    
    var promptLogin = function(){
        $('.loginError').hide();
        $('#loginModal').modal('show');
    };
    
    var promptSignup = function(){
        $('.signupError').hide();
        $('#signUpModal').modal('show');
    };

    var redirectToPage = function(page){
        if (window.location !== page){
            window.location = page;
        }
    };
    
    var enterClick = function(button,e) {
        if (e.keyCode == 13) {
            button.click();
        }
    };

    var resetAction = function(buttonTrigger,containerString,successCallback){
        buttonTrigger.button('loading');
        var errorMessageContainer = $(containerString+' .resetError');
        var newPassword= $(containerString + ' input[name="newPassword"]').val();
        Ibles.session.resetPassword({//url: "/json-api/resetPassword/",
            email: $(containerString + ' input[name="resetEmail"]').val(),
            resetCode: $(containerString + ' input[name="resetCode"]').val(),
            password:newPassword,
            passRT:newPassword
        },{
            success: function(data){
                errorMessageContainer.hide();
                addLogin(data["screenName"],newPassword,buttonTrigger,successCallback);
            },
            error: function(data){
                var validationErrors = data['validationErrors']; //possible errors: email, resetCode, password
                if (validationErrors['email']){
                    errorMessageContainer.html(T(validationErrors['email']));
                } else if (validationErrors['resetCode']){
                    errorMessageContainer.html(T(validationErrors['resetCode']));
                } else if (validationErrors['password']){
                    errorMessageContainer.html(T(validationErrors['password']));
                } else {
                    errorMessageContainer.html(T(validationErrors));
                }
                errorMessageContainer.show();
            },
            complete: function() {
                buttonTrigger.button('reset');
            }

        });
    };

    var forgotAction = function(buttonTrigger, containerString, successCallback){
        buttonTrigger.button('loading');
        var errorMessageContainer = $(containerString+' .forgotError');
        Ibles.session.forgotPassword({//url: "/json-api/forgotPassword/",
            email: $(containerString + ' input[name="forgotEmail"]').val()
        }, {
            success: function(){
                errorMessageContainer.hide();
                if (successCallback) successCallback();
            },
            error: function(data){
                var validationErrors = data['validationErrors'];
                if (validationErrors['email']){
                    errorMessageContainer.html(T(validationErrors['email']));
                } else {
                    errorMessageContainer.html(T(validationErrors));
                }
                errorMessageContainer.show();
            },
            complete: function() {
                buttonTrigger.button('reset');
            }
        });
    };

    var loginAction = function(buttonTrigger, containerString, successCallback){
        buttonTrigger.button('loading');
        var errorMessageContainer = $(containerString+' .loginErrorMessage');
        Ibles.session.login({//url: "/json-api/login/",
            p: $(containerString + ' input[name="p"]').val(),
            u: $(containerString + ' input[name="u"]').val(),
            RememberME: 'true'
        }, {
            success: function(){
                errorMessageContainer.hide();
                if (successCallback) successCallback();
            },
            error: function(data){
                errorMessageContainer.html(T(data['error']));
                errorMessageContainer.show();
            },
            complete: function() {
                buttonTrigger.button('reset');
            }
        });
    };

    var signupAction = function(buttonTrigger, containerString, successCallback){
        buttonTrigger.button('loading');
        var errorMessageContainer = $(containerString+' .signupError');
        var password = $(containerString + ' input[name="password"]').val();
        Ibles.session.register({//url: "/json-api/register/",
            email: $(containerString +' input[name="email"]').val(),
            screenName: $(containerString +' input[name="screenName"]').val(),
            password: password,
            passRT: password,
            sendNewsletter: $(containerString +' input[name="sendNewsletter"]').is(':checked'),
            RememberME: 'true'
        }, {
            success: function(data) {
                errorMessageContainer.hide();
                addLogin(data["screenName"],password,buttonTrigger,successCallback);
            },
            error: function(data) {
                //so many possible error messages with signup, and they are all buried in a JSON array
                var validationErrors = data['validationErrors'];
                if (validationErrors['password'] || validationErrors['screenName']=="Enter a username."){
                    errorMessageContainer.html(Ibles.locale.errors.incompleteFormError);
                } else if (validationErrors['email']){
                    errorMessageContainer.html(T(validationErrors['email']));
                } else if (validationErrors['screenName']){
                    errorMessageContainer.html(T(validationErrors['screenName']));
                } else {
                    errorMessageContainer.html(T(validationErrors));
                }
                errorMessageContainer.show();
            },
            complete: function() {
                buttonTrigger.button('reset');
            }
        });
    };

    var addLogin = function(userName,password,buttonTrigger,successCallback){
        buttonTrigger.button('loading');
        Ibles.session.login({//url: "/json-api/login/",
            p: password,
            u: userName,
            RememberME: 'true'
        }, {
            success: function(){
                if (successCallback) successCallback();
            },
            error: function(){
                redirectToPage(Ibles.reverseUrls.loginUrl());
            },
            complete: function() {
                buttonTrigger.button('reset');
            }
        });
    };

    var checkLoginThen = function(callback){
        if (Ibles.session.get('logged_in')){
            if (callback){
                callback();
            }
        } else {
            promptLogin();
        }
    };

    return {
        promptLogin: promptLogin,
        promptSignup: promptSignup,
        checkLoginThen: checkLoginThen,
        enterClick: enterClick,
        loginAction: loginAction,
        signupAction: signupAction,
        resetAction: resetAction,
        forgotAction: forgotAction,
        redirectToPage: redirectToPage
    }
};


