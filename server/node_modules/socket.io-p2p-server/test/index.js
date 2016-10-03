var p2pSocket = require('../index')
var events = require('events')
var chai = require('chai')
var sinon = require('sinon')
var sinonChai = require('sinon-chai')
var expect = chai.expect
chai.use(sinonChai)

describe('p2pSocket', function () {
  var socket = new events.EventEmitter()
  socket.id = 1
  socket.broadcast = {emit: function () {}}
  var socket2 = new events.EventEmitter()
  socket2.id = 2
  socket2.broadcast = {emit: function () {}}

  it('should decrement number of clients when a socket disconnects', function () {
    p2pSocket.Server(socket, function () {})
    socket.emit('disconnect')
    expect(Object.keys(p2pSocket.clients).length).to.equal(0)
  })

  it('should emit peer-signal to a given client', function () {
    var emitfn = sinon.spy()
    var emitData = {toPeerId: 2}

    p2pSocket.Server(socket, function () {})
    p2pSocket.Server(socket2, function () {})
    socket2.emit = emitfn
    socket.emit('peer-signal', emitData)
    expect(emitfn).to.have.been.calledWith('peer-signal', emitData)
  })

  it('should emit an offer to all other clients when it receives array of offers', function () {
    var emitfn = sinon.spy()
    var offerObj = {offerId: 2, offer: 'over here'}
    var emitData = {offers: [offerObj, offerObj]}

    p2pSocket.Server(socket, function () {})
    p2pSocket.Server(socket2, function () {})
    socket2.emit = emitfn

    socket.emit('offers', emitData)
    expect(emitfn).to.have.been.calledWithMatch('offer', sinon.match.object)
  })
})
