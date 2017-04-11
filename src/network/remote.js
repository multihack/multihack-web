/* globals window, io */

var VoiceCall = require('./voice')
var Io = io // standard constructor names
var SimpleSignalClient = require('simple-signal-client')
var getBrowserRTC = require('get-browser-rtc')

var Throttle = require('stream-throttle').Throttle
var Wire = require('multihack-wire')

function RemoteManager (hostname, room) {
  var self = this

  self.room = room
  
  if (!getBrowserRTC()) {
    window.alert('Your browser is ancient or a plugin is blocking WebRTC!')
    throw new Error('No WebRTC support')
  }

  self._handlers = {}
  self._socket = new Io(hostname)
  self._client = new SimpleSignalClient(self._socket, {
    room: room
  })
  self.peers = []
  
  self.voice = new VoiceCall(self._socket, self._client, room)
  
  self._socket.emit('join', {
    room: room
  })
  
  self._client.on('ready', function (peerIDs) {
    self.voice.ready = true
    for (var i=0; i<peerIDs.length; i++) {
      if (peerIDs[i] === self._client.id) continue
      self._client.connect(peerIDs[i], {}, {})
    }
  })
  
  self._client.on('request', function (request) {
    if (request.metadata.voice) return
    request.accept({}, {})
  })
  
  self._client.on('peer', function (peer) {
    console.log('got peer')
    if (peer.metadata.voice) return
    
    // throttle outgoing
    var throttle = new Throttle({rate:300*1000, chunksize: 15*1000})
    peer.wire = new Wire()
    peer.pipe(peer.wire).pipe(throttle).pipe(peer)
    
    self.peers.push(peer)

    peer.wire.on('provideFile', self._emit.bind(self, 'provideFile'))
    peer.wire.on('changeFile', self._emit.bind(self, 'change'))
    peer.wire.on('deleteFile', self._emit.bind(self, 'deleteFile'))
    peer.wire.on('requestProject', function () {
      self._emit('requestProject', peer.id)
    })
    
    peer.on('close', function () {
      console.warn('connection to peer closed')
      self._removePeer(peer)
    })
  })
  
}

RemoteManager.prototype._sendToAll = function (fn) {
  var self = this

  for (var i=0; i<self.peers.length; i++) {
    fn(self.peers[i])
  }
}

RemoteManager.prototype._sendToOne = function (id, fn) {
  var self = this
  
  for (var i=0; i<self.peers.length; i++) {
    if (self.peers[i].id !== id) continue
    fn(self.peers[i])
  }
}

RemoteManager.prototype._removePeer = function (peer) {
  var self = this
  
  for (var i=0; i<self.peers.length; i++) {
    if (self.peers[i].id === peer.id) {
      self.peers.splice(i, 1)
      return
    }
  }
}

RemoteManager.prototype.deleteFile = function (filePath) {
  var self = this

  self._sendToAll(function (peer) {
    peer.wire.deleteFile(filePath)
  })
}

RemoteManager.prototype.change = function (filePath, change) {
  var self = this

  self._sendToAll(function (peer) {
    peer.wire.changeFile(filePath, change)
  })
}

RemoteManager.prototype.requestProject = function () {
  var self = this
  
  var firstPeerID
  for (var i=0; i<self.peers.length;i++) {
    if (self.peers[i].connected) {
      firstPeerID = self.peers[i].id
      break
    }
  }
  if (!firstPeerID) return

  console.log('called requestProject')
  self._sendToOne(firstPeerID, function (peer) {
    peer.wire.requestProject()
  })
}

RemoteManager.prototype.provideFile = function (filePath, content, requester) {
  var self = this

  self._sendToOne(requester, function (peer) {
    peer.wire.provideFile(filePath, content)
  })
}

RemoteManager.prototype.destroy = function () {
  var self = this
  
  for (var i=0; i<self.peers.length; i++) {
    self.peers[i].destroy()
  }

  self._handlers = null
  self.room = null
  self.peers = null
  self._handlers = null
  self._socket.disconnect()
  self._socket = null
}

RemoteManager.prototype._emit = function (event, data) {
  var self = this
  var fns = self._handlers[event] || []
  var fn
  var i

  for (i = 0; i < fns.length; i++) {
    fn = fns[i]
    if (fn && typeof (fn) === 'function') {
      fn(data)
    }
  }
}

RemoteManager.prototype.on = function (event, handler) {
  var self = this

  if (!self._handlers[event]) {
    self._handlers[event] = []
  }

  self._handlers[event].push(handler)
}

module.exports = RemoteManager
