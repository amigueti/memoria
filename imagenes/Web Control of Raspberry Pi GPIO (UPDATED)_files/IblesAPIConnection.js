Ibles.API = {
    baseURL: "/json-api/",
    
    postRequest: function(method, opts, callbacks) {
        var self = this;

        var promise = $.ajax({
            url: this.baseURL + method,
            dataType: 'json',
            type: 'POST',
            data: opts || {}
        })
        .done(function(data) {
            if (callbacks && 'success' in callbacks ) callbacks.success(data);
        })
        .fail(function(jqXHR) {
            if (callbacks && 'error' in callbacks) callbacks.error(jqXHR.responseJSON);
        })
        .always(function(jqXHR){
            if (callbacks && 'complete' in callbacks) callbacks.complete(jqXHR.responseJSON);
        });
        return promise;
    },

    jsonPostRequest: function(method, opts, callbacks) {
        var promise = $.ajax({
            url: this.baseURL + method,
            dataType: 'json',
            type: 'POST',
            data: 'json=' + encodeURIComponent(JSON.stringify(opts || {}))
        })
        .done(function(data) {
            if (callbacks && 'success' in callbacks ) callbacks.success(data);
        })
        .fail(function(jqXHR) {
            if (callbacks && 'error' in callbacks) callbacks.error(jqXHR.responseJSON);
        })
        .always(function(jqXHR){
            if (callbacks && 'complete' in callbacks) callbacks.complete(jqXHR.responseJSON);
        });
        return promise;
    },

    ajaxRequest: function(method, opts, callbacks) {
        var promise = $.ajax({
            url: '/ajax/' + method + '/',
            type: 'POST',
            data: opts || {}
        })
        .done(function(data) {
            if (callbacks && 'success' in callbacks ) callbacks.success(data);
        })
        .fail(function(jqXHR) {
            if (callbacks && 'error' in callbacks) callbacks.error(jqXHR.responseJSON);
        })
        .always(function(jqXHR){
            if (callbacks && 'complete' in callbacks) callbacks.complete(jqXHR.responseJSON);
        });
        return promise;
    },
    contestAjaxRequest: function(method, opts, callbacksDict) {
        var promise =$.ajax({
            url: '/contest/' + method + '/',
            type: 'POST',
            data: opts || {}
        })
        .done(function(data) {
            if (callbacksDict && 'success' in callbacksDict ) callbacksDict.success(data);
        })
        .fail(function(jqXHR) {
            if (callbacksDict && 'error' in callbacksDict) callbacksDict.error(jqXHR.responseJSON);
        })
        .always(function(jqXHR){
            if (callbacksDict && 'complete' in callbacksDict) callbacksDict.complete(jqXHR.responseJSON);
        });
        return promise;
    },
    youAjaxRequest:function(method, opts, callbacksDict) {
        var promise =$.ajax({
            url: '/you/' + method + '/',
            type: 'POST',
            data: opts || {}
        })
        .done(function(data) {
            if (callbacksDict && 'success' in callbacksDict ) callbacksDict.success(data);
        })
        .fail(function(jqXHR) {
            if (callbacksDict && 'error' in callbacksDict) callbacksDict.error(jqXHR.responseJSON);
        })
        .always(function(jqXHR){
            if (callbacksDict && 'complete' in callbacksDict) callbacksDict.complete(jqXHR.responseJSON);
        });
        return promise;
    },

    getRequest: function(method, opts, callbacks) {
        var opts = opts || {},
            url = this.baseURL + method + '?' + $.param(opts);

        var promise = $.ajax({
            url: url,
            dataType: 'json',
            type: 'GET'
        })
        .done(function(data) {
            if (callbacks && 'success' in callbacks ) callbacks.success(data);
        })
        .fail(function(jqXHR) {
            if (callbacks && 'error' in callbacks) callbacks.error(jqXHR.responseJSON);
        })
        .always(function(jqXHR){
            if (callbacks && 'complete' in callbacks) callbacks.complete(jqXHR.responseJSON);
        });
        return promise;
    }
}