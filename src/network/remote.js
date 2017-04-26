/* globals window, io */

var Y = require('yjs')
var YText = require('y-text')(Y)
require('y-memory')(Y)
require('y-array')(Y)
require('y-map')(Y)
require('y-webrtc')(Y)

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(RemoteManager, EventEmitter)

function RemoteManager (hostname, room, nickname) {
  var self = this
  
  self.roomID = room
  self.yfs = null
  self.ytext = {}
  self.posFromIndex = function (filePath, index, cb) {
    console.warn('No "remote.posFromIndex" provided. Unable to apply change!')
  }
  
  Y({
    db: {
        name: 'memory' // Store the CRDT model in memory
    },
    connector: {
        name: 'webrtc', // TODO: Use a custom connector
        room: self.roomID
    },
    share: {
        dir_tree: 'Map' // key: filePath, value: y_obj_id
    }
  }).then(function (y) {
    self.yfs = y.share.dir_tree
    
    self.yfs.observe(function (event) {
      var filePath = event.name
      
      if (event.type === 'add') { // create file/folder     
        
        event.value.observe(self._onYTextEvent.bind(self, filePath))
        console.log('got', filePath)
        
        self.emit('createFile', {
          filePath: filePath,
          content: event.value.toString()
        })
      } else if (event.type === 'update') { // rename
        console.log(oldPath, 'was renamed to', newPath)
        self.emit('renameFile', {
          filePath: filePath
        })
      } else if (event.type === 'delete') { // delete
        console.log(filePath, 'was deleted')
        self.emit('deleteFile', {
          filePath: filePath
        })
      }
    })
  })
}

RemoteManager.prototype.createFile = function (filePath, contents) {
  var self = this
  
  console.log('created', filePath, typeof contents)
  
  self.yfs.set(filePath, Y.Text)
  insertChunked(self.yfs.get(filePath), 0, contents || '')
}

function insertChunked(ytext, start, str) {
  var i = start
  var CHUNK_SIZE = 60000
  chunkString(str, CHUNK_SIZE).forEach(function (chunk) {
    ytext.insert(i, chunk)
    i+=chunk.length
  })
}

function chunkString(str, size) {
  var numChunks = Math.ceil(str.length / size),
      chunks = new Array(numChunks);

  for(var i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = str.substr(o, size);
  }

  return chunks;
}

RemoteManager.prototype.renameFile = function (oldPath, newPath) {
  var self = this
  
  console.log('renamed', oldPath, 'to', newPath)
  
  self.yfs.set(newPath, self.yfs.get(oldPath))
}
  
RemoteManager.prototype.deleteFile = function (filePath) {
  var self = this
  
  console.log('deleted', filePath)
  
  self.yfs.delete(filePath)
}

RemoteManager.prototype.changeFile = function (filePath, delta) {
  var self = this
  
  console.log(delta)
  
  var ytext = self.yfs.get(filePath)
  if (!ytext) return
  
  // apply the delta to the ytext instance
  var start = delta.start

  // apply the delete operation first
  if (delta.removed.length > 0) {
    var delLength = 0
    for (var j = 0; j < delta.removed.length; j++) {
      delLength += delta.removed[j].length
    }
    // "enter" is also a character in our case
    delLength += delta.removed.length - 1
    ytext.delete(start, delLength)
  }

  // apply insert operation
  insertChunked(ytext, start, delta.text.join('\n'))
}

RemoteManager.prototype._onYTextEvent = function (filePath, event) {
  var self = this
  
  console.log(event)
  
  self.posFromIndex(filePath, event.index, function (from) {
    console.log(event.index, from)
    if (event.type === 'insert') {
      self.emit('changeFile', {
        filePath, filePath,
        change: {
          from: from,
          to: from,
          text: event.values.join('')
        }
      })
    } else if (event.type === 'delete') {
      self.posFromIndex(filePath, event.index + event.length, function (to) {
        self.emit('changeFile', {
          filePath, filePath,
          change: {
            from: from,
            to: to,
            text: ''
          }
        })
      })
    }
  })
}

RemoteManager.prototype.destroy = function () {
  var self = this
  
}

module.exports = RemoteManager