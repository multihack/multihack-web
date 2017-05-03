/* globals JSZip, Blob, CodeMirror */

var File = require('./file')
var Directory = require('./directory')
var util = require('./util')

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(FileSystem, EventEmitter)

var ignoredFilenames = ['__MACOSX', '.DS_Store']

function FileSystem () {
  var self = this
  if (!(self instanceof FileSystem)) return new FileSystem()

  self._tree = [
    new Directory('')
  ]
}

// Loads a project
FileSystem.prototype.loadProject = function (file, cb) {
  var self = this

  // TODO: More load types
  self.unzip(file, function () {
    cb(self._tree[0].nodes)
  })

  // TODO: More input options
}

// Saves the project
FileSystem.prototype.saveProject = function (saveType, cb) {
  var self = this

  // TODO: More save types
  if (saveType === 'zip') {
    try {
      var zip = new JSZip()
      util.zipTree(zip, self._tree[0].nodes)

      zip.generateAsync({type: 'blob'}).then(function (content) {
        window.saveAs(content, 'myProject.zip')
        cb(true)
      })
    } catch (err) {
      console.error(err)
      cb(false)
    }
  }
}

// Makes a directory, building paths
FileSystem.prototype.mkdir = function (path) {
  var self = this
  
  var parentPath = path.split('/')
  parentPath.splice(-1, 1)
  parentPath = parentPath.join('/')

  self._buildPath(parentPath)
  if (self._getNode(path, self._getNode(parentPath).nodes)) return false
  self._getNode(parentPath).nodes.push(new Directory(path))
  
  return true
}

// Makes an empty file (must set doc), building paths
FileSystem.prototype.mkfile = function (path) {
  var self = this
  var parentPath = path.split('/')
  parentPath.splice(-1, 1)
  parentPath = parentPath.join('/')

  self._buildPath(parentPath)
  if (self._getNode(path, self._getNode(parentPath).nodes)) return false
  self._getNode(parentPath).nodes.push(new File(path))
  
  return true
}

FileSystem.prototype.getContained = function (path) {
  var self = this
  
  var dir = self.getFile(path)
  if (!dir.isDir) return [dir]
  
  var contained = []
  
  dir.nodes.forEach(function (node) {
    self.getContained(node.path).forEach(function (c) {
      contained.push(c)
    })
  })
  
  return contained
}

// Ensures all directories have been built along a path
FileSystem.prototype._buildPath = function (path) {
  var self = this

  var split = path.split('/')
  for (var i = 0; i <= split.length; i++) {
    var check = split.slice(0, i).join('/')
    if (!self._getNode(check)) {
      self.mkdir(check)
    }
  }
}

// Recursive node search
FileSystem.prototype._getNode = function (path, nodeList) {
  var self = this
  
  nodeList = nodeList || self._tree
  for (var i = 0; i < nodeList.length; i++) {
    if (nodeList[i].path === path) {
      return nodeList[i]
    } else if (nodeList[i].isDir) {
      var recur = self._getNode(path, nodeList[i].nodes)
      if (recur) return recur
    }
  }
  return undefined
}

// Checks if a file/directory exists at a path
FileSystem.prototype.exists = function (path) {
  var self = this

  var parentPath = path.split('/')
  parentPath.splice(-1, 1)
  parentPath = parentPath.join('/')

  return !!self._getNode(path)
}

// Gets a node, building any broken paths
FileSystem.prototype.get = function (path) {
  var self = this

  var parentPath = path.split('/')
  parentPath.splice(-1, 1)
  parentPath = parentPath.join('/')

  self._buildPath(parentPath)
  return self._getNode(path)
}

// Gets an existing file, or creates one if none exists
FileSystem.prototype.getFile = function (path) {
  var self = this
  
  var parentPath = path.split('/')
  parentPath.splice(-1,1)
  parentPath = parentPath.join('/')
  
  self._buildPath(parentPath)
  return self._getNode(path) || (function () {
    self.mkfile(path)
    return self._getNode(path)
  }())
}

// Deletes a file/directory on a path
FileSystem.prototype.delete = function (path) {
  var self = this
  var parentPath = path.split('/')
  parentPath.splice(-1, 1)
  parentPath = parentPath.join('/')
  self._getNode(parentPath).nodes = self._getNode(parentPath).nodes.filter(function (e) {
    if (e.path === path) {
      return false
    }
    return true
  })
}

// Returns the useable part of the tree
FileSystem.prototype.getTree = function () {
  var self = this

  return self._tree[0].nodes
}

// Return array of all files and folders
FileSystem.prototype.getAllFiles = function () {
  var self = this

  var all = []

  function walk (dir) {
    for (var i = 0; i < dir.nodes.length; i++) {
      if (dir.nodes[i].isDir) {
        walk(dir.nodes[i])
      }
      all.push(dir.nodes[i])
    }
  }

  walk(self._tree[0])

  return all
}

// Loads a project from a zip file
FileSystem.prototype.unzip = function (file, cb) {
  var self = this
  
  JSZip.loadAsync(file).then(function (zip) {
    var awaiting = Object.keys(zip.files).length
    zip.forEach(function (relativePath, zipEntry) {    
      if (relativePath[0] !== '/') relativePath = '/'+relativePath

      // Filter out ignored files
      for (var i = 0; i < ignoredFilenames.length; i++) {
        if (relativePath.indexOf(ignoredFilenames[i]) !== -1) {
          if (--awaiting <= 0) cb()
          return
        }
      }

      relativePath = relativePath.split('/')
      relativePath.splice(0, 1)
      relativePath = relativePath.join('/')
      relativePath = '/' + relativePath

      if (zipEntry.dir) {
        relativePath = relativePath.slice(0, -1)
      }

      var parentPath = relativePath.split('/')
      parentPath.splice(-1, 1)
      parentPath = parentPath.join('/')

      if (zipEntry.dir) {
        self.mkdir(relativePath)
        if (--awaiting <= 0) cb()
      } else {
        self.mkfile(relativePath)
        zipEntry.async('string').then(function (content) {
          self.get(relativePath).doc = new CodeMirror.Doc(content, util.pathToMode(relativePath))
          self.emit('unzipFile', self.get(relativePath))
          if (--awaiting <= 0) cb()
        })
      }
    })
  })
}

module.exports = new FileSystem()
