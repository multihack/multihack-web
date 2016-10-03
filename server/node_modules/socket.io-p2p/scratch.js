var Socketiop2p = require('socket.io-p2p');
var io = require('socket.io-client');
var connectionUrl = '/chat';
var peerOpts = {};

var manager = io.Manager();
var socket = manager.socket(connectionUrl)
var p2psocket = new Socketiop2p(peerOpts, socket);

p2psocket.on('ready', function() {
  console.log("socketp2p ready");
  p2psocket.emit('peer-obj', 'Hello there. I am ' + p2psocket.peerId)
});

// This event will be triggered over socket transport until `useSockets` is set to false
p2psocket.on('peer-msg', function(data) {
  console.log(data);
});

// Set useSocket to false to switch to WebRTC transport
p2psocket.on('go-private', function() {
  p2psocket.useSockets = false;
});
