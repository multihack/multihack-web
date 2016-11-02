var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var cfenv = require('cfenv');

var sanitizeHtml = require('sanitize-html');

// serve the files out of ./public
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});


var users = {};
var rooms = {};

//Make user object safe to send (and smaller)
function safeUser(user) {
    return {
        id: user.id,
        name: user.name,
        pic: user.pic,
        hash: user.hash
    }
}

function getRoomMembers(roomId, requesterId) {
    return rooms[roomId].map(function (id) {
        return safeUser(users[id]);
    });
}

//Gets oldest user in a room
function getOldestUser(roomId, skipOwner) {
    var roomOwner = users[roomId]; //Get original owner
    if (roomOwner && roomOwner.room === roomId && !skipOwner) { //Make sure the owner is stil around, and they are in their own room.
        return roomOwner;
    } else {
        //If owner is gone, just take the oldest user, that is still in the room
        for (var i = 0; i < rooms[roomId].length; i++) {
            var oldestUser = users[rooms[roomId][i]];
            if (oldestUser && oldestUser.room === roomId) { //Check they are still online and in the room
                return oldestUser;
            }
        }
        //If they're not, then tough luck! Code is unreachable!
    }
}

function getOnline(requesterId) {
    var keys = Object.keys(users);
    var result = [];
    for (var i = 0; i < keys.length; i++) {
        if (requesterId === users[keys[i]].id) continue; //Don't send the requester!
        result.push(safeUser(users[keys[i]]));
    }
    return result;
}

io.on('connection', function (socket) {
    var id = socket.id;


    socket.on('error', function (err) {
        console.log(err);
    });

    socket.on('disconnect', function () {
        if (!users[id]) return; //Never joined, no cleanup to do
        io.emit('online/leave', safeUser(users[id]));
        
        var oldRoomId = users[id].room;
        var index = rooms[oldRoomId].indexOf(id); 
        rooms[oldRoomId].splice(index, 1); //Remove the user from the room they were in
        
        delete users[id]; //Delete the reference
    });

    //Fires when user comes online
    socket.on('online/join', function (tryMe) {
        if (tryMe.name.length <= 1) return; //Name enforcement

        users[id] = {};
        users[id].name = sanitizeHtml(tryMe.name);
        users[id].pic = sanitizeHtml(tryMe.pic);
        users[id].hash = sanitizeHtml(tryMe.hash); //Hash is so user can recognize themselves
        users[id].id = id;
        users[id].socket = socket;
        users[id].room = id;
        users[id].rooms = {};
        users[id].rooms[id] = true;
        rooms[id] = [id];


        socket.emit('online/who', getOnline(id)); //Return list of others online  
        socket.emit('online/handshake', id); //Return their id
        socket.broadcast.emit('online/join', safeUser(users[id])); //Tell everyone they are online      
    });

    //Fires when user requests room access
    socket.on('room/request', function (roomId) {
        var originalId = roomId;
        if (!users[roomId]) return; //Responder left
        roomId = users[roomId].room; //Redirect request to owner.
        var roomOwner = getOldestUser(roomId); //Get the oldest member of the room, if owner is gone
        if (!roomOwner) return;
        if (users[id].room === roomOwner.room) return; //Users already in a room together!
        roomOwner.socket.emit('room/request', {user:safeUser(users[id]), originalId:originalId}); //Send request to room owner
    });

    //When responds to room access request
    socket.on('room/response', function (data) {
        var userId = data.userId;
        if (!users[userId]) return; //Requester left
        users[userId].rooms[id] = true; //Grant room permission
        users[userId].socket.emit('room/response', {
            user: safeUser(users[id]),
            who: getRoomMembers(id, userId),
            originalId: data.originalId
        }); //Inform affected of a success, with list of users
    });

    //When joins room
    socket.on('room/join', function (roomId) {
        if (!users[id].rooms[roomId]) return; //Block unauthorized joins

        var oldRoomId = users[id].room;
        socket.broadcast.to(oldRoomId).emit('room/leave', safeUser(users[id])); //Broadcast leaving the current room
        var index = rooms[oldRoomId].indexOf(id); 
        rooms[oldRoomId].splice(index, 1); //Remove the user from the old room

        users[id].room = roomId; //Set the room
        socket.join(roomId); //Join the room
        rooms[roomId].push(id); //Push to roomList
        socket.broadcast.to(roomId).emit('room/join', safeUser(users[id])); //Broadcast that join
        
        //Now serve them the project code
        var roomId = users[id].room;
        var roomOwner = getOldestUser(roomId);
        roomOwner.socket.emit('code/all/get', id);
    });

    //When kicks another from room
    socket.on('room/kick', function (userId) {
        if (users[userId].room != id) return; //Block unauthorized kicks
        users[userId].rooms[id] = false; //Remove permissions
        users[userId].socket.leave(id); //Leave the room
        users[userId].socket.emit('room/kick', getOnline(userId)); //Alert user of their kick (send a list of online users to make sure they are up-to-date)
        io.in(id).emit('room/leave', safeUser(users[userId])); //Tell room they have left
        
        socket.broadcast.to(userId).emit('room/join', safeUser(users[userId])); //Broadcast the user returning
        users[userId].room = userId; //Put user back in their own room
        users[userId].socket.join(userId); //Join the room (AFTER BROADCAST)
        rooms[userId].push(userId); //Push to roomList
        
        //Now serve them the project code
        var roomId = users[userId].room;
        var roomOwner = getOldestUser(userId, true); //Skip the owner, which is the original user
        roomOwner.socket.emit('code/all/get', userId);
    });


    socket.on('code/all/get', function () {
        //Get the code from the room owner
        var roomId = users[id].room;
        var roomOwner = getOldestUser(roomId);
        if (!roomOwner) return;
        roomOwner.socket.emit('code/all/get', id);
    });
    socket.on('code/delete', function (fileId) {
        if (!users[id]) return;
        socket.to(users[id].room).emit('code/delete', fileId);
    });
    socket.on('code/add', function (file) {
        if (!users[id]) return;
        socket.to(users[id].room).emit('code/add', file);
    });
    socket.on('code/change', function (data) {
        if (!users[id]) return;
        socket.to(users[id].room).emit('code/change', data); //{fileId, change}
    });
    socket.on('code/all/serve', function (data) {
        var requester = users[data.userId];
        if (requester && requester.room === users[id].room){
             requester.socket.emit('code/all/serve', data.fileTree);
        }
    });
    socket.on('code/cursor', function(data){
        if (!users[id]) return;
        data.userId = id;
        socket.to(users[id].room).emit('code/cursor', data); //{userId, fileId, {x,y}}
    });

});


var appEnv = cfenv.getAppEnv();
server.listen(appEnv.port);
console.log("Freeing the web at " + appEnv.url);

