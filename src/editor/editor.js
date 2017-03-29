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
  self._cm.on('change', self._onchange)
  
  self._theme = null
}

Editor.prototype._onchange = function (cm, change) {
  var self = this
  
  if (self._mutex || !self._workingFile) return
  self._workingFile.content.replaceRange(change.text, change.to, change.from)
  self.emit('change', {
    path: self._workingFile.path,
    change: change
  })
}

Editor.prototype.change = function (filePath, change) {
  var self = this
  if (!self._workingFile || !filePath === self._workingFile.path) return
  self._cm.replaceRange(change.text, change.to, change.from)
}

Editor.prototype.open = function (filePath) {
  var self = this
  if (self._workingFile && filePath === self._workingFile.path) return
  self._cm.swapDoc(FileSystem.get(filePath).doc)
}
  
module.exports = new Editor()