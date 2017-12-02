/* globals CodeMirror */

var util = require('./util')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
  self.alreadyLink = false
  self.content = ''
  self.size = 0
  self._doc = null // holds temporary CodeMirror document reference
  self._releaseTimer = null
  self.lastCursor = null
  
  Object.defineProperty(self, 'doc', {
    get: function () {
      if (!self._doc) {
        self._doc = new CodeMirror.Doc(self.content, util.pathToMode(self.path))
      }
      if (!self._releaseTimer) {
        self._releaseTimer = window.setTimeout(function () {
          self.content = self._doc.getValue() // save the value
          self._doc = null // allow garbage collection
          self._releaseTimer = null
        }, 30000) // release document reference after 30 seconds
      } else {
        window.clearTimeout(self._releaseTimer)
      }
      return self._doc
    }
  })
}

File.prototype.write = function (content, cb) {
  var self = this
  
  cb = cb || function () {}
  
  if (self._doc) {
    self._doc.setValue(content)
  } else {
    self.content = content
  }
  
  self.size = content.length
}

File.prototype.read = function (cb) {
  var self = this
  
  cb = cb || function () {}
  
  if (self._doc) {
    cb(self._doc.getValue())
  } else {
    cb(self.content)
  }
}

module.exports = File
