Ibles.package("Ibles.models");

Ibles.models.InstructableModel = Backbone.Model.extend({
    defaults : {
        ibleId : "",
        favorited : false
    },

    favoriteAction : function () {
        var self = this;
        return Ibles.API.ajaxRequest("favorite", {'entryId': this.get('ibleId')}, {
            success: function() {
                self.set({'favorited': !self.get('favorited')});
            }
        });
    },
    
    isFavorite: function() {
        var self = this;
        return Ibles.API.getRequest("isFavorite", {'id': this.get('ibleId')}, {
            success: function(data) {
                self.set({'favorited': data['isFavorite']});
            }
        });        
    },
    
    toJSON: function() {
        var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
        json.url = Ibles.reverseUrls.ibleUrl(json.id);
        return json;
    }
});