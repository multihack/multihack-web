/* globals CodeMirror */

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var FileSystem = require('./../filesystem/filesystem')

inherits(Editor, EventEmitter)

function Editor () {
  var self = this
  if (!(self instanceof Editor)) return new Editor()

  var textArea = document.getElementById('editor')
  
  var options = {
                  mode: 'javascript',
                  lineNumbers: true,
                  theme: self._theme || 'atom',
                  tabSize: 4,
                  indentUnit: 4,
                  lineWrapping: !!(window.innerWidth < 480), // No wrap on mobile
                  styleActiveLine: true
                }
  
  self._cm = CodeMirror.fromTextArea(textArea, options)
  
  self._workingFile = null
  self._mutex = false
  self._cm.on('change', self._onchange.bind(self))
  
  self._theme = null
}

Editor.prototype._onchange = function (cm, change) {
  var self = this
  
  if (self._mutex || !self._workingFile) return
  self.emit('change', {
    filePath: self._workingFile.path,
    change: change
  })
}

// Handle an external change
Editor.prototype.change = function (filePath, change) {
  var self = this
  self._mutex = true
  if (!self._workingFile || filePath !== self._workingFile.path) {
    FileSystem.getFile(filePath).content.replaceRange(change.text, change.to, change.from)
  } else {
    self._cm.replaceRange(change.text, change.to, change.from)
  }
  self._mutex = false
}

Editor.prototype.open = function (filePath) {
  var self = this
  if (self._workingFile && filePath === self._workingFile.path) return
  self._workingFile = FileSystem.get(filePath)
  document.getElementById('working-file').innerHTML = self._workingFile.name
  switch (self._workingFile.viewMapping) {
    case 'image':
      document.querySelector('.image-wrapper').style.display = ''
      document.querySelector('.image-wrapper > img').src = 'data:text/javascript;base64,'+self._workingFile.content
    break
    default:
      document.querySelector('.image-wrapper').style.display = 'none'
      self._cm.swapDoc(self._workingFile.content)
    break
  }
}
  
module.exports = new Editor()