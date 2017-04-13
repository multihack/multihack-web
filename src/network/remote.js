/* globals window, io */

var VoiceCall = require('./voice')
var Io = io // standard constructor names
var SimpleSignalClient = require('simple-signal-client')
var getBrowserRTC = require('get-browser-rtc')

var Throttle = require('stream-throttle').Throttle
var Wire = require('multihack-wire')

function RemoteManager (hostname, room, nickname) {
  var self = this
  
  self._handlers = {}

  self.hostname = hostname
  self.room = room
  self.nickname = nickname
  
  self._socket = new Io(self.hostname)
  self.peers = []
  self.mustForward = 0 // num of peers that are nop2p
  
  self._socket.on('forward', function (data) {
    if (!data || !data.event || !data.payload) return
    self._emit(data.event, assemblePayload(data))
  })
  
  // p2p 
  self._socket.on('peer-join', function (data) {
    if (!self.nop2p && !data.nop2p) return // will connect p2p
    console.log(data.id, 'joined')
    
    self.peers.push({
      metadata: {
        nickname: data.nickname
      },
      id: data.id,
      nop2p: data.nop2p
    })
    if (data.nop2p) self.mustForward++
    self._emit('gotPeer', data)
  })
  
  self._socket.on('peer-leave', function (data) {
    if (!self.nop2p && !data.nop2p) return // will disconnect p2p  
    console.log(data.id, 'left')

    for (var i=0; i<self.peers.length; i++) {
      if (self.peers[i].id === data.id) {
        self._emit('lostPeer', self.peers[i])
        self.peers.splice(i, 1)
        break
      }
    }
    if (data.nop2p) self.mustForward--
  })
  
  if (!getBrowserRTC()) {
    console.warn('No WebRTC support')
    self.nop2p = true
  } else {
    self.nop2p = false
    self._initP2P()
  }
  
  self._socket.emit('join', {
    room: self.room,
    nickname: self.nickname,
    nop2p: self.nop2p
  })
}
  
RemoteManager.prototype._initP2P = function (room, nickname) {
  var self = this
  
  self._client = new SimpleSignalClient(self._socket, {
    room: self.room
  })
  
  self.voice = new VoiceCall(self._socket, self._client, self.room)
  
  self._client.on('ready', function (peerIDs) {
    self.voice.ready = true
    for (var i=0; i<peerIDs.length; i++) {
      if (peerIDs[i] === self._client.id) continue
      self._client.connect(peerIDs[i], {}, {
        nickname: self.nickname
      })
    }
  })
  
  self._client.on('request', function (request) {
    if (request.metadata.voice) return
    request.accept({}, {
      nickname: self.nickname
    })
  })
  
  self._client.on('peer', function (peer) {
    if (peer.metadata.voice) return
    peer.metadata.nickname = peer.metadata.nickname || 'Guest'
    console.log(peer.metadata.nickname + ' joined')
    
    // throttle outgoing
    var throttle = new Throttle({rate:300*1000, chunksize: 15*1000})
    peer.wire = new Wire()
    peer.pipe(peer.wire).pipe(throttle).pipe(peer)
    
    self.peers.push(peer)

    peer.wire.on('provideFile', self._emit.bind(self, 'provideFile'))
    peer.wire.on('changeFile', self._emit.bind(self, 'changeFile'))
    peer.wire.on('deleteFile', self._emit.bind(self, 'deleteFile'))
    peer.wire.on('requestProject', function () {
      self._emit('requestProject', peer.id)
    })
    
    peer.on('connect', function () {
      self._emit('gotPeer', peer)   
    })
    
    peer.on('close', function () {
      console.warn('connection to peer closed')
      self._removePeer(peer)
    })
  })
}

RemoteManager.prototype._sendAllPeers = function (event, payload) {
  var self = this
  
  if (self.nop2p || self.mustForward > 0) {
    self._socket.emit('forward', {
      event: event,
      target: self.room,
      payload: payload
    })
    return
  }

  for (var i=0; i<self.peers.length; i++) {
    if (!self.peers[i].nop2p) {
      self.peers[i].wire[event].apply(self.peers[i].wire, payload)
    }
  }
}

RemoteManager.prototype._sendOnePeer = function (id, event, payload) {
  var self = this
  
  if (self.nop2p) {
    self._socket.emit('forward', {
      event: event,
      target: id,
      payload: payload
    })
    return
  }
  
  for (var i=0; i<self.peers.length; i++) {
    if (self.peers[i].id !== id) continue
    if (self.peers[i].nop2p) {
      self._socket.emit('forward', {
        event: event,
        target: self.peers[i].id,
        payload: payload
      })
    } else {
      self.peers[i].wire[event].apply(self.peers[i].wire, payload)
    }
    break
  }
}

RemoteManager.prototype._removePeer = function (peer) {
  var self = this
  
  for (var i=0; i<self.peers.length; i++) {
    if (self.peers[i].id === peer.id) {
      self.peers.splice(i, 1)
      break
    }
  }
  peer.destroy()
  
  self._emit('lostPeer', peer)
}

RemoteManager.prototype.deleteFile = function (filePath) {
  var self = this
  
  self._sendAllPeers('deleteFile', [filePath])
}

RemoteManager.prototype.changeFile = function (filePath, change) {
  var self = this
  
  console.log(change)
  
  self._sendAllPeers('changeFile', [filePath, change])
}

RemoteManager.prototype.requestProject = function () {
  var self = this
  
  var firstPeerID
  for (var i=0; i<self.peers.length;i++) {
    if (self.peers[i].connected || self.peers[i].nop2p || self.nop2p) {
      firstPeerID = self.peers[i].id
      break
    }
  }
  if (!firstPeerID) return

  self._sendOnePeer(firstPeerID, 'requestProject', [])
}

RemoteManager.prototype.provideFile = function (filePath, content, requester) {
  var self = this
  
  self._sendOnePeer(requester, 'provideFile', [filePath, content])
}

RemoteManager.prototype.destroy = function () {
  var self = this
  
  for (var i=0; i<self.peers.length; i++) {
    if (self.peers[i].nop2p || self.nop2p) {
      self.peers[i] = null
    } else {
      self.peers[i].destroy()
    }
  }

  self.voice = null
  self._client = null
  self._handlers = null
  self.room = null
  self.hostname = null
  self.nop2p = null
  self.nickname = null
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

// turns array back into structured object
function assemblePayload (data) {
  switch (data.event) {
    case 'deleteFile':
      return {
        filePath: data.payload[0]
      }
      break
    case 'changeFile':
      return {
        filePath: data.payload[0],
        change: data.payload[1]
      }
      break    
    case 'provideFile':
      return {
        filePath: data.payload[0],
        content: data.payload[1]
      }
      break    
    case 'requestProject':
      return data.id
      break
  }
}

module.exports = RemoteManager