var util = require('./util')
var mustache = require('mustache')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.doc = null
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
  // HACK: To get working with HyperHost
  Object.defineProperty(self, 'content', {
    get: self.getRawContent.bind(self)
  })
}

File.prototype.getRawContent = function () {
  var self = this
  
  if (self.viewMapping === 'image') {
    return atob(self.doc)
  } else {
    return self.doc.getValue()
  }
}

  
module.exports = File