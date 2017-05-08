var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('multihack-core')
var HyperHostWrapper = require('./network/hyperhostwrapper')
var util = require('./filesystem/util')
var Voice = require('./network/voice')
var lang = require('./interface/lang/lang')
var lg = lang.get.bind(lang)

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
  
  FileSystem.on('unzipFile', function (file) {
    file.read(function (content) {
      self._remote.createFile(file.path, content)
    })
  })

  Interface.on('addDir', function (e) {
    var created = FileSystem.mkdir(e.path)
    
    if (created) {
      Interface.treeview.addDir(e.parentElement, FileSystem.get(e.path))
    }
    self._remote.createDir(e.path)
  })

  Interface.on('removeDir', function (e) {
    var dir = FileSystem.get(e.path)
    var workingFile = Editor.getWorkingFile()
    
    Interface.confirmDelete(dir.name, function () {
      Interface.treeview.remove(e.parentElement, dir)

      FileSystem.getContained(e.path).forEach(function (file) {
        if (workingFile && file.path === workingFile.path) {
          Editor.close()
        }
        self._remote.deleteFile(file.path)
      })
      self._remote.deleteFile(e.path)
    })
  })

  Interface.on('deleteCurrent', function (e) {
    var workingFile = Editor.getWorkingFile()
    if (!workingFile) return
    Editor.close()
    
    Interface.confirmDelete(workingFile.name, function () {
      var workingPath = workingFile.path
      var parentElement = Interface.treeview.getParentElement(workingPath)
      if (parentElement) {
        Interface.treeview.remove(parentElement, FileSystem.get(workingPath))
      }
      FileSystem.delete(workingPath)
      self._remote.deleteFile(workingPath)
    })
  })

  self.embed = util.getParameterByName('embed') || null
  self.roomID = util.getParameterByName('room') || null
  self.hostname = config.hostname

  Interface.on('saveAs', function (saveType) {
    FileSystem.getContained('').forEach(function (file) {
      file.write(self._remote.getContent(file.path))
    })
    FileSystem.saveProject(saveType, function (success) {
      if (success) {
        Interface.alert(lg('save_success_title'), lg('save_success'))
      } else {
        Interface.alert(lg('save_fail_title'), lg('save_fail'))
      }
    })
  })

  Interface.on('deploy', function () {
    HyperHostWrapper.on('error', function (err) {
      Interface.alert(lg('deploy_fail_title'), err)
    })
    
    HyperHostWrapper.on('ready', function (url) {
      Interface.alertHTML(lg('deploy_title'), lg('deploy_success', {url: url}))
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
            Interface.treeview.rerender(tree)
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
    Interface.setRoom(self.roomID)
    window.history.pushState('Multihack', lg('history_item', {room: self.roomID}), '?room='+self.roomID + (self.embed ? '&embed=true' : ''));
    self.nickname = data.nickname
    self._remote = new Remote({
      hostname: self.hostname, 
      room: self.roomID, 
      nickname: self.nickname,
      voice: Voice,
      wrtc: null
    })
    self._remote.posFromIndex = function (filePath, index, cb) {
      cb(FileSystem.getFile(filePath).doc.posFromIndex(index))
    }
    
    document.getElementById('voice').style.display = ''
    document.getElementById('network').style.display = ''

    Interface.on('voiceToggle', function () {
      self._remote.voice.toggle()
    })
    Interface.on('showNetwork', function () {
      Interface.showNetwork(self._remote.peers, self.roomID, self._remote.nop2p, self._remote.mustForward)
    })

    self._remote.on('changeSelection', function (selections) {
      Editor.highlight(selections)
    })
    self._remote.on('changeFile', function (data) {
      Editor.change(data.filePath, data.change)
    })
    self._remote.on('deleteFile', function (data) {
      var parentElement = Interface.treeview.getParentElement(data.filePath)
      var workingFile = Editor.getWorkingFile()
      
      if (workingFile && data.filePath === workingFile.path) {
        Editor.close()
      }
      
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
    self._remote.on('createDir', function (data) {
      FileSystem.mkdir(data.path)
      Interface.treeview.rerender(FileSystem.getTree())
    })
    self._remote.on('lostPeer', function (peer) {
      if (self.embed) return
      Interface.flashTooltip('tooltip-lostpeer', lg('lost_connection', {nickname: peer.metadata.nickname}))
    })
    
    Editor.on('change', function (data) {
      self._remote.changeFile(data.filePath, data.change)
    })
    Editor.on('selection', function (data) {
      self._remote.changeSelection(data)
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
      nickname: lg('default_nickname')
    })
  }
}

module.exports = Multihack
