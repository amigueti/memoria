Ibles.package("Ibles.views","Ibles.models","Ibles.collections");

Ibles.models.CommentModel = Backbone.Model.extend({
    parentModel: null,
    defaults : {
        inReplyTo : null,
        highlight : "",
        replyClass : "",
        ibleAuthor: "",
        tinyUrl: "",
        ibleId: "",
        published: true,
        screenName: "",
        commentTime: "",
        files: null
    },

    initialize: function(attributes, options) {
        var self = this;
        if (options && options.parentModel) {
            this.setParentModel(options.parentModel);
        }
    },
    
    setParentModel: function(parentModel) {
        var self = this;
        this.parentModel = parentModel;
        this.listenTo(this.parentModel, 'deleted', function(model, isThread){
            if (isThread) {
                self.trigger("deleted", self, isThread);
            }
        });        
    },
    
    postCommentAction : function(commentBodyUnescaped, completeCallback) {
        var self = this;        
        var params = {
            author: Ibles.session.get('screenName'),
            instructableId: this.get('ibleId')
        };
        
        this.set({'commentBody' : commentBodyUnescaped.replace(/\n/g,"<br>")});
        params["body"] = this.get('commentBody');
        
        if (this.get('inReplyTo')){
            params['inReplyTo'] = this.get('inReplyTo');
            this.set({'replyClass' : "comment-reply"});
        } else {
            this.set({'replyClass' : "topLevel"});
        }

        var attachedFiles = this.get('files');        
        if (attachedFiles && attachedFiles.length>0){
            var filesIdArray = [];
            attachedFiles.each(function(file){
                filesIdArray.push({"id":file.get('id')});
            });
            params['images'] = filesIdArray;
        }

        Ibles.API.jsonPostRequest("addComment", params, {
            success: function(data) {
                self.set({'screenName':Ibles.session.get('screenName'),'id':data['id'],'tinyUrl':Ibles.session.get('tinyUrl')});
                if (self.get('ibleAuthor') == self.get('screenName')){
                    self.set({'highlight' : "highlight"});
                }
                if (completeCallback) {completeCallback();}//needed to put this here in case el changes before callback is executed

                self.set({'commentTime' : moment().format("MMM D, YYYY. h:mm A")});
                self.set({'published':true});

            },
            error: function (data) {
                var errorMessage;
                if (completeCallback) completeCallback();
                if (data && data['validationErrors']){
                    errorMessage = Ibles.locale.errors.incompleteFormError;
                } else {
                    errorMessage = Ibles.toLocaleError(data, Ibles.locale.errors.somethingWentWrong);
                }
                var alert = new Ibles.models.AlertModel({
                    alertType: "error",
                    alertMessage: errorMessage
                });
                new Ibles.views.AlertView({
                    model: alert
                });
            }
        });
    },
    
    deleteCommentAction: function(isThread) {
        var method = isThread ? 'deleteThread' : 'deleteComment',
            self = this;
            
        return Ibles.API.postRequest(method, {id: this.get('id')}, {
            success: function(data) {
                self.trigger("deleted", self, isThread);
            }
        });        
    },
    
    flagCommentAction: function(flagName) {
        var self = this;
        var params = {
            id: this.get('id'),
            flag: flagName
        };
        return Ibles.API.postRequest('setFlag', params, {
            success: function(data) {
                self.trigger("flagged", self, flagName);
            }
        });        
    }
});


Ibles.collections.CommentCollection = Backbone.Collection.extend({
    model: Ibles.models.CommentModel
});


