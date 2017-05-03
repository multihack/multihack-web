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
    get: function () {
      return self.doc.getValue()
    }
  })
  
  Object.defineProperty(self, 'size', {
    get: function () {
      return self.doc.getValue().length
    }
  })
}

File.prototype.write = function (content, cb) {
  var self = this

  self.doc.setValue(content)
  if (cb) cb()
}

File.prototype.read = function (cb) {
  var self = this

  if (cb) cb(self.doc.getValue())
}

module.exports = File
