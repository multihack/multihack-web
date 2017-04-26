var util = require('./util')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
  self.alreadyLink = false
  
  self.doc = new CodeMirror.Doc('', util.pathToMode(path))
  
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

  self.doc.setValue(content)
}

File.prototype.getRawContent = function () {
  var self = this

  return self.doc.getValue()
}

module.exports = File
