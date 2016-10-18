/* API for all incoming/outgoing events */
var SocketAPI = (function () {
    var my = {};

    var HOSTNAME = "https://tethys.mybluemix.net";
    var socket = io(HOSTNAME, {
        'reconnect': true,
        'reconnection delay': 500,
        'max reconnection attempts': 10
    });

    var me = {
        name: null,
        pic: null,
        requesting: null,
    }

    var requestHistory = {};

    var kicked = {};
    var roomMembers = [];


    my.isMyRoom = true;

    /* Outgoing */
    my.joinOnline = function (name, pic, hash) {
        me.name = name;
        me.pic = pic;
        me.hash = hash;
        socket.emit('online/join', me);
    }
    my.requestRoom = function (roomId) {
        me.requesting = roomId;
        socket.emit('room/request', roomId);
    }
    my.respondToRoomRequest = function (userId, originalId) {
        socket.emit('room/response', {
            userId: userId,
            originalId: originalId
        });
    }
    my.kick = function (userId) {
        socket.emit('room/kick', userId);
        kicked[userId] = true;
    }


    my.getAllCode = function () {
        socket.emit('code/all/get');
    }
    my.deleteFile = function (fileId) {
        socket.emit('code/delete', fileId);
    }
    my.addFile = function (data) {
        socket.emit('code/add', data);
    }
    my.changeFile = function (fileId, change, full) {
        socket.emit('code/change', {
            fileId: fileId,
            full: full,
            change: change
        });
    }

    /* Incoming */
    socket.on('online/handshake', function (myId) {
        me.id = myId;
        peer = new Peer(me.id.substring(2), PEER_SERVER); //Connect to peerserver
    });
    socket.on('room/leave', function (user) {
        for (var i = 0; i < roomMembers.length; i++) {
            if (user.id == roomMembers[i]) {
                roomMembers = roomMembers.splice(i, 1); //Remove from room list
                break;
            }
        }
        for (var i=0; i< calls.length; i++){
            if (user.id === calls[i].id){
                calls[i].call.close(); //Hang up any audio calls
                calls = calls.splice(i,1);//Remove from list
            }
        }
        my.onOtherLeftRoom(user);
    });
    socket.on('room/join', function (user) {
        my.onOtherJoinRoom(user);
    });
    socket.on('online/join', function (user) {
        roomMembers.push(user);
        my.onOtherJoinOnline(user);
    });
    socket.on('online/leave', function (user) {
        my.onOtherLeftOnline(user);
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
            my.onRequestRoom(user, originalId);
        }
    });
    socket.on('online/who', function (onlineList) {
        my.onWho(onlineList);
    });
    socket.on('room/response', function (data) {
        if (data.originalId === me.requesting) {
            leaveCall();
            me.room = data.user.id;
            my.isMyRoom = false; //The server will already know this, it's for the UI to work.
            socket.emit('room/join', data.user.id);
            roomMembers = data.who;
            my.onRoomRespond(data.user, data.who);
        }
    });
    socket.on('room/kick', function (onlineList) {
        my.onKick(onlineList);
    });


    socket.on('code/all/serve', function (fileTree) {
        if (fileTree) {
            my.onAllCode(fileTree);
        }
    });
    socket.on('code/all/get', function (userId) {
        socket.emit('code/all/serve', {
            userId: userId,
            fileTree: FileSystem.getFileTree()
        })
    });
    socket.on('code/delete', function (fileId) {
        my.onDeleteFile(fileId);
    });
    socket.on('code/add', function (data) {
        my.onAddFile(data.parentId, data.name, data.fileId, data.type);
    });
    socket.on('code/change', function (data) {
        my.onChangeFile(data.fileId, data.change, data.full);
    });


    /* PeerJS takes over from here, because Socket.io isn't great for streams */
    var PEER_SERVER = {
        host: "peerjs-server-tmullen.mybluemix.net",
        port: 443,
        path: "/server",
        secure: true
    };
    var peer;
    var joinedCall = false;
    var calls = [];

    function joinCall() {
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
                msg: "Microphone access is required to join the room's call."
            })
        });
    }

    function leaveCall() {
        if (!joinedCall) return;
        for (var i = 0; i < calls.length; i++) { //Close all the calls
            calls[i].call.close();
        }
        calls =[];
        joinedCall = false;
        document.querySelector("#mic > img").src = "img/muted.png";
    }

    function toggleCall() {
        if (joinedCall) {
            leaveCall();
        } else {
            joinCall();
        }
    }

    document.querySelector("#mic").addEventListener('click', function (e) {
        toggleCall();
    });

    //SHIM!
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    if (!navigator.getUserMedia) {
        document.querySelector("#mic").style.display = "none";
    }
    if (!(window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection)){
        document.querySelector("#mic").style.display = "none";
        document.querySelector("#deploy").style.display = "none";
    }
        

    //TWO SHIM!
    var cameraStream;

    function embedStream(domElement, stream) {
        if (window.webkitURL) {
            domElement.src = window.webkitURL.createObjectURL(stream);
        } else {
            domElement.src = stream;
        }
        savedStream = stream; //Save a reference
        domElement.play();
    }

    //THREE SHIM!
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
}())