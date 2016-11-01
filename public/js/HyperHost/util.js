/*

A bunch of useful utilities.

Thomas Mullen 2016

*/


var Util = (function () { 
    var module = {};
    
    // dash-case to camelCase
    module.camelize = function(str) {
        return str.replace(/-([a-z])/g, function (g) {
            return g[1].toUpperCase();
        });
    }


    //Basic ajax GET call with IE 8 support
    module.ajax = function (url, successCallback, errorCallback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    if (successCallback && successCallback.constructor == Function) {
                        return successCallback(xhr.responseText);
                    }
                } else {
                    if (errorCallback && errorCallback.constructor == Function) {
                        return errorCallback(xhr.statusText);
                    } else {
                        console.error("Failed to get resource '" + url + "' Error: " + xhr.statusText);
                    }
                }
            }
        };
        xhr.onerror = function (e) {
            if (errorCallback && errorCallback.constructor == Function) {
                return errorCallback(xhr.statusText);
            } else {
                console.error("Failed to get resource. Error: " + xhr.statusText);
            }
        };
        xhr.send(null);
    };

    //Ajax-es an array of urls, only returning when all have been loaded
    module.ajaxMulti = function (arr, successCallback, errorCallback) {
        var result = [];
        var remaining = arr.length;
        for (var i = 0; i < arr.length; i++) {
            ajax(arr[i],
                function (data) {
                    result[i] = data;
                    remaining--;
                    if (remaining === 0) {
                        successCallback(result);
                    }
                }, errorCallback);
        }
    }

    // Injects an array of urls as scripts
    module.injectScripts = function(scripts, mappingObject, callback) {
        var remaining = scripts.length;

        function loadScript(i) {
            var script = document.createElement("script");
            script.type = "text/javascript";

            if (script.readyState) { //IE
                script.onreadystatechange = function () {
                    if (script.readyState === "loaded" || script.readyState === "complete") {
                        script.onreadystatechange = null;
                        remaining--;
                        if (remaining === 0) {
                            callback();
                        } else {
                            if (i < scripts.length - 1) {
                                loadScript(i + 1);
                            }
                        }
                    }
                };
            } else { //Others
                script.onload = function () {
                    remaining--;
                    if (remaining === 0) {
                        callback();
                    } else {
                        if (i < scripts.length - 1) {
                            loadScript(i + 1);
                        }
                    }
                };
            }

            script.src = mappingObject[scripts[i]];
            document.getElementsByTagName("head")[0].appendChild(script);
        }
        loadScript(0);
    }
    
    // Gets the value of a query parameter in a URL
    module.getParameterByName = function(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) {
            return null;
        } else if (!results[2]) {
            return '';
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }
    
    // Deeply sets a nested object/array tree, creating ancestors where they are missing
    // Ancestors is an array of names that lead from root to the target object
    module.deepSetTree = function(tempObj, value, ancestors) {
        for (var i = 0; i < ancestors.length; i++) {
            var found = false;
            for (var i2 = 0; i2 < tempObj.nodes.length; i2++) { //Locate the ancestors
                if (tempObj.nodes[i2].name === ancestors[i]) {
                    tempObj = tempObj.nodes[i2];
                    found = true;
                    break;
                }
            }
            if (!found) {
                tempObj.nodes.push({ //Create the ancestor if it doesn't exits
                    name: ancestors[i],
                    type: "folder",
                    nodes: []
                });
                for (var i2 = 0; i2 < tempObj.nodes.length; i2++) { //Get the reference of the new object
                    if (tempObj.nodes[i2].name === ancestors[i]) {
                        tempObj = tempObj.nodes[i2];
                        break;
                    }
                }
            }
        }
        value.nodes = [];
        tempObj.nodes.push(value);
    }
    
    //Escapes a regular expression
    module.escapeRegExp = function(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }
    
    
    //Extension to CodeMirror editor mime type
    module.extToMime = function(ext) {
        var map = {
            'js': 'javascript',
            'html': 'htmlmixed',
            'css': 'css',
            'json': 'javascript',
        }

        if (Object.keys(map).indexOf(ext) !== -1) {
            return map[ext];
        } else {
            return ext;
        }
    }
    
    
    return module;
}());