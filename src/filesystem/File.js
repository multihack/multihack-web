var util = require('./util')
var mustache = require('mustache')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.content = null
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
}

File.prototype.getRawContent = function () {
  var self = this
  
  if (self.viewMapping === 'image') {
    return atob(self.content)
  } else {
    return self.content.getValue()
  }
}

  
module.exports = File