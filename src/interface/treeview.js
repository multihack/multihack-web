var mustache = require('mustache')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(TreeView, EventEmitter)

function TreeView () {
  var self = this
  if (!(self instanceof TreeView)) return new TreeView()

}

TreeView.prototype.render = function (nodeList, parentElement) {
  var self = this
  
  parentElement = parentElement || document.querySelector('#tree')
    
  for (var i = 0; i < nodeList.length; i++) { 
      if (!nodeList[i].isDir) {
        // Render file
        var el = document.createElement('li')
        el.className = 'file'
        
        var a = document.createElement('a')
        a.className = 'filelink'
        a.id = nodeList[i].path
        a.innerHTML = nodeList[i].name
        a.addEventListener('click', self._handleFileClick.bind(self))
        
        el.appendChild(a)
        parentElement.appendChild(el)
      } else {
        //Render dir
        var el = document.createElement('li')
        
        var label = document.createElement('label')
        label.setAttribute('for', nodeList[i].path)
        label.innerHTML = nodeList[i].name
        label.addEventListener('click', self._handleFolderClick.bind(self))
        
        var input = document.createElement('input')
        input.id = nodeList[i].path
        input.type = 'checkbox'
        
        var ol = document.createElement('ol')
        self.render(nodeList[i].children, ol)
        
        el.appendChild(label)
        el.appendChild(input)
        el.appendChild(ol)
        parentElement.appendChild(el)
      }
  }
}

TreeView.prototype._handleFileClick = function (e) {
  var self = this
  self.emit('open', e.target.id)
}

TreeView.prototype._handleFolderClick = function (e) {
  var self = this
  console.log(e.target.getAttribute('for'))
  
}

TreeView.prototype.remove = function (file) {
  var self = this
  
}

TreeView.prototype.add = function (parent, file) {
  var self = this
  
}
    
module.exports = TreeView