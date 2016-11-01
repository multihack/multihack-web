/*

socket.js

This module handles external connections (both normal websockets and webRTC)


*/
var Sockets = (function (Config) {
    'use strict';

    var my = {

        /* Whether or not the room is owned by this client (UI, not used for auth) */
        isMyRoom: true,


        /* Fires on initial connection */
        joinOnline: function (name, pic, hash) {
            me.name = name;
            me.pic = pic;
            me.hash = hash;
            socket.emit('online/join', me);
        },


        /* Fires when the user requests to join another's room */
        requestRoom: function (roomId) {
            me.requesting = roomId;
            socket.emit('room/request', roomId);
        },


        /* Fires when the user responds to a room join request */
        respondToRoomRequest: function (userId, originalId) {
            socket.emit('room/response', {
                userId: userId,
                originalId: originalId
            });
        },

        /* Fires when the user kicks another from the room */
        kick: function (userId) {
            socket.emit('room/kick', userId);
            kicked[userId] = true;
        },

        /* Fires when user joins a new room (initiates code request) */
        getAllCode: function () {
            socket.emit('code/all/get');
        },

        /* Fires when the filesystem fulfills a full code request */
        provideAllCode: function (userId, fileTree) {
            socket.emit('code/all/serve', {
                userId: userId,
                fileTree: fileTree
            });
        },

        /* Fires when user deletes a file */
        deleteFile: function (fileId) {
            socket.emit('code/delete', fileId);
        },

        /* Fire when user adds a file */
        addFile: function (data) {
            socket.emit('code/add', data);
        },

        /* Fires when user changes a file */
        changeFile: function (fileId, change, full) {
            socket.emit('code/change', {
                fileId: fileId,
                full: full,
                change: change
            });
        },


        /* Fires when user moves their cursor */
        moveCursor: function (coords, fileId) {
            socket.emit('code/cursor', {
                coords: coords,
                fileId: fileId
            });
        },


        /* 
        Facilitates event routing for other modules 
        
        Events fired include:
            
            remotedelete    - Remote user has deleted a file
            remoteadd       - Remote user has added a file
            remotechange    - Remote user has changed a file
            remotemousemove - Remote user moved thier cursor
            
            codeget         - A remote user is requesting the local code
            codeserve       - Contains the remote code (previously requested)
            
            onlinewho       - Contains list of online users
            onlinejoin      - Remote user joined the online lobby
            onlineleave     - Remote user left the online lobby
            
            roomwho         - Contains list of users in room
            roomjoin        - Remote user joined the room
            roomleave       - Remote user left the room
            roomrequest     - Remote user has requested to join the room
            roomresponse    - Remote user has responded to a previous request
            roomkick        - Kicked from room
            
        */
        on: function (event, fn) {
            eventRouting[event] = fn;
        }
    };

    var HOSTNAME = Config.HOSTNAME,
        socket = io(HOSTNAME, {
            'reconnect': true,
            'reconnection delay': 500,
            'max reconnection attempts': 10
        }),
        me = {
            name: null,
            pic: null,
            requesting: null
        },
        requestHistory = {},
        kicked = {},
        roomMembers = [],
        eventRouting = {};


    /* Incoming */
    socket.on('online/handshake', function (myId) {
        me.id = myId;
        WebRTC.init();
    });
    socket.on('room/leave', function (user) {
        for (var i = 0; i < roomMembers.length; i++) {
            if (user.id == roomMembers[i]) {
                roomMembers = roomMembers.splice(i, 1); //Remove from room list
                break;
            }
        }
        WebRTC.otherLeave(user.id);
        eventRouting['roomleave'](user);
    });
    socket.on('room/join', function (user) {
        eventRouting['roomjoin'](user);
    });
    socket.on('online/join', function (user) {
        roomMembers.push(user);
        eventRouting['onlinejoin'](user);
    });
    socket.on('online/leave', function (user) {
        eventRouting['onlineleave'](user);
    });
    socket.on('room/request', function (data) {
        var user = data.user;
        var originalId = data.originalId;
        var last = requestHistory[user.id];
        var now = new Date();
        if (kicked[user.id]) {
            return; //Ignore kicked users
        } else if (last && now.getTime() - last.getTime() < 10000) {
            return; //Ratelimit to 10 seconds
        } else {
            requestHistory[user.id] = now;
            eventRouting['roomrequest'](user, originalId);
        }
    });
    socket.on('online/who', function (onlineList) {
        eventRouting['onlinewho'](onlineList);
    });
    socket.on('room/response', function (data) {
        if (data.originalId === me.requesting) {
            WebRTC.leaveCall();
            me.room = data.user.id;
            my.isMyRoom = false; //The server will already know this, it's for the UI to work.
            socket.emit('room/join', data.user.id);
            roomMembers = data.who;
            eventRouting['roomresponse'](data.user);
            eventRouting['roomwho'](data.who);
        }
    });
    socket.on('room/kick', function (onlineList) {
        eventRouting['roomkick'](onlineList);
    });


    socket.on('code/all/serve', function (fileTree) {
        if (fileTree) {
            eventRouting['codeserve'](fileTree);
        }
    });
    socket.on('code/all/get', function (userId) {
        eventRouting['codeget'](userId);

    });
    socket.on('code/delete', function (fileId) {
        eventRouting['remotedelete'](fileId);
    });
    socket.on('code/add', function (data) {
        eventRouting['remoteadd'](data.parentId, data.name, data.fileId, data.type);
    });
    socket.on('code/change', function (data) {
        eventRouting['remotechange'](data.fileId, data.change, data.full);
    });
    socket.on('code/cursor', function (data) {
        eventRouting['remotemousemove'](data.userId, data.fileId, data.coords);
    });


    var WebRTC = (function () {

        /* PeerJS takes over from here, because Socket.io isn't great for audio streams */

        var PEER_SERVER = Config.PeerJS;
        var peer;
        var joinedCall = false;
        var calls = [];


        var my = {
            init: function () {
                peer = new Peer(me.id.substring(2), PEER_SERVER); //Connect to peerserver
            },
            joinCall: function() {
                if (joinedCall || !me.id) return; //Already in call or not initialized

                if (roomMembers.length > 10) {
                    Modal.open("general-alert", {
                        title: "Uh Oh!",
                        msg: "Your browser can't handle more than 10 peers at once!"
                    })
                }

                navigator.getUserMedia({
                    audio: true,
                    video: false
                }, function (stream) {
                    joinedCall = true;
                    document.querySelector("#mic > img").src = "img/mic.png";
                    var callList = [];
                    for (var i = 0; i < roomMembers.length; i++) {
                        calls.push({
                            id: roomMembers[i],
                            call: peer.call(roomMembers[i].id.substring(2), stream)
                        }); //Call everyone in the room

                        calls[i].call.on('stream', function (stream) { //Listen for answers
                            var player = new Audio();
                            embedStream(player, stream);
                        });
                    }

                    peer.on('call', function (call) {
                        if (!joinedCall) return;
                        call.answer(stream);
                        calls.push({
                            id: call.peer,
                            call: call
                        });

                        call.on('stream', function (stream) { //Listen for answers
                            if (!joinedCall) return;
                            var player = new Audio();
                            embedStream(player, stream);
                        });
                    });
                }, function () {
                    Modal.open("general-alert", {
                        title: "Microphone Error",
                        msg: "Microphone access is required<br>to join the room's call."
                    })
                });
            },
            leaveCall: function () {
                if (!joinedCall) return;
                for (var i = 0; i < calls.length; i++) { //Close all the calls
                    calls[i].call.close();
                }
                calls = [];
                joinedCall = false;
                document.querySelector("#mic > img").src = "img/muted.png";
            },

            toggleCall: function () {
                if (joinedCall) {
                    my.leaveCall();
                } else {
                    my.joinCall();
                }
            },
            otherLeave : function(userId){ 
                for (var i = 0; i < calls.length; i++) {
                    if (userId === calls[i].id) {
                        try{
                            calls[i].call.close(); //Hang up any audio calls
                            calls = calls.splice(i, 1); //Remove from list
                        }catch (err){
                            console.error(err);
                        }
                    }
                }
            }
        }
        
        //TODO: Move this DOM manipulation to UI.js

        document.querySelector("#mic").addEventListener('click', function (e) {
            my.toggleCall();
        });

        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        
        window.URL = window.URL || window.webkitURL;

        if (!navigator.getUserMedia) {
            document.querySelector("#mic").style.display = "none";
        }
        if (!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection)) {
            document.querySelector("#mic").style.display = "none";
            document.querySelector("#deploy").style.display = "none";
        }


        var cameraStream, savedStream;

        function embedStream(domElement, stream) {
            if (window.URL) {
                domElement.src = window.URL.createObjectURL(stream);
            } else {
                domElement.src = stream;
            }
            savedStream = stream; //Save a reference
            domElement.play();
        }

        function stopUserMedia(domElement) {
            if (domElement) {
                domElement.pause();
                domElement.src = '';
                domElement.load();
            }

            if (savedStream && savedStream.stop) {
                savedStream.stop();
            }
            savedStream = null;
        }

        return my;
    }());

    return my;
}(Config.Sockets))