Ibles.views.CommentView = Backbone.View.extend({
    manager: null,
    model: null,
    topLevelCommentField:false,//flag to tell us if this is the main comment box on page
    parentReplyBtn: null,//this is the original reply button that was clicked to create the commentView - we will want to unhide this after the comment is posted
    events: {
        "click .post-comment-btn": "attemptComment",
        "click .addCommentImages": "attemptUpload",
        "click .removeAttachedImg": "removeImgFromTray",
        "click .replyToCommentBtn": "showReplyField",
        "click .deleteComment": "deleteComment",
        "click .deleteThread": "deleteThread",
        "click .flagComment .dropdown-menu a": "flagComment"
    },

    initialize: function(options) {
        _.extend(this, options);
        if (!this.model || !this.manager)
            throw new Error('model and manager required to initialize comment view');            
        this.listenTo(this.model, 'change:published', this.publishComment);
        this.listenTo(this.model, 'deleted', this.remove);
        if (!this.model.get("published") && !this.topLevelCommentField) 
            this.addRedactorAirMode();
    },

    addRedactorAirMode : function(){
        var self = this;
        head.load('/static/drag_editor/dependencies/redactor916/redactor/redactor.min.js',
            function(){
                head.load('/static/drag_editor/dependencies/redactor916/redactor/redactor.css');
                self.$(".redactorAirComment").redactor({
                    air:true,
                    airButtons: ['bold', 'italic', 'underline', '|', 'link', 'video']
                });
                var toolTip = self.$(".comment-tip");
                toolTip.tooltip();
                self.$(".redactor_redactorAirComment").on("click",function(){
                    toolTip.tooltip('show');
                    setTimeout(function() {
                        self.hideToolTip();
                    }, 5000);
                });
            });
    },

    hideToolTip : function() {
        this.$(".comment-tip").tooltip('hide');
        this.$(".redactor_redactorAirComment").off("click");
    },

    showUploader: function(){
        var self = this;
        head.load(
            Ibles.pageContext.remoteRoot+"static/drag_editor/css/editor_dragdrop.css",
            Ibles.pageContext.remoteRoot+"/static/drag_editor/dependencies/uploader_depends/jquery-ui-1.10.3.custom/css/ui-lightness/jquery-ui-1.10.3.custom.min.css"
        );
        head.load(
            // Use minimally-featured version of JQueryUI to preserve bootstrap tooltip on comments
            Ibles.pageContext.remoteRoot+"/static/drag_editor/dependencies/uploader_depends/jquery-ui-1.10.3.custom/js/jquery-ui-1.10.3.custom.min.js",
            Ibles.pageContext.remoteRoot+"static/drag_editor/js/editor_locale_"+Ibles.pageContext.currentLocale+".js",
            Ibles.pageContext.remoteRoot+window.UPLOAD_SCRIPT.substr(1),
            function() {
                if (!self.model.get('files')){
                    var newFileSet = new window.ibles.FileSet();
                    newFileSet.bind("add remove",function(){
                        self.renderCommentFiles();
                    });
                    self.model.set({'files':newFileSet});
                }
                new window.ibles.uploadModalView({
                    collection:self.model.get('files')
                });
            }
        );
    },

    showReplyField: function (e) {
        //add reply field, create new comment view, and set reply field as el
        e.preventDefault();
        var replyBtn = $(e.currentTarget),
            replyTemplate = Ibles.templateCache('#template-post-comment'),
            replyToComment = this.$el;
        
        replyToComment.after(replyTemplate({'tinyUrl':Ibles.session.get('tinyUrl'), 'author':Ibles.session.get("screenName")}));
        replyBtn.hide();
        
        var replyToCommentModel = new Ibles.models.CommentModel({
            inReplyTo: this.model.get("id"),
            published: false,
            ibleAuthor: this.model.get("ibleAuthor"),
            ibleId: this.model.get("ibleId")
        }, {parentModel: this.model});
        
        new Ibles.views.CommentView({
            'el': replyToComment.next().get(0),
            'model': replyToCommentModel,
            'manager': this.manager,            
            'parentReplyBtn': replyBtn
        });
        
        this.manager.addCommentModel(replyToCommentModel);
    },
    
    renderCommentFiles: function() {
        var imageTray = this.$('.comment-imageTray');
        var imageTemplate = Ibles.templateCache('#template-attached-file');
        imageTray.html("");
        var attachedFiles = this.model.get('files');
        if (attachedFiles){
            attachedFiles.each(function(file){
                imageTray.append(imageTemplate(file.toJSON()));
            });
            imageTray.fadeIn();
        } else {
            imageTray.fadeOut();
        }
    },

    removeImgFromTray: function(e){
        e.preventDefault();
        var imgId = $(e.currentTarget).data('id');
        var attachedFiles = this.model.get('files');
        if (attachedFiles){
            var modelToDelete = attachedFiles.findWhere({'id':imgId});
            if (modelToDelete){
                attachedFiles.remove(modelToDelete);
                modelToDelete.destroy();
            } else {
                var alert = new Ibles.models.AlertModel({
                    alertType: "error",
                    alertMessage: Ibles.locale.errors.somethingWentWrong
                });
                new Ibles.views.AlertView({
                    model: alert
                });
            }
        }
    },

    attemptUpload: function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.checkLoginThen(function(){
            self.showUploader();
        })
    },

    attemptComment: function(e){
        e.preventDefault();
        var self = this;
        Ibles.loginFlow.checkLoginThen(function(){
            self.$('.post-comment-btn').button('loading');
            //post comment, pass in comment body and a complete callback
            self.model.postCommentAction(self.$('.postCommentBody').val(), function(){self.$('.post-comment-btn').button('reset')});
        });
    },

    renderPostedComment: function() {
        var commentTemplate = Ibles.templateCache('#template-comment-item');
        var postedCommentDiv = $(commentTemplate(this.model.toJSON()));
        this.$el.after(postedCommentDiv);
        this.$('.postCommentBody').val("");//clear out reply text field
        this.$('.redactor_postCommentBody').html("");//clear out reply text field
        this.$('.comment-imageTray').html("");//clear image tray
        this.hideToolTip();
        if (!this.topLevelCommentField) this.$el.remove();//remove reply field
        this.setElement(postedCommentDiv);//set new el to posted comment div
        this.renderCommentFiles();//add attached images
        this.$(".removeAttachedImg").hide();//don't show the remove links
    },

    publishComment: function() {
        if (this.model.get('published')){
            this.renderPostedComment();
            if (this.parentReplyBtn){
               this.parentReplyBtn.show();
            }
        }
    },
    
    deleteComment: function() {
        this.model.deleteCommentAction(false)
            .error(Ibles.views.AlertView.callbackFactory("error"));
    },
    
    deleteThread: function() {
        this.model.deleteCommentAction(true)
            .error(Ibles.views.AlertView.callbackFactory("error"));
    },
    
    flagComment: function(e) {
        this.model.flagCommentAction($(e.currentTarget).data('flagname'))
            .success(Ibles.views.AlertView.callbackFactory("success"))        
            .error(Ibles.views.AlertView.callbackFactory("error"));
    },
        
    remove: function() {
        this.$el.slideUp(_.bind(Backbone.View.prototype.remove, this));        
    }
});


