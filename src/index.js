var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('./network/remote')
var HyperHostWrapper = require('./network/hyperhostwrapper')
var util = require('./filesystem/util')

var DEFAULT_HOSTNAME = 'https://quiet-shelf-57463.herokuapp.com'
var MAX_FORWARDING_SIZE = 5*1000*1000 // 5mb limit for non-p2p connections (validated by server)

function Multihack (config) {
  var self = this
  if (!(self instanceof Multihack)) return new Multihack(config)

  config = config || {}

  Interface.on('openFile', function (e) {
    Editor.open(e.path)
  })

  Interface.on('addFile', function (e) {
    var created = FileSystem.mkfile(e.path)
    
    if (created) {
      Interface.treeview.addFile(e.parentElement, FileSystem.get(e.path))
      Editor.open(e.path)
    }
    self._remote.createFile(e.path)
  })
  
  FileSystem.on('unzipFile', function (e) {
    self._remote.createFile(e.path, e.content)
  })

  Interface.on('addDir', function (e) {
    var created = FileSystem.mkdir(e.path)
    
    if (created) {
      Interface.treeview.addDir(e.parentElement, FileSystem.get(e.path))
    }
  })

  Interface.on('removeFile', function (e) {
    var file = FileSystem.get(e.path)
    Interface.confirmDelete(file.name, function () {
      Interface.treeview.remove(e.parentElement, file)
      FileSystem.delete(e.path)
      if (self._remote) {
        self._remote.deleteFile(e.path)
      }
    })
  })

  Interface.on('deleteCurrent', function (e) {
    var workingFile = Editor.getWorkingFile()
    
    Interface.confirmDelete(workingFile.name, function () {
      var workingPath = workingFile.path
      var parentElement = Interface.treeview.getParentElement(workingPath)
      if (parentElement) {
        Interface.treeview.remove(parentElement, FileSystem.get(workingPath))
      }
      FileSystem.delete(workingPath)
      Editor.close()
      self._remote.deleteFile(workingPath)
    })
  })

  self.embed = util.getParameterByName('embed') || null
  self.roomID = util.getParameterByName('room') || null
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
    HyperHostWrapper.on('error', function (err) {
      Interface.alert('Deploy Failed', err)
    })
    
    HyperHostWrapper.on('ready', function (url) {
      Interface.alertHTML('Website Deployed', 'Anyone can visit your site at<br><a target="_blank" href="' + url + '">' + url + '</a>')
    })
    
    HyperHostWrapper.deploy(FileSystem.getTree())
  })

  Interface.hideOverlay()
  if (self.embed) {
    self._initRemote()
  } else {
    self._initRemote(function () {
      Interface.getProject(function (project) {
        if (project) {
          Interface.showOverlay()
          FileSystem.loadProject(project, function (tree) {
            Interface.treeview.render(tree)
            Interface.hideOverlay()
          })
        }
      })
    })
  }
}

Multihack.prototype._initRemote = function (cb) {
  var self = this
  
  function onRoom(data) {
    self.roomID = data.room
    window.history.pushState('Multihack', 'Multihack Room '+self.roomID, '?room='+self.roomID + (self.embed ? '&embed=true' : ''));
    self.nickname = data.nickname
    self._remote = new Remote(self.hostname, self.roomID, self.nickname)
    self._remote.posFromIndex = function (filePath, index, cb) {
      cb(FileSystem.getFile(filePath).doc.posFromIndex(index))
    }
    
    document.getElementById('voice').style.display = ''
    document.getElementById('network').style.display = ''

    Interface.on('voiceToggle', function () {
      self._remote.voice.toggle()
    })
    Interface.on('resync', function () {
      self._remote.requestProject()
    })
    Interface.on('showNetwork', function () {
      Interface.showNetwork(self._remote.peers, self.roomID, self._remote.nop2p, self._remote.mustForward)
    })

    self._remote.on('selection', function (data) {
      Editor.highlight(data.filePath, data.change.ranges)
    })
    self._remote.on('changeFile', function (data) {
      Editor.change(data.filePath, data.change)
    })
    self._remote.on('renameFile', function (data) {
      var contents = FileSystem.getFile(data.filePath).content
      Editor.change(data.change.newPath, {
        from: {ch:0, line:0},
        to: {ch:0, line:0},
        text: contents,
        origin: 'paste'
      })
      var parentElement = Interface.treeview.getParentElement(data.filePath)
      if (parentElement) {
        Interface.treeview.remove(parentElement, FileSystem.get(data.filePath))
      }
      FileSystem.delete(data.filePath)
      Interface.treeview.rerender(FileSystem.getTree()) 
    })
    self._remote.on('deleteFile', function (data) {
      var parentElement = Interface.treeview.getParentElement(data.filePath)
      if (parentElement) {
        Interface.treeview.remove(parentElement, FileSystem.get(data.filePath))
      }
      FileSystem.delete(data.filePath)
    })
    self._remote.on('createFile', function (data) {
      FileSystem.getFile(data.filePath).write(data.content)
      Interface.treeview.rerender(FileSystem.getTree())
      if (!Editor.getWorkingFile()) {
        Editor.open(data.filePath)
      }
    })
    self._remote.on('lostPeer', function (peer) {
      if (self.embed) return
      Interface.alert('Connection Lost', 'Your connection to "'+peer.metadata.nickname+'" has been lost.')
    })
    
    Editor.on('change', function (data) {
      self._remote.changeFile(data.filePath, data.change)
    })
    
    cb()
  }

  // Random starting room (to be changed) or from query
  if (!self.roomID && !self.embed) {
    Interface.getRoom(Math.random().toString(36).substr(2), onRoom)
  } else if (!self.embed) {
    Interface.getNickname(self.roomID, onRoom)
  } else {
    Interface.embedMode()
    onRoom({
      room: self.roomID || Math.random().toString(36).substr(2),
      nickname: 'Guest'
    })
  }
}

module.exports = Multihack
