var util = require('./util')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
  self.alreadyLink = false
  
  self.doc = util.getViewMapping(path) === 'text' ? new CodeMirror.Doc('', util.pathToMode(path)) : ''
  
  // HACK: To get working with HyperHost
  Object.defineProperty(self, 'content', {
    get: self.getRawContent.bind(self)
  })
  Object.defineProperty(self, 'size', {
    get: function () {
      return self.getRawContent().length
    }
  })
}

File.prototype.write = function (content) {
  var self = this
  
  if (util.getViewMapping(self.path) === 'text') {
    self.doc.setValue(content)
  } else {
    self.doc = content
  }
}

File.prototype.getRawContent = function () {
  var self = this

  if (self.viewMapping === 'image') {
    return self.doc
  } else {
    return self.doc.getValue()
  }
}

module.exports = File
