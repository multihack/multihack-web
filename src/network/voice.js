var getusermedia = require('getusermedia')

function VoiceCall (socket, client, room) {
  var self = this
  if (!(self instanceof VoiceCall)) return new VoiceCall()

  self.room = room
  self.stream = null
  self.peers = []
  self.socket = socket
  self.client = client

  socket.on('voice-discover', function (peerIDs) {
    console.log('voice peers', peerIDs)

    if (self.stream) {
      for (var i = 0; i < peerIDs.length; i++) {
        self.client.connect(peerIDs[0], {
          stream: self.stream,
          answerConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          },
          offerConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          }
        }, {
          voice: true
        })
      }
    }
  })

  self.client.on('request', function (request) {
    if (!request.metadata.voice) return
    if (!self.stream) return

    request.accept({
      stream: self.stream,
      answerConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      },
      offerConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }
    }, {
      voice: true
    })
  })

  self.client.on('peer', function (peer) {
    if (!peer.metadata.voice) return
    self.peers.push(peer)

    var audio = document.createElement('audio')
    peer.on('stream', function (stream) {
      console.log('stream')
      audio.setAttribute('autoplay', true)
      audio.setAttribute('src', window.URL.createObjectURL(stream))
      document.body.appendChild(audio)
    })

    peer.on('close', function () {
      document.body.removeChild(audio)
      self._removePeer(peer)
    })
  })
}

VoiceCall.prototype._removePeer = function (peer) {
  var self = this

  for (var i = 0; i < self.peers.length; i++) {
    if (self.peers[i].id === peer.id) {
      self.peers.splice(i, 1)
      return
    }
  }
}

VoiceCall.prototype.leave = function () {
  var self = this
  if (!self.stream) return

  console.log('voice leave')

  while (self.peers[0]) {
    self.peers[0].destroy()
    self.peers.shift()
  }
  var audioEls = document.querySelectorAll('audio')
  for (var i = 0; i < audioEls.length; i++) {
    document.body.removeChild(audioEls[i])
  }
  self.stream = null
  self.socket.emit('voice-leave')
}

VoiceCall.prototype.join = function () {
  var self = this
  if (self.stream) return

  console.log('voice join')

  getusermedia(function (err, stream) {
    if (err) return console.log(err)
    self.stream = stream
    self.socket.emit('voice-join')
  })
}

VoiceCall.prototype.toggle = function () {
  var self = this

  console.log('voice toggle')

  console.log(self.stream)
  if (!self.stream) {
    self.join()
  } else {
    self.leave()
  }
}

module.exports = VoiceCall
