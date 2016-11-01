/*
Client that renders the processed HTML served by the host.
Thomas Mullen 2016
*/

(function () {
    var initialized = false;
    var dataLoaded = false;

    document.addEventListener("DOMContentLoaded", initialize);
    window.addEventListener('hypermessage', handleHyperMessage);

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    var ajax = function (url, successCallback, errorCallback) {
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

    var conn;


    //Define the HyperRequest object (akin to XMLHttpRequest)
    var HyperRequestSrc = 'var HyperRequest=function(){var e={};return e.onload=function(){},e.open=function(t,n){e.method=t,e.route=n},e.send=function(t){function n(t){"response"===t.detail.type&&t.detail.id===r&&(window.removeEventListener(i,n),e.onload(t.detail.response))}var o=window.parent,r=Math.random().toString().substr(0,30),d=new CustomEvent("hypermessage",{detail:{type:"request",request:{method:e.method,route:e.route,body:t},id:r}});o.dispatchEvent(d);var i=window.addEventListener("hypermessage",n)},e};';
    /*
    var HyperRequest = function () {
        var self = {};
        self.onload = function () {}
        self.open = function (method, route) {
            self.method = method;
            self.route = route;
        }
        self.send = function (body) {
            var parent = window.parent;
            var id = Math.random().toString().substr(0, 30);
            var event = new CustomEvent("hypermessage", {
                detail: {
                    type: "request",
                    request: {
                        method: self.method,
                        route: self.route,
                        body: body
                    },
                    id: id
                }
            });
            parent.dispatchEvent(event)

            function handleResponse(e) {
                if (e.detail.type === "response" && e.detail.id === id) {
                    window.removeEventListener(listener, handleResponse);
                    self.onload(e.detail.response);
                }
            }
            var listener = window.addEventListener('hypermessage', handleResponse);
        }
        return self;
    }
    */

    function initialize(event) {
        if (initialized) return;
        initialized = true;
        //Request resources
        var MY_ID = parseInt(Math.random() * 1e15, 10).toString(16);
        var PEER_SERVER = {
            host: "peerjs-server-tmullen.mybluemix.net",
            port: 443,
            path: "/server",
            secure: true
        };
        var peer = new Peer(MY_ID, PEER_SERVER); //Create the peer object

        //Heartbeat to prevent disconnection from signalling server
        var heartbeater = makePeerHeartbeater(peer);

        function makePeerHeartbeater(peer) {
            var timeoutId = 0;

            function heartbeat() {
                timeoutId = setTimeout(heartbeat, 20000);
                if (peer.socket._wsOpen()) {
                    peer.socket.send({
                        type: 'HEARTBEAT'
                    });
                }
            }
            heartbeat();
            return {
                start: function () {
                    if (timeoutId === 0) {
                        heartbeat();
                    }
                },
                stop: function () {
                    clearTimeout(timeoutId);
                    timeoutId = 0;
                }
            };
        }


        var OTHER_ID = getParameterByName("site", document.location); //Get the server's id from url
        if (!OTHER_ID) { //If no siteId, just go to main HyperHost
            window.location = window.location.href.replace("client.html", "index.html");
        }

        peer.on('error', function (err) {
            console.error(err);
            if (!dataLoaded) {
                document.getElementById("HYPERHOST-HEADER").innerHTML = "Host could not be reached.";
                document.querySelector("#HYPERHOST-dropzone > div > a").style.display = "inherit";
            }
        });

        conn = peer.connect(OTHER_ID, {
            reliable: true
        });
        conn.on("data", function (data) {
            if (data.type === "view") {
                console.log("Data received, rendering page...");
                var newView = data.content.view;
                var path = data.path;
                dataLoaded = true;
                document.getElementById("HYPERHOST-viewframe").style.display = "inherit";
                document.getElementById("HYPERHOST-dropzone").style.display = "none";


                if (!!newView) {
                    document.getElementById("HYPERHOST-viewframe").srcdoc = newView.body.replace('<html>', '<html><script>' + HyperRequestSrc + '</script>');

                    history.pushState(path, path);
                    console.log("Navigated to " + path);
                    return;
                } else {
                    alert("HyperHost path '" + path + "' does not exist!");
                    if (path === "index.html") {
                        window.location.hash = "";
                        document.getElementById("HYPERHOST-header").innerHTML = "HyperHost";
                        document.querySelector("#HYPERHOST-dropzone > div > h2").innerHTML = "Drop Website Root Folder Here to Instantly Host";
                        document.getElementById("HYPERHOST-viewframe").style.display = "none";
                        document.getElementById("HYPERHOST-dropzone").style.display = "inherit";
                    }
                }
            } else if (data.type === "response") {
                sendHyperMessage({
                    type: "response",
                    response: data.content,
                    id: data.id
                });
            }
        });
        conn.on("open", function () {
            //Check for 'incognito mode' with ?i=true 
            /*
            if (!getParameterByName("i", document.location)) {
                ajax("https://api.ipify.org?format=json", function (res) {
                        conn.send({
                            'type': 'ip',
                            'ip': JSON.parse(res).ip
                        })
                    }),
                    function () {}
            }
            */
            HYPERHOST_NAVIGATE('index.html');
        });
        conn.on("close", function () {
            console.log("Connection to host closed.");
            if (!dataLoaded) {
                document.getElementById("HYPERHOST-HEADER").innerHTML = "Connection closed by host.";
                document.querySelector("#HYPERHOST-dropzone > div > a").style.display = "inherit";
            }
        });

    };

    //Send message to viewFrame document (across iframe)
    function sendHyperMessage(data, type) {
        var childWindow = document.getElementById("HYPERHOST-viewframe").contentWindow;
        var event = new CustomEvent('hypermessage', {
            detail: data
        });
        childWindow.dispatchEvent(event);
    }

    //Listen to messages from viewFrame document (across iframe)
    function handleHyperMessage(e) {
        if (e.detail.type == "navigate") {
            HYPERHOST_NAVIGATE(e.detail.path);
        } else if (e.detail.type == "request") {
            makeHyperRequest(e.detail.id, e.detail.request);
        }
    }

    //Make a request to the virtual backend
    function makeHyperRequest(id, request) {
        conn.send({
            id: id,
            type: "request",
            request: JSON.stringify(request)
        });
    }

    //Renders a different compiled HTML page in the viewframe
    function HYPERHOST_NAVIGATE(path, goingBack) {
        console.log("Requested " + path);
        conn.send({
            type: "view",
            path: path
        });
    }

    window.addEventListener('popstate', function (event) {
        HYPERHOST_NAVIGATE(event.state, true);
    });

}());