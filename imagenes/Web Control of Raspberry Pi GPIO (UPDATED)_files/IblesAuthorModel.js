Ibles.package("Ibles.models");

Ibles.models.AuthorModel = Backbone.Model.extend({
    defaults: {
        screenName:null,
        following:false
    },

    followAction : function () {
        var method = this.get('following') ? 'unfollowAuthor' : 'followAuthor',
            screenName = this.get('screenName'),
            self = this;
        
        return Ibles.API.postRequest(method, {'screenName':screenName}, {
            success: function(response) {
                if (response['message'].indexOf("You are now following") != -1){
                    self.set({'following':true});
                } else if (response['message'].indexOf("You are no longer following") != -1){
                    self.set({'following':false});
                }
            }
        });
    },
    
    isFollowing: function(){
        var self = this;
        return Ibles.API.getRequest("isFollowing", {'screenName': this.get('screenName')}, {
            success: function(data) {
                self.set({'following': data['isFollowing']});
            }
        });   
    }
});