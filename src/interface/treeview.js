var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(TreeView, EventEmitter)

function TreeView () {
  var self = this
  if (!(self instanceof TreeView)) return new TreeView()

  document.getElementById('root-plus').addEventListener('click', function (e) {
    self.emit('add', {
      target: null,
      path: '',
      parentElement: document.querySelector('#tree')
    })
  })
}

TreeView.prototype.render = function (nodeList, parentElement) {
  var self = this

  parentElement = parentElement || document.querySelector('#tree')

  for (var i = 0; i < nodeList.length; i++) {
    if (nodeList[i].path === '') continue
    self.add(parentElement, nodeList[i])
  }
}

TreeView.prototype.rerender = function (nodeList) {
  var self = this

  var rootElement = document.querySelector('#tree')
  while (rootElement.firstChild) {
    rootElement.removeChild(rootElement.firstChild)
  }

  self.render(nodeList)
}

TreeView.prototype._handleFileClick = function (e) {
  var self = this
  self.emit('open', {
    target: e.target,
    path: e.target.id,
    parentElement: e.parentElement
  })
}

TreeView.prototype._handleFolderClick = function (e) {
  // var self = this
  // Nothing
}

// Returns parentElement of node if it already exists
TreeView.prototype.getParentElement = function (path) {
  // var self = this
  var el = document.getElementById(path)
  return el ? el.parentElement.parentElement : null
}

TreeView.prototype.remove = function (parentElement, file) {
  // var self = this

  var element = document.getElementById(file.path).parentElement
  parentElement.removeChild(element)
}

TreeView.prototype.add = function (parentElement, file) {
  var self = this

  if (file.isDir) {
    self.addDir(parentElement, file)
  } else {
    self.addFile(parentElement, file)
  }
}

TreeView.prototype.addFile = function (parentElement, file) {
  var self = this

  // Render file
  var el = document.createElement('li')
  el.className = 'file'

  var a = document.createElement('a')
  a.className = 'filelink'
  a.id = file.path
  a.innerHTML = file.name
  a.addEventListener('click', function (e) {
    self.emit('open', {
      target: e.target,
      path: file.path,
      parentElement: parentElement
    })
  })

  el.appendChild(a)
  parentElement.appendChild(el)
}

TreeView.prototype.addDir = function (parentElement, file) {
  var self = this

  var el = document.createElement('li')

  var label = document.createElement('label')
  label.setAttribute('for', file.path)
  label.innerHTML = file.name
  label.addEventListener('click', self._handleFolderClick.bind(self))

  var input = document.createElement('input')
  input.id = file.path
  input.checked = true
  input.type = 'checkbox'

  var ol = document.createElement('ol')
  self.render(file.nodes, ol)

  var plus = document.createElement('span')
  plus.className = 'beside plus'
  plus.innerHTML = '&#43;'
  plus.addEventListener('click', function (e) {
    self.emit('add', {
      target: null,
      path: file.path,
      parentElement: ol
    })
  })

  var del = document.createElement('span')
  del.className = 'beside delete'
  del.innerHTML = '&#9003;'
  del.addEventListener('click', function (e) {
    self.emit('remove', {
      target: e.target,
      path: file.path,
      parentElement: parentElement
    })
  })

  el.appendChild(label)
  el.appendChild(input)
  el.appendChild(plus)
  el.appendChild(del)
  el.appendChild(ol)
  parentElement.appendChild(el)
}

module.exports = TreeView
