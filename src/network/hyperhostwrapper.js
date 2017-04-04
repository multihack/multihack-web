/* globals HyperHost */

// Wraps the HyperHost instance
// TODO: When HyperHost uses simple-signal, make child of remote.js

function HyperHostWrapper () {
  var self = this
  if (!(self instanceof HyperHostWrapper)) return new HyperHostWrapper()

  self._host = new HyperHost()
}

HyperHostWrapper.prototype.deploy = function (tree, cb) {
  var self = this
  
  self._host.on('ready', function(url) {
      cb(url)
  })

  self._host.io.on('digest', function () {
    console.log('hello world')
    self._host.launch()
  })
  
  console.log(tree)
  self._host.io.contentTree(tree)
}
  
module.exports = new HyperHostWrapper()