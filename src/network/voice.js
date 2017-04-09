var SimpleSignalClient = require('simple-signal-client')
var getBrowserRTC = require('get-browser-rtc')
var getusermedia = require('getusermedia')

function VoiceCall (socket, room) {
  var self = this
  if (!(self instanceof VoiceCall)) return new VoiceCall()

  if (!getBrowserRTC()) {
    // TODO: Remove mic button
    console.error('No WebRTC support.')
    return
  }
  console.log('constructor')

  self.room = room
  self.ready = false
  self.stream = null
  self.peers = []
  self.socket = socket
  self.client = new SimpleSignalClient(socket, {
    room: self.room
  })
  self.client.on('ready', function (peerIDs) {
    self.ready = true
    console.log(self.client.id)
    console.log(peerIDs)

    if (self.stream) {
      for (var i = 0; i < peerIDs.length; i++) {
        self.client.connect(peerIDs[0], {
          stream: self.stream,
          answerConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          },
          offerConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          }
        })
      }
    }
  })
  self.client.on('request', function (request) {
    console.log('request')
    if (!self.stream) return
    request.accept({
      stream: self.stream,
      answerConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      },
      offerConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      }
    })
  })
  self.client.on('peer', function (peer) {
    self.peers.push(peer)

    peer.on('stream', function (stream) {
      console.log('stream')
      var audio = document.createElement('audio')
      audio.setAttribute('autoplay', true)
      audio.setAttribute('src', window.URL.createObjectURL(stream))
      document.body.appendChild(audio)
    })
  })
}

VoiceCall.prototype.leave = function () {
  var self = this

  if (!self.ready || !self.stream) return

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

  if (!self.ready || self.stream) return

  getusermedia(function (err, stream) {
    if (err) return console.log(err)
    self.stream = stream

    self.client.rediscover({
      room: self.room
    })
    self.socket.emit('voice-join')
  })
}

VoiceCall.prototype.toggle = function () {
  var self = this
  console.log('toggle')

  if (!self.stream) {
    self.join()
  } else {
    self.leave()
  }
}

module.exports = VoiceCall
