var util = require('./util')

function Directory (path) {
  var self = this
  if (!(self instanceof Directory)) return new Directory()

  self.name = util.getFilename(path)
  self.path = path
  self.nodes = []
  self.isDir = true
}

module.exports = Directory
