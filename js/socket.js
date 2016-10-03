/* API for all incoming/outgoing events */
var SocketAPI =(function(){
    var my = {};
    
    var HOSTNAME = "https://tethys.mybluemix.net";
    var socket = io(HOSTNAME, 
        {
        'reconnect': true,
        'reconnection delay': 500,
        'max reconnection attempts': 10
        });

    var me = {
        name : null,
        pic : null,
        requesting : null
    }
    
    var requestHistory = {};
    
    var kicked = {};
    
    
    my.isMyRoom = true;
    
    /* Outgoing */
    my.joinOnline = function(name, pic, hash){
        me.name = name;
        me.pic = pic;
        me.hash = hash;
        socket.emit('online/join', me);
    }
    my.requestRoom = function(roomId){
        me.requesting = roomId;
        socket.emit('room/request', roomId);
    }
    my.respondToRoomRequest = function(userId, originalId){
        socket.emit('room/response', {userId:userId, originalId:originalId});
    }
    my.kick = function(userId){
        socket.emit('room/kick', userId);
        kicked[userId]=true;
    }
    
    
    my.getAllCode = function(){
        socket.emit('code/all/get');
    }
    my.deleteFile = function(fileId){
        socket.emit('code/delete', fileId);
    }
    my.addFile = function(data){
        socket.emit('code/add', data);
    }
    my.changeFile = function(fileId, change){
        socket.emit('code/change', {fileId:fileId, change:change});
    }
    
    /* Incoming */
    socket.on('room/leave', function(user){
        my.onOtherLeftRoom(user);
    });
    socket.on('room/join', function(user){
        my.onOtherJoinRoom(user);
    });
    socket.on('online/join', function(user){
        my.onOtherJoinOnline(user);
    });
    socket.on('online/leave', function(user){
        my.onOtherLeftOnline(user);
    });
    socket.on('room/request', function(data){
        var user = data.user;
        var originalId = data.originalId;
        var last = requestHistory[user.id];
        var now = new Date();
        if (kicked[user.id]){
            return; //Ignore kicked users
        }else if (last && now.getTime() - last.getTime() < 10000){
            return; //Ratelimit to 10 seconds
        }else{
            requestHistory[user.id] = now;
            my.onRequestRoom(user, originalId);
        }
    });
    socket.on('online/who', function(onlineList){
        my.onWho(onlineList);
    });
    socket.on('room/response', function(data){
        if (data.originalId === me.requesting){
            my.isMyRoom = false; //The server will already know this, it's for the UI to work.
            socket.emit('room/join', data.user.id);
            my.onRoomRespond(data.user, data.who);
        }   
    });
    socket.on('room/kick', function(onlineList){
        my.onKick(onlineList);
    });
    
    
    socket.on('code/all/serve', function(fileTree){
        if (fileTree){
            my.onAllCode(fileTree);
        }
    });
    socket.on('code/all/get', function(userId){
        socket.emit('code/all/serve', {userId: userId, fileTree:FileSystem.getFileTree()})
    });
    socket.on('code/delete', function(fileId){
        my.onDeleteFile(fileId);
    });
    socket.on('code/add', function(data){
        my.onAddFile(data.parentId, data.name, data.fileId, data.type);
    });
    socket.on('code/change', function(data){
        my.onChangeFile(data.fileId, data.change);
    });
    
    return my;
}())