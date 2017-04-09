var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('./network/remote')
var HyperHostWrapper = require('./network/hyperhostwrapper')

var DEFAULT_HOSTNAME = 'https://quiet-shelf-57463.herokuapp.com'

// please don't change these! I'm working on improving this!
var MAX_PUBLIC_SIZE = 20000000 // 20 mb max for public server
var MAX_PUBLIC_NUMBER = 500 // 500 files

function Multihack (config) {
  var self = this
  if (!(self instanceof Multihack)) return new Multihack(config)

  config = config || {}

  Interface.on('openFile', function (e) {
    Editor.open(e.path)
  })

  Interface.on('addFile', function (e) {
    FileSystem.getFile(e.path)
    Interface.treeview.addFile(e.parentElement, FileSystem.get(e.path))
    Editor.open(e.path)
  })

  Interface.on('addDir', function (e) {
    FileSystem.mkdir(e.path)
    Interface.treeview.addDir(e.parentElement, FileSystem.get(e.path))
  })

  Interface.on('removeFile', function (e) {
    Interface.treeview.remove(e.parentElement, FileSystem.get(e.path))
    FileSystem.delete(e.path)
    if (self._remote) {
      self._remote.deleteFile(e.path)
    }
  })

  Interface.on('deleteCurrent', function (e) {
    var workingPath = Editor.getWorkingFile().path
    var parentElement = Interface.treeview.getParentElement(workingPath)
    Interface.treeview.remove(parentElement, FileSystem.get(workingPath))
    FileSystem.delete(workingPath)
    Editor.close()
    self._remote.deleteFile(workingPath)
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
      Interface.alert('Website Deployed', 'Anyone can visit your site at<br><a target="_blank" href="' + url + '">' + url + '</a>')
    })
  })

  Interface.removeOverlay()
  Interface.getProject(function (project) {
    if (!project) {
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
    self._remote = new Remote(self.hostname, roomID)

    Interface.on('voiceToggle', function () {
      self._remote.voice.toggle()
    })
    Interface.on('resync', function () {
      self._remote.requestProject()
    })

    self._remote.on('change', function (data) {
      var outOfSync = !FileSystem.exists(data.filePath)
      Editor.change(data.filePath, data.change)
      if (outOfSync) {
        Interface.treeview.rerender(FileSystem.getTree())
      }
    })
    self._remote.on('deleteFile', function (data) {
      var parentElement = Interface.treeview.getParentElement(data.filePath)
      Interface.treeview.remove(parentElement, FileSystem.get(data.filePath))
      FileSystem.delete(data.filePath)
    })
    self._remote.on('requestProject', function (data) {
      var isPublicServer = self.hostname === DEFAULT_HOSTNAME
      var size = 0
<<<<<<< HEAD
      
=======

>>>>>>> master
      // Get a list of all non-directory files, sorted by ascending path length
      var allFiles = FileSystem.getAllFiles().sort(function (a, b) {
        return a.path.length - b.path.length
      }).filter(function (a) {
        return !a.isDir
      })
<<<<<<< HEAD
      
      if (isPublicServer && allFiles.length > MAX_PUBLIC_NUMBER)  {
        return alert('More than 500 files. Please use a private server.')
      }
      
      for (var i=0; i<allFiles.length; i++) {
=======

      if (isPublicServer && allFiles.length > MAX_PUBLIC_NUMBER) {
        return window.alert('More than 500 files. Please use a private server.')
      }

      for (var i = 0; i < allFiles.length; i++) {
>>>>>>> master
        size = size + allFiles[i].content.length
        if (size > MAX_PUBLIC_SIZE) {
          return window.alert('Project over 20mb. Please use a private server.')
        }

        self._remote.provideFile(allFiles[i].path, allFiles[i].content, data.requester, i, allFiles.length - 1)
      }
    })
    self._remote.on('provideFile', function (data) {
      FileSystem.getFile(data.filePath).doc.setValue(data.content)
      Interface.treeview.rerender(FileSystem.getTree())
      console.log(data.num + ' of ' + data.total)
    })

    Editor.on('change', function (data) {
      self._remote.change(data.filePath, data.change)
    })
  })
}

module.exports = Multihack
