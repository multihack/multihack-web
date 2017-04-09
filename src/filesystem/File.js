var util = require('./util')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
  
  self.doc = util.getViewMapping(path) === 'text' ? new CodeMirror.Doc('', util.pathToMode(path)) : ''
  console.log(self.doc)
  
  // HACK: To get working with HyperHost
  Object.defineProperty(self, 'content', {
    get: self.getRawContent.bind(self)
  })
}

File.prototype.getRawContent = function () {
  var self = this

  if (self.viewMapping === 'image') {
    return window.atob(self.doc)
  } else {
    return self.doc.getValue()
  }
}

module.exports = File
