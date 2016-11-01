var debug = require('debug')('socket')
var clients = {}

module.exports.clients = clients
module.exports.Server = p2pSocket

function p2pSocket (socket, next, room) {
  clients[socket.id] = socket
  if (typeof room === 'object') {
    var connectedClients = socket.adapter.rooms[room.name]
  } else {
    var connectedClients = clients
  }
  socket.emit('numClients', Object.keys(connectedClients).length - 1)

  socket.on('disconnect', function () {
    delete clients[socket.id]
    Object.keys(connectedClients).forEach(function (clientId, i) {
      var client = clients[clientId]
      client.emit('peer-disconnect', {peerId: socket.id})
    })
    debug('Client gone (id=' + socket.id + ').')
  })

  socket.on('offers', function (data) {
    // send offers to everyone in a given room
    Object.keys(connectedClients).forEach(function (clientId, i) {
      var client = clients[clientId]
      if (client !== socket) {
        var offerObj = data.offers[i]
        var emittedOffer = {fromPeerId: socket.id, offerId: offerObj.offerId, offer: offerObj.offer}
        debug('Emitting offer: %s', JSON.stringify(emittedOffer))
        client.emit('offer', emittedOffer)
      }
    })
  })

  socket.on('peer-signal', function (data) {
    var toPeerId = data.toPeerId
    debug('Signal peer id %s', toPeerId);
    var client = clients[toPeerId]
    client.emit('peer-signal', data)
  })
  typeof next === 'function' && next()
}
