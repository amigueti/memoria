window.Ibles = window.Ibles || {};

window.Ibles = _.extend(window.Ibles, {
    namespaces: {},

    package: function() {
        var namespaces = arguments;
        for (var i = 0; i < namespaces.length; i++) {
            var ns = namespaces[i].trim();
            if (!this.namespaces[ns]) {
                this.exportPath(ns);   
                this.namespaces[ns] = true;                             
            }
        }
    },
    
    exportPath : function(namespace) {
        var nsparts = namespace.split(".");
        var parent = window.Ibles;
        if (nsparts[0] === "Ibles") {
            nsparts = nsparts.slice(1);
        }
        for (var i = 0; i < nsparts.length; i++) {
            var partname = nsparts[i];
            if (typeof parent[partname] === "undefined") {
                parent[partname] = {};
            }
            parent = parent[partname];
        }    
    },
    
    attemptTranslationOfString: function(translateString){
        if (Ibles.locale.iblesAPIResponses[translateString] != undefined) {
            return Ibles.locale.iblesAPIResponses[translateString];
        }
        return translateString;
    },
    
    recordStackTrace: function(errMsg,trace,url,lineNumber,other){
        // Record errors that occur everywhere except when running locally. It's good to see these from edison.
        var currentUrl = window.location.href;
        if ((currentUrl.indexOf("localhost") == -1) &&
            (currentUrl.indexOf(".instructables.") >= 0)) {
            $('#entry_471673786').val(errMsg);
            $('#entry_1373678458').val(url);
            $('#entry_1348670500').val(lineNumber);
            $('#entry_281012952').val(trace);
            $('#entry_138043702').val(window.location.href);
            $('#entry_352037291').val(other);
            $('#entry_1951759084').val(this.detectBrowser());
            $('#entry_32892476').val(this.detectOS());
            $('#entry_629374639').val(document.referrer);
            $('#jsErrorReportingForm').submit();
        }
    },

    appendReverseUrls: function(dictionary){
        var screenName = Ibles.session.get('screenName');
        dictionary['youLink'] = Ibles.reverseUrls.memberUrl(screenName);
        dictionary['favesLink'] = Ibles.reverseUrls.memberFavUrl(screenName);
        dictionary['myIblesLink'] = Ibles.reverseUrls.memberIblesUrl(screenName);
        return dictionary;
    },
    
    toLocaleError: function(json, defaultMessage){
        var errorMessage;
        if (json && json['error']){
            errorMessage = Ibles.attemptTranslationOfString(json['error']);
        } else {
            errorMessage = defaultMessage;
        }
        return errorMessage;
    },    

    toLocaleSuccess: function(json, defaultMessage){
        var successMessage;
        if (json && json['message']){
            successMessage = Ibles.attemptTranslationOfString(json['message']);
        } else {
            successMessage = defaultMessage;
        }
        return successMessage;
    },
    
    recordAndThrow: function(message,stack,otherInfo){
        var prefixed = "IBLES-INTERNATIONAL ERROR:" + message;
        this.recordStackTrace(prefixed,stack.join('\n'),otherInfo,"","Thrown");
        _.delay(function(){
            throw new Error(prefixed);
        },4000);
    },

    detectOS: function(){
        var OSName="Unknown OS";
        if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
        if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
        if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
        if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";
        return OSName;
    },

    detectBrowser: function(){
        return head.browser.name + " " + head.browser.version;        
    },
    
    getQueryStringParam: function(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(window.location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    },
    
    templateCache: function(selector) {
        if (!window.Ibles.JST) {
            window.Ibles.JST = {};
        }
        var template = window.Ibles.JST[selector];
        if (!template) {
            template = $(selector).html();
            template = _.template(template);
            window.Ibles.JST[selector] = template;
        }
        return template;
    }  
});