Ibles.views.CommentsManager = Backbone.View.extend({
    el: "#commentsWrapper",
    session: null,
    ibleOptions: {},
    
    initialize: function (ibleOptions) {
        this.commentCollection = new Ibles.collections.CommentCollection();         
        this.ibleOptions = ibleOptions;
        this.session = Ibles.session;
        this.createMainCommentFieldView().addRedactorAirMode();
        this.createPublishedCommentViews();       
        this.listenTo(this.session, "change", this.render);    
        this.render();
    },
    
    addCommentModel: function(model) {
        this.commentCollection.add(model);
    },

    getCommentModel: function(commentId) {
        return this.commentCollection.get(commentId);
    },    

    createMainCommentFieldView: function(){
        // create a comment model and view for the main comment box to handle new comments
        var newCommentModel = new Ibles.models.CommentModel(_.extend({'published':false},this.ibleOptions));
        var newCommentView = new Ibles.views.CommentView({
            manager: this, 
            model: newCommentModel,
            el: $('#topLevelCommentField').get(0),
            topLevelCommentField: true
        });
        
        // add comment to internal collection
        this.addCommentModel(newCommentModel);
        
        //each time we comment from the top field, we need to make a new backbone view
        this.listenTo(newCommentModel, 'change:published', this.createMainCommentFieldView);
        return newCommentView;
    },

    createPublishedCommentViews: function() {
        var self = this;
        _.each(this.$el.find('.comment'), function(comment) {
            var $comment = $(comment),
                commentId = $comment.data('commentid'),
                replyToId = $comment.data('replytoid') || null,
                publishedCommentModel = new Ibles.models.CommentModel(_.extend({
                    'id': commentId,
                    'published': true, 
                    'inReplyTo': replyToId
                }, self.ibleOptions), {parentModel: self.getCommentModel(replyToId)});
            
            new Ibles.views.CommentView({
                el: comment,                
                manager: self,
                model: publishedCommentModel
            });

            self.addCommentModel(publishedCommentModel);
        });
    },
    
    render: function () {
        if (this.session.authenticated()) {
            var userCommentsSelector = ".commentBy-"+this.session.get('screenName');
            if (this.session.isAdmin()){
                $('.quarantine, .deleteThread, .deleteComment').show();
            }
            $(".limbo").hide();
            $(userCommentsSelector).show();
            $(userCommentsSelector + " .deleteComment, .flagComment").show();
        } else {
            $(".limbo").show();
            $('.quarantine, .deleteThread, .deleteComment, .flagComment').hide();
        }
        $(".postCommentAvatar").attr('src', this.session.get('tinyUrl'));
    }
});
