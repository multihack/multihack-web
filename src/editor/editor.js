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
    mode: {name: 'javascript', globalVars: true},
    extraKeys: {'tab': 'autocomplete'},
    lineNumbers: true,
    theme: self._theme || 'atom',
    tabSize: 4,
    indentUnit: 4,
    lineWrapping: !!(window.innerWidth < 480), // No wrap on mobile
    styleActiveLine: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    matchTags: {bothTags: true},
    autoCloseTags: true
  }

  self._cm = CodeMirror.fromTextArea(textArea, options)

  self._cm.on('keyup', function (editor, event) {
    
    console.log(event.keyCode, event.which)

    if (!ExcludedIntelliSenseTriggerKeys[(event.keyCode || event.which).toString()]) {
      console.log('completed')
      CodeMirror.commands.autocomplete(editor, null, { completeSingle: false })
    }
  })

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
    FileSystem.getFile(filePath).doc.replaceRange(change.text, change.to, change.from)
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
      document.querySelector('.editor-wrapper').style.display = 'none'
      document.querySelector('.image-wrapper').style.display = ''
      document.querySelector('.image-wrapper > img').src = 'data:text/javascript;base64,' + self._workingFile.doc
      break
    default:
      document.querySelector('.editor-wrapper').style.display = ''
      document.querySelector('.image-wrapper').style.display = 'none'
      self._cm.swapDoc(self._workingFile.doc)
      break
  }
}

Editor.prototype.close = function () {
  var self = this
  self._workingFile = null
  document.getElementById('working-file').innerHTML = ''
  document.querySelector('.editor-wrapper').style.display = 'none'
  document.querySelector('.editor-wrapper').style.display = 'none'
}

Editor.prototype.getWorkingFile = function () {
  var self = this
  return self._workingFile
}

module.exports = new Editor()

var ExcludedIntelliSenseTriggerKeys = {
  '8': 'backspace',
  '9': 'tab',
  '13': 'enter',
  '16': 'shift',
  '17': 'ctrl',
  '18': 'alt',
  '19': 'pause',
  '20': 'capslock',
  '27': 'escape',
  '32': 'space',
  '33': 'pageup',
  '34': 'pagedown',
  '35': 'end',
  '36': 'home',
  '37': 'left',
  '38': 'up',
  '39': 'right',
  '40': 'down',
  '45': 'insert',
  '46': 'delete',
  '91': 'left window key',
  '92': 'right window key',
  '93': 'select',
  '107': 'add',
  '109': 'subtract',
  '110': 'decimal point',
  '111': 'divide',
  '112': 'f1',
  '113': 'f2',
  '114': 'f3',
  '115': 'f4',
  '116': 'f5',
  '117': 'f6',
  '118': 'f7',
  '119': 'f8',
  '120': 'f9',
  '121': 'f10',
  '122': 'f11',
  '123': 'f12',
  '144': 'numlock',
  '145': 'scrolllock',
  '186': 'semicolon',
  '187': 'equalsign',
  '188': 'comma',
  '189': 'dash',
  '191': 'slash',
  '192': 'graveaccent',
  '219': 'bracket',
  '220': 'backslash',
  '222': 'quote'
}