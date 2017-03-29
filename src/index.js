var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('./network/remote')

function Multihack () {
  var self = this
  if (!(self instanceof Multihack)) return new Multihack()
  
  Interface.on('openFile', function (path) {
    Editor.open(path)
  })
  
  // Initialize project and room
  self.roomID = Math.random().toString(36).substr(2, 20)
    
  Interface.removeOverlay()
  Interface.getProject(function (project) {
    if (!project){
      Interface.getRoom(self.roomID, function (roomID) {
        self.roomID = roomID
        // self._remote = new Remote('quiet-shelf-57463.herokuapp.com', roomID)
      })
    } else {
      Interface.showOverlay()
      FileSystem.loadProject(project, function (tree) {
        Interface.getRoom(self.roomID, function (roomID) {
          self.roomID = roomID
        })
        Interface.treeview.render(tree)
      })
    }
  })
}
    
module.exports = Multihack