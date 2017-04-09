/* globals HyperHost */

// Wraps the HyperHost instance
// TODO: When HyperHost uses simple-signal, make child of remote.js

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(HyperHostWrapper, EventEmitter)

function HyperHostWrapper () {
  var self = this
  if (!(self instanceof HyperHostWrapper)) return new HyperHostWrapper()

  self._host = new HyperHost()
}

HyperHostWrapper.prototype.deploy = function (tree) {
  var self = this
  console.log('HH started')

  self._host.on('ready', function (url) {
    console.log('HH ready')
    self.emit('ready', url)
  })

  self._host.io.on('digest', function () {
    console.log('HH digested')
    self._host.launch()
  })

  console.log(tree)
  try {
    self._host.io.contentTree(tree) // TODO: Don't try/catch when HH supports "error" event
  } catch (err) {
    console.error(err)
    self.emit('error', err)
  }
}

module.exports = new HyperHostWrapper()
