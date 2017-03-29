var util = require('./util')
var mustache = require('mustache')

function Directory (path) {
  var self = this
  if (!(self instanceof Directory)) return new Directory()
  
  self.name = util.getFilename(path)
  self.path = path
  self.children = []
  self.isDir = true
}
  
module.exports = Directory