var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('./network/remote')
var HyperHostWrapper = require('./network/hyperhostwrapper')

function Multihack (config) {
  var self = this
  if (!(self instanceof Multihack)) return new Multihack(config)
  
  config = config || {}
  
  Interface.on('openFile', function (path) {
    Editor.open(path)
  })
  
  // Initialize project and room
  self.roomID = Math.random().toString(36).substr(2, 20)
  self.hostname = config.hostname
  
  Interface.on('saveAs', function (saveType) {
    FileSystem.saveProject(saveType, function (success) {
      if (success) {
        Interface.alert('Save Completed', 'Your project has been successfully saved.')
      } else {
        Interface.alert('Save Failed', 'An error occured while trying to save your project.<br>Please select a different method.')
      }
    })
  })
  
  Interface.on('deploy', function () {
    HyperHostWrapper.deploy(FileSystem.getTree(), function (url) {
      Interface.alert('Website Deployed', 'Anyone can visit your site at<br><a target="_blank" href="'+url+'">'+url+'</a>')
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
  var self = this
  
  Interface.getRoom(self.roomID, function (roomID) {
    self.roomID = roomID
    console.log(self, self.hostname)
    self._remote = new Remote(self.hostname, roomID)
    
    Interface.on('voiceToggle', function () {
      self._remote.voice.toggle()
    })
    
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