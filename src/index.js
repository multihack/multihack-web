var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('./network/remote')

var config = require('./config.json')

function Multihack () {
  var self = this
  if (!(self instanceof Multihack)) return new Multihack()
  
  Interface.on('openFile', function (path) {
    Editor.open(path)
  })
  
  // Initialize project and room
  self.roomID = Math.random().toString(36).substr(2, 20)
  
  Interface.on('saveAs', function (saveType) {
    FileSystem.saveProject(saveType, function (success) {
      if (success) {
        Interface.alert('Save Completed', 'Your project has been successfully saved.')
      } else {
        Interface.alert('Save Failed', 'An error occured while trying to save your project.<br>Please select a different method.')
      }
    })
  })
    
  Interface.removeOverlay()
  Interface.getProject(function (project) {
    if (!project){
      self._initRemote()
    } else {
      Interface.showOverlay()
      FileSystem.loadProject(project, function (tree) {
        Interface.treeview.render(tree)
        self._initRemote()
      })
    }
  })
  
}

Multihack.prototype._initRemote = function () {
  Interface.getRoom(self.roomID, function (roomID) {
    self.roomID = roomID
    self._remote = new Remote(config.hostname, roomID)
    
    self._remote.on('change', function (data) {
      if (Editor.change(data.filePath, data.change)) {
        Interface.treeview.render(tree)
      }
    })
    self._remote.on('deleteFile', function (data) {
      FileSystem.delete(data.filePath)
      Interface.treeview.render(tree)
    })
    Editor.on('change', function (data) {
      self._remote.change(data.filePath, data.change)
    })
  })
}
    
module.exports = Multihack