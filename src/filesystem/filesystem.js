/* globals JSZip, JSZipUtils, CodeMirror */

var File = require('./file')
var Directory = require('./directory')
var util = require('./util')

var ignoredFilenames = ['__MACOSX', '.DS_Store']

function FileSystem () {
  var self = this
  if (!(self instanceof FileSystem)) return new FileSystem()
  
  self._counter = 0
  self._tree = [
    new Directory('')
  ]
  self.currentFile = null
}

// Takes a zip file and loads the project
FileSystem.prototype.loadProject = function (file, cb) {
  var self = this
  self.unzip(file, function () {
    console.log('done')
    cb(self._tree[0].children)
  })
  
  // TODO: More input options
}

FileSystem.prototype.mkdir = function (parentPath, path) {
  var self = this
  self._getNode(parentPath).children.push(new Directory(path))
}

FileSystem.prototype.mkfile = function (parentPath, path) {
  var self = this
  self._getNode(parentPath).children.push(new File(path))
}


// Recursive search
FileSystem.prototype._getNode = function (path, nodeList) {
  var self = this
  nodeList = nodeList || self._tree
    for (var i = 0; i < nodeList.length; i++) { 
        if (nodeList[i].path === path) {
            return nodeList[i]
        } else if (nodeList[i].children) {
            var recur = self._getNode(path, nodeList[i].children) 
            if (recur) return recur
        }
    }
    return undefined
}

FileSystem.prototype.get = function (path) {
  var self = this
  return self._getNode(path)
}

// Takes a zip file and writes to the directory
FileSystem.prototype.unzip = function (file, cb) {
  var self = this
  
  JSZip.loadAsync(file).then(function (zip) {
    
    var awaiting = Object.keys(zip.files).length
    var first = true
    
    zip.forEach(function (relativePath, zipEntry) {  
      if (first) {
        first = false
        awaiting--
        return
      }

      // Filter out ignored files
      for (var i=0; i<ignoredFilenames.length; i++) {
        if (relativePath.indexOf(ignoredFilenames[i]) !== -1) {
          if (--awaiting <= 0) cb() 
          return
        }
      } 
      
      relativePath = relativePath.split('/')
      relativePath.splice(0,1)
      relativePath = relativePath.join('/')
      relativePath='/'+relativePath
      
      if (zipEntry.dir) {
        relativePath = relativePath.slice(0, -1)
      }
      
      var parentPath = relativePath.split('/')
      parentPath.splice(-1,1)
      parentPath = parentPath.join('/')
      
      if (zipEntry.dir) {
        self.mkdir(parentPath, relativePath)
        if (--awaiting <= 0) cb() 
      } else {
        self.mkfile(parentPath, relativePath)
        var viewMapping = util.getViewMapping(relativePath)
        switch (viewMapping) {
          default:
            // Load as text
            zipEntry.async('string').then(function (content) {  
              self.get(relativePath).doc = new CodeMirror.Doc(content, util.pathToMode(relativePath))
              if (--awaiting <= 0) cb() 
            })
            break
        }
      }   
    })
  })
}
    
module.exports = new FileSystem()